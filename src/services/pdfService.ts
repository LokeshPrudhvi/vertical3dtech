import { jsPDF } from 'jspdf';
import type { ProductConfiguration, ProductDefinition } from '@/types/product';
import type { PriceQuote } from './pricingService';
import { resolveShopifyVariant } from './shopifyService';

export interface PreviewImage {
  label: string;
  dataUrl: string; // PNG data URL
}

/**
 * Builds a one-page "production summary" PDF: order/variant identifiers,
 * every customer selection, customization details per zone, pricing
 * breakdown, and preview snapshot(s). The Shopify variant ID + a generated
 * config reference are printed at the top specifically so this PDF can be
 * uploaded as an order attachment (e.g. via a Shopify order metafield or
 * fulfillment note) and matched back to the cart line item that created it.
 */
export function generateProductionSummaryPdf(
  product: ProductDefinition,
  config: ProductConfiguration,
  quote: PriceQuote | null,
  previews: PreviewImage[]
): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const margin = 48;
  let y = margin;
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Production Summary', margin, y);
  y += 22;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(90);
  doc.text(`${product.name}`, margin, y);
  y += 14;

  let variantLine = 'Shopify variant: unresolved';
  try {
    const variant = resolveShopifyVariant(product, config);
    variantLine = `Shopify variant: ${variant.sku} (${variant.variantId})`;
  } catch {
    // leave default
  }
  doc.text(variantLine, margin, y);
  y += 14;
  doc.text(`Config reference: ${config.productId}-${config.createdAt}`, margin, y);
  y += 24;
  doc.setTextColor(0);

  // --- Selections ---
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Selections', margin, y);
  y += 18;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  for (const section of product.sections) {
    if (section.type !== 'variant' || !section.options) continue;
    const selected = section.options.find((o) => o.id === config.selectedOptions[section.id]);
    if (!selected) continue;
    doc.text(`${section.label}:`, margin, y);
    doc.text(selected.label, margin + 140, y);
    y += 16;
  }

  y += 10;

  // --- Customization detail ---
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Customization Detail', margin, y);
  y += 18;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  for (const section of product.sections) {
    if (section.type !== 'customization' || !section.zone) continue;
    const zoneState = config.zoneStates[section.zone.id];
    if (!zoneState) continue;

    doc.setFont('helvetica', 'bold');
    doc.text(`${section.zone.label}`, margin, y);
    doc.setFont('helvetica', 'normal');
    y += 14;
    doc.text(
      `Print area: ${section.zone.printSize.widthIn}" x ${section.zone.printSize.heightIn}"  |  Base color: ${zoneState.backgroundColor}`,
      margin,
      y
    );
    y += 14;

    if (zoneState.layers.length === 0) {
      doc.text('No custom elements added.', margin, y);
      y += 14;
    } else {
      zoneState.layers.forEach((layer, i) => {
        const desc =
          layer.type === 'text'
            ? `Text "${layer.text}" - ${layer.color}, size ${Math.round(layer.scale * 100)}%, rotation ${layer.rotation}°`
            : layer.type === 'image'
              ? `Uploaded image - position (${Math.round(layer.x * 100)}%, ${Math.round(layer.y * 100)}%), scale ${Math.round(layer.scale * 100)}%`
              : `Color fill - ${layer.color}`;
        doc.text(`${i + 1}. ${desc}`, margin + 10, y);
        y += 14;
      });
    }
    y += 8;
  }

  // --- Pricing ---
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Pricing Breakdown', margin, y);
  y += 18;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  if (quote) {
    for (const li of quote.lineItems) {
      doc.text(li.label, margin, y);
      doc.text(li.amountCents === 0 ? 'Included' : `₹${(li.amountCents / 100).toLocaleString('en-IN')}`, pageWidth - margin - 80, y);
      y += 14;
    }
    y += 4;
    doc.setDrawColor(200);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 14;

    doc.text('Subtotal', margin, y);
    doc.text(`₹${(quote.subtotalCents / 100).toLocaleString('en-IN')}`, pageWidth - margin - 80, y);
    y += 14;

    doc.text('Estimated GST (18%)', margin, y);
    doc.text(`₹${(quote.taxCents / 100).toLocaleString('en-IN')}`, pageWidth - margin - 80, y);
    y += 14;

    doc.setFont('helvetica', 'bold');
    doc.text('Total (incl. GST)', margin, y);
    doc.text(`₹${(quote.totalCents / 100).toLocaleString('en-IN')}`, pageWidth - margin - 80, y);
    y += 22;
  } else {
    doc.text('Quote unavailable at time of export.', margin, y);
    y += 20;
  }

  // --- Preview images ---
  if (previews.length > 0) {
    if (y > 500) {
      doc.addPage();
      y = margin;
    }
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Preview', margin, y);
    y += 14;

    const imgSize = 220;
    let x = margin;
    for (const preview of previews) {
      if (x + imgSize > pageWidth - margin) {
        x = margin;
        y += imgSize + 24;
      }
      try {
        doc.addImage(preview.dataUrl, 'PNG', x, y, imgSize, imgSize);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(preview.label, x, y + imgSize + 14);
      } catch {
        // Skip a preview that failed to encode rather than failing the whole export.
      }
      x += imgSize + 24;
    }
  }

  return doc;
}
