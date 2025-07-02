import React from 'react'
import { ThemedView } from './ThemedView'
import { ThemedText } from './ThemedText'
import { Button, Divider, Spinner } from '@ui-kitten/components'
import { isLoaded, isLoading } from 'expo-font'

interface iCreateWallet {
    handleButtonPress?: () => void
    isLoading?: boolean
}

export default function CreateWallets({ handleButtonPress, isLoading }: iCreateWallet) {
  return (

    <ThemedView style={{flex:1,  alignItems: 'center', minWidth: '100%', }}>
        <ThemedText category="s1" style={{ marginBottom: 16 }}>
        Create Wallets
        </ThemedText>
        <Divider style={{ width: '100%', marginVertical: 10 }} />
          <ThemedView style={{ flex: 1, backgroundColor: 'red', alignItems: 'center', padding: 20, width: '100%', }}>
              <ThemedView style={{ flex: 1, width: '100%', padding:20, borderRadius:10, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' }}>
               {isLoading === true ? 
               
               (
                <>
                              <ThemedText category="c1" appearance="hint" style={{ textAlign: 'center', marginBottom: 20 }}>
                                  Creating your wallet, please wait...

                              </ThemedText>
                
                <Spinner size='giant' style={{}} />
                </>
              
                ) : 
              
               (   <ThemedText category="c1" appearance="hint" style={{ textAlign: 'center', marginBottom: 20 }}>
                      Signup/ Login successfully, Let's create your wallet. Wallets will be created on the blockchain and will be used to store your assets securely.
                      Click on the button below to create a new wallet.
                  </ThemedText>)}
            </ThemedView>

            <ThemedView style={{minWidth:'100%', marginTop: 20, padding: 10, backgroundColor: '#6200ee', borderRadius: 5 }} >
                  <Button style={{flex:1,  width: '100%' }}  status='basic' onPress={handleButtonPress} >
                    Create Wallet
                </Button>
            </ThemedView>
              
        </ThemedView>

    </ThemedView>
  )
}
