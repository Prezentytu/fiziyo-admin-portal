"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface UseScrollDirectionOptions {
  /** Minimum scroll delta to trigger visibility change (default: 10px) */
  threshold?: number;
  /** Element to monitor for scroll events. If not provided, uses main content area */
  scrollContainerSelector?: string;
}

/**
 * Hook do wykrywania kierunku scrollowania
 * Zwraca true gdy FAB powinien być widoczny (scroll w górę lub brak scrollowania)
 * Zwraca false gdy FAB powinien być ukryty (scroll w dół)
 */
export function useScrollDirection({
  threshold = 10,
  scrollContainerSelector = "main",
}: UseScrollDirectionOptions = {}): boolean {
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  const updateVisibility = useCallback(
    (scrollContainer: Element) => {
      const currentScrollY = scrollContainer.scrollTop;
      const scrollDelta = currentScrollY - lastScrollY.current;

      // Only update if scroll delta exceeds threshold
      if (Math.abs(scrollDelta) >= threshold) {
        // Scrolling down - hide FAB
        if (scrollDelta > 0 && currentScrollY > 100) {
          setIsVisible(false);
        }
        // Scrolling up - show FAB
        else if (scrollDelta < 0) {
          setIsVisible(true);
        }

        lastScrollY.current = currentScrollY;
      }

      // Always show FAB when at the top
      if (currentScrollY <= 50) {
        setIsVisible(true);
      }

      ticking.current = false;
    },
    [threshold]
  );

  useEffect(() => {
    const scrollContainer = document.querySelector(scrollContainerSelector);

    if (!scrollContainer) {
      return;
    }

    const handleScroll = () => {
      if (!ticking.current) {
        requestAnimationFrame(() => {
          updateVisibility(scrollContainer);
        });
        ticking.current = true;
      }
    };

    // Initialize last scroll position
    lastScrollY.current = scrollContainer.scrollTop;

    scrollContainer.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      scrollContainer.removeEventListener("scroll", handleScroll);
    };
  }, [scrollContainerSelector, updateVisibility]);

  return isVisible;
}
