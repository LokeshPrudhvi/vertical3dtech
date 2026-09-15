import { useState } from 'react';
import type { ProductDefinition } from '@/types/product';
import { ConfigProvider, useConfigStore } from '@/store/ConfigProvider';
import { usePriceQuote } from '@/hooks/usePriceQuote';
import { OptionSection } from './shared/OptionSection';
import { PriceSummary } from './shared/PriceSummary';
import { AddToCartButton } from './shared/AddToCartButton';
import { ExportPdfButton } from './shared/ExportPdfButton';
import { Canvas2DEditor } from './Editor2D/Canvas2DEditor';
import { Unfolded2DLayout } from './Editor2D/Unfolded2DLayout';
import { Scene3D } from './Preview3D/Scene3D';

function ConfiguratorInner() {
  const product = useConfigStore((s) => s.product);
  const activeZoneId = useConfigStore((s) => s.activeZoneId);
  const setActiveZone = useConfigStore((s) => s.setActiveZone);
  const { quote, isLoading } = usePriceQuote();

  // Mode state: Default product view vs. Dedicated Customization Studio
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('2d');

  const variantSections = product.sections.filter((s) => s.type === 'variant');
  const customizationSections = product.sections.filter((s) => s.type === 'customization' && s.zone);

  const activeSection =
    customizationSections.find((s) => s.zone?.id === activeZoneId) || customizationSections[0];

  const hasAnyCustomization = quote?.hasCustomizations ?? false;

  // =========================================================================
  // 1. CUSTOMIZATION STUDIO MODE (2D Unfolded Layout + 3D PIP + Tools)
  // =========================================================================
  if (isCustomizing) {
    return (
      <main
        className="customization-studio"
        role="region"
        aria-label="Tent Customization Studio"
      >
        {/* Studio Top Navigation Bar */}
        <header className="studio-header">
          <div
            className="view-mode-toggle"
            role="tablist"
            aria-label="Preview View Mode"
          >
            <button
              role="tab"
              aria-selected={viewMode === '3d'}
              className={`view-mode-btn ${viewMode === '3d' ? 'active' : ''}`}
              onClick={() => setViewMode('3d')}
              aria-label="Switch to 3D View"
            >
              3D View
            </button>
            <button
              role="tab"
              aria-selected={viewMode === '2d'}
              className={`view-mode-btn ${viewMode === '2d' ? 'active' : ''}`}
              onClick={() => setViewMode('2d')}
              aria-label="Switch to 2D Blueprint View"
            >
              2D Layout
            </button>
          </div>

          <div className="studio-title-wrap">
            <h2 className="studio-title">Customize in 2D | Preview in 3D</h2>
          </div>

          <button
            className="save-exit-btn"
            onClick={() => setIsCustomizing(false)}
            aria-label="Save customization and exit to product view"
          >
            Save & Exit
          </button>
        </header>

        <div className="studio-body">
          {/* Main Visualizer Area (2D Blueprint or 3D Preview) */}
          <section className="studio-main-col" aria-label="Visual Workspace">
            {viewMode === '3d' ? (
              <Scene3D />
            ) : (
              <Unfolded2DLayout
                availableZones={customizationSections.map((s) => s.zone!)}
                activeZoneId={activeZoneId || 'all'}
                onSelectZone={(id) => setActiveZone(id)}
              />
            )}
          </section>

          {/* Right Sidebar: Active Surface Customization Tools & Price Summary */}
          <aside className="studio-sidebar-col" aria-label="Customization Tools and Summary">
            {activeSection?.zone && (
              <Canvas2DEditor
                zone={activeSection.zone}
                availableZones={customizationSections.map((s) => s.zone!)}
                activeZoneId={activeZoneId || 'all'}
                onSelectZone={(id) => setActiveZone(id)}
                hideCanvasPreview={true}
              />
            )}
            <PriceSummary quote={quote} isLoading={isLoading} />
            <button
              className="save-exit-btn-secondary"
              onClick={() => setIsCustomizing(false)}
              aria-label="Finish customizing and save"
            >
              Done Customizing
            </button>
          </aside>
        </div>
      </main>
    );
  }

  // =========================================================================
  // 2. DEFAULT PRODUCT VIEW (Clean Product Page, No Customization UI)
  // =========================================================================
  return (
    <main className="configurator" role="main" aria-label="Product Configurator">
      <header className="configurator-header">
        <div className="configurator-title-wrap">
          <h1>{product.name}</h1>
          <span className="configurator-subtitle">
            Custom canopy tent with company logo, dye sublimation printing, and a lifetime frame warranty. 2-day production. No minimums, no setup fees.
          </span>
        </div>
      </header>

      <div className="configurator-body">
        {/* Main Clean 3D Tent Preview */}
        <section className="configurator-preview-col" aria-label="3D Tent Preview">
          <Scene3D />
        </section>

        {/* Standard Product Options & Customize Trigger */}
        <aside className="configurator-controls-col" aria-label="Product Options and Pricing">
          {variantSections.map((section) => (
            <OptionSection key={section.id} section={section} />
          ))}

          {/* Primary CTA: Open Dedicated Customization Studio */}
          <section className="customize-trigger-card" aria-label="Customization Options">
            <div className="customize-trigger-info">
              <h3>Custom Canopy Graphics</h3>
              <p>Add full-color peak & valance branding, logos, slogans, and custom hex colors.</p>
            </div>
            <button
              className="open-studio-btn"
              onClick={() => setIsCustomizing(true)}
              aria-label="Open Customization Studio"
            >
              {hasAnyCustomization ? 'Edit Custom Design' : 'Customize Tent (Colors & Logos)'}
            </button>
          </section>

          <PriceSummary quote={quote} isLoading={isLoading} />
          <AddToCartButton quote={quote} />
          <ExportPdfButton quote={quote} />
        </aside>
      </div>
    </main>
  );
}

/** Public entry point. Drop <Configurator product={anyProductDefinition} /> anywhere */
export function Configurator({ product }: { product: ProductDefinition }) {
  return (
    <ConfigProvider product={product}>
      <ConfiguratorInner />
    </ConfigProvider>
  );
}




