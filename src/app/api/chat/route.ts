import { google } from '@ai-sdk/google'
import { streamText, tool, ModelMessage, stepCountIs } from 'ai'
import { z } from 'zod'
import productsData from '@/../data/products.json'

interface Product {
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
}

const products = productsData as Product[]

export const runtime = 'edge'

const SYSTEM_PROMPT = `You are MONA, an AI shopping assistant built on Monad blockchain.
You help users find products through natural conversation.

You have access to these tools:
- searchProducts: search the product catalog by query, price, and category
- addToCart: add a product to the user's cart

Rules:
- Always be conversational and helpful.
- When a user describes what they want, call searchProducts.
- If search returns fewer than 2 results, retry with broader terms before responding.
- When adding to cart, confirm the specific item before calling addToCart.
- Keep responses concise — the UI shows product cards separately, so don't list products in text.`

export async function POST(req: Request) {
  const { messages }: { messages: ModelMessage[] } = await req.json()

  const result = streamText({
    model: google('gemini-2.0-flash-001'),
    system: SYSTEM_PROMPT,
    messages,
    stopWhen: stepCountIs(5),
    onError: ({ error }) => {
      console.error('Gemini Stream Error:', error)
    },
    tools: {
      searchProducts: tool({
        description: 'Search the product catalog and return matching items.',
        parameters: z.object({
          query: z.string().describe('The plain-text search term'),
          maxPrice: z.number().optional().describe('Maximum price filter'),
          category: z.string().optional().describe('One of: electronics, footwear, bags, accessories, gaming')
        }),
        execute: async ({ query, maxPrice, category }: { query: string, maxPrice?: number, category?: string }) => {
          const lowerQuery = query.toLowerCase()
          const filtered = products.filter((p) => {
            const matchesText = p.name.toLowerCase().includes(lowerQuery) || 
                               p.brand.toLowerCase().includes(lowerQuery) || 
                               p.description.toLowerCase().includes(lowerQuery)
            const matchesPrice = maxPrice ? p.price <= maxPrice : true
            const matchesCategory = category ? p.category === category : true
            return matchesText && matchesPrice && matchesCategory
          })
          return filtered.slice(0, 6)
        }
      } as any),
      addToCart: tool({
        description: 'Add a product to the user\'s cart.',
        parameters: z.object({
          productId: z.string().describe('The unique ID of the product'),
          quantity: z.number().default(1).describe('The quantity to add')
        }),
        execute: async ({ productId, quantity }: { productId: string, quantity: number }) => {
          const product = products.find(p => p.id === productId)
          if (!product) {
            return { success: false, message: 'Product not found' }
          }
          return {
            success: true,
            productId,
            productName: product.name,
            quantity: quantity || 1,
            product,
            message: `${quantity || 1} x ${product.name} added to cart`
          }
        }
      } as any)
    }
  })

  return result.toUIMessageStreamResponse()
}
