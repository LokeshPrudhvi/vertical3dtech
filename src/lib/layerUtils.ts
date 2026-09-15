import type { ImageLayer, TextLayer } from '@/types/product';

let layerCounter = 0;
export const nextLayerId = () => `layer-${Date.now()}-${layerCounter++}`;

export function createDefaultTextLayer(existingCount = 0): TextLayer {
  return {
    id: nextLayerId(),
    type: 'text',
    text: 'Your Custom Text',
    x: 0.5,
    y: 0.5,
    scale: 1,
    rotation: 0,
    zIndex: existingCount + 1,
    fontFamily: 'Arial',
    fontSize: 100,
    color: '#111111',
    fontWeight: 'bold',
  };
}

export function createImageLayerFromFile(
  file: File,
  maxResolution = 1024,
  existingCount = 0
): Promise<ImageLayer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const maxDim = maxResolution * 0.5;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          const ratio = Math.min(maxDim / w, maxDim / h);
          w *= ratio;
          h *= ratio;
        }
        resolve({
          id: nextLayerId(),
          type: 'image',
          src,
          x: 0.5,
          y: 0.5,
          scale: 1,
          rotation: 0,
          zIndex: existingCount + 1,
          naturalWidth: w,
          naturalHeight: h,
        });
      };
      img.onerror = reject;
      img.src = src;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
