'use client';

import { useState } from 'react';
import { PAYMENT_PRODUCTS } from '@/lib/dodo-payments';

interface PaymentCardProps {
  productId: string;
  onCheckout?: () => void;
}

export default function PaymentCard({
  productId,
  onCheckout,
}: PaymentCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const product = Object.values(PAYMENT_PRODUCTS).find(
    (p) => p.id === productId
  );

  if (!product) {
    return null;
  }

  const handleCheckout = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/payments/create-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productId }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { checkoutUrl } = await response.json();
      window.location.href = checkoutUrl;
      onCheckout?.();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An error occurred'
      );
      setIsLoading(false);
    }
  };

  const priceInDollars = (product.price / 100).toFixed(2);

  return (
    <div className="border border-gray-200 rounded-lg p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        {product.name}
      </h3>
      <p className="text-gray-600 text-sm mb-4">
        {product.description}
      </p>
      <div className="mb-4">
        <span className="text-3xl font-bold text-gray-900">
          ${priceInDollars}
        </span>
        {product.trial_days && (
          <p className="text-xs text-gray-500 mt-1">
            {product.trial_days} day free trial
          </p>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      <button
        onClick={handleCheckout}
        disabled={isLoading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
      >
        {isLoading ? 'Processing...' : 'Get Started'}
      </button>
    </div>
  );
}
