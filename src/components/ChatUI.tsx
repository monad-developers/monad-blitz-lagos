'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useAccount, useDisconnect, useBalance, useWalletClient, useReadContract } from 'wagmi'
import { formatUnits, erc20Abi } from 'viem'
import { useQueryClient } from '@tanstack/react-query'
import Image from 'next/image'

const USDC_ADDRESS = '0x534b2f3A21130d7a60830c2Df862319e593943A3'
import Link from 'next/link'
import { monadTestnet } from '@/lib/monad'
import { useCartStore, Product } from '@/store/cartStore'
import { UIMessage as Message, readUIMessageStream } from 'ai'
import { ProductCardSkeleton } from './ProductCardSkeleton'
import { checkout, OrderConfirmation } from '@/lib/checkout'
import { OrderConfirmationModal } from './OrderConfirmationModal'
import { Toast } from './Toast'

interface SearchArgs {
  query: string
  maxPrice?: number
  category?: string
}

interface AddToCartResult {
  success: boolean
  product: Product
  quantity: number
}

interface ToolInvocation {
  state: 'partial-call' | 'call' | 'result'
  toolCallId: string
  toolName: string
  args: unknown
  result?: unknown
}

interface ExtendedMessage extends Message {
  toolInvocations?: ToolInvocation[]
}

export function ChatUI() {
  const { address, chain } = useAccount()
  const { disconnect } = useDisconnect()
  const queryClient = useQueryClient()
  const { data: balance } = useBalance({ address })
  
  const { data: usdcBalanceValue } = useReadContract({
    address: USDC_ADDRESS as `0x${string}`,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    }
  })

  const usdcBalance = useMemo(() => {
    if (usdcBalanceValue === undefined) return null;
    return {
      value: usdcBalanceValue as bigint,
      decimals: 6,
      symbol: 'USDC'
    }
  }, [usdcBalanceValue])

  const { data: walletClient } = useWalletClient()
  const { items: cart, addItem, removeItem, updateQuantity } = useCartStore()

  // Dynamic Chat State
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'assistant', parts: [{ type: 'text', text: "I've curated a selection of high-fidelity wireless options that prioritize both acoustic precision and minimalist design. Use the chat to find anything you need." }] }
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [currentProducts, setCurrentProducts] = useState<Product[]>([])
  const [lastSearchQuery, setLastSearchQuery] = useState('')

  const scrollRef = useRef<HTMLDivElement>(null)

  // Sidebar and Modal State
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [checkoutStatus, setCheckoutStatus] = useState<'idle' | 'processing' | 'success'>('idle')
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [orderConfirmation, setOrderConfirmation] = useState<OrderConfirmation | null>(null)

  const cartTotal = useMemo(() => {
    return cart.reduce((total, item) => total + item.priceUsdc * item.quantity, 0)
  }, [cart])

  const cartItemCount = useMemo(() => {
    return cart.reduce((count, item) => count + item.quantity, 0)
  }, [cart])

  const isWrongNetwork = chain?.id !== monadTestnet.id

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Scan for tool results whenever messages update
  useEffect(() => {
    const lastMessage = messages[messages.length - 1] as ExtendedMessage
    if (lastMessage?.role === 'assistant' && lastMessage.toolInvocations) {
      // Check for searchProducts results
      const searchInv = lastMessage.toolInvocations.find(inv => inv.toolName === 'searchProducts')
      if (searchInv?.state === 'result') {
        setCurrentProducts(searchInv.result as Product[])
        setLastSearchQuery((searchInv.args as SearchArgs).query)
        setIsSearching(false)
      } else if (searchInv?.state === 'call') {
        setIsSearching(true)
      }

      // Check for addToCart results
      const addInv = lastMessage.toolInvocations.find(inv => inv.toolName === 'addToCart')
      if (addInv?.state === 'result' && (addInv.result as AddToCartResult).success) {
        addItem((addInv.result as AddToCartResult).product, (addInv.result as AddToCartResult).quantity)
        setIsCartOpen(true)
      }
    }
  }, [messages, addItem])

  const handleCheckout = async () => {
    if (!walletClient) {
      setPaymentError("Wallet not connected")
      return
    }

    if (isWrongNetwork) {
      setPaymentError("Please switch to Monad testnet")
      return
    }

    setCheckoutStatus('processing')
    setPaymentError(null)

    try {
      const confirmation = await checkout(cart, cartTotal, walletClient)
      setOrderConfirmation(confirmation)
      setCheckoutStatus('success')
      
      // Clear cart
      useCartStore.getState().clearCart()
      setIsCartOpen(false)
      setIsCheckoutOpen(false)
      
      // Notify agent
      await handleSubmit(undefined, `Payment confirmed. Transaction hash: ${confirmation.txHash}. Please confirm my order and include the Monad explorer link: ${confirmation.explorerUrl}`)
      
    } catch (err: any) {
      console.error('Checkout failed:', err)
      setCheckoutStatus('idle')
      setPaymentError(err.message || "Payment failed")
    }
  }

  const handleSubmit = async (e?: React.FormEvent, overrideInput?: string) => {
    e?.preventDefault()
    const text = overrideInput ?? input
    if (!text.trim() || isLoading) return

    const userMessage: Message = { 
        id: Date.now().toString(), 
        role: 'user', 
        parts: [{ type: 'text', text: text }] 
    }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ 
            messages: newMessages.map(m => ({ 
                role: m.role, 
                content: m.parts.filter(p => p.type === 'text').map(p => p.type === 'text' ? p.text : '').join('')
            })) 
        }),
      })

      if (!response.ok) throw new Error('Failed to fetch')
      if (!response.body) throw new Error('No body')

      // @ts-expect-error - response.body is ReadableStream<Uint8Array> but readUIMessageStream expects ReadableStream<UIMessageChunk>
      const messageStream = readUIMessageStream({ stream: response.body })

      for await (const message of messageStream) {
        setMessages(prev => {
          const index = prev.findIndex(m => m.id === message.id)
          if (index !== -1) {
            const updated = [...prev]
            updated[index] = message
            return updated
          }
          return [...prev, message]
        })
      }
    } catch (err) {
      console.error('Chat error:', err)
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        parts: [{ type: 'text', text: 'Sorry, I encountered an error. Please check your OpenAI API key and credits.' }]
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const isOverlayOpen = isCartOpen || isCheckoutOpen

  return (
    <div className={`font-body text-on-surface min-h-screen flex flex-col bg-background ${isOverlayOpen ? 'overflow-hidden' : ''}`}>
      {/* Side Navigation Shell */}
      <aside className={`fixed left-0 top-0 h-screen w-64 bg-surface-container-low border-r border-outline-variant/20 z-40 flex flex-col p-6 space-y-8 transition-all duration-300 ${isOverlayOpen ? 'blur-sm pointer-events-none' : ''}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-surface-container-high border border-outline-variant/30 relative">
            <Image 
              className="w-full h-full object-cover" 
              alt="The Curator" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBm1gwgqK89gJsf0qQY7zVN6cNr_uUzMVWF2yGxxcOk1EcX0-MRo7njVp2fWC65vExPUqsZZKbjxuzPcR5S02xuov1b_d8qEPIpI1iczrcf8Hwi5QJAm3hAhgXMeTtSMBj9xmheINFTJ44f2hGGheYb2L7p3SUqsVNrgpS8l9jDGqyL9Obi385rCNLvfHgctubYsrl_3CzYUZVIXs1cVJU5dVlm9Fr8R6OJHElj8rLaQLB79UMDxNWOahSvYz9jrRPa68_blJhA6v5_"
              fill
            />
          </div>
          <div>
            <h2 className="font-headline text-on-surface leading-none">The Curator</h2>
            <p className="text-[10px] text-on-surface-variant uppercase tracking-widest mt-1">AI Shopping Intelligence</p>
          </div>
        </div>
        <nav className="flex-1 flex flex-col space-y-2">
          <Link className="flex items-center gap-3 p-3 text-on-surface opacity-60 font-label text-sm hover:bg-surface-container-high hover:text-primary rounded-lg transition-all" href="#">
            <span className="material-symbols-outlined text-xl">chat_bubble</span>
            <span>Concierge</span>
          </Link>
          <Link className="flex items-center gap-3 p-3 text-primary bg-surface-container-high font-label text-sm rounded-lg transition-all" href="#">
            <span className="material-symbols-outlined text-xl">auto_awesome</span>
            <span>Discovery</span>
          </Link>
          <Link className="flex items-center gap-3 p-3 text-on-surface opacity-60 font-label text-sm hover:bg-surface-container-high hover:text-primary rounded-lg transition-all" href="#">
            <span className="material-symbols-outlined text-xl">history</span>
            <span>History</span>
          </Link>
          <Link className="flex items-center gap-3 p-3 text-on-surface opacity-60 font-label text-sm hover:bg-surface-container-high hover:text-primary rounded-lg transition-all" href="#">
            <span className="material-symbols-outlined text-xl">settings</span>
            <span>Settings</span>
          </Link>
        </nav>
        <div className="pt-4 border-t border-outline-variant/10">
          {isWrongNetwork && (
            <div className="mb-4 px-3 py-2 bg-error-container text-on-error-container rounded-lg text-[10px] font-bold uppercase tracking-tight flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">warning</span>
                Wrong Network
            </div>
          )}
          <div className="flex flex-col gap-1 mb-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
              {balance ? `${parseFloat(formatUnits(balance.value, balance.decimals)).toFixed(2)} ${balance.symbol}` : '0.00 MON'}
            </span>
            <span className="text-[10px] opacity-60 font-mono">
              {address ? truncateAddress(address) : 'Not connected'}
            </span>
          </div>
          <button 
            onClick={() => disconnect()}
            className="w-full py-4 border border-primary/30 text-primary font-bold rounded-lg text-sm uppercase tracking-widest hover:bg-primary/5 transition-colors"
          >
            Disconnect
          </button>
        </div>
      </aside>

      {/* Main Content Area: Offset for side nav */}
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        {/* TopNavBar */}
        <header className={`fixed top-0 right-0 left-64 w-auto z-50 flex justify-between items-center px-8 py-4 bg-background/70 backdrop-blur-xl transition-all ${isOverlayOpen ? 'blur-sm pointer-events-none' : ''}`}>
          <div className="text-2xl font-headline italic text-on-surface">The Editorial Intelligence</div>
          <div className="flex items-center gap-6">
            <nav className="hidden md:flex gap-8 items-center">
              <span className="text-on-surface opacity-70 font-label text-sm uppercase tracking-widest cursor-pointer hover:opacity-100 transition-opacity">Discover</span>
              <span className="text-on-surface opacity-70 font-label text-sm uppercase tracking-widest cursor-pointer hover:opacity-100 transition-opacity">Archive</span>
              <span className="text-primary font-bold border-b border-primary pb-1 font-label text-sm uppercase tracking-widest cursor-pointer">Curated</span>
            </nav>
            <div className="flex gap-4">
              <span className="material-symbols-outlined text-on-surface opacity-70 cursor-pointer hover:text-primary transition-colors">wallet</span>
              <span className="material-symbols-outlined text-on-surface opacity-70 cursor-pointer hover:text-primary transition-colors" onClick={() => setIsCartOpen(true)}>shopping_bag</span>
            </div>
          </div>
        </header>

        {/* Main Content Area: Split View */}
        <main className={`flex-grow pt-20 flex h-screen overflow-hidden transition-all ${isOverlayOpen ? 'blur-md pointer-events-none' : ''}`}>
          {/* Left Column: AI Curator Chat (55%) */}
          <section className="w-[55%] flex flex-col border-r border-outline-variant/10 bg-surface-container-low p-12 justify-end">
            <div ref={scrollRef} className="flex-grow overflow-y-auto scrollbar-hide space-y-8 mb-8">
              {messages.map((msg, i) => {
                const content = msg.parts
                  .filter(p => p.type === 'text')
                  .map(p => (p.type === 'text' ? p.text : ''))
                  .join('')
                if (!content && msg.role === 'assistant') return null
                return (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] ${msg.role === 'user' ? 'bg-primary text-on-primary px-6 py-4 rounded-xl shadow-sm' : 'bg-surface-container-high px-6 py-5 rounded-xl'}`}>
                      {msg.role === 'assistant' && <p className="font-headline text-lg italic text-primary mb-2">The Digital Curator</p>}
                      <p className={`text-sm ${msg.role === 'user' ? 'font-medium leading-relaxed italic' : 'text-on-surface-variant leading-relaxed'}`}>
                        {content}
                      </p>
                    </div>
                  </div>
                )
              })}
              {/* Typing Indicator */}
              {isLoading && (
                <div className="flex justify-start items-center gap-2 px-2">
                    <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSubmit} className="max-w-2xl w-full">
              {!input && (
                <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide">
                    <button type="button" onClick={() => handleSubmit(undefined, 'Find me wireless headphones under $80')} className="whitespace-nowrap px-4 py-1 text-[11px] uppercase tracking-wider bg-surface-container-highest border border-outline-variant/30 text-on-surface-variant hover:bg-primary hover:text-white transition-all rounded-full">Headphones under $80</button>
                    <button type="button" onClick={() => handleSubmit(undefined, 'Noise Cancelling')} className="whitespace-nowrap px-4 py-1 text-[11px] uppercase tracking-wider bg-surface-container-highest border border-outline-variant/30 text-on-surface-variant hover:bg-primary hover:text-white transition-all rounded-full">Noise Cancelling</button>
                </div>
              )}
              <div className="relative flex items-center">
                <input 
                  className="w-full bg-surface-container-high border-none focus:ring-1 focus:ring-primary-container py-4 pl-6 pr-16 text-sm rounded-xl" 
                  placeholder="Ask me anything..." 
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={isLoading}
                />
                <button disabled={isLoading || !input.trim()} className="absolute right-2 p-2 bg-primary text-on-primary hover:brightness-110 transition-colors rounded-lg disabled:opacity-50">
                  <span className="material-symbols-outlined text-sm">arrow_upward</span>
                </button>
              </div>
            </form>
          </section>

          {/* Right Column: Product Grid (45%) */}
          <section className="w-[45%] bg-surface overflow-y-auto scrollbar-hide p-12">
            <div className="mb-10">
              <h2 className="font-headline text-4xl italic text-on-surface tracking-tight">
                {isSearching ? 'Curating Selection...' : lastSearchQuery ? `Results for "${lastSearchQuery}"` : 'Curated Selection'}
              </h2>
              <p className="text-on-surface-variant text-sm mt-2">
                {isSearching ? 'Scouring the ecosystem for your request.' : 'Recommended for your technical specs.'}
              </p>
            </div>
            
            {isSearching ? (
              <div className="grid grid-cols-2 gap-8">
                <ProductCardSkeleton />
                <ProductCardSkeleton />
              </div>
            ) : currentProducts.length > 0 ? (
              <div className="grid grid-cols-2 gap-8">
                {currentProducts.map((product) => (
                  <ProductCard 
                    key={product.id}
                    product={product}
                    onAddToCart={() => handleSubmit(undefined, `Add the ${product.name} to my cart`)}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 opacity-40">
                <span className="material-symbols-outlined text-6xl mb-4">search</span>
                <p className="font-headline text-xl italic">Search for products in the chat</p>
              </div>
            )}
          </section>
        </main>
      </div>

      {/* Floating Action Button: Shopping Bag */}
      <div className={`fixed bottom-12 right-8 z-40 transition-all ${isOverlayOpen ? 'blur-sm pointer-events-none opacity-0 scale-90' : 'opacity-100 scale-100'}`}>
        <button 
          onClick={() => setIsCartOpen(true)}
          className="flex items-center gap-3 bg-primary text-on-primary px-6 py-3 shadow-xl hover:scale-105 transition-transform active:scale-95 rounded-full"
        >
          <span className="material-symbols-outlined text-lg">shopping_bag</span>
          <span className="text-xs font-bold uppercase tracking-widest">Bag | {cartItemCount} items</span>
        </button>
      </div>

      {/* UI OVERLAYS */}
      {/* Modal Backdrop */}
      {isOverlayOpen && (
        <div 
          className="fixed inset-0 bg-background/40 backdrop-blur-[16px] z-[60]"
          onClick={() => {
            if (checkoutStatus !== 'processing') {
              setIsCartOpen(false)
              setIsCheckoutOpen(false)
            }
          }}
        ></div>
      )}

      {/* Cart Sidebar */}
      <aside className={`fixed right-0 top-0 h-full w-[360px] bg-surface-container-lowest shadow-2xl z-[70] flex flex-col border-l border-outline-variant/20 transition-transform duration-300 ease-in-out ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-6 flex justify-between items-center border-b border-outline-variant/10">
          <h2 className="font-headline text-2xl italic text-on-surface">Your cart</h2>
          <button 
            onClick={() => setIsCartOpen(false)}
            className="material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors"
          >
            close
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full opacity-40">
              <span className="material-symbols-outlined text-6xl mb-4">shopping_cart</span>
              <p className="font-headline text-xl italic">Your cart is empty</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.productId} className="flex gap-4 items-start">
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-surface-container shrink-0 relative border border-outline-variant/20">
                  <Image className="w-full h-full object-cover" alt={item.productName} src={item.image} fill />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium leading-tight mb-1 text-on-surface">{item.productName}</p>
                  <p className="text-xs text-primary font-bold mb-3">{item.priceUsdc.toFixed(2)} USDC</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center bg-surface-container rounded-full px-2 py-1 gap-3">
                      <button 
                        onClick={() => updateQuantity(item.productId, -1)}
                        className="material-symbols-outlined text-xs text-on-surface hover:text-primary transition-colors"
                      >
                        remove
                      </button>
                      <span className="text-xs font-bold text-on-surface">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.productId, 1)}
                        className="material-symbols-outlined text-xs text-on-surface hover:text-primary transition-colors"
                      >
                        add
                      </button>
                    </div>
                    <button 
                      onClick={() => removeItem(item.productId)}
                      className="material-symbols-outlined text-on-surface-variant text-sm hover:text-error transition-colors"
                    >
                      delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        {cart.length > 0 && (
          <div className="p-6 border-t border-outline-variant/10 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-on-surface-variant text-sm">Subtotal</span>
              <span className="font-bold text-lg text-on-surface">{cartTotal.toFixed(2)} USDC</span>
            </div>
            <button 
              onClick={() => {
                setIsCartOpen(false)
                setIsCheckoutOpen(true)
              }}
              className="w-full bg-primary text-on-primary py-4 rounded-xl font-bold tracking-wide hover:brightness-110 transition-all shadow-lg shadow-primary/20"
            >
              Checkout
            </button>
          </div>
        )}
      </aside>

      {/* Payment Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center pointer-events-none p-4">
          <div className="w-full max-w-[420px] bg-surface-container-lowest p-8 rounded-2xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.1)] border border-outline-variant/30 pointer-events-auto transform transition-all animate-in fade-in zoom-in duration-200">
            {checkoutStatus === 'success' ? (
              <div className="text-center py-8 space-y-6">
                <div className="w-20 h-20 bg-tertiary-container rounded-full flex items-center justify-center mx-auto mb-4 text-on-tertiary-container">
                  <span className="material-symbols-outlined text-4xl">check_circle</span>
                </div>
                <h3 className="text-2xl font-headline italic">Payment Confirmed</h3>
                <p className="text-on-surface-variant text-sm leading-relaxed">
                  Your transaction has been settled on the Monad testnet. <br/>
                  <span className="font-bold text-primary">Settlement time: 394ms</span>
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 bg-primary-container rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-on-primary-container">link</span>
                  </div>
                  <h3 className="text-on-surface text-xl font-bold font-body">Confirm payment</h3>
                </div>
                <div className="space-y-6">
                  <div>
                    <p className="text-on-surface-variant text-xs font-bold uppercase tracking-widest mb-1">Amount</p>
                    <p className="text-4xl font-headline italic text-on-surface tracking-tight">{cartTotal.toFixed(2)} USDC</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-surface-container-high p-3 rounded-lg">
                      <p className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest mb-1">Network</p>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-tertiary rounded-full animate-pulse"></span>
                        <span className="text-on-surface font-medium text-sm">Monad testnet</span>
                      </div>
                    </div>
                    <div className="bg-surface-container-high p-3 rounded-lg">
                      <p className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest mb-1">Settlement</p>
                      <span className="text-tertiary font-bold text-sm">~400ms</span>
                    </div>
                  </div>
                  <div className="bg-surface-container-low p-4 rounded-lg border border-outline-variant/20">
                    <p className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest mb-1">Payment Method</p>
                    <div className="flex items-center justify-between">
                      <span className="text-on-surface font-mono text-sm">{address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '0x1a2b...9f0e'}</span>
                      <span className="material-symbols-outlined text-on-surface-variant text-sm cursor-pointer hover:text-primary transition-colors">content_copy</span>
                    </div>
                  </div>
                  <p className="text-on-surface-variant/70 text-[11px] leading-relaxed italic text-center">
                    Signing this transaction authorises a USDC transfer. No card details required.
                  </p>
                  <div className="flex gap-4 pt-2">
                    <button 
                      disabled={checkoutStatus === 'processing'}
                      onClick={() => setIsCheckoutOpen(false)}
                      className="flex-1 py-3 px-6 text-on-surface-variant font-bold text-sm hover:bg-surface-container-high rounded-lg transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button 
                      disabled={checkoutStatus === 'processing'}
                      onClick={handleCheckout}
                      className="flex-[2] bg-primary text-on-primary py-3 px-8 rounded-lg font-bold text-sm hover:brightness-110 transition-all shadow-lg shadow-primary/20 disabled:opacity-80 flex items-center justify-center gap-2"
                    >
                      {checkoutStatus === 'processing' ? (
                        <>
                          <div className="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin"></div>
                          Processing...
                        </>
                      ) : (
                        'Approve in wallet'
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {/* Order Confirmation Modal */}
      {orderConfirmation && (
        <OrderConfirmationModal 
          order={orderConfirmation} 
          onClose={() => setOrderConfirmation(null)} 
        />
      )}

      {/* Payment Error Toast */}
      {paymentError && (
        <Toast 
          message={paymentError} 
          type="error" 
          onDismiss={() => setPaymentError(null)} 
        />
      )}
    </div>
  )
}

function ProductCard({ product, onAddToCart }: { product: Product, onAddToCart: () => void }) {
  const { name, brand, priceUsdc, rating, reviewCount, image, className = "" } = product
  const [isAdded, setIsAdded] = useState(false)

  const handleAdd = () => {
    onAddToCart()
    setIsAdded(true)
    setTimeout(() => setIsAdded(false), 1500)
  }

  return (
    <div className={`bg-surface-container-low p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col rounded-[12px] ${className}`}>
      <div className="aspect-square bg-surface-container-lowest mb-4 overflow-hidden rounded-[8px] relative">
        <Image 
          alt={name} 
          src={image}
          fill
          className="object-cover mix-blend-multiply opacity-90"
        />
      </div>
      <p className="text-[10px] uppercase tracking-[0.2em] text-secondary font-bold mb-1">{brand}</p>
      <h3 className="font-headline text-lg leading-tight mb-1 line-clamp-2">{name}</h3>
      
      {/* Rating */}
      <div className="flex items-center gap-1 mb-3">
        <div className="flex text-amber-400">
            {[...Array(5)].map((_, i) => (
                <span key={i} className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: `'FILL' ${i < Math.floor(rating) ? 1 : 0}` }}>
                    star
                </span>
            ))}
        </div>
        <span className="text-[10px] text-on-surface-variant">({reviewCount})</span>
      </div>

      <div className="mt-auto flex justify-between items-center">
        <span className="font-mono text-sm font-semibold">{priceUsdc.toFixed(2)} USDC</span>
        <button 
          onClick={handleAdd}
          className={`px-4 py-2 flex items-center justify-center transition-all rounded-[4px] text-xs font-bold uppercase tracking-wider ${isAdded ? 'bg-tertiary text-on-tertiary' : 'bg-primary text-on-primary hover:brightness-110'}`}
        >
          {isAdded ? 'Added!' : (
            <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">add_shopping_cart</span>
                <span>Add</span>
            </div>
          )}
        </button>
      </div>
    </div>
  )
}
