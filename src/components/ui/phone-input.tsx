"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface PhoneInputProps
  extends Omit<React.ComponentProps<"input">, "onChange" | "value" | "type"> {
  value: string;
  onChange: (value: string) => void;
  countryCode?: string;
}

/**
 * Formatuje numer telefonu do formatu XXX XXX XXX
 */
function formatPhoneNumber(value: string): string {
  // Usuń wszystko poza cyframi
  const digits = value.replaceAll(/\D/g, "");

  // Ogranicz do 9 cyfr (polski numer bez kierunkowego)
  const limited = digits.slice(0, 9);

  // Formatuj jako XXX XXX XXX
  if (limited.length <= 3) {
    return limited;
  }
  if (limited.length <= 6) {
    return `${limited.slice(0, 3)} ${limited.slice(3)}`;
  }
  return `${limited.slice(0, 3)} ${limited.slice(3, 6)} ${limited.slice(6)}`;
}

/**
 * Wyciąga same cyfry z sformatowanego numeru
 */
function extractDigits(value: string): string {
  return value.replaceAll(/\D/g, "").slice(0, 9);
}

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, value, onChange, countryCode = "+48", ...props }, ref) => {
    const inputRef = React.useRef<HTMLInputElement>(null);

    // Połącz zewnętrzny ref z wewnętrznym
    React.useImperativeHandle(ref, () => inputRef.current!);

    // Formatowana wartość do wyświetlenia
    const displayValue = formatPhoneNumber(value);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      const digits = extractDigits(newValue);
      onChange(digits);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Dozwolone klawisze: cyfry, backspace, delete, tab, escape, enter, strzałki
      const allowedKeys = [
        "Backspace",
        "Delete",
        "Tab",
        "Escape",
        "Enter",
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "Home",
        "End",
      ];

      // Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
      if (
        (e.ctrlKey || e.metaKey) &&
        ["a", "c", "v", "x"].includes(e.key.toLowerCase())
      ) {
        return;
      }

      // Dozwolone klawisze specjalne
      if (allowedKeys.includes(e.key)) {
        return;
      }

      // Tylko cyfry
      if (!/^\d$/.test(e.key)) {
        e.preventDefault();
      }

      // Blokuj jeśli już mamy 9 cyfr (chyba że coś jest zaznaczone)
      const input = inputRef.current;
      if (input) {
        const selectionLength =
          (input.selectionEnd ?? 0) - (input.selectionStart ?? 0);
        const currentDigits = extractDigits(value);
        if (currentDigits.length >= 9 && selectionLength === 0) {
          e.preventDefault();
        }
      }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pastedText = e.clipboardData.getData("text");

      // Wyciągnij tylko cyfry z wklejonego tekstu
      let digits = pastedText.replaceAll(/\D/g, "");

      // Usuń prefiks kraju jeśli jest (+48 lub 48)
      if (digits.startsWith("48") && digits.length > 9) {
        digits = digits.slice(2);
      }

      // Ogranicz do 9 cyfr
      digits = digits.slice(0, 9);

      onChange(digits);
    };

    // Extract height class from className to apply to both elements
    const heightMatch = className?.match(/h-(\d+)/);
    const heightClass = heightMatch ? `h-${heightMatch[1]}` : 'h-9';

    return (
      <div className="relative flex w-full">
        {/* Prefiks kraju */}
        <div
          className={cn(
            "flex items-center justify-center rounded-l-md border border-r-0 border-border bg-surface px-3 text-sm font-medium text-muted-foreground select-none shrink-0",
            heightClass,
            props.disabled && "cursor-not-allowed opacity-50"
          )}
        >
          {countryCode}
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          className={cn(
            "flex w-full rounded-r-md border border-border bg-input px-3 py-1 shadow-sm transition-colors",
            heightClass,
            "placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          value={displayValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          maxLength={11} // 9 cyfr + 2 spacje
          {...props}
        />
      </div>
    );
  }
);

PhoneInput.displayName = "PhoneInput";

export { PhoneInput };
