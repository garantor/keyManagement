import { sepolia } from "viem/chains";


export const NETWORK_CONFIGS = {
    stellar: {
        horizon: 'https://horizon.stellar.org',
        testnet: 'https://horizon-testnet.stellar.org'
    },
    xrpl: {
        mainnet: 'wss://xrplcluster.com',
        testnet: 'wss://s.altnet.rippletest.net:51233'
    },
    solana: {
        mainnet: 'https://api.mainnet-beta.solana.com',
        devnet: 'https://api.devnet.solana.com'
    },
    evm: {
        ethereum: { chain: sepolia, rpc: 'https://gateway.tenderly.co/public/sepolia' },
      
    }
};