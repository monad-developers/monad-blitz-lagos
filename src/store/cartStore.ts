import { create } from 'zustand'

export interface Product {
  id: string
  name: string
  brand: string
  price: number
  priceUsdc: number
  category: string
  description: string
  image: string
  rating: number
  reviewCount: number
  inStock: boolean
  className?: string
}

export interface CartItem {
  productId: string
  productName: string
  priceUsdc: number
  quantity: number
  image: string
}

interface CartState {
  items: CartItem[]
  addItem: (product: Product, quantity: number) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, delta: number) => void
  clearCart: () => void
}

export const useCartStore = create<CartState>((set) => ({
  items: [],
  addItem: (product, quantity) => set((state) => {
    const existingItem = state.items.find((item) => item.productId === product.id)
    if (existingItem) {
      return {
        items: state.items.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        ),
      }
    }
    return {
      items: [
        ...state.items,
        {
          productId: product.id,
          productName: product.name,
          priceUsdc: product.priceUsdc,
          quantity,
          image: product.image,
        },
      ],
    }
  }),
  removeItem: (productId) => set((state) => ({
    items: state.items.filter((item) => item.productId !== productId),
  })),
  updateQuantity: (productId, delta) => set((state) => ({
    items: state.items.map((item) => {
      if (item.productId === productId) {
        const newQuantity = Math.max(0, item.quantity + delta)
        return { ...item, quantity: newQuantity }
      }
      return item
    }).filter(item => item.quantity > 0),
  })),
  clearCart: () => set({ items: [] }),
}))
