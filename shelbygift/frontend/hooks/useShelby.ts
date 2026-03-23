import { useState, useCallback } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { aptosClient } from "@/utils/aptosClient";
import { shelbyClient } from "@/utils/shelbyClient";
import { SHELBY_BLOB_BASE_URL } from "@/constants";

// Import Shelby SDK utilities
import {
  createDefaultErasureCodingProvider,
  generateCommitments,
  ShelbyBlobClient,
  expectedTotalChunksets,
} from "@shelby-protocol/sdk/browser";

export type UploadStep = "idle" | "encoding" | "registering" | "uploading" | "done" | "error";

export interface UploadState {
  step: UploadStep;
  error?: string;
  blobId?: string;
}

/**
 * Hook to upload media (mp4/mp3) to Shelby Protocol.
 * Returns upload function + current state.
 */
export function useUploadMedia() {
  const { account, signAndSubmitTransaction } = useWallet();
  const [state, setState] = useState<UploadState>({ step: "idle" });

  const upload = useCallback(
    async (file: File): Promise<string | null> => {
      if (!account?.address) {
        setState({ step: "error", error: "Wallet not connected" });
        return null;
      }

      try {
        // Tự động thêm timestamp để tránh trùng lặp file name trên contract Shelby
        const uniqueBlobName = `${Date.now()}-${file.name}`;

        // Step 1: Encode
        setState({ step: "encoding" });
        const data = Buffer.from(await file.arrayBuffer());
        const provider = await createDefaultErasureCodingProvider();
        const commitments = await generateCommitments(provider, data);

        // Step 2: Register on-chain (wallet signs tx)
        setState({ step: "registering" });
        const payload = ShelbyBlobClient.createRegisterBlobPayload({
          account: account.address.toString(),
          blobName: uniqueBlobName,
          blobMerkleRoot: commitments.blob_merkle_root,
          numChunksets: expectedTotalChunksets(commitments.raw_data_size),
          expirationMicros: (Date.now() + 30 * 24 * 60 * 60 * 1000) * 1000,
          blobSize: commitments.raw_data_size,
          encoding: 0, // 0 corresponds to default ClayCode setting
        });
        const tx = await signAndSubmitTransaction({ data: payload });
        await aptosClient().waitForTransaction({ transactionHash: tx.hash });

        // Step 3: Upload data to Shelby RPC
        setState({ step: "uploading" });
        await shelbyClient.rpc.putBlob({
          account: account.address.toString(),
          blobName: uniqueBlobName,
          blobData: new Uint8Array(await file.arrayBuffer()),
        });

        const blobId = `${account.address.toString()}/${uniqueBlobName}`;
        setState({ step: "done", blobId });
        return blobId;
      } catch (err: any) {
        const errorMsg = err?.message || "Upload failed";
        setState({ step: "error", error: errorMsg });
        console.error("Shelby upload error:", err);
        return null;
      }
    },
    [account, signAndSubmitTransaction]
  );

  const reset = useCallback(() => {
    setState({ step: "idle" });
  }, []);

  return { upload, state, reset };
}

/**
 * Construct the download URL for a Shelby blob.
 */
export function getMediaUrl(blobId: string): string {
  return `${SHELBY_BLOB_BASE_URL}/${blobId}`;
}

/**
 * Determine media type from blob ID (file extension).
 */
export function getMediaType(blobId: string): "video" | "audio" | "image" | "unknown" {
  const lower = blobId.toLowerCase();
  if (lower.endsWith(".mp4") || lower.endsWith(".webm") || lower.endsWith(".mov")) return "video";
  if (lower.endsWith(".mp3") || lower.endsWith(".wav") || lower.endsWith(".ogg")) return "audio";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png") || lower.endsWith(".gif") || lower.endsWith(".webp")) return "image";
  return "unknown";
}