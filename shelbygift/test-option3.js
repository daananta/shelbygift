const { Aptos, AptosConfig, Network } = require("@aptos-labs/ts-sdk");

async function main() {
    const config = new AptosConfig({ network: Network.CUSTOM, fullnode: "https://api.shelbynet.shelby.xyz/v1" });
    const aptos = new Aptos(config);
    
    const address = "0x5cea8ec952885dce79d7c5b1a1e3a912be7de2bbc61a04ab2502a369d8bcef01";
    const sender = "0x5cea8ec952885dce79d7c5b1a1e3a912be7de2bbc61a04ab2502a369d8bcef01";
    
    // Test with undefined
    try {
        const payload1 = await aptos.transaction.build.simple({
            sender,
            data: {
                function: `${address}::lixi::create_envelope`,
                functionArguments: [
                    "name", "message", "creator", 100, 10, sender, [], true, "blob_id",
                    undefined, undefined, undefined
                ]
            }
        });
        console.log("Built successfully with undefined");
    } catch (e) {
        console.error("Failed with undefined:", e.message);
    }

    // Test with array
    try {
        const payload2 = await aptos.transaction.build.simple({
            sender,
            data: {
                function: `${address}::lixi::create_envelope`,
                functionArguments: [
                    "name", "message", "creator", 100, 10, sender, [], true, "blob_id",
                    [], [], []
                ]
            }
        });
        console.log("Built successfully with [] array");
    } catch (e) {
        console.error("Failed with [] array:", e.message);
    }
}
main();
