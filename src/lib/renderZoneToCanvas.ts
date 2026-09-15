import type { CustomizationZone, ProductDefinition, ZoneState } from '@/types/product';

const imageCache = new Map<string, HTMLImageElement>();

export function loadImage(src: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(src);
  if (cached && cached.complete) return Promise.resolve(cached);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageCache.set(src, img);
      resolve(img);
    };
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Preload all images referenced by zone states into memory
 */
export async function preloadZoneImages(zoneStates: Record<string, ZoneState>): Promise<void> {
  const promises: Promise<HTMLImageElement>[] = [];
  for (const state of Object.values(zoneStates)) {
    for (const layer of state.layers) {
      if (layer.type === 'image' && layer.src) {
        promises.push(loadImage(layer.src).catch(() => null as unknown as HTMLImageElement));
      }
    }
  }
  await Promise.all(promises);
}

/**
 * Renders an individual zone's design (background color + ordered layers) onto the
 * given 2D editor canvas at its resolution.
 */
export async function renderZoneToCanvas(
  canvas: HTMLCanvasElement,
  zone: CustomizationZone,
  state: ZoneState
): Promise<void> {
  canvas.width = zone.canvasResolution.width;
  canvas.height = zone.canvasResolution.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = state.backgroundColor || '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const sorted = [...state.layers].sort((a, b) => a.zIndex - b.zIndex);

  for (const layer of sorted) {
    ctx.save();
    const cx = layer.x * canvas.width;
    const cy = layer.y * canvas.height;
    ctx.translate(cx, cy);
    ctx.rotate((layer.rotation * Math.PI) / 180);
    ctx.scale(layer.scale, layer.scale);

    if (layer.type === 'text') {
      ctx.fillStyle = layer.color;
      ctx.font = `${layer.fontWeight} ${layer.fontSize}px ${layer.fontFamily || 'Arial, sans-serif'}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(layer.text, 0, 0);
    } else if (layer.type === 'image') {
      try {
        const img = await loadImage(layer.src);
        const w = layer.naturalWidth;
        const h = layer.naturalHeight;
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
      } catch {
        // Missing/broken image source - skip gracefully
      }
    } else if (layer.type === 'color') {
      ctx.fillStyle = layer.color;
      ctx.fillRect(-100, -100, 200, 200);
    }

    ctx.restore();
  }
}

/**
 * Helper to check if a zone has any shopper customizations.
 */
export function isZoneCustomized(state: ZoneState | undefined): boolean {
  if (!state) return false;
  const isNonDefaultColor =
    Boolean(state.backgroundColor) &&
    state.backgroundColor.toLowerCase() !== '#ffffff' &&
    state.backgroundColor.toLowerCase() !== '#fff';
  return isNonDefaultColor || (state.layers && state.layers.length > 0);
}

// Full-coverage quadrant geometries for 100% seam-to-seam canopy coverage
const SECTIONS_GEOMETRY = [
  {
    id: 'front',
    // Full canvas quadrant clipping & fill: Apex (1024, 1024) -> (0, 2048) -> (2048, 2048)
    quadrantPoints: [1024, 1024, 0, 2048, 2048, 2048],
    center: { x: 1024, y: 1536 },
    width: 1400,
    height: 950,
    rotationRad: 0,
  },
  {
    id: 'back',
    // Full canvas quadrant clipping & fill: Apex (1024, 1024) -> (2048, 0) -> (0, 0)
    quadrantPoints: [1024, 1024, 2048, 0, 0, 0],
    center: { x: 1024, y: 512 },
    width: 1400,
    height: 950,
    rotationRad: Math.PI,
  },
  {
    id: 'left',
    // Full canvas quadrant clipping & fill: Apex (1024, 1024) -> (0, 0) -> (0, 2048)
    quadrantPoints: [1024, 1024, 0, 0, 0, 2048],
    center: { x: 512, y: 1024 },
    width: 1400,
    height: 950,
    rotationRad: Math.PI / 2,
  },
  {
    id: 'right',
    // Full canvas quadrant clipping & fill: Apex (1024, 1024) -> (2048, 2048) -> (2048, 0)
    quadrantPoints: [1024, 1024, 2048, 2048, 2048, 0],
    center: { x: 1536, y: 1024 },
    width: 1400,
    height: 950,
    rotationRad: -Math.PI / 2,
  },
];

/**
 * Composites tent zones (Front, Back, Left, Right) onto a master 2048x2048 texture.
 * Ensures 100% full-width coverage from corner seam to corner seam on each face.
 */
export async function renderTentAtlas(
  masterCanvas: HTMLCanvasElement,
  _product: ProductDefinition,
  zoneStates: Record<string, ZoneState>,
  baseImage?: CanvasImageSource | null
): Promise<void> {
  const ATLAS_SIZE = 2048;
  if (masterCanvas.width !== ATLAS_SIZE || masterCanvas.height !== ATLAS_SIZE) {
    masterCanvas.width = ATLAS_SIZE;
    masterCanvas.height = ATLAS_SIZE;
  }
  const ctx = masterCanvas.getContext('2d');
  if (!ctx) return;

  // Draw original base image if available, otherwise clear to clean white
  if (baseImage && (baseImage as HTMLImageElement).width > 0) {
    try {
      ctx.drawImage(baseImage, 0, 0, ATLAS_SIZE, ATLAS_SIZE);
    } catch {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, ATLAS_SIZE, ATLAS_SIZE);
    }
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, ATLAS_SIZE, ATLAS_SIZE);
  }

  // Render each section with full quadrant coverage
  for (const sec of SECTIONS_GEOMETRY) {
    const state = zoneStates[sec.id];
    if (!state || (!isZoneCustomized(state) && baseImage)) {
      continue;
    }

    // 1. Fill Section Base Color across the ENTIRE quadrant triangle (100% seam-to-seam width)
    ctx.save();
    ctx.fillStyle = state.backgroundColor || '#ffffff';
    ctx.beginPath();
    ctx.moveTo(sec.quadrantPoints[0], sec.quadrantPoints[1]);
    ctx.lineTo(sec.quadrantPoints[2], sec.quadrantPoints[3]);
    ctx.lineTo(sec.quadrantPoints[4], sec.quadrantPoints[5]);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 2. Render Artworks / Layers with exact 1:1 local transformation
    ctx.save();
    ctx.translate(sec.center.x, sec.center.y);
    ctx.rotate(sec.rotationRad);

    const sortedLayers = [...state.layers].sort((a, b) => a.zIndex - b.zIndex);
    for (const layer of sortedLayers) {
      ctx.save();
      const lx = (layer.x - 0.5) * sec.width;
      const ly = (layer.y - 0.5) * sec.height;
      ctx.translate(lx, ly);
      ctx.rotate((layer.rotation * Math.PI) / 180);
      ctx.scale(layer.scale, layer.scale);

      if (layer.type === 'text') {
        ctx.fillStyle = layer.color;
        ctx.font = `${layer.fontWeight} ${layer.fontSize * 0.7}px ${layer.fontFamily || 'Arial, sans-serif'}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(layer.text, 0, 0);
      } else if (layer.type === 'image') {
        try {
          const img = await loadImage(layer.src);
          const w = layer.naturalWidth * 0.6;
          const h = layer.naturalHeight * 0.6;
          ctx.drawImage(img, -w / 2, -h / 2, w, h);
        } catch {
          // ignore broken images
        }
      }
      ctx.restore();
    }
    ctx.restore();
  }
}


