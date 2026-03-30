'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'fiziyo-sidebar-collapsed';

export function useSidebarState() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load state from localStorage after hydration (defer setState to avoid set-state-in-effect)
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const collapsed = stored !== null ? stored === 'true' : false;
    queueMicrotask(() => {
      setIsCollapsed(collapsed);
      setIsHydrated(true);
    });
  }, []);

  // Persist collapsed state to localStorage
  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((prev) => {
      const newValue = !prev;
      localStorage.setItem(STORAGE_KEY, String(newValue));
      return newValue;
    });
  }, []);

  const toggleMobile = useCallback(() => {
    setIsMobileOpen((prev) => !prev);
  }, []);

  const closeMobile = useCallback(() => {
    setIsMobileOpen(false);
  }, []);

  return {
    isCollapsed,
    isMobileOpen,
    isHydrated,
    toggleCollapsed,
    toggleMobile,
    closeMobile,
  };
}
