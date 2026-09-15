# Canopy Tent — Interactive 3D/2D Product Configurator

An interactive product configurator featuring a real-time **2D unfolded blueprint engine**, live **3D WebGL synchronization (Three.js / React Three Fiber)**, dynamic **API-driven pricing**, **Shopify cart integration**, and **vector production PDF export**.

---

## Live Demo & Repository

- **Live Demo on Vercel:** [https://vertical3dtech.vercel.app/](https://vertical3dtech.vercel.app/)
- **Shopify Iframe Embed Demo:** [https://vertical3dtech.vercel.app/embed-example.html](https://vertical3dtech.vercel.app/embed-example.html)
- **GitHub Repository:** [https://github.com/LokeshPrudhvi/vertical3dtech](https://github.com/LokeshPrudhvi/vertical3dtech)

---

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Local Development Server
```bash
npm run dev
# Open http://localhost:5173 in your browser
```

### 3. Build for Production
```bash
npm run build
# Generates production bundle in dist/
```

---

## Architecture at a Glance

```
src/
├── types/
│   └── product.ts            # Generic schema: ProductDefinition, Section, Zone, Layer, Configuration
├── data/
│   └── tentProduct.ts        # Tent product configuration (sizes, zones, pricing, SKUs)
├── store/
│   ├── configStore.ts        # Zustand single-source-of-truth store factory
│   └── ConfigProvider.tsx    # Scoped React Context Provider
├── lib/
│   ├── layerUtils.ts         # Layer creation helpers (text, image uploads)
│   └── renderZoneToCanvas.ts # Universal 2D/3D canvas rendering engine & master 2048x2048 atlas
├── hooks/
│   ├── useZoneCanvas.ts      # Debounced canvas repaint hook shared by 2D & 3D texture
│   └── usePriceQuote.ts      # Debounced async pricing calculation hook
├── services/
│   ├── pricingService.ts     # Async mock pricing API with 18% GST
│   ├── shopifyService.ts     # Shopify variant resolver, line-item properties & cart add
│   └── pdfService.ts         # jsPDF vector specification sheet & production summary generator
└── components/
    ├── Configurator.tsx      # Main view orchestrator (Product View vs. Studio Mode)
    ├── Editor2D/             # Unfolded2DLayout, Canvas2DEditor, Toolbar, LayerList
    ├── Preview3D/            # Scene3D, TentModel (Three.js WebGL viewport)
    └── shared/               # OptionSection, PriceSummary, AddToCartButton, ExportPdfButton
```

---

## Key Technical Decisions

### 1. Reusable Domain Model (`ProductDefinition`)
All components, hooks, and services operate against generic domain types (`ProductDefinition`, `ProductSection`, `CustomizationZone`, `Layer`) rather than hardcoding tent-specific logic. Adding another customizable product (such as a Table Cover, Banner, or Apparel) requires only creating a data file and passing it to `<Configurator product={...} />`.

### 2. Single Source of Truth & 2D/3D Synchronization
Rather than maintaining separate states that can drift out of sync, both the 2D blueprint editor and 3D WebGL scene subscribe to the same Zustand state (`zoneStates`). A single universal function (`renderZoneToCanvas.ts`) composites designs onto an offscreen $2048 \times 2048$ canvas atlas bound to `material.map` (`THREE.CanvasTexture`) on the 3D model. Setting `texture.needsUpdate = true` updates GPU memory seamlessly at 60 FPS without state drift.

### 3. Non-Overlapping 2D Blueprint Geometry
Canopy faces are modeled as unified 5-sided polygons (`[Apex, HipRight, ValanceRight, ValanceLeft, HipLeft]`) meeting at $45^\circ$ diagonal seams with $90^\circ$ inside corner cutouts. Strict canvas path clipping (`ctx.clip()`) guarantees artwork remains crisp and contained without corner collisions, while pointer hit-testing and radial quadrant math allow users to drag elements smoothly across all four surfaces.

### 4. API-First Pricing & Shopify Cart Bridge
Pricing logic is decoupled into an asynchronous service (`pricingService.ts`) with base size pricing, custom surface fees, extra logo costs, and 18% GST. When adding to cart, `shopifyService.ts` maps selections to Shopify Variant IDs, calculates customization fee deltas, serializes line-item properties, and broadcasts `CONFIGURATOR_ADD_TO_CART` to the host parent window via `window.parent.postMessage`.

### 5. Vector Production PDF Generation
`pdfService.ts` leverages `jsPDF` to build a one-page prepress production summary. It captures high-resolution snapshots of both the 2D artwork canvas and the live 3D WebGL render (enabled via `preserveDrawingBuffer: true`), pairing them with exact coordinate metrics, rotation angles, colors, and order SKU identifiers for factory execution.
