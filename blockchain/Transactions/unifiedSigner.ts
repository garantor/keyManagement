import { initWasm, TW } from '@trustwallet/wallet-core';
import { SendTokensRequest, SendTokensResult, getPrivateKeyFromMnemonic } from './stellarTransactions';
import { Networks } from '@stellar/stellar-sdk';

export interface NetworkConfig {
    coinType: any;
    testnetRpc?: string;
    mainnetRpc?: string;
    nativeDecimals: number;
    feeAmount: number;
}

export interface SignedTransaction {
    network: string;
    signedData: Uint8Array;
    txHash?: string;
}

export interface TransactionInput {
    fromAddress: string;
    toAddress: string;
    amount: string;
    sequence?: number;
    fee?: number;
    additionalParams?: any;
}

const NETWORK_CONFIGS: Record<string, NetworkConfig> = {
    stellar: {
        coinType: 'stellar',
        testnetRpc: 'https://horizon-testnet.stellar.org',
        mainnetRpc: 'https://horizon.stellar.org',
        nativeDecimals: 7,
        feeAmount: 1000
    },
    xrpl: {
        coinType: 'xrp',
        testnetRpc: 'wss://s.devnet.rippletest.net',
        mainnetRpc: 'wss://xrplcluster.com',
        nativeDecimals: 6,
        feeAmount: 12
    },
    solana: {
        coinType: 'solana',
        testnetRpc: 'https://api.testnet.solana.com',
        mainnetRpc: 'https://api.mainnet-beta.solana.com',
        nativeDecimals: 9,
        feeAmount: 5000
    },
    ethereum: {
        coinType: 'ethereum',
        testnetRpc: 'https://goerli.infura.io/v3/YOUR_KEY',
        mainnetRpc: 'https://mainnet.infura.io/v3/YOUR_KEY',
        nativeDecimals: 18,
        feeAmount: 21000
    }
};

function getAmountInBaseUnits(amount: string, decimals: number): string {
    return (parseFloat(amount) * Math.pow(10, decimals)).toString();
}

function getNetworkConfig(network: string): NetworkConfig {
    const config = NETWORK_CONFIGS[network];
    if (!config) throw new Error(`Unsupported network: ${network}`);
    return config;
}

export class UnifiedTransactionSigner {
    private static async createSigningInput(
        network: string,
        input: TransactionInput,
        privateKey: any,
        testnet: boolean = true
    ): Promise<Uint8Array> {
        const config = getNetworkConfig(network);
        const amount = getAmountInBaseUnits(input.amount, config.nativeDecimals);

        const builders: Record<string, () => Uint8Array> = {
            stellar: () => TW.Stellar.Proto.SigningInput.encode(
                TW.Stellar.Proto.SigningInput.create({
                    account: input.fromAddress,
                    fee: input.fee || config.feeAmount,
                    sequence: input.sequence || 1,
                    privateKey: privateKey.data(),
                    passphrase: testnet ? Networks.TESTNET : Networks.PUBLIC,
                    opPayment: TW.Stellar.Proto.OperationPayment.create({
                        destination: input.toAddress,
                        asset: null,
                        amount
                    })
                })
            ).finish(),

            xrpl: () => TW.Ripple.Proto.SigningInput.encode(
                TW.Ripple.Proto.SigningInput.create({
                    account: input.fromAddress,
                    fee: input.fee || config.feeAmount,
                    sequence: input.sequence || 1,
                    lastLedgerSequence: input.additionalParams?.lastLedgerSequence,
                    privateKey: privateKey.data(),
                    opPayment: TW.Ripple.Proto.OperationPayment.create({
                        destination: input.toAddress,
                        amount: parseInt(amount)
                    })
                })
            ).finish(),

            solana: () => TW.Solana.Proto.SigningInput.encode(
                TW.Solana.Proto.SigningInput.create({
                    privateKey: privateKey.data(),
                    recentBlockhash: input.additionalParams?.recentBlockhash || '',
                    transferTransaction: TW.Solana.Proto.Transfer.create({
                        recipient: input.toAddress,
                        value: parseInt(amount)
                    })
                })
            ).finish()
        };

        if (!(network in builders)) throw new Error(`Signing not implemented for ${network}`);
        return builders[network]();
    }

    public static async signTransaction(
        network: string,
        input: TransactionInput,
        privateKey: any,
        testnet: boolean = true
    ): Promise<SignedTransaction> {
        const config = getNetworkConfig(network);
        const { AnySigner } = await initWasm();
        const signingInput = await this.createSigningInput(network, input, privateKey, testnet);
        const signedOutput = AnySigner.sign(signingInput, config.coinType);

        return { network, signedData: signedOutput };
    }

    private static readonly decoders: Record<string, (data: Uint8Array) => any> = {
        stellar: TW.Stellar.Proto.SigningOutput.decode,
        xrpl: TW.Ripple.Proto.SigningOutput.decode,
        solana: TW.Solana.Proto.SigningOutput.decode
    };

    public static decodeSignedTransaction(network: string, signedData: Uint8Array): any {
        const decoder = this.decoders[network];
        if (!decoder) throw new Error(`Decoding not implemented for ${network}`);
        return decoder(signedData);
    }
}

export class UnifiedTransactionSubmitter {
    public static async submitTransaction(
        network: string,
        signedTransaction: SignedTransaction,
        testnet: boolean = true
    ): Promise<{ txHash: string | undefined ; success: boolean; error?: string }> {
        try {
            switch (network) {
                case 'stellar':
                    return await this.submitStellarTransaction(signedTransaction, testnet);
                case 'xrpl':
                    return await this.submitXRPLTransaction(signedTransaction, testnet);
                case 'solana':
                    return await this.submitSolanaTransaction(signedTransaction, testnet);
                default:
                    throw new Error(`Submission not implemented for ${network}`);
            }
        } catch (error) {
            return {
                txHash: '',
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    private static async submitStellarTransaction(signedTransaction: SignedTransaction, testnet: boolean) {
        const { Horizon, Networks, TransactionBuilder } = await import('@stellar/stellar-sdk');
        const server = new Horizon.Server(testnet ? NETWORK_CONFIGS.stellar.testnetRpc! : NETWORK_CONFIGS.stellar.mainnetRpc!);
        const networkPassphrase = testnet ? Networks.TESTNET : Networks.PUBLIC;
        const decoded = UnifiedTransactionSigner.decodeSignedTransaction('stellar', signedTransaction.signedData);
        const transaction = TransactionBuilder.fromXDR(decoded.signature, networkPassphrase);
        const result = await server.submitTransaction(transaction);
        return { txHash: result.hash, success: true };
    }

    private static async submitXRPLTransaction(signedTransaction: SignedTransaction, testnet: boolean) {
        const { Client } = await import('xrpl');
        const { Buffer } = await import('buffer');
        const client = new Client(testnet ? NETWORK_CONFIGS.xrpl.testnetRpc! : NETWORK_CONFIGS.xrpl.mainnetRpc!);
        await client.connect();

        try {
            const decoded = UnifiedTransactionSigner.decodeSignedTransaction('xrpl', signedTransaction.signedData);
            const txBlob = Buffer.from(decoded.encoded).toString('hex').toUpperCase();
            const submitResponse = await client.request({ command: 'submit', tx_blob: txBlob });

            if (submitResponse.result.engine_result === 'tesSUCCESS') {
                return { txHash: submitResponse.result.tx_json.hash, success: true };
            } else {
                throw new Error(`Transaction failed: ${submitResponse.result.engine_result}`);
            }
        } finally {
            await client.disconnect();
        }
    }

    private static async submitSolanaTransaction(signedTransaction: SignedTransaction, testnet: boolean): Promise<{ txHash: string; success: boolean }> {
        throw new Error('Solana submission not yet implemented');
    }
}

export async function sendTokensUnified(
    request: SendTokensRequest,
    encryptionKey: Uint8Array,
    encryptedData: any
): Promise<SendTokensResult> {
    try {
        const privateKey = await getPrivateKeyFromMnemonic(encryptionKey, encryptedData, request.network);
        const additionalParams = await getNetworkSpecificData(request);

        const transactionInput: TransactionInput = {
            fromAddress: request.fromAddress,
            toAddress: request.toAddress,
            amount: request.amount,
            ...additionalParams
        };

        const signedTransaction = await UnifiedTransactionSigner.signTransaction(
            request.network,
            transactionInput,
            privateKey,
            request.testnet
        );

        const result = await UnifiedTransactionSubmitter.submitTransaction(
            request.network,
            signedTransaction,
            request.testnet
        );

        return {
            success: result.success,
            network: request.network,
            transactionId: result.txHash,
            amount: request.amount,
            fromAddress: request.fromAddress,
            toAddress: request.toAddress,
            error: result.error
        };
    } catch (error) {
        return {
            success: false,
            network: request.network,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

async function getNetworkSpecificData(request: SendTokensRequest): Promise<any> {
    switch (request.network) {
        case 'stellar': {
            const { Horizon } = await import('@stellar/stellar-sdk');
            const server = new Horizon.Server(request.testnet ? NETWORK_CONFIGS.stellar.testnetRpc! : NETWORK_CONFIGS.stellar.mainnetRpc!);
            const account = await server.loadAccount(request.fromAddress);
            return { sequence: parseInt(account.sequence) + 1 };
        }
        case 'xrpl': {
            const { Client } = await import('xrpl');
            const client = new Client(request.testnet ? NETWORK_CONFIGS.xrpl.testnetRpc! : NETWORK_CONFIGS.xrpl.mainnetRpc!);
            await client.connect();
            try {
                const [accountInfo, ledgerInfo] = await Promise.all([
                    client.request({ command: 'account_info', account: request.fromAddress, ledger_index: 'validated' }),
                    client.request({ command: 'ledger', ledger_index: 'validated' })
                ]);
                return {
                    sequence: accountInfo.result.account_data.Sequence,
                    lastLedgerSequence: ledgerInfo.result.ledger_index + 4
                };
            } finally {
                await client.disconnect();
            }
        }
        default:
            return {};
    }
}
