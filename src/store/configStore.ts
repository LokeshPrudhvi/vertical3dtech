import { create } from 'zustand';
import type {
  Layer,
  ProductConfiguration,
  ProductDefinition,
  ZoneState,
} from '@/types/product';
import { createEmptyZoneState } from '@/types/product';

interface ConfigStore {
  product: ProductDefinition;
  config: ProductConfiguration;
  activeZoneId: string | null;
  activeLayerId: string | null;

  setActiveZone: (zoneId: string | null) => void;
  setActiveLayer: (layerId: string | null) => void;
  selectOption: (sectionId: string, optionId: string) => void;
  setZoneBackground: (zoneId: string, color: string) => void;
  setAllZonesBackground: (color: string) => void;
  addLayer: (zoneId: string, layer: Layer) => void;
  updateLayer: (zoneId: string, layerId: string, patch: Partial<Layer>) => void;
  removeLayer: (zoneId: string, layerId: string) => void;
  moveLayerToZone: (sourceZoneId: string, targetZoneId: string, layerId: string, patch?: Partial<Layer>) => void;
  resetZone: (zoneId: string) => void;
  resetAllZones: () => void;
  reset: () => void;
}

/** This store is the single source of truth. The 2D editor writes to it on every
 * interaction; the 3D preview subscribes to the same zoneStates and re-renders
 * its canvas-based texture whenever they change. Neither view holds its own copy
 * of the design, which is what keeps 2D <-> 3D in sync by construction rather
 * than by manual event-passing. */
export function createConfigStore(product: ProductDefinition) {
  const initialZoneStates: Record<string, ZoneState> = {};
  for (const section of product.sections) {
    if (section.type === 'customization' && section.zone) {
      initialZoneStates[section.zone.id] = createEmptyZoneState(section.zone.id);
    }
  }

  const initialSelectedOptions: Record<string, string> = {};
  for (const section of product.sections) {
    if (section.type === 'variant' && section.options?.length) {
      initialSelectedOptions[section.id] = section.options[0].id;
    }
  }

  const initialConfig: ProductConfiguration = {
    productId: product.id,
    selectedOptions: initialSelectedOptions,
    zoneStates: initialZoneStates,
    createdAt: new Date().toISOString(),
    configVersion: 1,
  };

  return create<ConfigStore>((set) => ({
    product,
    config: initialConfig,
    activeZoneId: 'all',
    activeLayerId: null,

    setActiveZone: (zoneId) => set({ activeZoneId: zoneId, activeLayerId: null }),
    setActiveLayer: (layerId) => set({ activeLayerId: layerId }),

    selectOption: (sectionId, optionId) =>
      set((state) => ({
        config: {
          ...state.config,
          selectedOptions: { ...state.config.selectedOptions, [sectionId]: optionId },
        },
      })),

    setZoneBackground: (zoneId, color) =>
      set((state) => ({
        config: {
          ...state.config,
          zoneStates: {
            ...state.config.zoneStates,
            [zoneId]: { ...state.config.zoneStates[zoneId], backgroundColor: color },
          },
        },
      })),

    setAllZonesBackground: (color) =>
      set((state) => {
        const nextZones: Record<string, ZoneState> = {};
        for (const [zId, zState] of Object.entries(state.config.zoneStates)) {
          nextZones[zId] = { ...zState, backgroundColor: color };
        }
        return {
          config: {
            ...state.config,
            zoneStates: nextZones,
          },
        };
      }),

    addLayer: (zoneId, layer) =>
      set((state) => {
        const zone = state.config.zoneStates[zoneId] ?? createEmptyZoneState(zoneId);
        return {
          config: {
            ...state.config,
            zoneStates: {
              ...state.config.zoneStates,
              [zoneId]: { ...zone, layers: [...zone.layers, layer] },
            },
          },
          activeLayerId: layer.id,
        };
      }),

    updateLayer: (zoneId, layerId, patch) =>
      set((state) => {
        const zone = state.config.zoneStates[zoneId];
        if (!zone) return state;
        return {
          config: {
            ...state.config,
            zoneStates: {
              ...state.config.zoneStates,
              [zoneId]: {
                ...zone,
                layers: zone.layers.map((l) => (l.id === layerId ? ({ ...l, ...patch } as Layer) : l)),
              },
            },
          },
        };
      }),

    removeLayer: (zoneId, layerId) =>
      set((state) => {
        const zone = state.config.zoneStates[zoneId];
        if (!zone) return state;
        return {
          config: {
            ...state.config,
            zoneStates: {
              ...state.config.zoneStates,
              [zoneId]: { ...zone, layers: zone.layers.filter((l) => l.id !== layerId) },
            },
          },
          activeLayerId: null,
        };
      }),

    moveLayerToZone: (sourceZoneId, targetZoneId, layerId, patch) =>
      set((state) => {
        const sourceZone = state.config.zoneStates[sourceZoneId];
        const targetZone = state.config.zoneStates[targetZoneId] ?? createEmptyZoneState(targetZoneId);
        if (!sourceZone) return state;

        const layer = sourceZone.layers.find((l) => l.id === layerId);
        if (!layer) return state;

        const movedLayer: Layer = {
          ...layer,
          ...(patch as Partial<Layer>),
          zIndex: targetZone.layers.length + 1,
        } as Layer;

        return {
          activeZoneId: targetZoneId,
          activeLayerId: layerId,
          config: {
            ...state.config,
            zoneStates: {
              ...state.config.zoneStates,
              [sourceZoneId]: {
                ...sourceZone,
                layers: sourceZone.layers.filter((l) => l.id !== layerId),
              },
              [targetZoneId]: {
                ...targetZone,
                layers: [...targetZone.layers, movedLayer],
              },
            },
          },
        };
      }),

    resetZone: (zoneId) =>
      set((state) => ({
        config: {
          ...state.config,
          zoneStates: {
            ...state.config.zoneStates,
            [zoneId]: createEmptyZoneState(zoneId),
          },
        },
        activeLayerId: null,
      })),

    resetAllZones: () =>
      set((state) => {
        const clearedZoneStates: Record<string, ZoneState> = {};
        for (const section of state.product.sections) {
          if (section.type === 'customization' && section.zone) {
            clearedZoneStates[section.zone.id] = createEmptyZoneState(section.zone.id);
          }
        }
        return {
          config: {
            ...state.config,
            zoneStates: clearedZoneStates,
          },
          activeLayerId: null,
        };
      }),

    reset: () => set({ config: initialConfig, activeLayerId: null }),
  }));
}

export type UseConfigStore = ReturnType<typeof createConfigStore>;
