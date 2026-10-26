import { useEffect, useRef } from 'react';

interface UseVerificationHotkeysOptions {
  /** Main action of the current stage (CMD/CTRL + Enter). */
  onApproveAndNext: () => void;
  /** Save now (CMD/CTRL + S). */
  onSaveDraft: () => void;
  /** Disable while a dialog owns the keyboard. */
  enabled?: boolean;
}

/** Keyboard shortcuts for the verification workspace: CMD/CTRL + Enter and CMD/CTRL + S. */
export function useVerificationHotkeys({
  onApproveAndNext,
  onSaveDraft,
  enabled = true,
}: UseVerificationHotkeysOptions) {
  const latest = useRef({ onApproveAndNext, onSaveDraft, enabled });

  useEffect(() => {
    latest.current = { onApproveAndNext, onSaveDraft, enabled };
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!latest.current.enabled || !(event.metaKey || event.ctrlKey)) return;
      const key = event.key.toLowerCase();
      if (key === 'enter') {
        event.preventDefault();
        latest.current.onApproveAndNext();
      } else if (key === 's') {
        event.preventDefault();
        latest.current.onSaveDraft();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
}
