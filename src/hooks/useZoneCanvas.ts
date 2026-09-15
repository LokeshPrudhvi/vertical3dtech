import { useEffect, useRef } from 'react';
import type { CustomizationZone, ZoneState } from '@/types/product';
import { renderZoneToCanvas } from '@/lib/renderZoneToCanvas';

const RENDER_DEBOUNCE_MS = 16; // 60fps frame budget for responsive drag/live updates

/** 
 * Renders `state` onto `canvasRef.current` whenever it changes.
 * Calls `onRendered` after each paint to trigger texture upload.
 */
export function useZoneCanvas(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  zone: CustomizationZone | undefined,
  state: ZoneState | undefined,
  onRendered?: () => void
) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!zone || !state || !canvasRef.current) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      if (!canvasRef.current) return;
      renderZoneToCanvas(canvasRef.current, zone, state).then(() => onRendered?.());
    }, RENDER_DEBOUNCE_MS);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zone, JSON.stringify(state), canvasRef]);
}

