'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  DESIGN_PREFERENCE,
  applyDesignVariant,
  isDesignPreviewEnabled,
  readDesignVariant,
  saveDesignVariant,
  type DesignVariant,
} from './preferences';

interface DesignVariantContextValue {
  variant: DesignVariant;
  isHydrated: boolean;
  setVariant: (variant: DesignVariant) => void;
}

const DesignVariantContext = createContext<DesignVariantContextValue | null>(null);

export function DesignVariantProvider({ children }: { children: ReactNode }) {
  const [variant, setCurrentVariant] = useState<DesignVariant>(DESIGN_PREFERENCE.defaultVariant);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    const saved = applyDesignVariant(readDesignVariant());
    queueMicrotask(() => {
      if (!active) return;
      setCurrentVariant(saved);
      setIsHydrated(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const setVariant = (next: DesignVariant) => {
    if (!isHydrated || !isDesignPreviewEnabled()) return;
    const applied = applyDesignVariant(next);
    saveDesignVariant(applied);
    setCurrentVariant(applied);
  };

  return (
    <DesignVariantContext.Provider value={{ variant, isHydrated, setVariant }}>
      {children}
    </DesignVariantContext.Provider>
  );
}

export function useDesignVariant() {
  return useContext(DesignVariantContext);
}
