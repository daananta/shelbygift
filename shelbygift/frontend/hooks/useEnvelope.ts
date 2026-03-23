import { useState, useCallback, useEffect } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { aptosClient } from "@/utils/aptosClient";
import { CONTRACT_ADDRESS } from "@/constants";

// ── Types ──
export interface EnvelopeInfo {
  name: string;
  message: string;
  creatorName: string;
  creatorAddress: string;
  totalAmount: number;
  maxClaims: number;
  currentClaims: number;
  isRandom: boolean;
  hasMedia: boolean;
  blobId: string | null;
  startTime: number | null;
  endTime: number | null;
  isOpen: boolean;
}

export interface CreateEnvelopeParams {
  name: string;
  message: string;
  creatorName: string;
  amount: number;
  maxClaims: number;
  isRandom: boolean;
  blobId: string; // empty string if no media
  passcodeHash?: number[]; // SHA256 bytes, omit if no passcode
  startTime?: number; // unix seconds
  endTime?: number; // unix seconds
  tokenMetadataAddress: string; // The FA metadata address to use
}

// ── Create Envelope Hook ──
export function useCreateEnvelope() {
  const { signAndSubmitTransaction } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = useCallback(
    async (params: CreateEnvelopeParams): Promise<string | null> => {
      if (!CONTRACT_ADDRESS) {
        setError("Contract address not configured");
        return null;
      }
      setLoading(true);
      setError(null);

      try {
        const tx = await signAndSubmitTransaction({
          data: {
            function: `${CONTRACT_ADDRESS}::lixi::create_envelope`,
            typeArguments: [],
            functionArguments: [
              params.name, // 0: name (String)
              params.message, // 1: message (String)
              params.creatorName, // 2: creator_name (String)
              params.amount, // 3: amount (u64)
              params.maxClaims, // 4: max_claims (u64)
              params.tokenMetadataAddress, // 5: fa_metadata (Object)
              [], // 6: allowed_users (vector<address>)
              params.isRandom, // 7: is_random (bool)
              params.blobId || "", // 8: blob_id_raw (String)
              params.passcodeHash || undefined, // 9: passcode_hash (Option<vector<u8>>)
              params.startTime || undefined, // 10: start_time (Option<u64>)
              params.endTime || undefined, // 11: end_time (Option<u64>)
            ],
          },
        });

        const result = await aptosClient().waitForTransaction({
          transactionHash: tx.hash,
        });

        // Extract envelope address from events
        const createEvent = (result as any).events?.find(
          (e: any) =>
            e.type?.includes("EnvelopeCreatedEvent")
        );

        setLoading(false);
        return createEvent?.data?.envelope_address || tx.hash;
      } catch (err: any) {
        const msg = err?.message || "Failed to create envelope";
        setError(msg);
        setLoading(false);
        console.error("Create envelope error:", err);
        return null;
      }
    },
    [signAndSubmitTransaction]
  );

  return { create, loading, error };
}

// ── Claim Envelope Hook ──
export function useClaimEnvelope() {
  const { signAndSubmitTransaction } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claimedAmount, setClaimedAmount] = useState<number | null>(null);

  const claim = useCallback(
    async (
      envelopeAddress: string,
      passcode?: number[]
    ): Promise<boolean> => {
      if (!CONTRACT_ADDRESS) {
        setError("Contract address not configured");
        return false;
      }
      setLoading(true);
      setError(null);
      setClaimedAmount(null);

      try {
        const tx = await signAndSubmitTransaction({
          data: {
            function: `${CONTRACT_ADDRESS}::lixi::claim_envelope`,
            typeArguments: [],
            functionArguments: [
              envelopeAddress,
              passcode || undefined,
            ],
          },
        });

        const result = await aptosClient().waitForTransaction({
          transactionHash: tx.hash,
        });

        // Extract claimed amount from events
        const claimEvent = (result as any).events?.find(
          (e: any) =>
            e.type?.includes("EnvelopeClaimedEvent")
        );

        if (claimEvent?.data?.amount) {
          setClaimedAmount(Number(claimEvent.data.amount));
        }

        setLoading(false);
        return true;
      } catch (err: any) {
        const msg = err?.message || "Failed to claim envelope";
        setError(msg);
        setLoading(false);
        console.error("Claim envelope error:", err);
        return false;
      }
    },
    [signAndSubmitTransaction]
  );

  return { claim, loading, error, claimedAmount };
}

// ── Get Envelope Info Hook ──
export function useEnvelopeInfo(envelopeAddress: string | undefined) {
  const [info, setInfo] = useState<EnvelopeInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInfo = useCallback(async () => {
    if (!envelopeAddress || !CONTRACT_ADDRESS) return;

    setLoading(true);
    setError(null);

    try {
      const result = await aptosClient().view({
        payload: {
          function: `${CONTRACT_ADDRESS}::lixi::get_envelope_info`,
          typeArguments: [],
          functionArguments: [envelopeAddress],
        },
      });

      // result is a tuple array matching the contract return order
      const [
        name,
        message,
        creatorName,
        creatorAddress,
        totalAmount,
        maxClaims,
        currentClaims,
        isRandom,
        hasMedia,
        blobId,
        startTime,
        endTime,
        isOpen,
      ] = result as any[];

      setInfo({
        name: String(name),
        message: String(message),
        creatorName: String(creatorName),
        creatorAddress: String(creatorAddress),
        totalAmount: Number(totalAmount),
        maxClaims: Number(maxClaims),
        currentClaims: Number(currentClaims),
        isRandom: Boolean(isRandom),
        hasMedia: Boolean(hasMedia),
        blobId: blobId?.vec?.[0] || null,
        startTime: startTime?.vec?.[0] ? Number(startTime.vec[0]) : null,
        endTime: endTime?.vec?.[0] ? Number(endTime.vec[0]) : null,
        isOpen: Boolean(isOpen),
      });

      setLoading(false);
    } catch (err: any) {
      setError(err?.message || "Failed to fetch envelope info");
      setLoading(false);
      console.error("Fetch envelope info error:", err);
    }
  }, [envelopeAddress]);

  useEffect(() => {
    fetchInfo();
  }, [fetchInfo]);

  return { info, loading, error, refetch: fetchInfo };
}

// ── Has Claimed Hook ──
export function useHasClaimed(
  userAddress: string | undefined,
  envelopeAddress: string | undefined
) {
  const [hasClaimed, setHasClaimed] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);

  const check = useCallback(async () => {
    if (!userAddress || !envelopeAddress || !CONTRACT_ADDRESS) return;

    setLoading(true);
    try {
      const result = await aptosClient().view({
        payload: {
          function: `${CONTRACT_ADDRESS}::lixi::has_claimed`,
          typeArguments: [],
          functionArguments: [userAddress, envelopeAddress],
        },
      });
      setHasClaimed(Boolean(result[0]));
    } catch (err) {
      console.error("Check has_claimed error:", err);
    }
    setLoading(false);
  }, [userAddress, envelopeAddress]);

  useEffect(() => {
    check();
  }, [check]);

  return { hasClaimed, loading, refetch: check };
}

// ── Get Remaining Hook ──
export function useGetRemaining(envelopeAddress: string | undefined) {
  const [remaining, setRemaining] = useState<{
    claims: number;
    balance: number;
  } | null>(null);

  const fetch = useCallback(async () => {
    if (!envelopeAddress || !CONTRACT_ADDRESS) return;

    try {
      const result = await aptosClient().view({
        payload: {
          function: `${CONTRACT_ADDRESS}::lixi::get_remaining`,
          typeArguments: [],
          functionArguments: [envelopeAddress],
        },
      });
      setRemaining({
        claims: Number(result[0]),
        balance: Number(result[1]),
      });
    } catch (err) {
      console.error("Get remaining error:", err);
    }
  }, [envelopeAddress]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { remaining, refetch: fetch };
}
