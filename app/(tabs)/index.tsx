import { Image } from 'expo-image';
import {  StyleSheet } from 'react-native';

import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import React, { useState } from 'react';
import { Button, Spinner } from '@ui-kitten/components';
import { GetUserPasskeyAssertion, RegisterNewPasskeyWithPRF } from '@/passkeys';
import { decryptBlockchainKey, encryptBlockchainKey } from '@/utils';





export default function HomeScreen() {


  const [blockchainKey, setBlockchainKey] = useState<any | null>(null);
  const [userAssertion, setUserAssertion] = useState<any>(null);
  const [userEncryptedKey, setUserEncryptedKey] = useState<any>(null);
  const [credential, setCredential] = useState<any>(null);
  const [registrationLoading, setRegistrationLoading] = useState(false);
  const [disableComponent, setDisableComponent] = useState(false);
  const [decryptingLoading, setDecryptingLoading] = useState(false);
  const [backendSalt, setBackendSalt] = useState<string>('Domain-specific-Salt'); // This should be a unique salt for your application



  async function handleUserReg() {
    setDisableComponent(true);
    setRegistrationLoading(true);

    try {
      // Step 1: Register user with passkey
      let cred = await RegisterNewPasskeyWithPRF();
      setCredential(cred);
      console.log('User registered with passkey:', cred);

      // Step 2: Get user assertion with PRF
      let assertion = await GetUserPasskeyAssertion(backendSalt); // this will require the user to authenticate with their passkey
      setUserAssertion(assertion); // the beauty of PRF is you don't have to store the key, you can always derive it from the assertion
      console.log('User assertion with PRF:  set .....', assertion);

      // Step 3: if PRF does not exist throw and error, else Encrypt blockchain key with PRF-derived key
      if (assertion) {
        let userData = 'Super Secret Blockchain Key';
        console.log('Encrypting blockchain key with PRF-derived key...');
        const encryptedStrings = await encryptBlockchainKey(assertion, userData);
        console.log('Encrypted blockchain key:', encryptedStrings);
        setBlockchainKey(encryptedStrings);
        window.alert('Blockchain key encrypted successfully!',);
      }


    } catch (error: any) {
      console.error('Error during user registration:', error);
      window.alert('Error during user registration: ' + error.message);
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
      let decryptKeyAssertion = await GetUserPasskeyAssertion(backendSalt);

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
      <ThemedView level='1' style={{ flex: 1, gap: 20 }}>
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
              <ThemedText style={{ color: 'white' }}>Register User with Passkey</ThemedText>

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
