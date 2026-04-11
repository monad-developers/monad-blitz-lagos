import { http } from 'wagmi'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors'
import { monadTestnet } from './monad'

// Export it so it can be used in other files
export { monadTestnet }

// Reown Project ID from env or fallback
export const projectId = process.env.NEXT_PUBLIC_PROJECT_ID || '96c70ceff717740f6ddc1c276b3f16ca'

if (!projectId) {
  throw new Error('Project ID is not defined')
}

// Create Wagmi Adapter - using WagmiAdapter ensures AppKit and Wagmi stay in sync
export const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks: [monadTestnet],
  connectors: [
    injected(),
    walletConnect({ projectId }),
    coinbaseWallet({
        appName: 'MONA',
    }),
  ],
  transports: {
    [monadTestnet.id]: http(),
  },
})

export const wagmiConfig = wagmiAdapter.wagmiConfig
