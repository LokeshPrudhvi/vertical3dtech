import { useConfigStore } from '@/store/ConfigProvider';
import { generateProductionSummaryPdf, type PreviewImage } from '@/services/pdfService';
import type { PriceQuote } from '@/services/pricingService';

/**
 * Captures the live 2D editor canvas and the Three.js render canvas as PNG
 * snapshots and hands them to the PDF service. Queries the DOM for the
 * canvases at click-time rather than threading refs through several
 * component layers, which keeps this a leaf component that any layout can drop in.
 */
export function ExportPdfButton({ quote }: { quote: PriceQuote | null }) {
  const product = useConfigStore((s) => s.product);
  const config = useConfigStore((s) => s.config);

  const handleExport = () => {
    const previews: PreviewImage[] = [];

    const editorCanvas = document.querySelector<HTMLCanvasElement>('.editor2d-canvas');
    if (editorCanvas) {
      previews.push({ label: '2D Artwork', dataUrl: editorCanvas.toDataURL('image/png') });
    }

    const threeCanvas = document.querySelector<HTMLCanvasElement>('.scene3d-wrap canvas');
    if (threeCanvas) {
      try {
        previews.push({ label: '3D Preview', dataUrl: threeCanvas.toDataURL('image/png') });
      } catch {
        // toDataURL can throw if the WebGL context was created without
        // preserveDrawingBuffer; the 2D preview above still gets attached.
      }
    }

    const doc = generateProductionSummaryPdf(product, config, quote, previews);
    doc.save(`${product.id}-production-summary-${Date.now()}.pdf`);
  };

  return (
    <button className="export-pdf-button" onClick={handleExport}>
      Download Production Summary (PDF)
    </button>
  );
}
