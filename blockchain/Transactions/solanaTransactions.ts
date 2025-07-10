import {
    Connection,
    Keypair,
    LAMPORTS_PER_SOL,
    PublicKey,
    SystemProgram,
    Transaction,
    sendAndConfirmTransaction
} from '@solana/web3.js';
import { SendTokensRequest, SendTokensResult, getPrivateKeyFromMnemonic } from './stellarTransactions';

/**
 * Send tokens on Solana network
 */
export async function sendSolanaTokens(
    request: SendTokensRequest,
    encryptionKey: Uint8Array,
    encryptedData: any
): Promise<SendTokensResult> {
    const { fromAddress, toAddress, amount, testnet = true } = request;

    try {
        // Get private key using Trust Wallet Core
        const privateKey = await getPrivateKeyFromMnemonic(encryptionKey, encryptedData, 'solana');

        // Initialize Solana connection
        const connection = new Connection(
            testnet
                ? 'https://api.devnet.solana.com'
                : 'https://api.mainnet-beta.solana.com',
            'confirmed'
        );

        // Create keypair from private key
        const privateKeyBytes = privateKey.data();
        const senderKeypair = Keypair.fromSecretKey(privateKeyBytes);

        // Verify the sender address matches
        if (senderKeypair.publicKey.toString() !== fromAddress) {
            throw new Error('Private key does not match sender address');
        }

        // Convert SOL amount to lamports (1 SOL = 1,000,000,000 lamports)
        const amountInLamports = Math.floor(parseFloat(amount) * LAMPORTS_PER_SOL);

        // Create recipient public key
        const recipientPublicKey = new PublicKey(toAddress);

        // Create transfer instruction
        const transferInstruction = SystemProgram.transfer({
            fromPubkey: senderKeypair.publicKey,
            toPubkey: recipientPublicKey,
            lamports: amountInLamports,
        });

        // Create transaction
        const transaction = new Transaction().add(transferInstruction);

        // Get recent blockhash
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = senderKeypair.publicKey;

        // Send and confirm transaction
        const signature = await sendAndConfirmTransaction(
            connection,
            transaction,
            [senderKeypair],
            {
                commitment: 'confirmed',
                maxRetries: 3,
            }
        );

        return {
            success: true,
            network: 'solana',
            transactionId: signature,
            amount,
            fromAddress,
            toAddress
        };

    } catch (error) {
        console.error('Solana transaction failed:', error);
        return {
            success: false,
            network: 'solana',
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}
