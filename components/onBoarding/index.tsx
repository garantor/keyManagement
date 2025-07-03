

import React from 'react'
import { ThemedView } from '../ThemedView'
import { ThemedText } from '../ThemedText'
import { Button, Spinner } from '@ui-kitten/components'
import { GenerateWalletMnemonic } from '@/blockchain/wallet';
import { GenerateBlockchainKeyFromMnemonic } from '@/blockchain/chains';


interface iLoginSignUpProps {
  handleLogin?: () => void;
  handleSignUp?: () => void;
  disable?: boolean;
}
export default function LoginSignUp({ handleLogin, handleSignUp, disable }: iLoginSignUpProps) {
  
  async function HanldeTexttstst() {

    let mnemonic = GenerateWalletMnemonic();
    console.log('Generated Wallet Mnemonic:', mnemonic);

    let data = GenerateBlockchainKeyFromMnemonic(mnemonic, 'xrpl');
    console.log('Generated Blockchain Key:', data);
  }

  
  

  return (
    <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20,}}>
      <ThemedView style={{ flex:1, padding: 20, borderRadius: 10, }}>
        <ThemedText category='h2' style={{textAlign:'center'}}>Login or Sign Up</ThemedText>
        <ThemedView style={{flex:1, marginTop:20, justifyContent: 'center', alignItems: 'center', padding: 20, gap:20 }}>
          {/* <ThemedText category='h1'>Welcome to Key Management</ThemedText> */}
        {
          disable ? 
          <ThemedView style={{ flex: 1, gap:20, minWidth:'100%',justifyContent: 'center', alignItems: 'center', padding: 20 }}>

          <ThemedText category='h3'>Loading...</ThemedText> 
          <Spinner size='giant' />
          
          </ThemedView>
          
          :

          (
<>
                  <Button style={{minHeight:50,  minWidth: '100%' }} onPress={handleLogin} disabled={disable}>
                    Login With Passkey
                  </Button>
                  <Button style={{ minHeight:50, minWidth: '100%' }} onPress={handleSignUp} disabled={disable}>
                    Create Wallet With Passkey
                  </Button>


                  <Button style={{ minHeight: 50, minWidth: '100%' }} onPress={HanldeTexttstst} disabled={disable}>
                   Play around 
                  </Button>
</>
          )
        

          
          }
          
        </ThemedView>
        
      </ThemedView>
    </ThemedView>
  )
}
