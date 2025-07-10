import { Client, xrpToDrops } from 'xrpl';
import { SendTokensRequest, SendTokensResult, getPrivateKeyFromMnemonic } from './stellarTransactions';
import { initWasm, TW } from '@trustwallet/wallet-core';
import { Buffer } from 'buffer';

/**
 * Send tokens on XRPL network using Trust Wallet Core
 */
export async function sendXRPLTokens(
    request: SendTokensRequest,
    encryptionKey: Uint8Array,
    encryptedData: any
): Promise<SendTokensResult> {
    const { fromAddress, toAddress, amount, testnet = true } = request;

    try {
        // Get private key using Trust Wallet Core
        const privateKey = await getPrivateKeyFromMnemonic(encryptionKey, encryptedData, 'xrpl');

        // Initialize XRPL client to get account info
        const client = new Client(testnet ? 'wss://s.devnet.rippletest.net' : 'wss://xrplcluster.com');
        await client.connect();

        console.log('Connected to XRPL client', client.isConnected(), { fromAddress, toAddress, amount, testnet });
        try {
            // Get account info to retrieve sequence number
            const accountInfo = await client.request({
                command: 'account_info',
                account: fromAddress,
                ledger_index: 'validated'
            });

            // Get current ledger info
            const ledgerInfo = await client.request({
                command: 'ledger',
                ledger_index: 'validated'
            });

            const sequence = accountInfo.result.account_data.Sequence;
            const currentLedger = ledgerInfo.result.ledger_index;

            console.log('Account sequence:', sequence);
            console.log('Current ledger:', currentLedger);

            // Convert XRP amount to drops (1 XRP = 1,000,000 drops)
            const amountInDrops = xrpToDrops(amount);

            // Initialize Trust Wallet Core
            const { CoinType, AnySigner } = await initWasm();

            // Create XRPL signing input using Trust Wallet Core
            const signingInput = TW.Ripple.Proto.SigningInput.create({
                account: fromAddress,
                fee: 12, // Standard fee in drops
                sequence: sequence,
                lastLedgerSequence: currentLedger + 4, // Add 4 ledgers buffer (about 20 seconds)
                privateKey: privateKey.data(),
                opPayment: TW.Ripple.Proto.OperationPayment.create({
                    destination: toAddress,
                    amount: parseInt(amountInDrops)
                })
            });

            // Encode the signing input
            const encoded = TW.Ripple.Proto.SigningInput.encode(signingInput).finish();

            // Sign transaction with Trust Wallet Core
            const signedOutput = AnySigner.sign(encoded, CoinType.xrp);
            const signedDecoded = TW.Ripple.Proto.SigningOutput.decode(signedOutput);

            const txBlob = Buffer.from(signedDecoded.encoded).toString('hex').toUpperCase();

            console.log('Signed transaction blob:', txBlob);

            // Submit the signed transaction
            const submitResponse = await client.request({
                command: 'submit',
                tx_blob: txBlob
            });


            // console.log('Signed transaction blob:', signedDecoded.tx_blob());

            // // // Submit the signed transaction
            // const submitResponse = await client.request({
            //     command: 'submit',
            //     tx_blob: signedDecoded.encoded
            // });

            console.log('Submit response:', submitResponse);

            if (submitResponse.result.engine_result === 'tesSUCCESS') {
                // Wait for validation
                const txHash = submitResponse.result.tx_json.hash;

                // Poll for transaction validation
                let validated = false;
                let attempts = 0;
                const maxAttempts = 10;

                while (!validated && attempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

                    try {
                        const txResponse = await client.request({
                            command: 'tx',
                            transaction: txHash
                        });

                        if (txResponse.result.validated) {
                            validated = true;
                            console.log('Transaction validated:', txHash);
                        }
                    } catch (error) {
                        // Transaction might not be found yet
                        console.log('Transaction not found yet, retrying...');
                    }

                    attempts++;
                }

                return {
                    success: true,
                    network: 'xrpl',
                    transactionId: txHash,
                    amount,
                    fromAddress,
                    toAddress
                };
            } else {
                throw new Error(`Transaction failed: ${submitResponse.result.engine_result_message || submitResponse.result.engine_result}`);
            }

        } finally {
            await client.disconnect();
        }

    } catch (error) {
        console.error('XRPL transaction failed:', error);
        return {
            success: false,
            network: 'xrpl',
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}