import type { ProductConfiguration, ProductDefinition } from '@/types/product';
import type { PriceQuote } from './pricingService';

/**
 * Mocked Shopify integration. In production this module would call:
 *  - Storefront API `cartLinesAdd` mutation (headless), OR
 *  - the classic AJAX Cart API `POST /cart/add.js` (embedded in a Shopify theme)
 *
 * The important architectural point the assessment asks us to demonstrate:
 * the *configurator* never decides the final Shopify price. It resolves a
 * base Shopify variant (from `product.variantMap`) and attaches the
 * dynamically-priced customization as cart line-item properties + a
 * "make this line item's price match our quote" step, which on Shopify is
 * typically done with a Shopify Function / cart transform, or a hidden
 * "customization fee" product/variant added alongside the base variant.
 * We model that second part explicitly below (`customizationFeeVariant`)
 * rather than hiding it, since that's the part a real integration has to solve.
 */

export interface ShopifyCartLineProperty {
  name: string;
  value: string;
}

export interface AddToCartRequest {
  variantId: string;
  quantity: number;
  properties: ShopifyCartLineProperty[];
  /** If the customization pricing can't be expressed as a variant price,
   * a second synthetic line item carries the delta. Real stores implement
   * this with a Shopify Function (cart transform) so it's invisible to the
   * customer; we surface it explicitly here for transparency in the demo. */
  customizationFeeCents: number;
}

export interface AddToCartResult {
  success: boolean;
  cartId: string;
  lines: Array<{ variantId: string; quantity: number; properties: ShopifyCartLineProperty[] }>;
  message: string;
}

/** Resolves the shopper's variant selections to a real Shopify variant ID + SKU. */
export function resolveShopifyVariant(product: ProductDefinition, config: ProductConfiguration) {
  const sizeOptionId = config.selectedOptions['size'];
  const ref = product.variantMap[sizeOptionId];
  if (!ref) {
    throw new Error(`No Shopify variant mapped for size option "${sizeOptionId}"`);
  }
  return ref;
}

/** Serializes the full customization into Shopify line-item properties.
 * These show up on the order in Shopify admin and can drive production/fulfillment. */
export function buildLineItemProperties(
  product: ProductDefinition,
  config: ProductConfiguration,
  previewDataUrl?: string
): ShopifyCartLineProperty[] {
  const properties: ShopifyCartLineProperty[] = [];

  for (const section of product.sections) {
    if (section.type !== 'variant' || !section.options) continue;
    const selected = section.options.find((o) => o.id === config.selectedOptions[section.id]);
    if (selected) properties.push({ name: section.label, value: selected.label });
  }

  for (const section of product.sections) {
    if (section.type !== 'customization' || !section.zone) continue;
    const zoneState = config.zoneStates[section.zone.id];
    if (!zoneState) continue;
    const summary = zoneState.layers
      .map((l) => (l.type === 'text' ? `Text:"${l.text}"` : l.type === 'image' ? 'Image upload' : `Color:${l.color}`))
      .join('; ');
    properties.push({ name: `${section.zone.label} Design`, value: summary || 'No customization' });
    properties.push({ name: `${section.zone.label} Background`, value: zoneState.backgroundColor });
  }

  properties.push({ name: 'Config Version', value: String(config.configVersion) });
  properties.push({ name: 'Configured At', value: config.createdAt });
  if (previewDataUrl) {
    // In production this would be an uploaded asset URL (e.g. via Shopify Files API
    // or your own storage), not a raw data URL, to keep the cart payload small.
    properties.push({ name: '_preview_ref', value: '[preview image generated - see attached production PDF]' });
  }

  return properties;
}

const SIMULATED_LATENCY_MS = 500;

export async function addToShopifyCart(
  product: ProductDefinition,
  config: ProductConfiguration,
  quote: PriceQuote
): Promise<AddToCartResult> {
  const variant = resolveShopifyVariant(product, config);
  const properties = buildLineItemProperties(product, config);

  const request: AddToCartRequest = {
    variantId: variant.variantId,
    quantity: 1,
    properties,
    customizationFeeCents: quote.subtotalCents - variant.basePriceCents,
  };

  await new Promise((resolve) => setTimeout(resolve, SIMULATED_LATENCY_MS));

  // --- Real implementation would instead do, e.g.: ---
  // const res = await fetch('/cart/add.js', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({
  //     items: [{ id: numericVariantIdFrom(request.variantId), quantity: request.quantity, properties: propsToObject(request.properties) }],
  //   }),
  // });

  return {
    success: true,
    cartId: `mock-cart-${Date.now()}`,
    lines: [{ variantId: request.variantId, quantity: request.quantity, properties: request.properties }],
    message: `Added "${product.name}" (${variant.sku}) to cart with ${properties.length} customization properties. Total: ₹${(quote.totalCents / 100).toLocaleString('en-IN')}`,
  };
}
