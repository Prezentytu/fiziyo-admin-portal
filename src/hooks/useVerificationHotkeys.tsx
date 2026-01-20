import { useEffect, useCallback, useRef } from "react";

interface UseVerificationHotkeysOptions {
  /** Callback: Zatwierdź i przejdź do następnego (CMD/CTRL + Enter) */
  onApproveAndNext: () => void;
  /** Callback: Odrzuć ćwiczenie (CMD/CTRL + Backspace) */
  onReject: () => void;
  /** Callback: Zapisz draft (CMD/CTRL + S) */
  onSaveDraft?: () => void;
  /** Callback: Pomiń ćwiczenie (Escape) */
  onSkip?: () => void;
  /** Callback: Zaznacz/odznacz checkbox kliniczny (CMD/CTRL + D) */
  onToggleClinicalCheckbox?: () => void;
  /** Czy można zatwierdzić (np. wszystkie checky przeszły) */
  canApprove: boolean;
  /** Czy aktualnie trwa edycja inline (blokuje niektóre skróty) */
  isEditing?: boolean;
  /** Czy skróty są włączone */
  enabled?: boolean;
}

/**
 * useVerificationHotkeys - Skróty klawiszowe dla weryfikacji ćwiczeń
 *
 * Clinical Operator Workflow - Keyboard-First dla Power Users:
 * - CMD/CTRL + Enter → Zatwierdź i Następne (NAJWAŻNIEJSZE!)
 * - CMD/CTRL + Backspace → Odrzuć
 * - CMD/CTRL + S → Zapisz draft
 * - CMD/CTRL + D → Toggle checkbox bezpieczeństwa
 * - Escape → Pomiń / Anuluj edycję
 * - Tab → Następne pole (native behavior)
 * - Shift+Tab → Poprzednie pole (native behavior)
 *
 * Zasady:
 * - Skróty z modyfikatorem (CMD/CTRL) działają zawsze
 * - Escape działa tylko gdy nie ma aktywnej edycji inline
 * - Skróty są zablokowane gdy enabled=false
 */
export function useVerificationHotkeys({
  onApproveAndNext,
  onReject,
  onSaveDraft,
  onSkip,
  onToggleClinicalCheckbox,
  canApprove,
  isEditing = false,
  enabled = true,
}: UseVerificationHotkeysOptions) {
  // Refs dla stabilnych callbacków
  const onApproveAndNextRef = useRef(onApproveAndNext);
  const onRejectRef = useRef(onReject);
  const onSaveDraftRef = useRef(onSaveDraft);
  const onSkipRef = useRef(onSkip);
  const onToggleClinicalCheckboxRef = useRef(onToggleClinicalCheckbox);
  const canApproveRef = useRef(canApprove);
  const isEditingRef = useRef(isEditing);
  const enabledRef = useRef(enabled);

  // Update refs
  useEffect(() => {
    onApproveAndNextRef.current = onApproveAndNext;
    onRejectRef.current = onReject;
    onSaveDraftRef.current = onSaveDraft;
    onSkipRef.current = onSkip;
    onToggleClinicalCheckboxRef.current = onToggleClinicalCheckbox;
    canApproveRef.current = canApprove;
    isEditingRef.current = isEditing;
    enabledRef.current = enabled;
  });

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabledRef.current) return;

    const isMod = e.metaKey || e.ctrlKey;
    const isShift = e.shiftKey;
    const key = e.key.toLowerCase();

    // CMD/CTRL + Enter → Zatwierdź i Następne
    if (isMod && key === "enter") {
      e.preventDefault();
      // Nawet jeśli canApprove=false, callback może obsłużyć logikę (np. wyświetlić toast)
      if (!isEditingRef.current) {
        onApproveAndNextRef.current();
      }
      return;
    }

    // CMD/CTRL + S → Zapisz draft
    if (isMod && key === "s") {
      e.preventDefault();
      onSaveDraftRef.current?.();
      return;
    }

    // CMD/CTRL + D → Toggle checkbox bezpieczeństwa
    if (isMod && key === "d") {
      e.preventDefault();
      onToggleClinicalCheckboxRef.current?.();
      return;
    }

    // CMD/CTRL + Backspace → Odrzuć
    if (isMod && key === "backspace") {
      e.preventDefault();
      if (!isEditingRef.current) {
        onRejectRef.current();
      }
      return;
    }

    // Escape → Pomiń (tylko gdy nie ma edycji)
    if (key === "escape" && !isMod && !isShift) {
      // Nie preventDefault - pozwól na native behavior dla zamykania modali
      if (!isEditingRef.current) {
        onSkipRef.current?.();
      }
      return;
    }
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Hook do wykrywania czy użytkownik jest w trybie edycji
 * Sprawdza czy aktywny element to input, textarea, lub contenteditable
 */
export function useIsEditingDetection(): boolean {
  const checkIsEditing = useCallback(() => {
    const activeElement = document.activeElement;
    if (!activeElement) return false;

    const tagName = activeElement.tagName.toLowerCase();
    const isInput = tagName === "input" || tagName === "textarea";
    const isContentEditable = activeElement.getAttribute("contenteditable") === "true";
    const isSelect = tagName === "select";

    return isInput || isContentEditable || isSelect;
  }, []);

  return checkIsEditing();
}

/**
 * Komponent wyświetlający dostępne skróty klawiszowe
 * Clinical Operator UI - Extended shortcuts
 */
export function KeyboardShortcutsHint() {
  const isMac = typeof navigator !== "undefined" && navigator.platform.includes("Mac");
  const modKey = isMac ? "⌘" : "Ctrl";

  const shortcuts = [
    { keys: `${modKey}+↵`, label: "Zatwierdź i Następne", primary: true },
    { keys: `${modKey}+D`, label: "Toggle checkbox", primary: false },
    { keys: `${modKey}+⌫`, label: "Odrzuć", primary: false },
    { keys: `${modKey}+S`, label: "Zapisz draft", primary: false },
    { keys: "Esc", label: "Pomiń", primary: false },
    { keys: "Tab", label: "Następne pole", primary: false },
  ];

  return (
    <div className="text-xs space-y-1.5 p-3">
      <p className="font-semibold mb-2">Skróty klawiszowe</p>
      {shortcuts.map(({ keys, label, primary }) => (
        <div key={keys} className="flex items-center justify-between gap-4">
          <span className={primary ? "text-foreground font-medium" : "text-muted-foreground"}>
            {label}
          </span>
          <kbd className={`px-1.5 py-0.5 text-[10px] rounded border font-mono ${
            primary
              ? "bg-primary/20 border-primary/30 text-primary"
              : "bg-muted border-border"
          }`}>
            {keys}
          </kbd>
        </div>
      ))}
    </div>
  );
}

/**
 * Formatuje skrót klawiszowy dla wyświetlania
 */
export function formatShortcut(shortcut: string): string {
  const isMac = typeof navigator !== "undefined" && navigator.platform.includes("Mac");

  return shortcut
    .replace(/mod/gi, isMac ? "⌘" : "Ctrl")
    .replace(/ctrl/gi, isMac ? "⌘" : "Ctrl")
    .replace(/cmd/gi, "⌘")
    .replace(/alt/gi, isMac ? "⌥" : "Alt")
    .replace(/shift/gi, "⇧")
    .replace(/enter/gi, "↵")
    .replace(/backspace/gi, "⌫")
    .replace(/escape/gi, "Esc")
    .replace(/\+/g, " + ");
}
