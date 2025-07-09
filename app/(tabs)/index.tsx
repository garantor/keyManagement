import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';

import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import React, { useEffect, useState } from 'react';
import { Button, Spinner } from '@ui-kitten/components';
import { GetUserPasskeyAssertion, RegisterNewPasskeyWithPRF } from '@/passkeys';
import { decryptData, encryptData } from '@/blockchain/dataEncryption';
import storage, { getItem, setItem } from '@/storage';
import { decryptDataWithTrustWalletCore, generateEncryptedHexMnemonic, getSupportedBlockchainAddress } from '@/blockchain/trustWallet'; // Ensure this is the correct import path for your Trust Wallet SDK initialization
// Add these imports at the top
import { FlatList, ActivityIndicator, Alert } from 'react-native';
import { fundTestnetWallets, FundingResult } from '@/blockchain/fundingWallet';





export default function HomeScreen() {


  const [blockchainKey, setBlockchainKey] = useState<any | null>(null);
  const [userAssertion, setUserAssertion] = useState<any>(null);
  const [userEncryptedKey, setUserEncryptedKey] = useState<any>(null);
  const [credential, setCredential] = useState<any>(null);
  const [registrationLoading, setRegistrationLoading] = useState(false);
  const [disableComponent, setDisableComponent] = useState(false);
  const [decryptingLoading, setDecryptingLoading] = useState(false);
  const [backendSalt, setBackendSalt] = useState<string>('Domain-specific-Salt'); // This should be a unique salt for your application
  const [isAUthenticated, setIsAuthenticated] = useState(false);
  const [allowLogin, setAllowLogin] = useState(false);

  const [userAddresses, setUserAddresses] = useState<Record<string, string> | null>(null);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [passkeyRegistered, setPasskeyRegistered] = useState(false);
  const [blockchainRegistered, setBlockchainRegistered] = useState(false);
  const [fundingLoading, setFundingLoading] = useState<Record<string, boolean>>({});

  // Add this function to load addresses when authenticated
  const loadUserAddresses = async (PRF?: any) => {
    console.log('Loading user addresses with PRF:', PRF);
    console.log('Blockchain Key:', blockchainKey, 'Type:', typeof blockchainKey, isAUthenticated);
    if (!isAUthenticated || !blockchainKey) return;

    setLoadingAddresses(true);
    try {
      let assertion;
      if (PRF) {
        assertion = PRF;
      } else {
        // If PRF is not provided, get user assertion with PRF
        assertion = await GetUserPasskeyAssertion(backendSalt);
      }

      console.log('Passed assertion check ...... :', assertion);
      if (assertion) {
        // Convert ArrayBuffer to Uint8Array
        let keyArray: Uint8Array;
        if (assertion instanceof ArrayBuffer) {
          keyArray = new Uint8Array(assertion);
        } else if (assertion instanceof Uint8Array) {
          keyArray = assertion;
        } else {
          throw new Error('Invalid PRF key format. Expected ArrayBuffer or Uint8Array.');
        }

        if (keyArray.length !== 32) {
          throw new Error(`Expected 32-byte key, got ${keyArray.length} bytes`);
        }

        // Get encrypted data from storage
        const userData: any = await storage.getItem('encryptionKey-trustwallet');
        console.log('User Data from storage:', userData);
        const userDataParsed = JSON.parse(userData || '{}');

        // Decrypt the mnemonic
        const decryptedMnemonic = await decryptDataWithTrustWalletCore(keyArray, userDataParsed, 'utf8');

        // Get all blockchain addresses
        const addressList = await getSupportedBlockchainAddress(decryptedMnemonic, 'all');
        console.log('Decrypted blockchain key:', decryptedMnemonic, addressList);
        setUserAddresses(addressList as Record<string, string>);
      }
    } catch (error) {
      console.error('Error loading addresses:', error);
    } finally {
      setLoadingAddresses(false);
    }
  };

  // Update your useEffect to load addresses when authenticated
  useEffect(() => {
    const checkAuth = async () => {
      let localStorageKey = await getItem('encryptionKey-trustwallet');
      console.log('Local Storage Key:', localStorageKey);
      if (localStorageKey) {
        setBlockchainKey(localStorageKey);
        setIsAuthenticated(true);
        setPasskeyRegistered(true);
        setBlockchainRegistered(true);
        setAllowLogin(true);
        console.log('Blockchain Key found in local storage:', localStorageKey);
        // Load addresses after authentication
        await loadUserAddresses();
      } else {
        console.log('No Blockchain Key found in local storage');
      }
    };
    checkAuth();
  }, []);
  async function handlePasskeyRegistration() {
    console.log('Starting passkey registration...');
    try {
      // Step 1: Register user with passkey
      let cred = await RegisterNewPasskeyWithPRF();
      setCredential(cred);
      console.log('User registered with passkey:', cred);
      setPasskeyRegistered(true);
      window.alert('Passkey registered successfully! Now you can create your blockchain wallet.');
    } catch (error: any) {
      console.error('Error during passkey registration:', error);
      window.alert('Error during passkey registration: ' + error.message);
    }
  }

  // Step 2: Generate blockchain wallet (separate from passkey registration)
  async function handleBlockchainRegistration() {
    console.log('Starting blockchain wallet creation...');
    try {
      // Get user assertion with PRF
      let assertion = await GetUserPasskeyAssertion(backendSalt);
      setUserAssertion(assertion);
      console.log('User assertion with PRF:', assertion);

      // Convert ArrayBuffer to Uint8Array
      if (assertion) {
        console.log('PRF Key:', assertion, 'Type:', typeof assertion, 'Length:', assertion?.byteLength);

        // Convert ArrayBuffer to Uint8Array
        let keyArray: Uint8Array;
        if (assertion instanceof ArrayBuffer) {
          keyArray = new Uint8Array(assertion);
        } else if (assertion instanceof Uint8Array) {
          keyArray = assertion;
        } else {
          throw new Error('Invalid PRF key format. Expected ArrayBuffer or Uint8Array.');
        }

        console.log('Converted Key:', keyArray, 'Type:', typeof keyArray, 'Length:', keyArray.length);

        if (keyArray.length !== 32) {
          throw new Error(`Expected 32-byte key, got ${keyArray.length} bytes`);
        }

        console.log('Generating and encrypting blockchain mnemonic...');
        const encryptedStrings = await generateEncryptedHexMnemonic(keyArray);
        console.log('Encrypted blockchain key:', encryptedStrings);

        await setItem('encryptionKey-trustwallet', JSON.stringify(encryptedStrings));

        // Update state
        setBlockchainKey(encryptedStrings);
        setBlockchainRegistered(true);
        setIsAuthenticated(true);
        setPasskeyRegistered(true);

        console.log('Blockchain wallet created and saved to local storage:', encryptedStrings);

        // Load addresses immediately with the current assertion
        setLoadingAddresses(true);
        try {
          // Decrypt the mnemonic directly here since we already have the key
          const decryptedMnemonic = await decryptDataWithTrustWalletCore(keyArray, encryptedStrings, 'utf8');
          const addressList = await getSupportedBlockchainAddress(decryptedMnemonic, 'all');
          console.log('Addresses loaded successfully:', addressList);
          setUserAddresses(addressList as Record<string, string>);
        } catch (error) {
          console.error('Error loading addresses after registration:', error);
        } finally {
          setLoadingAddresses(false);
        }

        window.alert('Blockchain wallet created and addresses loaded successfully!');
      }
    } catch (error: any) {
      console.error('Error during blockchain registration:', error);
      window.alert('Error during blockchain registration: ' + error.message);
      setLoadingAddresses(false);
    }
  }

  // Updated handleTrust function to combine both steps (for backward compatibility)
  async function handleTrust() {
    console.log('Starting complete registration process...');
    try {
      await handlePasskeyRegistration();
      if (passkeyRegistered) {
        await handleBlockchainRegistration();
      }
    } catch (error: any) {
      console.error('Error during complete registration:', error);
      window.alert('Error during registration: ' + error.message);
    }
  }

  async function handleDecryptTrust() {
    console.log('Trust Wallet SDK initialized');
    try {


      // Step 2: Get user assertion with PRF
      let assertion = await GetUserPasskeyAssertion(backendSalt);
      setUserAssertion(assertion);
      console.log('User assertion with PRF:', assertion);

      // Step 3: Convert ArrayBuffer to Uint8Array
      if (assertion) {
        console.log('PRF Key:', assertion, 'Type:', typeof assertion, 'Length:', assertion?.byteLength);

        // Convert ArrayBuffer to Uint8Array
        let keyArray: Uint8Array;
        if (assertion instanceof ArrayBuffer) {
          keyArray = new Uint8Array(assertion);
        } else if (assertion instanceof Uint8Array) {
          keyArray = assertion;
        } else {
          throw new Error('Invalid PRF key format. Expected ArrayBuffer or Uint8Array.');
        }

        console.log('Converted Key:', keyArray, 'Type:', typeof keyArray, 'Length:', keyArray.length);

        if (keyArray.length !== 32) {
          throw new Error(`Expected 32-byte key, got ${keyArray.length} bytes`);
        }

        let userData: any = await storage.getItem('encryptionKey-trustwallet');
        let userDataParsed = JSON.parse(userData || '{}',);
        console.log('decryptDataWithTrustWalletCore Encrypting blockchain key with PRF-derived key...', userDataParsed);
        const encryptedStrings = await decryptDataWithTrustWalletCore(keyArray, userDataParsed, 'utf8');
        console.log('decryptDataWithTrustWalletCore key:', encryptedStrings);
        let addressList = await getSupportedBlockchainAddress(encryptedStrings, 'all');
        console.log('Decrypted blockchain key:', addressList);
        window.alert('Blockchain key encrypted successfully!');
      }
    } catch (error: any) {
      console.error('Error during user registration:', error);
      window.alert('Error during user registration: ' + error.message);
    }
  }

  const handleFundWallet = async (blockchain: string, address: string) => {
    setFundingLoading(prev => ({ ...prev, [blockchain]: true }));

    try {
      let results: FundingResult[] = [];

      // Map blockchain names to funding function parameters
      const fundingMap: Record<string, string> = {
        'stellar': 'stellar',
        'xrpl': 'xrpl',
        'solana': 'solana',
        'ethereum': 'evm'
      };

      const networkKey = fundingMap[blockchain.toLowerCase()];
      if (networkKey) {
        const walletAddresses = { [networkKey]: address };
        results = await fundTestnetWallets(walletAddresses);
      }

      if (results.length > 0 && results[0].success) {
        Alert.alert(
          'Funding Successful',
          `Successfully funded ${blockchain.toUpperCase()} wallet with ${results[0].amount}`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Funding Failed',
          results[0]?.error || 'Failed to fund wallet',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert(
        'Funding Error',
        error instanceof Error ? error.message : 'Unknown error occurred',
        [{ text: 'OK' }]
      );
    } finally {
      setFundingLoading(prev => ({ ...prev, [blockchain]: false }));
    }
  };

  // Add send function placeholder
  const handleSendTokens = (blockchain: string, address: string) => {
    Alert.alert(
      'Send Tokens',
      `Send tokens feature for ${blockchain.toUpperCase()} will be implemented soon.`,
      [{ text: 'OK' }]
    );
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />

      }>
      {
        isAUthenticated ? (
          <ThemedView style={styles.titleContainer}>
            {loadingAddresses ? (
              <ThemedView style={styles.loadingContainer}>
                <ThemedText category='h1'>Welcome to Key Management</ThemedText>
                <ActivityIndicator size="large" />
                <ThemedText>Loading your addresses...</ThemedText>
              </ThemedView>
            ) : userAddresses ? (
              <ThemedView style={styles.addressContainer}>
                <ThemedText category='h2' style={styles.addressTitle}>Your Blockchain Addresses</ThemedText>
                <FlatList
                  data={Object.entries(userAddresses)}
                  keyExtractor={([blockchain]) => blockchain}
                  numColumns={2}
                  columnWrapperStyle={styles.row}
                  renderItem={({ item: [blockchain, address] }) => (
                    <ThemedView style={styles.addressItem}>
                      <ThemedText category='s1' style={styles.blockchainName}>
                        {blockchain.toUpperCase()}
                      </ThemedText>
                      <ThemedText style={styles.addressText} numberOfLines={2} ellipsizeMode="middle">
                        {address}
                      </ThemedText>

                      {/* Action buttons */}
                      <ThemedView style={styles.buttonContainer}>
                        <Button
                          size="tiny"
                          status="success"
                          onPress={() => handleFundWallet(blockchain, address)}
                          disabled={fundingLoading[blockchain]}
                          style={styles.actionButton}
                        >
                          {fundingLoading[blockchain] ? (
                            <ActivityIndicator size="small" color="white" />
                          ) : (
                            <ThemedText style={styles.buttonText}>Fund</ThemedText>
                          )}
                        </Button>

                        <Button
                          size="tiny"
                          status="info"
                          onPress={() => handleSendTokens(blockchain, address)}
                          style={styles.actionButton}
                        >
                          <ThemedText style={styles.buttonText}>Send</ThemedText>
                        </Button>
                      </ThemedView>
                    </ThemedView>
                  )}
                  style={styles.addressList}
                />
                <Button
                  onPress={loadUserAddresses}
                  style={styles.refreshButton}
                >
                  <ThemedText style={{ color: 'white' }}>Refresh Addresses</ThemedText>
                </Button>
              </ThemedView>
            ) : (
              <ThemedView style={styles.noAddressContainer}>
                <ThemedText category='h1'>Welcome to Key Management</ThemedText>
                <ThemedText>No addresses found</ThemedText>
                <Button onPress={async () => await loadUserAddresses()}>
                  <ThemedText style={{ color: 'white' }}>Load Addresses</ThemedText>
                </Button>
              </ThemedView>
            )}
          </ThemedView>
        ) : (
          <ThemedView style={styles.titleContainer}>
            <ThemedView level='1' style={{ flex: 1, gap: 20 }}>
              <ThemedText category='h1' style={{ textAlign: 'center' }}>
                Welcome to Key Management
              </ThemedText>
              <ThemedText style={{ textAlign: 'center', opacity: 0.7 }}>
                {!passkeyRegistered
                  ? "First, register your passkey for secure authentication"
                  : !blockchainRegistered
                    ? "Now create your blockchain wallet"
                    : "Setup complete!"
                }
              </ThemedText>
            </ThemedView>

            {/* Step 1: Passkey Registration */}
            <Button
              disabled={registrationLoading || passkeyRegistered}
              onPress={async () => {
                setRegistrationLoading(true);
                try {
                  await handlePasskeyRegistration();
                } finally {
                  setRegistrationLoading(false);
                }
              }}
              status={passkeyRegistered ? 'success' : 'primary'}
            >
              {registrationLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : passkeyRegistered ? (
                "✓ Passkey Registered"
              ) : (
                "1. Register Passkey"
              )}
            </Button>

            {/* Step 2: Blockchain Registration (only show after passkey is registered) */}
            {passkeyRegistered && (
              <Button
                disabled={decryptingLoading || blockchainRegistered}
                onPress={async () => {
                  setDecryptingLoading(true);
                  try {
                    await handleBlockchainRegistration();
                  } finally {
                    setDecryptingLoading(false);
                  }
                }}
                status={blockchainRegistered ? 'success' : 'primary'}
              >
                {decryptingLoading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : blockchainRegistered ? (
                  "✓ Blockchain Wallet Created"
                ) : (
                  "2. Create Blockchain Wallet"
                )}
              </Button>
            )}

            {/* Login button for existing users */}
            <Button
              disabled={decryptingLoading}
              onPress={async () => {
                setDecryptingLoading(true);
                try {
                  await handleDecryptTrust();
                } finally {
                  setDecryptingLoading(false);
                }
              }}
              appearance='outline'
            >
              {decryptingLoading ? (
                <ActivityIndicator size="small" />
              ) : (
                "Login with Existing Passkey"
              )}
            </Button>
          </ThemedView>
        )
      }
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({

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

  titleContainer: {
    flex: 1,
    gap: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
    gap: 10,
  },
  addressContainer: {
    flex: 1,
    paddingHorizontal: 10,
  },
  addressTitle: {
    marginBottom: 15,
    textAlign: 'center',
  },
  addressList: {
    flex: 1,
  },


  refreshButton: {
    marginTop: 15,
    marginHorizontal: 20,
  },
  noAddressContainer: {
    alignItems: 'center',
    padding: 20,
    gap: 10,
  },
  subtitle: {
    textAlign: 'center',
    opacity: 0.7,
    marginTop: 10,
  },


  row: {
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  addressItem: {
    flex: 1,
    margin: 5,
    padding: 15,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    minHeight: 140,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  blockchainName: {
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#007AFF',
    textAlign: 'center',
    fontSize: 14,
  },
  addressText: {
    fontFamily: 'monospace',
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 10,
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
    justifyContent: 'center',
  },
  actionButton: {
    flex: 1,
    minHeight: 32,
  },
  buttonText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },
});
