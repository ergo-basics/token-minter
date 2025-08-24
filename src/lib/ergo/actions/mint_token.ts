import {
    OutputBuilder,
    SAFE_MIN_BOX_VALUE,
    RECOMMENDED_MIN_FEE_VALUE,
    TransactionBuilder,
    type InputBox
} from '@fleet-sdk/core';

/**
 * Crea una transacción para acuñar un nuevo token de Ergo.
 * @param tokenName - El nombre del token.
 * @param amount - La cantidad total de tokens a acuñar.
 * @param decimals - El número de decimales que tendrá el token.
 * @param description - Una breve descripción del token.
 * @returns El ID de la transacción enviada o null si falla.
 */
export async function mint_token(
    tokenName: string,
    amount: bigint,
    decimals: number,
    description: string
): Promise<string | null> {

    console.log("Iniciando el proceso de acuñación de token con los siguientes detalles:", {
        tokenName,
        amount: amount.toString(),
        decimals,
        description
    });

    try {
        // --- 1. Preparación de datos y dirección ---
        const changeAddress = await ergo.get_change_address();
        if (!changeAddress) {
            throw new Error("No se pudo obtener la dirección de cambio del monedero.");
        }

        const inputs: InputBox[] = await ergo.get_utxos();
        if (!inputs || inputs.length === 0) {
            throw new Error("No se encontraron UTXOs en el monedero para la transacción.");
        }

        const creationHeight = await ergo.get_current_height();

        // --- 2. Construcción de la caja de salida para la acuñación ---
        // La primera caja de entrada (inputs[0]) se convierte en el emisor del token.
        // Su ID se usará para generar el ID del nuevo token.
        const tokenOutput = new OutputBuilder(
            SAFE_MIN_BOX_VALUE,
            changeAddress
        ).mintToken({
            name: tokenName,
            amount: amount,
            decimals: decimals,
            description: description
        });

        // --- 3. Construcción y envío de la transacción ---
        const unsignedTransaction = new TransactionBuilder(creationHeight)
            .from(inputs)
            .to(tokenOutput)
            .sendChangeTo(changeAddress)
            .payFee(RECOMMENDED_MIN_FEE_VALUE)
            .build();
        
        console.log("Transacción sin firmar creada:", unsignedTransaction.toEIP12Object());

        const signedTransaction = await ergo.sign_tx(unsignedTransaction.toEIP12Object());
        console.log("Transacción firmada con éxito.");

        const transactionId = await ergo.submit_tx(signedTransaction);
        console.log(`Transacción de acuñación enviada con éxito. ID: ${transactionId}`);
        
        return transactionId;

    } catch (error) {
        console.error("Error durante el proceso de acuñación del token:", error);
        // Dependiendo de cómo quieras manejar los errores, podrías lanzar el error
        // o devolver null para indicar que la operación falló.
        return null;
    }
}
