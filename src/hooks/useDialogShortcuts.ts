'use client';

import { useEffect } from 'react';

interface UseDialogShortcutsOptions {
  open?: boolean;
  enabled?: boolean;
  onSubmit?: () => void;
  onClose?: () => void;
}

export function useDialogShortcuts({
  open = true,
  enabled = true,
  onSubmit,
  onClose,
}: UseDialogShortcutsOptions): void {
  useEffect(() => {
    if (!open || !enabled) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose?.();
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        onSubmit?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, onClose, onSubmit, open]);
}
