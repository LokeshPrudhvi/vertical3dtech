import type { ProductDefinition } from '@/types/product';


export const tentProduct: ProductDefinition = {
  id: '10x10-logo-canopy-tent',
  name: '10x10 Logo Canopy Tent',
  basePriceCents: 0, // size option carries the full base price for this product
  currency: 'INR',
  sections: [
    {
      id: 'size',
      label: 'Size',
      type: 'variant',
      options: [
        {
          id: 'size-5x5',
          label: "5' x 5'",
          priceDeltaCents: 4490000, // ₹44,900
          modelAsset: '/models/Tent_5_5.glb',
          sku: 'TENT-5X5-FRAME',
        },
        {
          id: 'size-6_5x6_5',
          label: "6.5' x 6.5'",
          priceDeltaCents: 5490000, // ₹54,900
          modelAsset: '/models/Tent_6_5_6_5.glb',
          sku: 'TENT-6_5X6_5-FRAME',
        },
        {
          id: 'size-8x8',
          label: "8' x 8'",
          priceDeltaCents: 6990000, // ₹69,900
          modelAsset: '/models/Tent_8_8.glb',
          sku: 'TENT-8X8-FRAME',
        },
      ],
    },
    {
      id: 'section-front',
      label: 'Front Surface',
      type: 'customization',
      zone: {
        id: 'front',
        label: 'Front',
        targetMeshName: 'fabric',
        targetMaterialName: 'fabric_Mat',
        aspectRatio: 1.4,
        canvasResolution: { width: 1400, height: 1000 },
        printSize: { widthIn: 120, heightIn: 84 },
        allowedCustomizations: ['text', 'image', 'color'],
      },
    },
    {
      id: 'section-back',
      label: 'Back Surface',
      type: 'customization',
      zone: {
        id: 'back',
        label: 'Back',
        targetMeshName: 'fabric',
        targetMaterialName: 'fabric_Mat',
        aspectRatio: 1.4,
        canvasResolution: { width: 1400, height: 1000 },
        printSize: { widthIn: 120, heightIn: 84 },
        allowedCustomizations: ['text', 'image', 'color'],
      },
    },
    {
      id: 'section-left',
      label: 'Left Surface',
      type: 'customization',
      zone: {
        id: 'left',
        label: 'Left',
        targetMeshName: 'fabric',
        targetMaterialName: 'fabric_Mat',
        aspectRatio: 1.4,
        canvasResolution: { width: 1400, height: 1000 },
        printSize: { widthIn: 120, heightIn: 84 },
        allowedCustomizations: ['text', 'image', 'color'],
      },
    },
    {
      id: 'section-right',
      label: 'Right Surface',
      type: 'customization',
      zone: {
        id: 'right',
        label: 'Right',
        targetMeshName: 'fabric',
        targetMaterialName: 'fabric_Mat',
        aspectRatio: 1.4,
        canvasResolution: { width: 1400, height: 1000 },
        printSize: { widthIn: 120, heightIn: 84 },
        allowedCustomizations: ['text', 'image', 'color'],
      },
    },
  ],
  // Shopify variant map keyed by `${sizeOptionId}`
  variantMap: {
    'size-5x5': { variantId: 'gid://shopify/ProductVariant/1000000001', sku: 'TENT-5X5-FRAME', basePriceCents: 4490000 },
    'size-6_5x6_5': { variantId: 'gid://shopify/ProductVariant/1000000002', sku: 'TENT-6_5X6_5-FRAME', basePriceCents: 5490000 },
    'size-8x8': { variantId: 'gid://shopify/ProductVariant/1000000003', sku: 'TENT-8X8-FRAME', basePriceCents: 6990000 },
  },
};

