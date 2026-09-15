import React, { useRef, useState, useCallback, useEffect } from 'react';
import type { CustomizationZone } from '@/types/product';
import { useConfigStore } from '@/store/ConfigProvider';
import { loadImage } from '@/lib/renderZoneToCanvas';
import { Scene3D } from '../Preview3D/Scene3D';

interface Unfolded2DLayoutProps {
  availableZones: CustomizationZone[];
  activeZoneId: string;
  onSelectZone: (zoneId: string) => void;
}

interface Point {
  x: number;
  y: number;
}

interface SectionGeometry {
  id: string;
  label: string;
  // Unified 5-sided polygon: [Apex, HipRight, ValanceRight, ValanceLeft, HipLeft]
  polygon: Point[];
  // Peak triangle points
  peakPoints: [number, number, number, number, number, number];
  // Valance fold line: from HipLeft to HipRight
  foldLine: { x1: number; y1: number; x2: number; y2: number };
  // Valance guide center
  valanceCenter: Point;
  // Transformation to map 2D layer coords (normalized 0-1) into canvas space
  center: { x: number; y: number };
  width: number;
  height: number;
  rotationRad: number;
}

// Symmetrical non-overlapping 4-face canopy geometry meeting cleanly at 45° diagonal hip seams
const SECTIONS: SectionGeometry[] = [
  {
    id: 'front',
    label: 'Front',
    polygon: [
      { x: 500, y: 500 }, // Apex
      { x: 800, y: 800 }, // Hip seam right
      { x: 800, y: 890 }, // Valance bottom right
      { x: 200, y: 890 }, // Valance bottom left
      { x: 200, y: 800 }, // Hip seam left
    ],
    peakPoints: [500, 500, 200, 800, 800, 800],
    foldLine: { x1: 200, y1: 800, x2: 800, y2: 800 },
    valanceCenter: { x: 500, y: 845 },
    center: { x: 500, y: 680 },
    width: 600,
    height: 390,
    rotationRad: 0,
  },
  {
    id: 'back',
    label: 'Back',
    polygon: [
      { x: 500, y: 500 }, // Apex
      { x: 200, y: 200 }, // Hip seam left
      { x: 200, y: 110 }, // Valance top left
      { x: 800, y: 110 }, // Valance top right
      { x: 800, y: 200 }, // Hip seam right
    ],
    peakPoints: [500, 500, 800, 200, 200, 200],
    foldLine: { x1: 200, y1: 200, x2: 800, y2: 200 },
    valanceCenter: { x: 500, y: 155 },
    center: { x: 500, y: 320 },
    width: 600,
    height: 390,
    rotationRad: Math.PI,
  },
  {
    id: 'left',
    label: 'Left',
    polygon: [
      { x: 500, y: 500 }, // Apex
      { x: 200, y: 800 }, // Hip seam bottom
      { x: 110, y: 800 }, // Valance outer bottom
      { x: 110, y: 200 }, // Valance outer top
      { x: 200, y: 200 }, // Hip seam top
    ],
    peakPoints: [500, 500, 200, 200, 200, 800],
    foldLine: { x1: 200, y1: 200, x2: 200, y2: 800 },
    valanceCenter: { x: 155, y: 500 },
    center: { x: 320, y: 500 },
    width: 600,
    height: 390,
    rotationRad: Math.PI / 2,
  },
  {
    id: 'right',
    label: 'Right',
    polygon: [
      { x: 500, y: 500 }, // Apex
      { x: 800, y: 200 }, // Hip seam top
      { x: 890, y: 200 }, // Valance outer top
      { x: 890, y: 800 }, // Valance outer bottom
      { x: 800, y: 800 }, // Hip seam bottom
    ],
    peakPoints: [500, 500, 800, 800, 800, 200],
    foldLine: { x1: 800, y1: 200, x2: 800, y2: 800 },
    valanceCenter: { x: 845, y: 500 },
    center: { x: 680, y: 500 },
    width: 600,
    height: 390,
    rotationRad: -Math.PI / 2,
  },
];

export function Unfolded2DLayout({
  activeZoneId,
  onSelectZone,
}: Unfolded2DLayoutProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const zoneStates = useConfigStore((s) => s.config.zoneStates);
  const activeLayerId = useConfigStore((s) => s.activeLayerId);
  const setActiveLayer = useConfigStore((s) => s.setActiveLayer);
  const updateLayer = useConfigStore((s) => s.updateLayer);

  const moveLayerToZone = useConfigStore((s) => s.moveLayerToZone);

  const [hoveredSection, setHoveredSection] = useState<string | null>(null);
  const [hoveredLayerId, setHoveredLayerId] = useState<string | null>(null);
  const [showMini3D, setShowMini3D] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const dragStateRef = useRef<{
    sectionId: string;
    layerId: string;
    offsetX: number; // offset between click and layer center in local space
    offsetY: number;
  } | null>(null);

  // Helper: converts canvas screen event to 0-1000 coordinate space
  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 500, y: 500 };
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 1000;
    const y = ((e.clientY - rect.top) / rect.height) * 1000;
    return { x, y };
  };

  // Helper: get local section coordinates from canvas coordinates
  const getSectionLocalCoords = (sec: SectionGeometry, cx: number, cy: number) => {
    const dx = cx - sec.center.x;
    const dy = cy - sec.center.y;
    const cos = Math.cos(-sec.rotationRad);
    const sin = Math.sin(-sec.rotationRad);
    const locX = dx * cos - dy * sin;
    const locY = dx * sin + dy * cos;
    return { locX, locY };
  };

  // Helper: hit test layers under pointer
  const findLayerAtCoords = useCallback(
    (cx: number, cy: number) => {
      // Check active section first, then all sections
      const activeSec = SECTIONS.find((s) => s.id === activeZoneId) || SECTIONS[0];
      const sectionsToCheck = [activeSec, ...SECTIONS.filter((s) => s.id !== activeZoneId)];

      for (const sec of sectionsToCheck) {
        const state = zoneStates[sec.id];
        if (!state || state.layers.length === 0) continue;

        const { locX, locY } = getSectionLocalCoords(sec, cx, cy);

        // Sort topmost layer first
        const sorted = [...state.layers].sort((a, b) => b.zIndex - a.zIndex);
        for (const layer of sorted) {
          const layerLocX = (layer.x - 0.5) * sec.width;
          const layerLocY = (layer.y - 0.5) * sec.height;

          const dX = locX - layerLocX;
          const dY = locY - layerLocY;

          const layerRotRad = (-layer.rotation * Math.PI) / 180;
          const rotDX = dX * Math.cos(layerRotRad) - dY * Math.sin(layerRotRad);
          const rotDY = dX * Math.sin(layerRotRad) + dY * Math.cos(layerRotRad);

          let halfW = 40;
          let halfH = 25;

          if (layer.type === 'text') {
            halfW = Math.max(45, (layer.text.length * layer.fontSize * 0.22 * layer.scale) / 2 + 15);
            halfH = Math.max(30, (layer.fontSize * 0.35 * layer.scale) / 2 + 10);
          } else if (layer.type === 'image') {
            halfW = Math.max(35, (layer.naturalWidth * 0.3 * layer.scale) / 2 + 12);
            halfH = Math.max(35, (layer.naturalHeight * 0.3 * layer.scale) / 2 + 12);
          }

          if (Math.abs(rotDX) <= halfW && Math.abs(rotDY) <= halfH) {
            return {
              sectionId: sec.id,
              layer,
              offsetLocX: dX,
              offsetLocY: dY,
            };
          }
        }
      }
      return null;
    },
    [zoneStates, activeZoneId]
  );

  // Render the full 2D unfolded tent canvas
  const drawTemplate = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const SIZE = 1000;
    canvas.width = SIZE;
    canvas.height = SIZE;

    // Background workspace
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, 0, SIZE, SIZE);

    // Subtle grid pattern
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.04)';
    ctx.lineWidth = 1;
    for (let i = 40; i < SIZE; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(SIZE, i);
      ctx.stroke();
    }

    // Draw each tent section cleanly without any overlaps
    for (const sec of SECTIONS) {
      const state = zoneStates[sec.id] || { zoneId: sec.id, backgroundColor: '#ffffff', layers: [] };
      const isActive = activeZoneId === 'all' || sec.id === activeZoneId;
      const isHovered = sec.id === hoveredSection;

      const bgColor = state.backgroundColor || '#ffffff';

      // 1. Draw Unified Face Polygon (Peak + Valance seamlessly merged)
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(sec.polygon[0].x, sec.polygon[0].y);
      for (let i = 1; i < sec.polygon.length; i++) {
        ctx.lineTo(sec.polygon[i].x, sec.polygon[i].y);
      }
      ctx.closePath();

      // Fill entire canopy face with background color
      ctx.fillStyle = bgColor;
      ctx.fill();

      // Stroke clean outer boundary
      ctx.lineWidth = isActive ? 3.5 : isHovered ? 2.5 : 1.5;
      ctx.strokeStyle = isActive ? '#2563eb' : isHovered ? '#60a5fa' : '#cbd5e1';
      ctx.stroke();
      ctx.restore();

      // 2. Draw Valance Fold Line (Subtle dashed line marking the eave)
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(sec.foldLine.x1, sec.foldLine.y1);
      ctx.lineTo(sec.foldLine.x2, sec.foldLine.y2);
      ctx.strokeStyle = isActive ? 'rgba(37, 99, 235, 0.45)' : 'rgba(148, 163, 184, 0.5)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([5, 4]);
      ctx.stroke();
      ctx.restore();

      // 3. Render Artworks / Layers clipped strictly to this face's polygon
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(sec.polygon[0].x, sec.polygon[0].y);
      for (let i = 1; i < sec.polygon.length; i++) {
        ctx.lineTo(sec.polygon[i].x, sec.polygon[i].y);
      }
      ctx.closePath();
      ctx.clip();

      ctx.translate(sec.center.x, sec.center.y);
      ctx.rotate(sec.rotationRad);

      const sortedLayers = [...state.layers].sort((a, b) => a.zIndex - b.zIndex);
      for (const layer of sortedLayers) {
        ctx.save();
        // Layer normalized coordinates (0 to 1) -> center relative (-width/2 to +width/2)
        const lx = (layer.x - 0.5) * sec.width;
        const ly = (layer.y - 0.5) * sec.height;
        ctx.translate(lx, ly);
        ctx.rotate((layer.rotation * Math.PI) / 180);
        ctx.scale(layer.scale, layer.scale);

        const isLayerSelected = activeLayerId === layer.id;
        const isLayerHovered = hoveredLayerId === layer.id;

        if (layer.type === 'text') {
          ctx.fillStyle = layer.color;
          ctx.font = `${layer.fontWeight} ${layer.fontSize * 0.35}px ${layer.fontFamily || 'Arial, sans-serif'}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(layer.text, 0, 0);

          if (isLayerSelected || isLayerHovered) {
            const metrics = ctx.measureText(layer.text);
            const w = metrics.width + 20;
            const h = layer.fontSize * 0.35 + 14;
            ctx.strokeStyle = isLayerSelected ? '#2563eb' : '#60a5fa';
            ctx.lineWidth = isLayerSelected ? 2.5 : 1.5;
            ctx.setLineDash(isLayerSelected ? [] : [4, 4]);
            ctx.strokeRect(-w / 2, -h / 2, w, h);
            ctx.setLineDash([]);

            // Selection drag badge
            if (isLayerSelected) {
              ctx.fillStyle = '#2563eb';
              ctx.beginPath();
              ctx.arc(-w / 2, -h / 2, 4, 0, Math.PI * 2);
              ctx.arc(w / 2, -h / 2, 4, 0, Math.PI * 2);
              ctx.arc(w / 2, h / 2, 4, 0, Math.PI * 2);
              ctx.arc(-w / 2, h / 2, 4, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        } else if (layer.type === 'image') {
          try {
            const img = await loadImage(layer.src);
            const w = layer.naturalWidth * 0.3;
            const h = layer.naturalHeight * 0.3;
            ctx.drawImage(img, -w / 2, -h / 2, w, h);

            if (isLayerSelected || isLayerHovered) {
              ctx.strokeStyle = isLayerSelected ? '#2563eb' : '#60a5fa';
              ctx.lineWidth = isLayerSelected ? 2.5 : 1.5;
              ctx.setLineDash(isLayerSelected ? [] : [4, 4]);
              ctx.strokeRect(-w / 2 - 4, -h / 2 - 4, w + 8, h + 8);
              ctx.setLineDash([]);

              if (isLayerSelected) {
                ctx.fillStyle = '#2563eb';
                ctx.beginPath();
                ctx.arc(-w / 2 - 4, -h / 2 - 4, 4, 0, Math.PI * 2);
                ctx.arc(w / 2 + 4, -h / 2 - 4, 4, 0, Math.PI * 2);
                ctx.arc(w / 2 + 4, h / 2 + 4, 4, 0, Math.PI * 2);
                ctx.arc(-w / 2 - 4, h / 2 + 4, 4, 0, Math.PI * 2);
                ctx.fill();
              }
            }
          } catch {
            // ignore broken images
          }
        }
        ctx.restore();
      }

      ctx.restore();

      // 4. Section guide badges & labels
      ctx.save();
      const badgeY =
        sec.id === 'front'
          ? 925
          : sec.id === 'back'
          ? 75
          : sec.id === 'left'
          ? 500
          : 500;
      const badgeX =
        sec.id === 'left'
          ? 75
          : sec.id === 'right'
          ? 925
          : 500;

      // Surface Label Pill
      const pillText = sec.label.toUpperCase();
      ctx.font = 'bold 12px sans-serif';
      const textMetrics = ctx.measureText(pillText);
      const pillW = textMetrics.width + 18;
      const pillH = 22;

      ctx.fillStyle = isActive ? '#2563eb' : isHovered ? '#e2e8f0' : '#f1f5f9';
      ctx.beginPath();
      ctx.roundRect(badgeX - pillW / 2, badgeY - pillH / 2, pillW, pillH, 6);
      ctx.fill();
      ctx.strokeStyle = isActive ? '#1d4ed8' : '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = isActive ? '#ffffff' : '#475569';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pillText, badgeX, badgeY);

      // Subtle Valance indicator
      ctx.font = '9px sans-serif';
      ctx.fillStyle = isActive ? 'rgba(37, 99, 235, 0.8)' : '#94a3b8';
      ctx.fillText('VALANCE', sec.valanceCenter.x, sec.valanceCenter.y);
      ctx.restore();
    }

    // 5. Draw Apex Center Indicator
    ctx.save();
    ctx.fillStyle = '#2563eb';
    ctx.beginPath();
    ctx.arc(500, 500, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('PEAK APEX', 500, 492);
    ctx.restore();
  }, [zoneStates, activeZoneId, hoveredSection, activeLayerId, hoveredLayerId]);

  useEffect(() => {
    drawTemplate();
  }, [drawTemplate]);

  // Pointer Down: Hit-test layer or section to start dragging / selection
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoords(e);

    const hit = findLayerAtCoords(x, y);
    if (hit) {
      if (hit.sectionId !== activeZoneId) {
        onSelectZone(hit.sectionId);
      }
      setActiveLayer(hit.layer.id);
      dragStateRef.current = {
        sectionId: hit.sectionId,
        layerId: hit.layer.id,
        offsetX: hit.offsetLocX,
        offsetY: hit.offsetLocY,
      };
      setIsDragging(true);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }

    // Otherwise, select the clicked section
    let clickedId = 'front';
    const dx = x - 500;
    const dy = y - 500;
    if (Math.abs(dy) >= Math.abs(dx)) {
      clickedId = dy > 0 ? 'front' : 'back';
    } else {
      clickedId = dx > 0 ? 'right' : 'left';
    }

    onSelectZone(clickedId);
    setActiveLayer(null);
  };

  // Pointer Move: Free dragging anywhere across any section + cross-side flow
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoords(e);

    // Active drag handling
    if (isDragging && dragStateRef.current) {
      const { sectionId, layerId, offsetX, offsetY } = dragStateRef.current;

      // Determine which quadrant the pointer currently resides in
      const dx = x - 500;
      const dy = y - 500;
      let targetSectionId = 'front';
      if (Math.abs(dy) >= Math.abs(dx)) {
        targetSectionId = dy > 0 ? 'front' : 'back';
      } else {
        targetSectionId = dx > 0 ? 'right' : 'left';
      }

      // If user drags the text across the boundary into another side, seamlessly flow to that side!
      if (targetSectionId !== sectionId) {
        const targetSec = SECTIONS.find((s) => s.id === targetSectionId);
        if (targetSec) {
          const { locX, locY } = getSectionLocalCoords(targetSec, x, y);
          const newX = Math.min(0.98, Math.max(0.02, locX / targetSec.width + 0.5));
          const newY = Math.min(0.98, Math.max(0.02, locY / targetSec.height + 0.5));
          moveLayerToZone(sectionId, targetSectionId, layerId, { x: newX, y: newY });
          dragStateRef.current = {
            sectionId: targetSectionId,
            layerId,
            offsetX: 0,
            offsetY: 0,
          };
          onSelectZone(targetSectionId);
          return;
        }
      }

      // Normal movement within the current section
      const sec = SECTIONS.find((s) => s.id === sectionId);
      if (!sec) return;

      const { locX, locY } = getSectionLocalCoords(sec, x, y);
      const targetLocX = locX - offsetX;
      const targetLocY = locY - offsetY;

      // Calculate normalized 0 to 1 position
      const newX = Math.min(0.98, Math.max(0.02, targetLocX / sec.width + 0.5));
      const newY = Math.min(0.98, Math.max(0.02, targetLocY / sec.height + 0.5));

      updateLayer(sectionId, layerId, { x: newX, y: newY });
      return;
    }

    // Hover detection
    const hit = findLayerAtCoords(x, y);
    setHoveredLayerId(hit ? hit.layer.id : null);

    const dx = x - 500;
    const dy = y - 500;
    const hoveredId = Math.abs(dy) >= Math.abs(dx) ? (dy > 0 ? 'front' : 'back') : dx > 0 ? 'right' : 'left';
    if (hoveredId !== hoveredSection) {
      setHoveredSection(hoveredId);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      setIsDragging(false);
      dragStateRef.current = null;
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  // Handle keyboard navigation for canvas
  const handleKeyDown = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (e.key === '1' || e.key === 'f' || e.key === 'F') {
      onSelectZone('front');
    } else if (e.key === '2' || e.key === 'b' || e.key === 'B') {
      onSelectZone('back');
    } else if (e.key === '3' || e.key === 'l' || e.key === 'L') {
      onSelectZone('left');
    } else if (e.key === '4' || e.key === 'r' || e.key === 'R') {
      onSelectZone('right');
    }
  };

  return (
    <div className="unfolded2d-container" ref={containerRef} role="region" aria-label="2D Template Workspace">
      {/* 2D Unfolded Pattern Canvas */}
      <div className="unfolded2d-canvas-wrapper">
        <canvas
          ref={canvasRef}
          tabIndex={0}
          role="img"
          aria-label={`Unfolded Tent 2D Blueprint Layout. Currently editing ${activeZoneId} surface. Click and drag text or logos to move them anywhere on the canopy. Press 1 for Front, 2 for Back, 3 for Left, 4 for Right.`}
          className={`unfolded2d-canvas ${isDragging ? 'dragging' : hoveredLayerId ? 'hover-layer' : ''}`}
          style={{
            cursor: isDragging ? 'grabbing' : hoveredLayerId ? 'grab' : 'pointer',
            touchAction: 'none',
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onKeyDown={handleKeyDown}
          onMouseLeave={() => {
            setHoveredSection(null);
            setHoveredLayerId(null);
          }}
        />

        {/* Floating Mini 3D Preview PIP */}
        {showMini3D && (
          <aside
            className="unfolded2d-mini-3d"
            role="complementary"
            aria-label="3D Live Mini Preview"
          >
            <div className="unfolded2d-mini-3d-header">
              <span>3D Live Preview</span>
              <button
                onClick={() => setShowMini3D(false)}
                title="Hide 3D Preview"
                aria-label="Close 3D mini preview"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="unfolded2d-mini-3d-body">
              <Scene3D />
            </div>
          </aside>
        )}

        {!showMini3D && (
          <button
            className="unfolded2d-show-3d-btn"
            onClick={() => setShowMini3D(true)}
            aria-label="Open 3D mini preview window"
          >
            Show 3D Mini View
          </button>
        )}
      </div>
    </div>
  );
}

