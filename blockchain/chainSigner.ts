import { GenerateBlockchainKeyFromMnemonic, ChainType } from "./chains";
import { mnemonicToAccount } from 'viem/accounts';
import { createWalletClient, http } from 'viem';
import { mainnet } from 'viem/chains';
import { Wallet } from 'xrpl';
import { Keypair, Connection } from '@solana/web3.js';
import * as StellarSdk from '@stellar/stellar-sdk';

export interface SimpleTransactionParams {
    mnemonic: string;
    chain: ChainType;
    to: string;
    amount: string;
    rpcUrl?: string;
}

export class SimpleTransactionSigner {

    // EVM chains (Ethereum, Polygon, etc.)
    static async sendEVM(params: SimpleTransactionParams): Promise<string> {
        const account = mnemonicToAccount(params.mnemonic);
        const client = createWalletClient({
            account,
            chain: mainnet,
            transport: http(params.rpcUrl || 'evm RPC URL')
        });

        const hash = await client.sendTransaction({
            to: params.to as `0x${string}`,
            value: BigInt(params.amount)
        });

        return hash;
    }

    // XRPL
    static async sendXRPL(params: SimpleTransactionParams): Promise<string> {
        const wallet = Wallet.fromMnemonic(params.mnemonic);
        const client = new (await import('xrpl')).Client(params.rpcUrl || 'wss://testnet.xrpl-labs.com/');

        await client.connect();

        const payment = {
            TransactionType: 'Payment',
            Account: wallet.address,
            Destination: params.to,
            Amount: params.amount
        };

        const response = await client.submitAndWait(payment, { wallet });
        await client.disconnect();

        return response.result.hash;
    }

    // Solana
    static async sendSolana(params: SimpleTransactionParams): Promise<string> {
        const keys = GenerateBlockchainKeyFromMnemonic(params.mnemonic, 'solana') as any;
        const keypair = Keypair.fromSecretKey(Buffer.from(keys.privateKey, 'hex'));
        const connection = new Connection(params.rpcUrl || 'https://api.testnet.solana.com');

        // Simple SOL transfer
        const { SystemProgram, PublicKey } = await import('@solana/web3.js');
        const { Transaction } = await import('@solana/web3.js');

        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: keypair.publicKey,
                toPubkey: new PublicKey(params.to),
                lamports: parseInt(params.amount)
            })
        );

        const signature = await connection.sendTransaction(transaction, [keypair]);
        return signature;
    }

    // Stellar
    static async sendStellar(params: SimpleTransactionParams): Promise<string> {
        const keys = GenerateBlockchainKeyFromMnemonic(params.mnemonic, 'stellar') as any;
        console.log('Stellar keys:', keys);
        const keypair = StellarSdk.Keypair.fromSecret(keys.privateKey);

        const server = new StellarSdk.Horizon.Server(params.rpcUrl || 'https://horizon-testnet.stellar.org');
        const account = await server.loadAccount(keypair.publicKey());

        const transaction = new StellarSdk.TransactionBuilder(account, {
            fee: StellarSdk.BASE_FEE,
            networkPassphrase: StellarSdk.Networks.TESTNET
        })
            .addOperation(StellarSdk.Operation.payment({
                destination: params.to,
                asset: StellarSdk.Asset.native(),
                amount: params.amount
            }))
            .setTimeout(30)
            .build();

        transaction.sign(keypair);
        const result = await server.submitTransaction(transaction);
        return result.hash;
    }
}