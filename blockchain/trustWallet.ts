import { initWasm } from '@trustwallet/wallet-core';
import { Buffer } from 'buffer';
import { encryptData } from './dataEncryption';



// Define supported blockchain types
type SupportedBlockchain =
    | 'stellar'
    | 'xrpl'
    | 'solana'
    | 'evm'
    | 'tron'
    | 'bitcoin'
    | 'litecoin'
    | 'icp'
    | 'dogecoin'
    | 'dash'
    | 'bch'
    | 'algo'
    | 'aptos'
    | 'sui'
    | 'ton'
    | 'filecoin'
    | 'zcash'
    | 'near'
    | 'polkadot'
    | 'kusama'
    | 'cosmos'
    | 'tezos'
    | 'cardano';


/**
 * Generates a 24-word mnemonic phrase and encrypts it using Trust Wallet Core AES-CBC encryption.
 * Returns encrypted data as a hex-encoded string with IV prepended.
 * 
 * Format: [IV (16 bytes)][Encrypted Mnemonic (variable length)]
 * This format is compatible with Trust Wallet Core's decryption functions.
 * 
 * @param key - 16, 24, or 32 byte Uint8Array encryption key for AES encryption
 * @returns Promise<string> - Hex-encoded string containing IV + encrypted mnemonic
 * @throws Error if key validation fails or encryption process encounters issues
 * 
 * @example
 * ```typescript
 * const key = new Uint8Array(32); // 256-bit key
 * crypto.getRandomValues(key);
 * 
 * const encryptedMnemonic = await generateEncryptedHexMnemonic(key);
 * console.log('Encrypted mnemonic:', encryptedMnemonic);
 * ```
 */
export async function generateEncryptedHexMnemonic(key: Uint8Array): Promise<string> {
    try {
        // Initialize Trust Wallet SDK
        const { AES, HexCoding, AESPaddingMode, HDWallet } = await initWasm();

        let userMnemonic = HDWallet.create(256, '');
        let data = userMnemonic.mnemonic();
        console.log('Trust Wallet SDK initialized with mnemonic:', data);
        // Generate random IV for CBC mode
        const iv = window.crypto.getRandomValues(new Uint8Array(16));

        // Convert data to Uint8Array
        const plain = isHexString(data)
            ? Buffer.from(data, 'hex')
            : Buffer.from(data, 'utf8');

        // Encrypt - this only returns ciphertext
        const encrypted = AES.encryptCBC(key, plain, iv, AESPaddingMode.pkcs7);

        // Combine IV + ciphertext
        const combined = new Uint8Array(iv.length + encrypted.length);
        combined.set(iv, 0);           // First 16 bytes = IV
        combined.set(encrypted, 16);   // Remaining bytes = ciphertext

        return HexCoding.encode(combined);

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Encryption failed: ${message}`);
    }
}

/**
 * Checks if a string is a valid hex string
 * @param str - String to check
 * @returns boolean - True if valid hex string
 */
function isHexString(str: string): boolean {
    // Remove 0x prefix if present
    const cleanStr = str.startsWith('0x') ? str.slice(2) : str;
    return /^[0-9a-fA-F]+$/.test(cleanStr) && cleanStr.length % 2 === 0;
}



/**
 * Decrypts data using Trust Wallet Core AES-CBC decryption
 * @param key - 16, 24, or 32 byte Uint8Array decryption key
 * @param encryptedData - Hex-encoded encrypted data
 * @param outputFormat - 'hex' or 'utf8' for output format (default: 'utf8')
 * @returns Promise<string> - Decrypted data in specified format
 */
export async function decryptDataWithTrustWalletCore(
    key: Uint8Array,
    encryptedData: string,
    outputFormat: 'hex' | 'utf8' = 'utf8'
): Promise<string> {
    // Input validation
    if (!key || !(key instanceof Uint8Array)) {
        throw new Error(`Invalid key: must be Uint8Array, got ${typeof key}`);
    }

    if (![16, 24, 32].includes(key.length)) {
        throw new Error(`Invalid key length: ${key.length}. Must be 16, 24, or 32 bytes`);
    }

    if (!encryptedData || typeof encryptedData !== 'string') {
        throw new Error('Encrypted data must be a non-empty string');
    }

    if (!isHexString(encryptedData)) {
        throw new Error('Encrypted data must be a valid hex string');
    }

    try {
        // Initialize Trust Wallet SDK
        const { AES, HexCoding, AESPaddingMode } = await initWasm();

        // Remove 0x prefix if present before decoding
        const cleanHex = encryptedData.startsWith('0x') ? encryptedData.slice(2) : encryptedData;

        // Decode hex-encoded encrypted data
        const encryptedBytes = HexCoding.decode(cleanHex);

        // Extract IV (first 16 bytes) and ciphertext (remaining bytes)
        if (encryptedBytes.length < 16) {
            throw new Error('Invalid encrypted data: too short to contain IV');
        }

        const iv = encryptedBytes.slice(0, 16);
        const ciphertext = encryptedBytes.slice(16);

        // Decrypt the data
        const decrypted = AES.decryptCBC(key, ciphertext, iv, AESPaddingMode.pkcs7);

        // Return in requested format
        return outputFormat === 'hex'
            ? Buffer.from(decrypted).toString('hex')
            : Buffer.from(decrypted).toString('utf8');

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Decryption failed: ${message}`);
    }
}




/**
 * Generates a blockchain address from a mnemonic phrase for supported blockchains
 * @param mnemonic - BIP39 mnemonic phrase
 * @param blockchain - Supported blockchain identifier
 * @returns Promise<string> - Generated address for the specified blockchain
 * @throws Error if blockchain is unsupported or address generation fails
 */
export async function getSupportedBlockchainAddress(
    mnemonic: string,
    blockchain: SupportedBlockchain | 'all'
): Promise<string | Record<SupportedBlockchain, string>> {
    try {
        const { HDWallet, CoinType } = await initWasm();
        const wallet = HDWallet.createWithMnemonic(mnemonic, '');

        if (blockchain === 'all') {
            // Return all addresses
            const addresses: Record<SupportedBlockchain, string> = {
                stellar: wallet.getAddressForCoin(CoinType.stellar),
                xrpl: wallet.getAddressForCoin(CoinType.xrp),
                solana: wallet.getAddressForCoin(CoinType.solana),
                evm: wallet.getAddressForCoin(CoinType.ethereum),
                tron: wallet.getAddressForCoin(CoinType.tron),
                bitcoin: wallet.getAddressForCoin(CoinType.bitcoin),
                litecoin: wallet.getAddressForCoin(CoinType.litecoin),
                icp: wallet.getAddressForCoin(CoinType.internetComputer),
                dogecoin: wallet.getAddressForCoin(CoinType.dogecoin),
                dash: wallet.getAddressForCoin(CoinType.dash),
                bch: wallet.getAddressForCoin(CoinType.bitcoinCash),
                algo: wallet.getAddressForCoin(CoinType.algorand),
                aptos: wallet.getAddressForCoin(CoinType.aptos),
                sui: wallet.getAddressForCoin(CoinType.sui),
                ton: wallet.getAddressForCoin(CoinType.ton),
                filecoin: wallet.getAddressForCoin(CoinType.filecoin),
                zcash: wallet.getAddressForCoin(CoinType.zcash),
                near: wallet.getAddressForCoin(CoinType.near),
                polkadot: wallet.getAddressForCoin(CoinType.polkadot),
                kusama: wallet.getAddressForCoin(CoinType.kusama),
                cosmos: wallet.getAddressForCoin(CoinType.cosmos),
                tezos: wallet.getAddressForCoin(CoinType.tezos),
                cardano: wallet.getAddressForCoin(CoinType.cardano),

            };
            return addresses;
        }

        // Return single address
        switch (blockchain) {
            case 'stellar':
                return wallet.getAddressForCoin(CoinType.stellar);
            case 'xrpl':
                return wallet.getAddressForCoin(CoinType.xrp);
            case 'solana':
                return wallet.getAddressForCoin(CoinType.solana);
            case 'evm':
                return wallet.getAddressForCoin(CoinType.ethereum);
            case 'tron':
                return wallet.getAddressForCoin(CoinType.tron);
            case 'bitcoin':
                return wallet.getAddressForCoin(CoinType.bitcoin);
            case 'litecoin':
                return wallet.getAddressForCoin(CoinType.litecoin);
            case 'icp':
                return wallet.getAddressForCoin(CoinType.internetComputer);
            case 'dogecoin':
                return wallet.getAddressForCoin(CoinType.dogecoin);
            case 'dash':
                return wallet.getAddressForCoin(CoinType.dash);
            case 'bch':
                return wallet.getAddressForCoin(CoinType.bitcoinCash);
            case 'algo':
                return wallet.getAddressForCoin(CoinType.algorand);
            default:
                throw new Error(`Unsupported blockchain: ${blockchain}`);
        }
    } catch (error) {
        throw new Error(`Failed to get address for ${blockchain}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Generates addresses for all supported blockchains from a mnemonic phrase
 * @param mnemonic - BIP39 mnemonic phrase
 * @returns Promise<Record<SupportedBlockchain, string>> - Object with all blockchain addresses
 * @throws Error if address generation fails
 */
export async function getAllBlockchainAddresses(
    mnemonic: string
): Promise<Record<SupportedBlockchain, string>> {
    const result = await getSupportedBlockchainAddress(mnemonic, 'all');
    return result as Record<SupportedBlockchain, string>;
}