
import * as bip39 from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';





export function GenerateWalletMnemonic() {
    try {
        const mnemonic = bip39.generateMnemonic(wordlist);
        // console.log('Generated Mnemonic:', mnemonic);
        return mnemonic;
    } catch (error) {
        console.error('Error generating mnemonic:', error);
        throw error;
    }
}



