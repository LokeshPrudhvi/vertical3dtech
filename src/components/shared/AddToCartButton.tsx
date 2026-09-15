import { useState } from 'react';
import { useConfigStore } from '@/store/ConfigProvider';
import { addToShopifyCart, type AddToCartResult } from '@/services/shopifyService';
import type { PriceQuote } from '@/services/pricingService';

export function AddToCartButton({ quote }: { quote: PriceQuote | null }) {
  const product = useConfigStore((s) => s.product);
  const config = useConfigStore((s) => s.config);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<AddToCartResult | null>(null);

  const handleClick = async () => {
    if (!quote) return;
    setIsSubmitting(true);
    setResult(null);
    try {
      const res = await addToShopifyCart(product, config, quote);
      setResult(res);

      // When embedded via <iframe> on a merchant's site, the host page can't
      // reach into our DOM - so we broadcast the result via postMessage. The
      // host listens for this and can open its own cart drawer, redirect to
      // checkout, or just log analytics. See public/embed-example.html.
      if (window.parent !== window) {
        window.parent.postMessage({ type: 'CONFIGURATOR_ADD_TO_CART', payload: res }, '*');
      }
    } catch (err) {
      setResult({
        success: false,
        cartId: '',
        lines: [],
        message: err instanceof Error ? err.message : 'Failed to add to cart.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="add-to-cart">
      <button className="add-to-cart-button" onClick={handleClick} disabled={!quote || isSubmitting}>
        {isSubmitting ? 'Adding…' : 'Add Custom Tent to Cart'}
      </button>
      {result && (
        <p className={`add-to-cart-result ${result.success ? 'success' : 'error'}`}>{result.message}</p>
      )}
    </div>
  );
}
