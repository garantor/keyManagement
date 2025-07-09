import { Client, Wallet, xrpToDrops } from 'xrpl';

import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { NETWORK_CONFIGS } from "./utils";

/**
 * Fund testnet wallets with native tokens
 */
export interface FundingResult {
    success: boolean;
    network: string;
    address: string;
    amount?: string;
    transactionId?: string;
    error?: string;
}

/**
 * Fund XRP testnet wallet
 */

export async function fundXrpTestnet(destinationAddress: string): Promise<FundingResult> {
    const WS_URL = 'wss://s.devnet.rippletest.net:51233'
    try {
        // 1. Get a new funded account from the faucet
 

        let client = new Client(WS_URL);
        await client.connect();

    

        const faucetResult = (await client.fundWallet()).wallet;
        console.log(`Faucet funded account: ${faucetResult}`);
        const senderAddress = faucetResult.address;
        const senderSecret = faucetResult.seed as string;

        const wallet = Wallet.fromSeed(senderSecret);
        console.log(`Sender Address: ${senderAddress}`);

        // 3. Prepare and submit payment
        const payment = {
            TransactionType: 'Payment',
            Account: senderAddress,
            Destination: destinationAddress,
            Amount: xrpToDrops('80'), // 1000 XRP
        };

        const prepared = await client.autofill(payment);
        const signed = wallet.sign(prepared);
        const tx = await client.submitAndWait(signed.tx_blob);

        await client.disconnect();

        return {
            success: true,
            network: 'xrpl-testnet',
            address: destinationAddress,
            amount: '1000 XRP',
            transactionId: tx.result.hash
        };
    } catch (error) {
        return {
            success: false,
            network: 'xrpl-testnet',
            address: destinationAddress,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Fund Stellar testnet wallet
 */
export async function fundStellarTestnet(address: string): Promise<FundingResult> {
    try {
        const response = await fetch(`https://friendbot.stellar.org?addr=${encodeURIComponent(address)}`, {
            method: 'GET'
        });

        if (!response.ok) {
            throw new Error(`Friendbot request failed: ${response.statusText}`);
        }

        const result = await response.json();

        return {
            success: true,
            network: 'stellar-testnet',
            address,
            amount: '10000 XLM',
            transactionId: result.hash
        };
    } catch (error) {
        return {
            success: false,
            network: 'stellar-testnet',
            address,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Fund Solana devnet wallet
 */
export async function fundSolanaDevnet(address: string): Promise<FundingResult> {
    try {
        const connection = new Connection(NETWORK_CONFIGS.solana.devnet, 'confirmed');
        const publicKey = new PublicKey(address);

        const signature = await connection.requestAirdrop(publicKey, 2 * LAMPORTS_PER_SOL);
        await connection.confirmTransaction(signature, 'confirmed');

        return {
            success: true,
            network: 'solana-devnet',
            address,
            amount: '2 SOL',
            transactionId: signature
        };
    } catch (error) {
        return {
            success: false,
            network: 'solana-devnet',
            address,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Fund Ethereum Sepolia testnet wallet
 */
export async function fundEthereumSepolia(address: string): Promise<FundingResult> {
    try {
        // Using Alchemy's Sepolia faucet
        const response = await fetch('https://sepoliafaucet.com/api/faucet', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                address: address,
                tier: 1
            })
        });

        if (!response.ok) {
            throw new Error(`Faucet request failed: ${response.statusText}`);
        }

        const result = await response.json();

        return {
            success: true,
            network: 'ethereum-sepolia',
            address,
            amount: '0.1 ETH',
            transactionId: result.hash
        };
    } catch (error) {
        // Fallback message with manual faucet links
        return {
            success: false,
            network: 'ethereum-sepolia',
            address,
            error: `Automated funding failed. Please use manual faucets: https://sepoliafaucet.com/ or https://faucets.chain.link/sepolia`
        };
    }
}

/**
 * Fund multiple testnet wallets
 */
export async function fundTestnetWallets(walletAddresses: {
    stellar?: string;
    xrpl?: string;
    solana?: string;
    evm?: string;
}): Promise<FundingResult[]> {
    const results: FundingResult[] = [];
    const promises: Promise<FundingResult>[] = [];

    if (walletAddresses.stellar) {
        promises.push(fundStellarTestnet(walletAddresses.stellar));
    }

    if (walletAddresses.xrpl) {
        promises.push(fundXrpTestnet(walletAddresses.xrpl));
    }

    if (walletAddresses.solana) {
        promises.push(fundSolanaDevnet(walletAddresses.solana));
    }

    if (walletAddresses.evm) {
        promises.push(fundEthereumSepolia(walletAddresses.evm));
    }

    const fundingResults = await Promise.allSettled(promises);

    fundingResults.forEach((result) => {
        if (result.status === 'fulfilled') {
            results.push(result.value);
        } else {
            results.push({
                success: false,
                network: 'unknown',
                address: 'unknown',
                error: `Promise rejected: ${result.reason}`
            });
        }
    });

    return results;
}

/**
 * Get funding status and check if wallet needs funding
 */
// export async function checkFundingNeeded(
//     network: 'stellar' | 'xrpl' | 'solana' | 'ethereum',
//     address: string
// ): Promise<{ needsFunding: boolean; currentBalance: string; minimumBalance: string }> {
//     const minimumBalances = {
//         stellar: '1',
//         xrpl: '10',
//         solana: '0.1',
//         ethereum: '0.01'
//     };

//     let currentBalance = '0';

//     try {
//         switch (network) {
//             case 'stellar':
//                 const stellarBalance = await getStellarBalance(address, true);
//                 currentBalance = stellarBalance.balance;
//                 break;
//             case 'xrpl':
//                 const xrplBalance = await getXrplBalance(address, true);
//                 currentBalance = xrplBalance.balance;
//                 break;
//             case 'solana':
//                 const solanaBalance = await getSolanaBalance(address, true);
//                 currentBalance = solanaBalance.balance;
//                 break;
//             case 'ethereum':
//                 const evmBalances = await getEvmBalances(address);
//                 const sepolia = evmBalances.find(b => b.network === 'ethereum');
//                 currentBalance = sepolia?.balance || '0';
//                 break;
//         }
//     } catch (error) {
//         // If we can't fetch balance, assume funding is needed
//         return {
//             needsFunding: true,
//             currentBalance: '0',
//             minimumBalance: minimumBalances[network]
//         };
//     }

//     const current = parseFloat(currentBalance);
//     const minimum = parseFloat(minimumBalances[network]);

//     return {
//         needsFunding: current < minimum,
//         currentBalance,
//         minimumBalance: minimumBalances[network]
//     };
// }

// ...existing code...