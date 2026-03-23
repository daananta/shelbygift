import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import { SHELBYNET_FULLNODE, SHELBYNET_INDEXER } from "@/constants";

const aptos = new Aptos(
  new AptosConfig({
    network: Network.CUSTOM,
    fullnode: SHELBYNET_FULLNODE,
    indexer: SHELBYNET_INDEXER,
  })
);

// Reuse same Aptos instance to utilize cookie based sticky routing
export function aptosClient() {
  return aptos;
}
