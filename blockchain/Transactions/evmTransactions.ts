import {
    createPublicClient,
    createWalletClient,
    http,
    parseEther
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import {
    arbitrum,
    arbitrumSepolia,
    bsc,
    bscTestnet,
    mainnet,
    polygon,
    polygonMumbai,
    sepolia
} from 'viem/chains';
import { getPrivateKeyFromMnemonic, SendTokensRequest, SendTokensResult } from './stellarTransactions';
import { Buffer } from 'buffer';

/**
 * Get chain configuration for EVM networks
 */
function getChainConfig(network: string, testnet: boolean) {
    switch (network.toLowerCase()) {
        case 'ethereum':
            return {
                chain: testnet ? sepolia : mainnet,
                rpcUrl: testnet
                    ? 'https://eth-sepolia.g.alchemy.com/v2/demo'
                    : 'https://eth-mainnet.g.alchemy.com/v2/demo'
            };
        case 'polygon':
            return {
                chain: testnet ? polygonMumbai : polygon,
                rpcUrl: testnet
                    ? 'https://polygon-mumbai.g.alchemy.com/v2/demo'
                    : 'https://polygon-mainnet.g.alchemy.com/v2/demo'
            };
        case 'bsc':
            return {
                chain: testnet ? bscTestnet : bsc,
                rpcUrl: testnet
                    ? 'https://data-seed-prebsc-1-s1.binance.org:8545'
                    : 'https://bsc-dataseed1.binance.org'
            };
        case 'arbitrum':
            return {
                chain: testnet ? arbitrumSepolia : arbitrum,
                rpcUrl: testnet
                    ? 'https://arb-sepolia.g.alchemy.com/v2/demo'
                    : 'https://arb-mainnet.g.alchemy.com/v2/demo'
            };
        default:
            throw new Error(`Unsupported EVM network: ${network}`);
    }
}

/**
 * Send tokens on EVM networks (Ethereum, Polygon, BSC, Arbitrum)
 */
export async function sendEVMTokens(
    request: SendTokensRequest,
    encryptionKey: Uint8Array,
    encryptedData: any
): Promise<SendTokensResult> {
    const { network, fromAddress, toAddress, amount, testnet = true } = request;

    try {
        // Get private key using Trust Wallet Core
        const privateKey = await getPrivateKeyFromMnemonic(encryptionKey, encryptedData, 'ethereum');

        // Get chain configuration
        const { chain, rpcUrl } = getChainConfig(network, testnet);

        // Convert private key to hex string
        const privateKeyHex = `0x${Buffer.from(privateKey.data()).toString('hex')}` as `0x${string}`;

        // Create account from private key
        const account = privateKeyToAccount(privateKeyHex);

        // Verify the sender address matches
        if (account.address.toLowerCase() !== fromAddress.toLowerCase()) {
            throw new Error('Private key does not match sender address');
        }

        // Create clients
        const publicClient = createPublicClient({
            chain,
            transport: http(rpcUrl),
        });

        const walletClient = createWalletClient({
            account,
            chain,
            transport: http(rpcUrl),
        });

        // Convert amount to wei
        const amountInWei = parseEther(amount);

        // Get current nonce
        const nonce = await publicClient.getTransactionCount({
            address: account.address,
        });

        // Estimate gas
        const gasEstimate = await publicClient.estimateGas({
            account: account.address,
            to: toAddress as `0x${string}`,
            value: amountInWei,
        });

        // Get gas price
        const gasPrice = await publicClient.getGasPrice();

        // Send transaction
        const hash = await walletClient.sendTransaction({
            account,
            to: toAddress as `0x${string}`,
            value: amountInWei,
            gas: gasEstimate,
            gasPrice: gasPrice,
            nonce: nonce,
        });

        // Wait for transaction confirmation
        const receipt = await publicClient.waitForTransactionReceipt({
            hash: hash,
            confirmations: 1,
        });

        if (receipt.status === 'success') {
            return {
                success: true,
                network,
                transactionId: hash,
                amount,
                fromAddress,
                toAddress
            };
        } else {
            throw new Error('Transaction failed');
        }

    } catch (error) {
        console.error(`${network} transaction failed:`, error);
        return {
            success: false,
            network,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}
