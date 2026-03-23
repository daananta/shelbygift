import { ShelbyClient } from "@shelby-protocol/sdk/browser";
import { Network } from "@aptos-labs/ts-sdk";
import { SHELBY_API_KEY, SHELBYNET_FULLNODE, SHELBYNET_INDEXER } from "@/constants";

console.log("SHELBY_API_KEY prefix:", SHELBY_API_KEY?.substring(0, 15));

let shelbyClient: ShelbyClient | null = null;

try {
  shelbyClient = new ShelbyClient({
    network: "shelbynet" as any, // Assuming ShelbyNetwork includes "shelbynet"
    apiKey: SHELBY_API_KEY || "placeholder",
    aptos: {
      network: Network.CUSTOM,
      fullnode: SHELBYNET_FULLNODE,
      indexer: SHELBYNET_INDEXER,
      clientConfig: {
        API_KEY: SHELBY_API_KEY || "placeholder",
      }
    },
    rpc: {
      baseUrl: "https://api.shelbynet.shelby.xyz/shelby"
    }
  });
} catch (err: any) {
  console.warn("Failed to create ShelbyClient:", err);
  console.error("ShelbyClient config error:", err.message);
}

export { shelbyClient };
