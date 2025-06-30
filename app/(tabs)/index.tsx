import { Image } from 'expo-image';
import {  Platform, StyleSheet } from 'react-native';

import { HelloWave } from '@/components/HelloWave';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import React, { useState } from 'react';
import {Button, Spinner} from '@ui-kitten/components';




async function getUserAssertion() {
  console.log('PRF coming ........')
  const credentialRequestOptions: any = {
    challenge: Uint8Array.from(window.crypto.getRandomValues(new Uint8Array(32))),
    timeout: 60000,
    rpId: "localhost",
    userVerification: "required",
    allowCredentials: [/* Registered credential IDs */],
    extensions: {
      prf: {
        eval: {
          first: new TextEncoder().encode("key-derivation-context"), // Any domain-specific salt
        },
      },
    },
  };

  console.log('Credential request options:', credentialRequestOptions);
  const assertion: any = await navigator.credentials.get({ publicKey: credentialRequestOptions });
  console.log('Assertion received:', assertion);
  const prfOutput = assertion?.getClientExtensionResults?.().prf?.results?.first;
  console.log('PRF output:', prfOutput);
  if(!prfOutput) {
    throw new Error('PRF output is missing');
  }

  return prfOutput;
}

async function RegPasskey() {
  // Frontend: navigator.credentials.create()
  console.log('Creating passkey credential...');
  const publicKey:any = {
    challenge: Uint8Array.from(window.crypto.getRandomValues(new Uint8Array(32))),
    rp: { name: "My App", id: "localhost" },
    user: {
      id: new TextEncoder().encode("user-id"),
      name: "user-888888888888",
      displayName: "User Name",
    },
    pubKeyCredParams: [{ type: "public-key", alg: -7 }], // ES256
    authenticatorSelection: {
      userVerification: "required",
      residentKey: "required",
    },
    extensions: {
      prf: { eval: { first: new Uint8Array(32) } }, // placeholder for PRF support
    },
    timeout: 60000,
    attestation: "none",
  };

  console.log('Public key options:', publicKey);
  const credential = await navigator.credentials.create({ publicKey });
  console.log('Credential created:', credential);

  return credential;
  // Send credential to your server for registration

}


// Encrypt blockchain private key with PRF-derived key (AES-GCM)
async function encryptBlockchainKey(prfKey:any) {
  const plaintextPrivateKey = "your-blockchain-private-key"; // Replace with actual private key
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
    new TextEncoder().encode(plaintextPrivateKey)
  );

  return { ciphertext, iv };
}

async function decryptBlockchainKey(ciphertext:any, iv:any, prfKey:any) {
  console.log('Decrypting blockchain key with PRF-derived key...', prfKey);
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
  let decryptedKey = new TextDecoder().decode(decrypted);
  console.log('Decrypted blockchain private key:', decryptedKey);
  return decryptedKey;
}



export default function HomeScreen() {
  const [prfKey, setPrfKey] = useState<Uint8Array | null>(null);


  const [blockchainKey, setBlockchainKey] = useState<any | null>(null);
  const [userAssertion, setUserAssertion] = useState<any>(null);
  const [userEncryptedKey, setUserEncryptedKey] = useState<any>(null);
  const [credential, setCredential] = useState<any>(null);
  const [registrationLoading, setRegistrationLoading] = useState(false);
  const [disableComponent, setDisableComponent] = useState(false);
  const [decryptingLoading, setDecryptingLoading] = useState(false);



  async function handleUserReg() {
    setDisableComponent(true);
    setRegistrationLoading(true);

    try {
      // Step 1: Register user with passkey
     let cred = await RegPasskey();
     setCredential(cred);
      console.log('User registered with passkey:', cred);

      // Step 2: Get user assertion with PRF
      let assertion = await getUserAssertion();
      setUserAssertion(assertion);
      console.log('User assertion with PRF:  set .....', assertion);

      // Step 3: Encrypt blockchain key with PRF-derived key
      if (assertion) {
        console.log('Encrypting blockchain key with PRF-derived key...');
        const { ciphertext, iv } = await encryptBlockchainKey(assertion);
        console.log('Encrypted blockchain key:', ciphertext);
        setBlockchainKey({
          ciphertext: ciphertext,
          iv: iv,
        });
        window.alert('Blockchain key encrypted successfully!');
      }

  
    } catch (error) {
      console.error('Error during user registration:', error);
    }

    setDisableComponent(false);
    setRegistrationLoading(false);
    
  }

  async function handleDecryptBlockchainKey() {
    setDisableComponent(true);
    setDecryptingLoading(true);
    try {
      if (!blockchainKey) {
        throw new Error('Blockchain key or PRF key is missing');
      }

      // Step 2: Get assertion to decrypt user key
      let decryptKeyAssertion = await getUserAssertion();
     
      console.log('User assertion with PRF:  set .....', decryptKeyAssertion);

      const decryptedKey = await decryptBlockchainKey(
        blockchainKey.ciphertext,
        blockchainKey.iv,
        decryptKeyAssertion
      );
      console.log('Decrypted blockchain key:', decryptedKey);
      setUserEncryptedKey(decryptedKey);
      window.alert('Blockchain key decrypt successfully! Decrypted key: ' + decryptedKey);

    } catch (error) {
      console.error('Error decrypting blockchain key:', error);
    }
  }

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />

      }>
      <ThemedView level='1' style={{ flex: 1, gap:20}}>
        <Button
        // disabled={registrationLoading}

          onPress={async () => {
            await handleUserReg();
          }}
          >
            {
            registrationLoading ?
            (
                <Spinner
                  status='basic'
                  size='giant'
                  // style={{marginRight: 10, marginLeft: 10, flex:1}}
                  
                />
            ) :
            <ThemedText style={{color: 'white'}}>Register User with Passkey</ThemedText>

          }
         
          </Button>



<Button
          onPress={async () => {
            await handleDecryptBlockchainKey();
          }}
        >
          Decrypt Blockchain Key with PRF
        </Button>


      </ThemedView>
      
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
});
