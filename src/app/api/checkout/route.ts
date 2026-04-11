import { NextRequest, NextResponse } from "next/server";
import { withX402, x402ResourceServer } from "@x402/next";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";

export const runtime = 'nodejs';

const facilitatorUrl = process.env.X402_FACILITATOR_URL || "https://x402-facilitator.molandak.org";
const payTo = (process.env.PAYMENT_RECIPIENT_ADDRESS || "0xb23c769dFc7ef020ec60A19567aB675C46a49910") as `0x${string}`;

const facilitator = new HTTPFacilitatorClient({ url: facilitatorUrl });
const server = new x402ResourceServer(facilitator)
  .register("eip155:10143", new ExactEvmScheme());

interface CheckoutResponse {
  success?: boolean;
  txHash?: string;
  explorerUrl?: string;
  timestamp?: string;
  totalPaid?: string;
  items?: any[];
  error?: string;
}

async function handler(req: NextRequest): Promise<NextResponse<CheckoutResponse>> {
  try {
    const body = await req.json();
    const { items } = body;
    
    // Get transaction hash from payment headers
    const paymentHeader = req.headers.get('payment-signature') || req.headers.get('x-payment');
    let txHash = '0x...';
    
    if (paymentHeader) {
      try {
        // x402 v2 uses base64 encoded JSON for payment-signature
        const decoded = JSON.parse(Buffer.from(paymentHeader, 'base64').toString());
        txHash = decoded.payload?.transactionHash || decoded.payload?.hash || txHash;
      } catch (e) {
        console.error('Failed to decode payment header:', e);
      }
    }

    const total = req.nextUrl.searchParams.get('total') || '0';
    
    return NextResponse.json({
      success: true,
      txHash,
      explorerUrl: `https://testnet.monadexplorer.com/tx/${txHash}`,
      timestamp: new Date().toISOString(),
      totalPaid: total,
      items
    });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const POST = withX402<CheckoutResponse>(
  handler,
  {
    accepts: {
      scheme: "exact",
      price: (context) => {
        const total = context.adapter.getQueryParam?.('total');
        const priceValue = Array.isArray(total) ? total[0] : total;
        return `$${priceValue || '0'}`;
      },
      network: "eip155:10143",
      payTo
    },
    description: "MONA Order Checkout"
  },
  server
);
