import { createContext, useContext, useRef, type ReactNode } from 'react';
import { useStore } from 'zustand';
import { createConfigStore, type UseConfigStore } from './configStore';
import type { ProductDefinition } from '@/types/product';

const ConfigStoreContext = createContext<UseConfigStore | null>(null);

export function ConfigProvider({ product, children }: { product: ProductDefinition; children: ReactNode }) {
  const storeRef = useRef<UseConfigStore>();
  if (!storeRef.current) {
    storeRef.current = createConfigStore(product);
  }
  return <ConfigStoreContext.Provider value={storeRef.current}>{children}</ConfigStoreContext.Provider>;
}

export function useConfigStore<T>(selector: (state: ReturnType<UseConfigStore['getState']>) => T): T {
  const store = useContext(ConfigStoreContext);
  if (!store) throw new Error('useConfigStore must be used within a ConfigProvider');
  return useStore(store, selector);
}
