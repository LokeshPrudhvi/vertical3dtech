import { useRef, useState, useCallback } from 'react';
import type { CustomizationZone } from '@/types/product';
import { useConfigStore } from '@/store/ConfigProvider';
import { useZoneCanvas } from '@/hooks/useZoneCanvas';
import { createDefaultTextLayer, createImageLayerFromFile } from '@/lib/layerUtils';
import { LayerList } from './LayerList';
import { Toolbar } from './Toolbar';

interface Canvas2DEditorProps {
  zone: CustomizationZone;
  availableZones?: CustomizationZone[];
  activeZoneId?: string;
  onSelectZone?: (zoneId: string) => void;
  hideCanvasPreview?: boolean;
}

export function Canvas2DEditor({
  zone,
  availableZones,
  activeZoneId,
  onSelectZone,
  hideCanvasPreview = false,
}: Canvas2DEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const zoneState = useConfigStore((s) => s.config.zoneStates[zone.id]);
  const addLayer = useConfigStore((s) => s.addLayer);
  const updateLayer = useConfigStore((s) => s.updateLayer);
  const setZoneBackground = useConfigStore((s) => s.setZoneBackground);
  const activeLayerId = useConfigStore((s) => s.activeLayerId);
  const setActiveLayer = useConfigStore((s) => s.setActiveLayer);

  const [dragState, setDragState] = useState<{ layerId: string; startX: number; startY: number } | null>(null);

  // Re-paint the 2D editor canvas whenever the active zone's state changes
  useZoneCanvas(canvasRef, zone, zoneState);

  const handleAddText = useCallback(() => {
    addLayer(zone.id, createDefaultTextLayer(zoneState?.layers.length ?? 0));
  }, [addLayer, zone.id, zoneState]);

  const handleAddImage = useCallback(
    async (file: File) => {
      const layer = await createImageLayerFromFile(
        file,
        zone.canvasResolution.width,
        zoneState?.layers.length ?? 0
      );
      addLayer(zone.id, layer);
    },
    [addLayer, zone.id, zone.canvasResolution.width, zoneState]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      const layerEl = (e.target as HTMLElement).closest('[data-layer-id]');
      const layerId = layerEl?.getAttribute('data-layer-id');
      if (!layerId) return;
      setActiveLayer(layerId);
      setDragState({ layerId, startX: e.clientX, startY: e.clientY });
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [setActiveLayer]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragState || !wrapperRef.current) return;
      const rect = wrapperRef.current.getBoundingClientRect();
      const layer = zoneState?.layers.find((l) => l.id === dragState.layerId);
      if (!layer) return;
      const dxNorm = e.movementX / rect.width;
      const dyNorm = e.movementY / rect.height;
      updateLayer(zone.id, layer.id, {
        x: Math.min(1, Math.max(0, layer.x + dxNorm)),
        y: Math.min(1, Math.max(0, layer.y + dyNorm)),
      });
    },
    [dragState, zoneState, updateLayer, zone.id]
  );

  const handlePointerUp = useCallback(() => setDragState(null), []);

  const resetZone = useConfigStore((s) => s.resetZone);
  const resetAllZones = useConfigStore((s) => s.resetAllZones);
  const setAllZonesBackground = useConfigStore((s) => s.setAllZonesBackground);

  const isAllSelected = activeZoneId === 'all';

  const handleBackgroundChange = (color: string) => {
    if (isAllSelected) {
      setAllZonesBackground(color);
    } else {
      setZoneBackground(zone.id, color);
    }
  };

  const handleReset = () => {
    if (isAllSelected) {
      resetAllZones();
    } else {
      resetZone(zone.id);
    }
  };

  const displayedZone = isAllSelected
    ? {
        ...zone,
        label: 'All Sides (Front, Back, Left, Right)',
      }
    : zone;

  return (
    <div className="editor2d">
      {/* Zone selection tabs */}
      {availableZones && availableZones.length > 1 && (
        <div className="editor2d-tabs">
          <span className="editor2d-tabs-label">Customize Surface:</span>
          <div className="editor2d-tabs-list">
            <button
              key="all"
              className={`editor2d-tab-btn ${isAllSelected ? 'active' : ''}`}
              onClick={() => onSelectZone?.('all')}
              title="Customize all 4 canopy sides simultaneously"
            >
              All
            </button>
            {availableZones.map((z) => {
              const isActive = !isAllSelected && (activeZoneId || zone.id) === z.id;
              return (
                <button
                  key={z.id}
                  className={`editor2d-tab-btn ${isActive ? 'active' : ''}`}
                  onClick={() => onSelectZone?.(z.id)}
                >
                  {z.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <Toolbar
        zone={displayedZone}
        backgroundColor={zoneState?.backgroundColor || '#ffffff'}
        onAddText={handleAddText}
        onAddImage={handleAddImage}
        onBackgroundChange={handleBackgroundChange}
        onResetZone={handleReset}
      />

      {!hideCanvasPreview && (
        <div
          ref={wrapperRef}
          className="editor2d-canvas-wrap"
          style={{ aspectRatio: zone.aspectRatio }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <canvas ref={canvasRef} className="editor2d-canvas" />

          {/* Draggable handle per layer */}
          {zoneState.layers.map((layer) => (
            <div
              key={layer.id}
              data-layer-id={layer.id}
              className={`editor2d-handle ${activeLayerId === layer.id ? 'active' : ''}`}
              style={{ left: `${layer.x * 100}%`, top: `${layer.y * 100}%` }}
              title={layer.type === 'text' ? layer.text : layer.type}
            />
          ))}
        </div>
      )}

      <LayerList zone={zone} />
    </div>
  );
}


