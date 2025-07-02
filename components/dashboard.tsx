import { getItem } from '@/storage'
import { Button, Card, List, Text, Modal } from '@ui-kitten/components'
import { get } from 'http'
import React, { use, useEffect } from 'react'
import { FlatList, ScrollView, TouchableOpacity, View, Clipboard } from 'react-native'
import { ThemedView } from './ThemedView'

type iWalletList = {
  id: string
  name: string
  chain: string
  balance: string
  address: string
}

export default function Dashboard() {
  const [walletList, setWalletList] = React.useState<any[] | null>(null)
  const [selectedWallet, setSelectedWallet] = React.useState<string | null>(null)
  const [showQrCode, setShowQrCode] = React.useState<boolean>(false)

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
            balance:'0.0',
            address: address
          }))
          console.log('Mapped wallet list:', list)
          setWalletList(list)
        } catch (e) {
          setWalletList(null)
        }
      } else {
        setWalletList(null)
      }
    }
    fetchWalletList()
  }, [])

  const mockWallets = walletList || [
    { id: '1', name: 'Ethereum Wallet', chain: 'Ethereum', balance: '1.5 ETH', address: '0x742d35Cc6074C12532c5eb' },
    { id: '2', name: 'Bitcoin Wallet', chain: 'Bitcoin', balance: '0.025 BTC', address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh' },
    { id: '3', name: 'Solana Wallet', chain: 'Solana', balance: '12.4 SOL', address: 'DjVE6JNiYqPL2QXyCUUh8rNjHjGp' },
  ]

  const handleSend = (walletId: string) => {
    console.log('Send from wallet:', walletId)
    // Add send logic here
  }

  const handleReceive = (walletId: string) => {
    console.log('Receive to wallet:', walletId)
    setSelectedWallet(walletId)
    setShowQrCode(true)
  }

  const closeQrCode = () => {
    setShowQrCode(false)
    setSelectedWallet(null)
  }

  const copyToClipboard = (address: string) => {
    Clipboard.setString(address)
    window.alert('Wallet address copied to clipboard')
  }

  const renderWalletItem = ({ item }: { item: typeof mockWallets[0] }) => (
    <Card style={{
      margin: 8,
      borderRadius: 12,
      flex: 1,
      maxWidth: '45%',
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
            onPress={() => handleSend(item.id)}
          >
            Send
          </Button>
          <Button
            size="small"
            style={{ flex: 1, marginHorizontal: 4 }}
            appearance="outline"
            onPress={() => handleReceive(item.id)}
          >
            Receive
          </Button>
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

      <ScrollView style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
        <ThemedView style={{flex:1, padding: 16, width: '100%' }}>
          <Text category="h4" style={{ marginBottom: 16 }}>My Wallets</Text>
          <FlatList
            data={mockWallets}
            renderItem={renderWalletItem}
            numColumns={2}
            scrollEnabled={false}
            contentContainerStyle={{flex:1, backgroundColor:'yellow', alignItems: 'stretch' }}
            columnWrapperStyle={{ justifyContent: 'space-between' }}
          />
        </ThemedView>
      </ScrollView>

      <Modal
        visible={showQrCode}
        backdropStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        onBackdropPress={closeQrCode}
      >
        <Card disabled={true} style={{ borderRadius: 12, backgroundColor:'red' }}>
          <View style={{ padding: 20, alignItems: 'center' }}>
            <Text category="h6" style={{ marginBottom: 16 }}>
              Receive Payment
            </Text>
            
            <Button
              size="small"
              appearance="outline"
              style={{ marginTop: 16 }}
              onPress={closeQrCode}
            >
              Close
            </Button>
          </View>
        </Card>
      </Modal>
    </ThemedView>

  )
}