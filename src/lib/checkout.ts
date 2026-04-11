
import { wrapFetchWithPaymentFromConfig } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm/exact/client";

export interface OrderConfirmation {
  success: boolean;
  txHash: string;
  explorerUrl: string;
  timestamp: string;
  totalPaid: string;
  items: any[];
}

/**
 * Executes the checkout process using x402 payment protocol.
 * @param items The items in the cart
 * @param total The total amount in USDC
 * @param walletClient The viem wallet client (must have address and signTypedData)
 * @returns Order confirmation details
 */
export async function checkout(
  items: any[],
  total: number,
  walletClient: any
): Promise<OrderConfirmation> {
  // Wrap fetch with x402 payment handling
  const fetchWithPayment = wrapFetchWithPaymentFromConfig(fetch, {
    schemes: [
      {
        network: "eip155:10143", // Monad Testnet
        client: new ExactEvmScheme(walletClient),
      },
    ],
  });

  try {
    const response = await fetchWithPayment(`/api/checkout?total=${total.toFixed(2)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ items }),
    });

    if (!response.ok) {
      if (response.status === 402) {
        throw new Error("Payment failed - Insufficient funds or verification error");
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Checkout failed with status ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error('Checkout error:', error);
    
    // Handle specific error cases
    if (error.code === 4001 || error.message?.toLowerCase().includes('user rejected')) {
      throw new Error("Payment cancelled");
    }
    
    if (error.message?.includes('insufficient funds')) {
      throw new Error("Insufficient USDC balance");
    }
    
    throw new Error(error.message || "Network error — please try again");
  }
}
