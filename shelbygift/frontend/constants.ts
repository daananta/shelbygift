import { Network } from "@aptos-labs/ts-sdk";

export const NETWORK = Network.CUSTOM;
export const APTOS_API_KEY = import.meta.env.VITE_APTOS_API_KEY;

// Contract
export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS ?? "";
export const FA_METADATA_ADDRESS = import.meta.env.VITE_FA_METADATA_ADDRESS ?? "";

// Shelby
export const SHELBY_API_KEY = import.meta.env.VITE_SHELBY_API_KEY ?? "";
export const SHELBY_BLOB_BASE_URL = "https://api.shelbynet.shelby.xyz/shelby/v1/blobs";

// Aptos shelbynet endpoints
export const SHELBYNET_FULLNODE = "https://api.shelbynet.shelby.xyz/v1";
export const SHELBYNET_INDEXER = "https://api.shelbynet.shelby.xyz/v1/graphql";
