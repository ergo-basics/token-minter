import {
    OutputBuilder,
    SAFE_MIN_BOX_VALUE,
    RECOMMENDED_MIN_FEE_VALUE,
    TransactionBuilder,
    type InputBox
} from '@fleet-sdk/core';

// Ensure the global 'ergo' variable (from the wallet connector) is available.
declare var ergo: any;

/**
 * Creates a transaction to mint a new Ergo token with improved debugging logs.
 * @param tokenName - The name of the token.
 * @param amount - The total amount of tokens to mint.
 * @param decimals - The number of decimals the token will have.
 * @param description - A brief description of the token.
 * @returns The ID of the submitted transaction or null if it fails.
 */
export async function mint_token(
    tokenName: string,
    amount: bigint,
    decimals: number,
    description: string
): Promise<string | null> {

    console.log("🚀 Starting the token minting process with the following details:", {
        tokenName,
        amount: amount.toString(),
        decimals,
        description
    });

    try {
        // --- 1. Data and address preparation ---
        console.log("Step 1: Getting wallet data...");
        
        const changeAddress = await ergo.get_change_address();
        if (!changeAddress) {
            throw new Error("Could not get the change address from the wallet.");
        }
        console.log(`Change address obtained: ${changeAddress}`);

        const creationHeight = await ergo.get_current_height();
        console.log(`Current blockchain height: ${creationHeight}`);

        const inputs: InputBox[] = await ergo.get_utxos();
        if (!inputs || inputs.length === 0) {
            throw new Error("No UTXOs found in the wallet for the transaction.");
        }
        // NEW LOG: Shows how many input boxes were found and their total value.
        const totalInputValue = inputs.reduce((sum, box) => sum + BigInt(box.value), 0n);
        console.log(`Found ${inputs.length} UTXOs with a total value of ${totalInputValue} nanoERGs.`);
        console.log("Selected UTXOs (inputs):", inputs);

        // --- 2. Building the output box for minting ---
        console.log("Step 2: Building the output box for the new token...");

        const tokenOutput = new OutputBuilder(
            SAFE_MIN_BOX_VALUE, // The box containing the new token must have at least this value in ERG.
            changeAddress
        ).mintToken({
            name: tokenName,
            amount: amount,      // The total amount to mint
            decimals: decimals,
            description: description
        });
        
        console.log("Minting output box successfully built.");

        // --- 3. Building and sending the transaction ---
        console.log("Step 3: Building the unsigned transaction...");
        const unsignedTransaction = new TransactionBuilder(creationHeight)
            .from(inputs)
            .to(tokenOutput)
            .sendChangeTo(changeAddress)
            .payFee(RECOMMENDED_MIN_FEE_VALUE)
            .build();
        
        // NEW LOG: Shows the Fleet-SDK transaction object before converting it to EIP-12.
        console.log("Unsigned transaction object (Fleet SDK):", unsignedTransaction);
        
        const txToSign = unsignedTransaction.toEIP12Object();
        console.log("Unsigned transaction (EIP-12 format) ready to be signed:", txToSign);

        console.log("Step 4: Requesting signature from the wallet...");
        const signedTransaction = await ergo.sign_tx(txToSign);
        console.log("Transaction successfully signed:", signedTransaction);

        console.log("Step 5: Submitting transaction to the network...");
        const transactionId = await ergo.submit_tx(signedTransaction);
        console.log(`✅ Minting transaction successfully submitted! ID: ${transactionId}`);
        
        return transactionId;

    } catch (error) {
        // NEW LOG: Shows the error in more detail.
        console.error("❌ Error during the token minting process.");
        if (error instanceof Error) {
            console.error(`Message: ${error.message}`);
            console.error(`Stack: ${error.stack}`);
        }
        console.error("Full error object:", error);
        
        return null;
    }
}