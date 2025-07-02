import StellarHDWallet from 'stellar-hd-wallet';
import { Wallet } from 'xrpl'; // Assuming you have xrpl installed for XRPL wallet generation
import { Keypair } from "@solana/web3.js";
import * as bip39 from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import * as StellarSdk from '@stellar/stellar-sdk';
import { HDKey } from '@scure/bip32';
import { mnemonicToAccount } from 'viem/accounts'



export function GenerateBlockchainKeyFromMnemonic(mnemonic: string){
    console.log('bip generation ', mnemonic);
    let validation = bip39.validateMnemonic(mnemonic, wordlist);
    console.log('Mnemonic validation result:', validation);

    if (!validation) {
        console.error('Invalid mnemonic');
        return null;
    }
    // console.log('Generating blockchain keys from mnemonic:', mnemonic);
   
    // //===========================================================
    const seed = bip39.mnemonicToSeedSync(mnemonic, "");
    const hdkey = HDKey.fromMasterSeed(seed);
    const stellarPath = "m/44'/148'/0'"; // Stellar's BIP44 path
    const stellarDerived = hdkey.derive(stellarPath);
    const stellarKeypair = StellarSdk.Keypair.fromRawEd25519Seed(stellarDerived.privateKey!);
    const stellarPublicKey = stellarKeypair.publicKey();
    console.log('Stellar Public Key:', stellarPublicKey);

    // // ===================================================
    let xrplWallet = Wallet.fromMnemonic(mnemonic);
    let xrplPublicKey = xrplWallet.address;
    console.log('XRPL Public Key:', xrplPublicKey);

    // // ===================================================
    const seedSolana = bip39.mnemonicToSeedSync(mnemonic, "");
    const solanaKeyPair = Keypair.fromSeed(seedSolana.subarray(0, 32));
    const solanaPublicKey = solanaKeyPair.publicKey.toBase58();
    console.log('Solana Public Key:', solanaPublicKey);

    // // =============================================================

    let evmKeyPair = mnemonicToAccount(mnemonic);
    console.log('EVM Public Key:', evmKeyPair.address);
    const evmPublicKey = evmKeyPair.address;


    return {
        stellar: stellarPublicKey,
        xrpl : xrplPublicKey,
        solana: solanaPublicKey,
        evm: evmPublicKey,
    }; // Replace with actual key generation logic
    
}