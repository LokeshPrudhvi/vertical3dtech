import type { PriceQuote } from '@/services/pricingService';

export function PriceSummary({ quote, isLoading }: { quote: PriceQuote | null; isLoading: boolean }) {
  const baseItems = quote?.lineItems.filter((i) => i.category === 'base') || [];
  const customItems = quote?.lineItems.filter((i) => i.category === 'customization') || [];

  return (
    <section className="price-summary" aria-label="Order Price Calculation" aria-live="polite">
      <div className="price-summary-header">
        <h3>Live Price Summary</h3>
        {quote?.hasCustomizations && (
          <span className="custom-badge" role="status">Custom Design</span>
        )}
      </div>

      <div className="price-section">
        <span className="price-section-title">Base Product</span>
        <ul className="price-lines">
          {baseItems.map((li) => (
            <li key={li.id}>
              <span>{li.label}</span>
              <span className="price-val">
                {li.amountCents === 0 ? 'Included' : `₹${(li.amountCents / 100).toLocaleString('en-IN')}`}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {customItems.length > 0 && (
        <div className="price-section customization-section">
          <span className="price-section-title">Customizations</span>
          <ul className="price-lines">
            {customItems.map((li) => (
              <li key={li.id} className="custom-line-item">
                <span>{li.label}</span>
                <span className="price-val">
                  {li.amountCents === 0 ? 'Included' : `+₹${(li.amountCents / 100).toLocaleString('en-IN')}`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="price-breakdown-totals">
        <div className="price-subrow">
          <span>Subtotal</span>
          <span>{quote ? `₹${(quote.subtotalCents / 100).toLocaleString('en-IN')}` : '—'}</span>
        </div>
        <div className="price-subrow">
          <span>Estimated GST (18%)</span>
          <span>{quote ? `₹${(quote.taxCents / 100).toLocaleString('en-IN')}` : '—'}</span>
        </div>
        <div className="price-total">
          <span>Total</span>
          <span className="price-total-val" aria-label={`Total price: ${quote ? (quote.totalCents / 100).toLocaleString('en-IN') : '0'} rupees`}>
            {quote ? `₹${(quote.totalCents / 100).toLocaleString('en-IN')}` : '—'}
          </span>
        </div>
      </div>

      {isLoading && <p className="price-loading" role="status">Recalculating price…</p>}
    </section>
  );
}


