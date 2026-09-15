import type { ProductConfiguration, ProductDefinition } from '@/types/product';

export interface PriceLineItem {
  id: string;
  label: string;
  amountCents: number;
  category?: 'base' | 'customization' | 'tax';
}

export interface PriceQuote {
  currency: string;
  lineItems: PriceLineItem[];
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  hasCustomizations: boolean;
  configHash: string;
}

const NETWORK_LATENCY_MS = 150;

// Dynamic pricing rules in Rupees (stored in paise: 100 paise = ₹1)
const CUSTOMIZATION_RULES = {
  customColorPerSectionCents: 150000, // ₹1,500 per customized color section
  firstLogoIncluded: true,
  additionalLogoCents: 100000, // ₹1,000 for each additional logo
  textLayerCents: 50000, // ₹500 per custom text layer
  taxRate: 0.18, // 18% GST
};

function hashConfig(config: ProductConfiguration): string {
  const json = JSON.stringify(config.selectedOptions) + JSON.stringify(
    Object.values(config.zoneStates).map((z) => ({ bg: z.backgroundColor, layers: z.layers.length }))
  );
  let hash = 0;
  for (let i = 0; i < json.length; i++) {
    hash = (hash * 31 + json.charCodeAt(i)) | 0;
  }
  return hash.toString(16);
}

async function simulateNetwork<T>(value: T): Promise<T> {
  await new Promise((resolve) => setTimeout(resolve, NETWORK_LATENCY_MS));
  return value;
}

export async function getQuote(
  product: ProductDefinition,
  config: ProductConfiguration
): Promise<PriceQuote> {
  const lineItems: PriceLineItem[] = [];

  // 1. Variant option pricing (size, print sides)
  for (const section of product.sections) {
    if (section.type !== 'variant' || !section.options) continue;
    const option = section.options.find((o) => o.id === config.selectedOptions[section.id]);
    if (!option) continue;
    if (option.priceDeltaCents === 0 && section.id !== 'size') continue;
    lineItems.push({
      id: `option-${section.id}`,
      label: `${section.label}: ${option.label}`,
      amountCents: option.priceDeltaCents,
      category: 'base',
    });
  }

  // 2. Dynamic customization pricing per section
  let totalImageLayers = 0;
  let totalTextLayers = 0;
  const customColorSections: string[] = [];

  for (const section of product.sections) {
    if (section.type !== 'customization' || !section.zone) continue;
    const zoneState = config.zoneStates[section.zone.id];
    if (!zoneState) continue;

    const images = zoneState.layers.filter((l) => l.type === 'image');
    const texts = zoneState.layers.filter((l) => l.type === 'text');
    totalImageLayers += images.length;
    totalTextLayers += texts.length;

    // Check if section color is customized (non-white)
    if (
      zoneState.backgroundColor &&
      zoneState.backgroundColor.toLowerCase() !== '#ffffff' &&
      zoneState.backgroundColor.toLowerCase() !== '#fff'
    ) {
      customColorSections.push(section.zone.label);
    }
  }

  const hasCustomizations =
    totalImageLayers > 0 || totalTextLayers > 0 || customColorSections.length > 0;

  // Custom section colors
  if (customColorSections.length > 0) {
    lineItems.push({
      id: 'customization-colors',
      label: `Custom Color (${customColorSections.join(', ')})`,
      amountCents: customColorSections.length * CUSTOMIZATION_RULES.customColorPerSectionCents,
      category: 'customization',
    });
  }

  // Logos / Images
  if (totalImageLayers > 0) {
    const billableImages = Math.max(0, totalImageLayers - 1);
    lineItems.push({
      id: 'customization-first-logo',
      label: 'Primary Logo Print (Included)',
      amountCents: 0,
      category: 'customization',
    });
    if (billableImages > 0) {
      lineItems.push({
        id: 'customization-extra-logos',
        label: `Additional Logo Prints (${billableImages}x)`,
        amountCents: billableImages * CUSTOMIZATION_RULES.additionalLogoCents,
        category: 'customization',
      });
    }
  }

  // Custom text elements
  if (totalTextLayers > 0) {
    lineItems.push({
      id: 'customization-text',
      label: `Custom Text Elements (${totalTextLayers}x)`,
      amountCents: totalTextLayers * CUSTOMIZATION_RULES.textLayerCents,
      category: 'customization',
    });
  }

  const subtotalCents = lineItems.reduce((sum, li) => sum + li.amountCents, 0);
  const taxCents = Math.round(subtotalCents * CUSTOMIZATION_RULES.taxRate);
  const totalCents = subtotalCents + taxCents;

  return simulateNetwork({
    currency: product.currency,
    lineItems,
    subtotalCents,
    taxCents,
    totalCents,
    hasCustomizations,
    configHash: hashConfig(config),
  });
}

