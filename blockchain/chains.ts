import StellarHDWallet from 'stellar-hd-wallet';
import { Wallet } from 'xrpl'; // Assuming you have xrpl installed for XRPL wallet generation
import { Keypair } from "@solana/web3.js";
import * as bip39 from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import * as StellarSdk from '@stellar/stellar-sdk';
import { HDKey } from '@scure/bip32';
import { mnemonicToAccount } from 'viem/accounts'
import { Buffer } from 'buffer';



// export function GenerateBlockchainKeyFromMnemonic(mnemonic: string){
//     console.log('bip generation ', mnemonic);
//     let validation = bip39.validateMnemonic(mnemonic, wordlist);
//     console.log('Mnemonic validation result:', validation);

//     if (!validation) {
//         console.error('Invalid mnemonic');
//         return null;
//     }
//     // console.log('Generating blockchain keys from mnemonic:', mnemonic);
   
//     // //===========================================================
//     const seed = bip39.mnemonicToSeedSync(mnemonic, "");
//     const hdkey = HDKey.fromMasterSeed(seed);
//     const stellarPath = "m/44'/148'/0'"; // Stellar's BIP44 path
//     const stellarDerived = hdkey.derive(stellarPath);
//     const stellarKeypair = StellarSdk.Keypair.fromRawEd25519Seed(stellarDerived.privateKey!);
//     const stellarPublicKey = stellarKeypair.publicKey();
//     console.log('Stellar Public Key:', stellarPublicKey);

//     // // ===================================================
//     let xrplWallet = Wallet.fromMnemonic(mnemonic);
//     let xrplPublicKey = xrplWallet.address;
//     console.log('XRPL Public Key:', xrplPublicKey);

//     // // ===================================================
//     const seedSolana = bip39.mnemonicToSeedSync(mnemonic, "");
//     const solanaKeyPair = Keypair.fromSeed(seedSolana.subarray(0, 32));
//     const solanaPublicKey = solanaKeyPair.publicKey.toBase58();
//     console.log('Solana Public Key:', solanaPublicKey);

//     // // =============================================================

//     let evmKeyPair = mnemonicToAccount(mnemonic);
//     console.log('EVM Public Key:', evmKeyPair.address);
//     const evmPublicKey = evmKeyPair.address;


//     return {
//         stellar: stellarPublicKey,
//         xrpl : xrplPublicKey,
//         solana: solanaPublicKey,
//         evm: evmPublicKey,
//     }; // Replace with actual key generation logic
    
// }


export type ChainType = 'stellar' | 'xrpl' | 'solana' | 'evm';

export interface ChainKeys {
    publicKey: string;
    privateKey: string;
}

interface AllChainKeys {
    stellar: string;
    xrpl: string;
    solana: string;
    evm: string;
}

export function GenerateBlockchainKeyFromMnemonic(
    mnemonic: string,
    chain?: ChainType
): ChainKeys | AllChainKeys | null {
    console.log('bip generation ', mnemonic);
    let validation = bip39.validateMnemonic(mnemonic, wordlist);
    console.log('Mnemonic validation result:', validation);

    if (!validation) {
        console.error('Invalid mnemonic');
        return null;
    }

    const seed = bip39.mnemonicToSeedSync(mnemonic, "");

    // Generate Stellar keys
    const generateStellarKeys = () => {
        const hdkey = HDKey.fromMasterSeed(seed);
        const stellarPath = "m/44'/148'/0'";
        const stellarDerived = hdkey.derive(stellarPath);
        const stellarKeypair = StellarSdk.Keypair.fromRawEd25519Seed(stellarDerived.privateKey!);
        return {
            publicKey: stellarKeypair.publicKey(),
            privateKey: stellarKeypair.secret()
        };
    };

    // Generate XRPL keys
    const generateXrplKeys = () => {
        const xrplWallet = Wallet.fromMnemonic(mnemonic);
        return {
            publicKey: xrplWallet.address,
            privateKey: xrplWallet.privateKey.toString()
        };
    };

    // Generate Solana keys
    const generateSolanaKeys = () => {
        const solanaKeyPair = Keypair.fromSeed(seed.subarray(0, 32));
        return {
            publicKey: solanaKeyPair.publicKey,
            privateKey: Buffer.from(solanaKeyPair.secretKey).toString('hex')
        };
    };

    // Generate EVM keys
    const generateEvmKeys = () => {
        const evmKeyPair = mnemonicToAccount(mnemonic);

        console.log('EVM Public Key:', evmKeyPair);
        return {
            publicKey: evmKeyPair.address,
            privateKey: evmKeyPair.privateKey
        };
    };

    // If specific chain requested, return its keys
    if (chain) {
        let keys: ChainKeys;
        switch (chain) {
            case 'stellar':
                keys = generateStellarKeys();
                console.log('Stellar Public Key:', keys.publicKey);
                break;
            case 'xrpl':
                keys = generateXrplKeys();
                console.log('XRPL Public Key:', keys.publicKey);
                break;
            case 'solana':
                keys = generateSolanaKeys();
                console.log('Solana Public Key:', keys.publicKey);
                break;
            case 'evm':
                keys = generateEvmKeys();
                console.log('EVM Public Key:', keys.publicKey);
                break;
            default:
                throw new Error(`Unsupported chain: ${chain}`);
        }
        return keys;
    }

    // Otherwise, return all public keys
    const stellarKeys = generateStellarKeys();
    const xrplKeys = generateXrplKeys();
    const solanaKeys = generateSolanaKeys();
    const evmKeys = generateEvmKeys();

    console.log('Stellar Public Key:', stellarKeys.publicKey);
    console.log('XRPL Public Key:', xrplKeys.publicKey);
    console.log('Solana Public Key:', solanaKeys.publicKey);
    console.log('EVM Public Key:', evmKeys.publicKey);

    return {
        stellar: stellarKeys.publicKey,
        xrpl: xrplKeys.publicKey,
        solana: solanaKeys.publicKey,
        evm: evmKeys.publicKey,
    };
}

