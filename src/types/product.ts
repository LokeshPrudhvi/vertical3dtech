/**
 * Generic product-configurator type system.
 *
 * Design goal: none of these types know anything about "tents". A ProductDefinition
 * describes ANY physical product made of customizable Zones grouped into Sections,
 * with Options that affect price/geometry, and Zones that accept text/image/color
 * customization. A new product (t-shirt, banner, tablecloth) is added by writing a
 * new ProductDefinition + swapping the 3D model, not by writing new components.
 */

/** A rectangular (or arbitrary) area on the product that can carry custom artwork. */
export interface CustomizationZone {
  id: string;
  label: string;
  /** Which mesh/material in the 3D model this zone's rendered texture should be applied to. */
  targetMeshName: string;
  targetMaterialName: string;
  /** Aspect ratio the 2D canvas should render at, so the texture maps correctly (w/h). */
  aspectRatio: number;
  /** Pixel dimensions used for the offscreen 2D->texture canvas. Higher = crisper print/preview. */
  canvasResolution: { width: number; height: number };
  /** Real-world print dimensions, used for the production PDF and DPI warnings. */
  printSize: { widthIn: number; heightIn: number };
  allowedCustomizations: Array<'text' | 'image' | 'color'>;
}

/** A selectable option within a variant axis (e.g. "Size", "Side Walls"). */
export interface ProductOption {
  id: string;
  label: string;
  /** Base price delta in USD cents contributed by choosing this option (before dynamic pricing rules). */
  priceDeltaCents: number;
  /** Optional: swaps the 3D model asset when this option is chosen (e.g. different tent size). */
  modelAsset?: string;
  /** Optional metadata passed through to pricing/Shopify services untouched. */
  sku?: string;
  meta?: Record<string, unknown>;
}

/** One axis of product configuration (e.g. Size, Side Walls, Half Walls). */
export interface ProductSection {
  id: string;
  label: string;
  type: 'variant' | 'customization';
  /** Present when type === 'variant' */
  options?: ProductOption[];
  /** Present when type === 'customization' */
  zone?: CustomizationZone;
}

export interface ProductDefinition {
  id: string;
  name: string;
  basePriceCents: number;
  currency: string;
  sections: ProductSection[];
  /** Maps a combination of variant option ids -> Shopify variant id (see shopifyService). */
  variantMap: Record<string, ShopifyVariantRef>;
}

export interface ShopifyVariantRef {
  variantId: string;
  sku: string;
  /** Shopify's own price for this exact variant combo, in cents. Authoritative once resolved via API. */
  basePriceCents: number;
}

// ---- Live configuration state (what the shopper has actually chosen) ----

export type LayerType = 'text' | 'image' | 'color';

export interface BaseLayer {
  id: string;
  type: LayerType;
  x: number; // normalized 0-1 within the zone canvas
  y: number;
  scale: number;
  rotation: number; // degrees
  zIndex: number;
}

export interface TextLayer extends BaseLayer {
  type: 'text';
  text: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  fontWeight: 'normal' | 'bold';
}

export interface ImageLayer extends BaseLayer {
  type: 'image';
  src: string; // data URL or blob URL
  naturalWidth: number;
  naturalHeight: number;
}

export interface ColorLayer extends BaseLayer {
  type: 'color';
  /** Fills the whole zone background (e.g. canopy base color) */
  color: string;
}

export type Layer = TextLayer | ImageLayer | ColorLayer;

/** Per-zone customization state. */
export interface ZoneState {
  zoneId: string;
  backgroundColor: string;
  layers: Layer[];
}

/** Full shopper configuration for one product instance. This is the structured
 * data that gets persisted, priced, sent to Shopify, and rendered into the PDF. */
export interface ProductConfiguration {
  productId: string;
  /** selected option id per variant-type section id */
  selectedOptions: Record<string, string>;
  /** customization state per zone id */
  zoneStates: Record<string, ZoneState>;
  createdAt: string;
  configVersion: 1;
}

export function createEmptyZoneState(zoneId: string): ZoneState {
  return { zoneId, backgroundColor: '#ffffff', layers: [] };
}
