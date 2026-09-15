import { useEffect, useRef, useState } from 'react';
import { getQuote, type PriceQuote } from '@/services/pricingService';
import { useConfigStore } from '@/store/ConfigProvider';

const DEBOUNCE_MS = 300;

export function usePriceQuote() {
  const product = useConfigStore((s) => s.product);
  const config = useConfigStore((s) => s.config);
  const [quote, setQuote] = useState<PriceQuote | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsLoading(true);

    timeoutRef.current = setTimeout(async () => {
      const requestId = ++requestIdRef.current;
      try {
        const result = await getQuote(product, config);
        // Ignore stale responses if the shopper kept editing while this was in flight.
        if (requestId === requestIdRef.current) {
          setQuote(result);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Pricing request failed', err);
        if (requestId === requestIdRef.current) setIsLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, JSON.stringify(config.selectedOptions), JSON.stringify(config.zoneStates)]);

  return { quote, isLoading };
}
