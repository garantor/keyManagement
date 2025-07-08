import { arrayBufferToBase64, base64ToArrayBuffer, base64ToUint8Array } from "@/utils";



export async function encryptData(
    secretKey: ArrayBuffer | Uint8Array, // this is the key derived from the user's passkey assertion
    plaintext: string // the data to encrypt
): Promise<{ ciphertext: string; iv: string }> {
    // Input validation
    if (!plaintext || plaintext.trim().length === 0) {
        throw new Error('Data to encrypt cannot be empty');
    }

    if (!secretKey || (secretKey instanceof ArrayBuffer && secretKey.byteLength === 0) ||
        (secretKey instanceof Uint8Array && secretKey.length === 0)) {
        throw new Error('Encryption key cannot be empty');
    }

    try {
        const initializationVector = window.crypto.getRandomValues(new Uint8Array(12));
        const cryptoKey = await window.crypto.subtle.importKey(
            "raw",
            secretKey,
            { name: "AES-GCM" },
            false,
            ["encrypt"]
        );

        const encryptedBuffer = await window.crypto.subtle.encrypt(
            { name: "AES-GCM", iv: initializationVector },
            cryptoKey,
            new TextEncoder().encode(plaintext)
        );

        const encryptionResult = {
            ciphertext: arrayBufferToBase64(encryptedBuffer),
            iv: arrayBufferToBase64(initializationVector.buffer)
        };

        return encryptionResult;
    } catch (error) {
        throw new Error('Encryption failed');
    }
}

export async function decryptData(
    ciphertextBase64: string,
    ivBase64: string,
    secretKey: ArrayBuffer | Uint8Array
): Promise<string> {
    // Input validation
    if (!ciphertextBase64 || !ivBase64 || !secretKey) {
        throw new Error('Missing required parameters for decryption');
    }

    if (typeof ciphertextBase64 !== 'string' || typeof ivBase64 !== 'string') {
        throw new Error('Ciphertext and IV must be base64 strings');
    }

    if (secretKey instanceof ArrayBuffer && secretKey.byteLength === 0 ||
        secretKey instanceof Uint8Array && secretKey.length === 0) {
        throw new Error('Encryption key cannot be empty');
    }

    try {
        const encryptedBuffer = base64ToArrayBuffer(ciphertextBase64);
        const initializationVector = base64ToUint8Array(ivBase64);

        if (initializationVector.length !== 12) {
            throw new Error('Invalid IV length for AES-GCM');
        }

        const cryptoKey = await window.crypto.subtle.importKey(
            "raw",
            secretKey,
            { name: "AES-GCM" },
            false,
            ["decrypt"]
        );

        const decryptedBuffer = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv: initializationVector },
            cryptoKey,
            encryptedBuffer
        );

        const plaintext = new TextDecoder().decode(decryptedBuffer);
        return plaintext;
    } catch (error) {
        throw new Error('Decryption failed');
    }
}