import { useRef } from 'react';
import type { CustomizationZone } from '@/types/product';

interface ToolbarProps {
  zone: CustomizationZone;
  backgroundColor: string;
  onAddText: () => void;
  onAddImage: (file: File) => void;
  onBackgroundChange: (color: string) => void;
  onResetZone?: () => void;
}

const PRESET_COLORS = [
  { name: 'White', hex: '#ffffff' },
  { name: 'Royal Blue', hex: '#1d4ed8' },
  { name: 'Crimson Red', hex: '#dc2626' },
  { name: 'Forest Green', hex: '#15803d' },
  { name: 'Sleek Black', hex: '#18181b' },
  { name: 'Amber Gold', hex: '#d97706' },
];

export function Toolbar({
  zone,
  backgroundColor,
  onAddText,
  onAddImage,
  onBackgroundChange,
  onResetZone,
}: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="editor2d-toolbar">
      {zone.allowedCustomizations.includes('color') && (
        <div className="color-swatches-group">
          <span className="tool-label">Color:</span>
          <div className="color-swatches">
            {PRESET_COLORS.map((c) => (
              <button
                key={c.hex}
                className={`color-swatch-btn ${backgroundColor.toLowerCase() === c.hex.toLowerCase() ? 'active' : ''}`}
                style={{ backgroundColor: c.hex }}
                onClick={() => onBackgroundChange(c.hex)}
                title={c.name}
              />
            ))}
            <label className="color-picker-label" title="Custom color picker">
              <input
                type="color"
                className="color-picker-input"
                value={backgroundColor}
                onChange={(e) => onBackgroundChange(e.target.value)}
              />
              <span className="color-picker-custom-btn" title="Custom Color">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
                </svg>
              </span>
            </label>
          </div>
        </div>
      )}

      <div className="tool-actions-group">
        {zone.allowedCustomizations.includes('text') && (
          <button className="tool-btn text-btn" onClick={onAddText}>
            <span>+</span> Add Text
          </button>
        )}

        {zone.allowedCustomizations.includes('image') && (
          <>
            <button className="tool-btn upload-btn" onClick={() => fileInputRef.current?.click()}>
              <span>+</span> Upload Logo
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onAddImage(file);
                e.target.value = '';
              }}
            />
          </>
        )}

        {onResetZone && (
          <button className="tool-btn reset-btn" onClick={onResetZone} title="Reset this surface to default">
            Reset
          </button>
        )}
      </div>

      <span className="tool-hint">
        {zone.label} ({zone.printSize.widthIn}" × {zone.printSize.heightIn}")
      </span>
    </div>
  );
}

