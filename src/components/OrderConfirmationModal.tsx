'use client';

import React from 'react';
import { OrderConfirmation } from '@/lib/checkout';

interface OrderConfirmationModalProps {
  order: OrderConfirmation;
  onClose: () => void;
}

export const OrderConfirmationModal: React.FC<OrderConfirmationModalProps> = ({ order, onClose }) => {
  const truncateHash = (hash: string) => {
    if (!hash || hash === '0x...') return hash;
    return `${hash.slice(0, 10)}...${hash.slice(-6)}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Optional: show a small toast for copy success
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in duration-300">
        <div className="p-8 text-center">
          {/* Success Icon */}
          <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-2">Order confirmed</h2>
          <p className="text-green-500 font-medium mb-8">Settled on Monad in ~400ms</p>
          
          {/* Order Summary */}
          <div className="bg-neutral-800/50 rounded-xl p-4 mb-6 text-left">
            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">Order Summary</h3>
            <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
              {order.items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-neutral-300">
                    <span className="text-neutral-500 mr-1">{item.quantity}x</span> {item.product.name}
                  </span>
                  <span className="text-white">${(item.product.priceUsdc * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-neutral-700 pt-3 flex justify-between font-bold">
              <span className="text-neutral-300">Total Paid</span>
              <span className="text-white">{order.totalPaid} USDC</span>
            </div>
          </div>
          
          {/* Transaction Info */}
          <div className="bg-neutral-800/30 rounded-xl p-4 mb-8 text-left border border-neutral-800">
            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Transaction</h3>
            <div className="flex items-center justify-between gap-2">
              <code className="text-xs text-neutral-400 font-mono break-all">
                {truncateHash(order.txHash)}
              </code>
              <button 
                onClick={() => copyToClipboard(order.txHash)}
                className="text-neutral-500 hover:text-white transition-colors"
                title="Copy hash"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
              </button>
            </div>
            
            <a 
              href={order.explorerUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 font-medium mt-3 transition-colors"
            >
              View on Monad explorer
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
          
          <button
            onClick={onClose}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl transition-all active:scale-95 shadow-lg shadow-purple-600/20"
          >
            Continue shopping
          </button>
        </div>
      </div>
    </div>
  );
};
