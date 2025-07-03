import { GenerateBlockchainKeyFromMnemonic } from '@/blockchain/chains'
import { GenerateWalletMnemonic } from '@/blockchain/wallet'
import CreateWallets from '@/components/createWallets'
import Dashboard from '@/components/dashboard'
import LoginSignUp from '@/components/onBoarding'
import { ThemedText } from '@/components/ThemedText'
import { ThemedView } from '@/components/ThemedView'
import { GetUserPasskeyAssertion, RegisterNewPasskeyWithPRF } from '@/passkeys'
import { getItem, setItem } from '@/storage'
import { encryptBlockchainKey } from '@/utils'
import React, { useEffect } from 'react'

export default function Wallet() {
  const [domainSalt, setDomainSalt] = React.useState('domain-salt'); // This can be any domain-specific salt
  const [isLoading, setIsLoading] = React.useState(false);
  const [isAUthenticated, setIsAuthenticated] = React.useState(false);
  const [passkeyCredential, setPasskeyCredential] = React.useState<any>(null);
  const [walletCreated, setWalletCreated] = React.useState<any>('');
  const [showDashbaord, setShowDashbaord] = React.useState(false);







  async function handleLogin() {
    setIsLoading(true);
    try {
      const credentialRequestOptions: any = {
        challenge: Uint8Array.from(window.crypto.getRandomValues(new Uint8Array(32))),
        timeout: 60000,
        rpId: "localhost",
        userVerification: "required",
        allowCredentials: [/* Registered credential IDs */],
      };

      console.log('GetUserPasskeyAssertion :', credentialRequestOptions);
      const loginCred: any = await navigator.credentials.get({ publicKey: credentialRequestOptions });
      setPasskeyCredential(loginCred);
      console.log('Login Credential:', loginCred);


      let existingWallet = await getItem('walletList');
      console.log('Existing Wallet:', existingWallet);
      if (existingWallet) {

        console.log('Existing wallet found, redirecting to dashboard...');
        setWalletCreated(existingWallet);
        setShowDashbaord(true);
        setIsLoading(false);
        setIsAuthenticated(true);
        return;
      }



      setIsLoading(false)
      setIsAuthenticated(true);

      
      
    } catch (error: any) {
      console.error('Error during login:', error);
      window.alert('Error during login: ' + error.message);
      setIsLoading(false);
      return;
      
    }
    // Implement login logic here
  }


  function handleWalletCreations() {
    setIsLoading(true);

    try {

      setTimeout(async () => {

        console.log('Timeout reached, you can now use the passkey to login');
        // this will throw an error if PRF is not supported on the device
        // do not save or store the returned assertion
        let userAssertion = await GetUserPasskeyAssertion(domainSalt);
        console.log('User Assertion:', userAssertion);

        let wallet = GenerateWalletMnemonic() // do not save or store the returned wallet mnemonic or send it anywhere
        console.log('Generated Wallet Mnemonic:', wallet);

        if (!wallet) {
          throw new Error('Failed to generate wallet mnemonic');
        }

        let walletList = GenerateBlockchainKeyFromMnemonic(wallet);
        console.log('Generated Wallet List:', walletList);
        if (!walletList) {
          throw new Error('Failed to generate wallet list from mnemonic');
        }
        //encrypt the wallet mnemonic with the user assertion
        const encryptedMnemonic = await encryptBlockchainKey(userAssertion, wallet);
        console.log('Encrypted Wallet Mnemonic:', encryptedMnemonic);
        // now store the encrypted mnemonic securely, e.g., in a secure storage or database
        let saveData = await setItem('encryptedWalletMnemonic', JSON.stringify(encryptedMnemonic));
        await setItem('walletList', await JSON.stringify(walletList)); // store the wallet list in local storage
        console.log('Encrypted Wallet Mnemonic saved:', saveData);
        window.alert('Wallet created successfully! Your wallet mnemonic is encrypted and saved securely.');
        // Now you can generate a new blockchain key from the  generated wallet mnemonic
        // For example, you can call GenerateBlockchainKeyFromMnemonic() here

        setIsLoading(false);
        setIsAuthenticated(true);

        setTimeout(() => {
          console.log('Redirecting to dashboard...');
          setWalletCreated(walletList);
          setShowDashbaord(true);

        }, 1000)


        // You can now use the passkey to login
        // For example, you can call GetUserPasskeyAssertion() here
      }, 2000)

    } catch (error: any) {
      console.error('Error during wallet creation:', error);
      window.alert('Error during wallet creation: ' + error.message);
      setIsLoading(false);
      return;
    }

  }

  async function handleSignUp() {
    setIsLoading(true);
    try {

      // window.alert('Create Wallet with Passkey clicked');
      let reg = await RegisterNewPasskeyWithPRF(); // this register a new passkey with PRF, it does not check if PRF is supported on the device 
      console.log('Registered Passkey with PRF:', reg);
      setPasskeyCredential(reg);
      setIsLoading(false)
      setIsAuthenticated(true);

    } catch (error: any) {
      console.error('Error during passkey assertion:', error);
      window.alert('Error during passkey assertion: ' + error.message);
      setIsLoading(false);

      return;

    }

    // Implement sign-up logic here
  }

  return (
    <ThemedView style={{ flex: 1, }}>

      <ThemedView style={{ justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <ThemedText category='h1'>Wallet Screen</ThemedText>
      </ThemedView>
      {
        isAUthenticated ?
          (
            showDashbaord ?
              (

                <Dashboard />
              ) :
              (
                <CreateWallets handleButtonPress={handleWalletCreations} isLoading={isLoading} />
              )
          ) :

          (
            <LoginSignUp handleLogin={handleLogin} handleSignUp={handleSignUp} disable={isLoading} />

          )

      }
      {/* Add your wallet related components here */}
    </ThemedView>
  )
}
