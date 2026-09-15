import type { CustomizationZone } from '@/types/product';
import { useConfigStore } from '@/store/ConfigProvider';

export function LayerList({ zone }: { zone: CustomizationZone }) {
  const zoneState = useConfigStore((s) => s.config.zoneStates[zone.id]);
  const updateLayer = useConfigStore((s) => s.updateLayer);
  const removeLayer = useConfigStore((s) => s.removeLayer);
  const activeLayerId = useConfigStore((s) => s.activeLayerId);
  const setActiveLayer = useConfigStore((s) => s.setActiveLayer);

  if (!zoneState || zoneState.layers.length === 0) {
    return <p className="layer-list-empty" role="status">No design elements on this surface yet. Add text or upload a logo above.</p>;
  }

  return (
    <div className="layer-list" role="list" aria-label={`Layers on ${zone.label} surface`}>
      {zoneState.layers.map((layer, index) => {
        const isActive = activeLayerId === layer.id;
        const layerTitle = layer.type === 'text' ? `Text: "${layer.text}"` : `Image Logo #${index + 1}`;

        return (
          <div
            key={layer.id}
            role="listitem"
            tabIndex={0}
            aria-selected={isActive}
            aria-label={`${layerTitle}, selected: ${isActive}`}
            className={`layer-row ${isActive ? 'active' : ''}`}
            onClick={() => setActiveLayer(layer.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                setActiveLayer(layer.id);
              }
            }}
          >
            <span className="layer-row-type">{layer.type}</span>

            {layer.type === 'text' && (
              <>
                <input
                  type="text"
                  aria-label="Edit text content"
                  value={layer.text}
                  onChange={(e) => updateLayer(zone.id, layer.id, { text: e.target.value })}
                  onClick={(e) => e.stopPropagation()}
                />
                <input
                  type="color"
                  aria-label="Text color picker"
                  value={layer.color}
                  onChange={(e) => updateLayer(zone.id, layer.id, { color: e.target.value })}
                  onClick={(e) => e.stopPropagation()}
                />
              </>
            )}

            {layer.type === 'image' && <span className="layer-row-label">Uploaded logo</span>}

            <label onClick={(e) => e.stopPropagation()} title="Horizontal Position">
              <span>Pos X:</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                aria-label={`Horizontal position for ${layerTitle}: ${Math.round(layer.x * 100)}%`}
                value={layer.x}
                onChange={(e) => updateLayer(zone.id, layer.id, { x: parseFloat(e.target.value) })}
              />
            </label>

            <label onClick={(e) => e.stopPropagation()} title="Vertical Position">
              <span>Pos Y:</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                aria-label={`Vertical position for ${layerTitle}: ${Math.round(layer.y * 100)}%`}
                value={layer.y}
                onChange={(e) => updateLayer(zone.id, layer.id, { y: parseFloat(e.target.value) })}
              />
            </label>

            <label onClick={(e) => e.stopPropagation()}>
              <span>Scale:</span>
              <input
                type="range"
                min={0.2}
                max={3}
                step={0.05}
                aria-label={`Scale for ${layerTitle}: ${Math.round(layer.scale * 100)}%`}
                value={layer.scale}
                onChange={(e) => updateLayer(zone.id, layer.id, { scale: parseFloat(e.target.value) })}
              />
            </label>

            <label onClick={(e) => e.stopPropagation()}>
              <span>Rotate:</span>
              <input
                type="range"
                min={-180}
                max={180}
                step={1}
                aria-label={`Rotation for ${layerTitle}: ${layer.rotation} degrees`}
                value={layer.rotation}
                onChange={(e) => updateLayer(zone.id, layer.id, { rotation: parseFloat(e.target.value) })}
              />
            </label>

            <button
              className="layer-row-delete"
              aria-label={`Remove ${layerTitle}`}
              onClick={(e) => {
                e.stopPropagation();
                removeLayer(zone.id, layer.id);
              }}
            >
              Remove
            </button>
          </div>
        );
      })}
    </div>
  );
}

