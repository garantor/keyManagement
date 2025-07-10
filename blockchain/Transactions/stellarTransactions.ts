import { Horizon, Networks, TransactionBuilder } from '@stellar/stellar-sdk';
import { initWasm, TW, } from '@trustwallet/wallet-core';
import { CoinType, PrivateKey } from '@trustwallet/wallet-core/dist/src/wallet-core';
import { decryptDataWithTrustWalletCore } from '../trustWallet';
import { sendEVMTokens } from './evmTransactions';
import { sendSolanaTokens } from './solanaTransactions';
import { sendXRPLTokens } from './xrplTransactions';

export interface SendTokensRequest {
    network: 'stellar' | 'xrpl' | 'solana' | 'ethereum' | 'polygon' | 'bsc' | 'arbitrum';
    fromAddress: string;
    toAddress: string;
    amount: string;
    testnet?: boolean;
}

export interface SendTokensResult {
    success: boolean;
    network: string;
    transactionId?: string;
    amount?: string;
    fromAddress?: string;
    toAddress?: string;
    error?: string;
}

/**
 * Get private key for blockchain from encrypted mnemonic using Trust Wallet Core
 */
export async function getPrivateKeyFromMnemonic(
    encryptionKey: Uint8Array,
    encryptedData: any,
    network: string
): Promise<PrivateKey> {
    console.log(`Deriving private key for network: ${network}`);
    try {
        // Decrypt the mnemonic
        const mnemonic = await decryptDataWithTrustWalletCore(encryptionKey, encryptedData, 'utf8');
        // const mnemonic = "index soul ceiling endless ankle claw monitor assault color message improve runway blouse wish inmate spatial sail night grit chronic assist remember fog wreck"; // Replace with actual decryption logic


        // Import Trust Wallet Core functions
        const { HDWallet, CoinType, PrivateKey, AnySigner } = await initWasm();
        const wallet = HDWallet.createWithMnemonic(mnemonic, '');


        console.log(`Deriving private key for network: ${network}`, wallet.getAddressForCoin(network.toLowerCase() as any));


        let coinType;
        switch (network.toLowerCase()) {
            case 'stellar':
                coinType = CoinType.stellar;
                break;
            case 'xrpl':
                coinType = CoinType.xrp;
                break;
            case 'solana':
                coinType = CoinType.solana;
                break;
            case 'ethereum':
            case 'polygon':
            case 'bsc':
            case 'arbitrum':
                coinType = CoinType.ethereum;
                break;
            default:
                throw new Error(`Unsupported network: ${network}`);
        }

        const privateKey = wallet.getKeyForCoin(coinType);
        return privateKey;
    } catch (error) {
        console.error(`Error deriving private key for ${network}:`, error);
        throw new Error(`Failed to derive private key: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}



/**
 * Send tokens on Stellar network
 */
export async function sendStellarTokens(
    request: SendTokensRequest,
    encryptionKey: Uint8Array,
    encryptedData: any
): Promise<SendTokensResult> {
    const { fromAddress, toAddress, amount, testnet = true } = request;

    try {
        // Get private key using Trust Wallet Core
        const privateKey = await getPrivateKeyFromMnemonic(encryptionKey, encryptedData, 'stellar');

        // Initialize Stellar server
        const serverUrl = testnet
            ? 'https://horizon-testnet.stellar.org'
            : 'https://horizon.stellar.org';
        const server = new Horizon.Server(serverUrl);
        const networkPassphrase = testnet ? Networks.TESTNET : Networks.PUBLIC;

        // Load account to get sequence number
        const sourceAccount = await server.loadAccount(fromAddress);
        console.log('Source account sequence:', sourceAccount);
        console.log('Source account balances:', parseInt(sourceAccount.sequence), sourceAccount.balances);

        // Convert amount to stroops (1 XLM = 10,000,000 stroops)
        const amountInStroops = (parseFloat(amount) * 10_000_000).toString();

        // Build transaction using Trust Wallet Core
        const {  CoinType, AnySigner } = await initWasm();


        // Create Stellar signing input
        const signingInput = TW.Stellar.Proto.SigningInput.create({

            account: fromAddress,
            fee: 1000, // Base reserve in stroops
            sequence: parseInt(sourceAccount.sequence) + 1, // Increment sequence number
            privateKey: privateKey.data(),

            passphrase: Networks.TESTNET,
            opPayment: TW.Stellar.Proto.OperationPayment.create({
                destination: toAddress,
                asset: null,
                amount: amountInStroops
            }),
        });
        let encoded = TW.Stellar.Proto.SigningInput.encode(signingInput).finish();

        // Sign transaction with Trust Wallet Core
        const signedOutput = AnySigner.sign(encoded, CoinType.stellar);
        console.log('Signed transaction:', signedOutput, signedOutput.toString());

        let signedDecoded = TW.Stellar.Proto.SigningOutput.decode(signedOutput);
        console.log('Decoded signed transaction:', signedDecoded);



        // Submit transaction to Horizon
        const transactionResult = await server.submitTransaction(
            TransactionBuilder.fromXDR(signedDecoded.signature, networkPassphrase)
        );

        return {
            success: true,
            network: 'stellar',
            transactionId: transactionResult.hash,
            amount,
            fromAddress,
            toAddress
        };

    } catch (error) {
        console.error('Stellar transaction failed:', error);
        return {
            success: false,
            network: 'stellar',
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}


/**
 * Main send tokens function that routes to appropriate network handler
 */
export async function sendTokens(
    request: SendTokensRequest,
    encryptionKey: Uint8Array,
    encryptedData: any
): Promise<SendTokensResult> {
    const { network } = request;

    try {
        switch (network.toLowerCase()) {
            case 'stellar':
                return await sendStellarTokens(request, encryptionKey, encryptedData);

            case 'solana':
                return await sendSolanaTokens(request, encryptionKey, encryptedData);

            case 'xrpl':
                return await sendXRPLTokens(request, encryptionKey, encryptedData);

            case 'ethereum':
            case 'polygon':
            case 'bsc':
            case 'arbitrum':
                return await sendEVMTokens(request, encryptionKey, encryptedData);

            default:
                throw new Error(`Unsupported network: ${network}`);
        }
    } catch (error) {
        console.error(`Send tokens failed for ${network}:`, error);
        return {
            success: false,
            network,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}