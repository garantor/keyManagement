import { Connection, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { Horizon } from '@stellar/stellar-sdk';
import { createPublicClient, formatEther, getAddress, http } from 'viem';
import { arbitrum, bsc, mainnet, polygon, sepolia } from 'viem/chains';
import { Client as XrplClient } from 'xrpl';

// Types for balance responses
export interface WalletBalance {
    network: string;
    address: string;
    balance: string;
    symbol: string;
    error?: string;
}

export interface BalanceResult {
    success: boolean;
    balances: WalletBalance[];
    errors: string[];
}

// Network configurations
const NETWORK_CONFIGS = {
    stellar: {
        horizon: 'https://horizon.stellar.org',
        testnet: 'https://horizon-testnet.stellar.org'
    },
    xrpl: {
        mainnet: 'wss://xrplcluster.com',
        testnet: 'wss://s.altnet.rippletest.net:51233'
    },
    solana: {
        mainnet: 'https://api.mainnet-beta.solana.com',
        devnet: 'https://api.devnet.solana.com'
    },
    evm: {
        ethereum: { chain: sepolia, rpc: 'https://gateway.tenderly.co/public/sepolia' },
      
    }
};

/**
 * Get Stellar wallet balance
 */
export async function getStellarBalance(
    address: string,
    testnet: boolean = false
): Promise<WalletBalance> {
    try {
        const horizonUrl = testnet ? NETWORK_CONFIGS.stellar.testnet : NETWORK_CONFIGS.stellar.horizon;
        const server = new Horizon.Server(horizonUrl);

        const account = await server.loadAccount(address);
        const xlmBalance = account.balances.find((balance: any) => balance.asset_type === 'native');

        return {
            network: testnet ? 'stellar-testnet' : 'stellar',
            address,
            balance: xlmBalance?.balance || '0',
            symbol: 'XLM'
        };
    } catch (error) {
        return {
            network: testnet ? 'stellar-testnet' : 'stellar',
            address,
            balance: '0',
            symbol: 'XLM',
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Get XRPL wallet balance
 */
export async function getXrplBalance(
    address: string,
    testnet: boolean = false
): Promise<WalletBalance> {
    let client: XrplClient | null = null;

    try {
        const serverUrl = testnet ? NETWORK_CONFIGS.xrpl.testnet : NETWORK_CONFIGS.xrpl.mainnet;
        client = new XrplClient(serverUrl);

        await client.connect();

        const response = await client.request({
            command: 'account_info',
            account: address,
            ledger_index: 'validated'
        });

        const balanceInDrops = response.result.account_data.Balance;
        const balanceInXrp = (parseInt(balanceInDrops) / 1000000).toString();

        return {
            network: testnet ? 'xrpl-testnet' : 'xrpl',
            address,
            balance: balanceInXrp,
            symbol: 'XRP'
        };
    } catch (error) {
        return {
            network: testnet ? 'xrpl-testnet' : 'xrpl',
            address,
            balance: '0',
            symbol: 'XRP',
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    } finally {
        if (client?.isConnected()) {
            await client.disconnect();
        }
    }
}

/**
 * Get EVM wallet balance for multiple chains
 */
export async function getEvmBalances(address: string): Promise<WalletBalance[]> {
    const balances: WalletBalance[] = [];

    for (const [networkName, config] of Object.entries(NETWORK_CONFIGS.evm)) {
        try {
            const client = createPublicClient({
                chain: config.chain,
                transport: http(config.rpc)
            });

            const checksumAddress = getAddress(address);
            const balance = await client.getBalance({ address: checksumAddress });
            console.log(`Balance for ${networkName}:`, balance);
            const balanceInEth = formatEther(balance);
            console.log(`Formatted balance for ${networkName}:`, balanceInEth);

            balances.push({
                network: networkName,
                address: checksumAddress,
                balance: balanceInEth,
                symbol: config.chain.nativeCurrency.symbol
            });
        } catch (error) {
            balances.push({
                network: networkName,
                address,
                balance: '0',
                symbol: NETWORK_CONFIGS.evm[networkName as keyof typeof NETWORK_CONFIGS.evm].chain.nativeCurrency.symbol,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    return balances;
}

/**
 * Get Solana wallet balance
 */
export async function getSolanaBalance(
    address: string,
    devnet: boolean = false
): Promise<WalletBalance> {
    try {
        const rpcUrl = devnet ? NETWORK_CONFIGS.solana.devnet : NETWORK_CONFIGS.solana.mainnet;
        const connection = new Connection(rpcUrl, 'confirmed');

        const publicKey = new PublicKey(address);
        const balance = await connection.getBalance(publicKey);
        const balanceInSol = (balance / LAMPORTS_PER_SOL).toString();

        return {
            network: devnet ? 'solana-devnet' : 'solana',
            address,
            balance: balanceInSol,
            symbol: 'SOL'
        };
    } catch (error) {
        return {
            network: devnet ? 'solana-devnet' : 'solana',
            address,
            balance: '0',
            symbol: 'SOL',
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Get all wallet balances across multiple networks
 */
export async function getAllWalletBalances(walletAddresses: {
    stellar?: string;
    xrpl?: string;
    evm?: string;
    solana?: string;
}, testnet: boolean = false): Promise<BalanceResult> {
    const balances: WalletBalance[] = [];
    const errors: string[] = [];

    try {
        // Fetch all balances in parallel
        const promises: Promise<WalletBalance | WalletBalance[]>[] = [];

        if (walletAddresses.stellar) {
            promises.push(getStellarBalance(walletAddresses.stellar, testnet));
        }

        if (walletAddresses.xrpl) {
            promises.push(getXrplBalance(walletAddresses.xrpl, testnet));
        }

        if (walletAddresses.evm) {
            promises.push(getEvmBalances(walletAddresses.evm));
        }

        if (walletAddresses.solana) {
            promises.push(getSolanaBalance(walletAddresses.solana, testnet));
        }

        const results = await Promise.allSettled(promises);

        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                const value = result.value;
                if (Array.isArray(value)) {
                    balances.push(...value);
                } else {
                    balances.push(value);
                }
            } else {
                errors.push(`Failed to fetch balance: ${result.reason}`);
            }
        });

        return {
            success: errors.length === 0,
            balances,
            errors
        };
    } catch (error) {
        return {
            success: false,
            balances,
            errors: [error instanceof Error ? error.message : 'Unknown error occurred']
        };
    }
}

/**
 * Get balance for a single network and address
 */
export async function getSingleNetworkBalance(
    network: 'stellar' | 'xrpl' | 'solana',
    address: string,
    testnet: boolean = false
): Promise<WalletBalance> {
    switch (network) {
        case 'stellar':
            return getStellarBalance(address, testnet);
        case 'xrpl':
            return getXrplBalance(address, testnet);
        case 'solana':
            return getSolanaBalance(address, testnet);
        default:
            throw new Error(`Unsupported network: ${network}`);
    }
}

/**
 * Format balance for display with proper decimal places
 */
export function formatBalance(balance: string, decimals: number = 6): string {
    const num = parseFloat(balance);
    if (isNaN(num)) return '0';

    if (num === 0) return '0';
    if (num < 0.000001) return '< 0.000001';

    return num.toFixed(decimals).replace(/\.?0+$/, '');
}
