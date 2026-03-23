const { Aptos, AptosConfig, Network } = require("@aptos-labs/ts-sdk");

async function main() {
    const config = new AptosConfig({ network: Network.CUSTOM, fullnode: "https://api.shelbynet.shelby.xyz/v1" });
    const aptos = new Aptos(config);
    
    // Just build a transaction payload to see how it validates
    try {
        const payload = await aptos.transaction.build.builder({
            sender: "0x123",
            data: {
                function: "0x5cea8ec952885dce79d7c5b1a1e3a912be7de2bbc61a04ab2502a369d8bcef01::lixi::create_envelope",
                functionArguments: [
                    "name", "message", "creator", 100, 10, "0x123", [], true, "blob_id",
                    undefined, undefined, undefined // trying undefined for Option
                ]
            }
        });
        console.log("Built successfully with undefined");
    } catch (e) {
        console.error("Failed with undefined:", e.message);
    }
}
main();
