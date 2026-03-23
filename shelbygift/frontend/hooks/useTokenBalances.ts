import { useState, useCallback, useEffect } from "react";
import { aptosClient } from "@/utils/aptosClient";

export interface TokenBalance {
  coinType?: string; // used if it's a legacy coin
  metadataAddress: string;
  amount: number;
  symbol: string;
  name: string;
  decimals: number;
  iconUri: string;
}

export function useTokenBalances(accountAddress: string | undefined) {
  const [tokens, setTokens] = useState<TokenBalance[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTokens = useCallback(async () => {
    if (!accountAddress) return;
    setLoading(true);
    
    try {
      // Dùng Indexer API để tìm toàn bộ FAs và chuẩn Coin cũ trong ví
      const coinsData = await aptosClient().getAccountCoinsData({ accountAddress });
      console.log("[useTokenBalances] Indexer trả về:", coinsData.length, "tokens");
      
      const foundTokens: TokenBalance[] = [];

      for (const coin of coinsData) {
        if (!coin.amount || coin.amount === 0) continue;
        
        const assetType = coin.asset_type;
        let metadataAddress = assetType;

        // Nếu là Legacy Coin (VD: 0x1::aptos_coin::AptosCoin), phải tìm paired FA
        if (assetType.includes("::")) {
          try {
            const pairedFaRes = await aptosClient().view({
              payload: {
                function: "0x1::coin::paired_metadata",
                typeArguments: [assetType],
                functionArguments: [],
              }
            });
            const opt = pairedFaRes[0] as any;
            if (opt?.vec?.[0]?.inner) {
              metadataAddress = opt.vec[0].inner;
            }
          } catch (e) {
            console.warn("[useTokenBalances] Không tìm thấy paired FA cho:", assetType);
          }
        }

        foundTokens.push({
          coinType: assetType,
          metadataAddress,
          amount: Number(coin.amount),
          symbol: coin.metadata?.symbol || "Unknown",
          name: coin.metadata?.name || "Unknown Token",
          decimals: coin.metadata?.decimals || 0,
          iconUri: (coin.metadata as any)?.icon_uri || (coin.metadata as any)?.token_uri || "https://raw.githubusercontent.com/aptos-labs/explorer/main/public/favicon.ico",
        });
      }

      setTokens(foundTokens);
    } catch (err) {
      console.error("[useTokenBalances] Fetch tokens error (Indexer):", err);
    }
    
    setLoading(false);
  }, [accountAddress]);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  return { tokens, loading, refetch: fetchTokens };
}
