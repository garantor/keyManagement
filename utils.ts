
// =========================================================
//  utility functions for encryption and decryption to base64 string
// =========================================================
function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}
function base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

function base64ToUint8Array(base64: string): Uint8Array {
    return new Uint8Array(base64ToArrayBuffer(base64));
}
// =========================================================



export async function encryptBlockchainKey(prfKey: any, dataToEncrypt: string) {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const key = await window.crypto.subtle.importKey(
        "raw",
        prfKey,
        { name: "AES-GCM" },
        false,
        ["encrypt"]
    );

    const ciphertext = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        key,
        new TextEncoder().encode(dataToEncrypt)
    );

    let encryptedData = {
        ciphertext: arrayBufferToBase64(ciphertext),
        iv: arrayBufferToBase64(iv.buffer)
    }

    console.log('Encrypted blockchain private key:', encryptedData);

    return encryptedData;
}



export async function decryptBlockchainKey(
    ciphertextBase64: string,
    ivBase64: string,
    prfKey: ArrayBuffer | Uint8Array
): Promise<string> {
    console.log('Decrypting blockchain key with PRF-derived key...', prfKey);

    // Decode base64 to ArrayBuffer / Uint8Array
    const ciphertext = base64ToArrayBuffer(ciphertextBase64);
    const iv = base64ToUint8Array(ivBase64);

    const key = await window.crypto.subtle.importKey(
        "raw",
        prfKey,
        { name: "AES-GCM" },
        false,
        ["decrypt"]
    );

    const decrypted = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        key,
        ciphertext
    );

    const decryptedKey = new TextDecoder().decode(decrypted);
    console.log('Decrypted blockchain private key:', decryptedKey);
    return decryptedKey;
}