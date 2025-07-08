import { getItem } from '@/storage'
import { Button, Card, List, Text, Modal, Spinner } from '@ui-kitten/components'
import { get } from 'http'
import React, { act, use, useEffect } from 'react'
import { FlatList, ScrollView, TouchableOpacity, View, Clipboard, StyleSheet } from 'react-native'
import { ThemedView } from './ThemedView'
import { SimpleTransactionParams, SimpleTransactionSigner } from '@/blockchain/chainSigner'
import { GetUserPasskeyAssertion } from '@/passkeys'
import { Modal as RNModal } from 'react-native'
import { decryptData } from '@/blockchain/dataEncryption'
import { getAllWalletBalances } from '@/blockchain/balances'

type iWalletList = {
  id: string
  name: string
  chain: string
  balance: string
  address: string
}

const CHAIN_CONFIGS = {
  xrpl: {
    amount: '1000000', // 1 XRP in drops
    rpcUrl: 'https://s.altnet.rippletest.net:51234',
    sender: SimpleTransactionSigner.sendXRPL
  },
  solana: {
    amount: '0.01', // 0.01 SOL
    rpcUrl: 'https://api.testnet.solana.com',
    sender: SimpleTransactionSigner.sendSolana
  },
  stellar: {
    amount: '1', // 1 XLM
    rpcUrl: 'https://horizon-testnet.stellar.org',
    sender: SimpleTransactionSigner.sendStellar
  },
  evm: {
    amount: '0.01', // 0.01 ETH
    rpcUrl: 'https://goerli.infura.io/v3/YOUR_INFURA_PROJECT_ID',
    sender: SimpleTransactionSigner.sendEVM
  }
}


export default function Dashboard() {
  const [walletList, setWalletList] = React.useState<any[] | null>(null)
  const [selectedWallet, setSelectedWallet] = React.useState<string | null>(null)
  const [showQrCode, setShowQrCode] = React.useState<boolean>(false)
  const [loading, setLoading] = React.useState<boolean>(false)
  const [transactionSuccessful, setTransactionSuccessful] = React.useState<boolean>(false)
  const [balancesLoading, setBalancesLoading] = React.useState<boolean>(false)





  useEffect(() => {
    const fetchWalletList = async () => {
      const walletListStr = await getItem('walletList')
      console.log('Fetched wallet list:', walletListStr)
      if (typeof walletListStr === 'string') {
        try {
          const parsed = JSON.parse(walletListStr)
          console.log('Parsed wallet list:', parsed)
          let list = Object.entries(parsed).map(([chain, address], index) => ({
            id: (index + 1).toString(),
            name: `${chain.charAt(0).toUpperCase() + chain.slice(1)} Wallet`,
            chain: chain,
            balance: '0.0',
            address: address
          }))
          console.log('Mapped wallet list:', list)
          setWalletList(list)

          // Fetch balances after setting the wallet list
          await fetchBalances(parsed)
        } catch (e) {
          setWalletList(null)
        }
      } else {
        setWalletList(null)
      }
    }
    fetchWalletList()
  }, [])


  const fetchBalances = async (walletAddresses: Record<string, string>) => {
    setBalancesLoading(true)
    try {
      const balanceResult = await getAllWalletBalances({
        stellar: walletAddresses.stellar,
        xrpl: walletAddresses.xrpl,
        evm: walletAddresses.evm,
        solana: walletAddresses.solana
      }, true)

      if (balanceResult.success) {
        setWalletList(prevList => {
          if (!prevList) return null

          return prevList.map(wallet => {
            let balanceData

            if (wallet.chain === 'evm') {
              // For EVM, find any EVM network balance
              balanceData = balanceResult.balances.find(b =>
                b.address.toLowerCase() === wallet.address.toLowerCase() &&
                (b.network === 'ethereum' || b.network.includes('evm'))
              )
            } else {
              // For other chains, match by chain name
              balanceData = balanceResult.balances.find(b =>
                b.address.toLowerCase() === wallet.address.toLowerCase() &&
                (b.network.includes(wallet.chain) || b.network === wallet.chain)
              )
            }

            return {
              ...wallet,
              balance: balanceData ? `${parseFloat(balanceData.balance).toFixed(4)} ${balanceData.symbol}` : '0.0'
            }
          })
        })
      }
    } catch (error) {
      console.error('Error fetching balances:', error)
    } finally {
      setBalancesLoading(false)
    }
  }

  const processTransaction = async (walletId: string) => {
    setLoading(true)

    try {
      let activeWallet = walletList?.find((wallet) => wallet.id === walletId)
      if (!activeWallet) {
        console.error('Wallet not found:', walletId)
        return
      }

      console.log('Selected wallet for sending:', activeWallet)



      let userAsseration = await GetUserPasskeyAssertion('domain-salt')
      console.log('User assertion:', userAsseration)
      if (!userAsseration) {
        console.error('No user assertion found')
        return
      }

      let mnemonic: any = await getItem('encryptedWalletMnemonic')
      let parsedMnemonic = await JSON.parse(mnemonic);
      console.log('Parsed mnemonic:', parsedMnemonic)

      let mnemonicKey = await decryptData(parsedMnemonic.ciphertext, parsedMnemonic.iv, userAsseration);
      console.log('Decrypted mnemonic key:', mnemonicKey);
      if(!mnemonicKey) {
        window.alert('Failed to decrypt mnemonic key')
        setLoading(false)
        return
      }

    

   
      const handleTransactionSuccess = (txKey: string) => {
        console.log('Transaction signer key:', txKey)
        setLoading(false)
        setTransactionSuccessful(true)
        window.alert('Transaction successful! Transaction ID: ' + txKey)
      }

      // Replace the if-else chain with this:
      const chainConfig = CHAIN_CONFIGS[activeWallet.chain as keyof typeof CHAIN_CONFIGS]

      if (!chainConfig) {
        console.error('Unsupported chain:', activeWallet.chain)
        setLoading(false)
        return
      }

      const transactionParams: SimpleTransactionParams = {
        chain: activeWallet.chain,
        mnemonic: mnemonicKey,
        to: activeWallet.address,
        amount: chainConfig.amount,
        rpcUrl: chainConfig.rpcUrl
      }

      try {
        const txKey = await chainConfig.sender(transactionParams)
        handleTransactionSuccess(txKey)
      } catch (error:any) {
        console.error('Transaction failed:', error)
        setLoading(false)
        window.alert('Transaction failed: ' + error.message)
      }



  
    } catch (error) {
      console.error('Error during send operation:', error)
      setLoading(false)
      return
    }
  }

  const refreshBalances = async () => {
    if (!walletList) return

    const walletAddresses = walletList.reduce((acc, wallet) => {
      acc[wallet.chain] = wallet.address
      return acc
    }, {} as Record<string, string>)

    await fetchBalances(walletAddresses)
  }
  const copyToClipboard = (address: string) => {
    Clipboard.setString(address)
    window.alert('Wallet address copied to clipboard')
  }

  const renderWalletItem = ({ item }: { item: any }) => (
    <Card style={{
      margin: 8,
      borderRadius: 12,
      flex: 1,
      maxWidth: '45%',
      shadowOpacity: 0.1,
      shadowRadius: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      elevation: 2
    }}>
      <ThemedView style={{ padding: 16 }}>
        <Text category="h6">{item.name}</Text>
        <Text category="s1" appearance="hint">{item.chain}</Text>
        <Text category="s1" style={{ marginVertical: 8 }}>{item.balance}</Text>

        <TouchableOpacity onPress={() => copyToClipboard(item.address)}>
          <Text category="c1" appearance="hint" style={{ textDecorationLine: 'underline' }}>
            {item.address}
          </Text>
        </TouchableOpacity>

        <ThemedView style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 16 }}>
          <Button
            size="small"
            style={{ flex: 1, marginRight: 4 }}
            onPress={() => processTransaction(item.id)}
          >
            Send
          </Button>
          {/* <Button
            size="small"
            style={{ flex: 1, marginHorizontal: 4 }}
            appearance="outline"
            onPress={() => handleReceive(item.id)}
          >
            Receive
          </Button> */}
          <Button
            size="small"
            style={{ flex: 1, marginLeft: 4 }}
            appearance="ghost"
            onPress={() => copyToClipboard(item.address)}
          >
            Copy
          </Button>
        </ThemedView>
      </ThemedView>
    </Card>
  )
  return (
    <ThemedView style={{ flex: 1 }}>

      <ScrollView style={{ flex: 1 }}>
        <ThemedView style={{ flex: 1, padding: 16, width: '100%', alignContent: 'center', alignItems: 'center' }}>
          <ThemedView style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <Text category="h4">My Wallets</Text>
            <Button
              size="small"
              appearance="ghost"
              onPress={refreshBalances}
              disabled={balancesLoading}
              style={{ marginLeft: 16 }}
            >
              {balancesLoading ? 'Loading...' : 'Refresh'}
            </Button>
          </ThemedView>

          <FlatList
            data={walletList}
            renderItem={renderWalletItem}
            numColumns={2}
            scrollEnabled={false}
            contentContainerStyle={{ flex: 1, alignItems: 'stretch' }}
            columnWrapperStyle={{ justifyContent: 'space-between' }}
          />
        </ThemedView>
      </ScrollView>
      {
        loading === true ?


          // Replace UI Kitten Modal with React Native Modal
          <RNModal
            visible={loading}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setLoading(false)}
          >
            <View style={[styles.backdrop, { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 20 }]}>
              <Spinner size="giant" />
              <Button onPress={() => setLoading(false)}>
                Cancel Transaction
              </Button>

            </View>
          </RNModal>
          : null
      }


    </ThemedView>

  )
}


const styles = StyleSheet.create({
  container: {
    minHeight: 192,
  },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
});