import type { ExerciseLoad } from "@/components/assignment/types";

/**
 * Parsuje tekst wpisany przez użytkownika do struktury ExerciseLoad.
 * Smart String - wykrywa typy obciążenia automatycznie.
 *
 * Przykłady:
 * - "5 kg" → { type: 'weight', value: 5, unit: 'kg', text: '5 kg' }
 * - "10 lbs" → { type: 'weight', value: 10, unit: 'lbs', text: '10 lbs' }
 * - "guma czerwona" → { type: 'band', text: 'guma czerwona' }
 * - "guma zielona poziom 2" → { type: 'band', value: 2, unit: 'level', text: 'guma zielona poziom 2' }
 * - "własna waga" → { type: 'bodyweight', text: 'własna waga' }
 * - "piłka 3kg" → { type: 'weight', value: 3, unit: 'kg', text: 'piłka 3kg' }
 */
export function parseLoad(input: string): ExerciseLoad {
  const text = input.trim();

  if (!text) {
    return { type: "other", text: "" };
  }

  const lowerText = text.toLowerCase();

  // Wykryj bodyweight
  if (
    lowerText.includes("własna waga") ||
    lowerText.includes("ciężar ciała") ||
    lowerText.includes("bodyweight") ||
    lowerText === "bw"
  ) {
    return { type: "bodyweight", text };
  }

  // Wykryj gumy oporowe
  if (
    lowerText.includes("guma") ||
    lowerText.includes("band") ||
    lowerText.includes("taśma") ||
    lowerText.includes("expander")
  ) {
    // Próba wyciągnięcia poziomu (np. "poziom 3", "level 2")
    const levelMatch = lowerText.match(/(?:poziom|level|lvl)\s*(\d+)/i);
    if (levelMatch) {
      return {
        type: "band",
        value: parseInt(levelMatch[1], 10),
        unit: "level",
        text,
      };
    }
    return { type: "band", text };
  }

  // Wykryj ciężar w kg lub lbs
  const weightMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(kg|lbs?|funt[óy]?w?)/i);
  if (weightMatch) {
    const value = parseFloat(weightMatch[1].replace(",", "."));
    const unitRaw = weightMatch[2].toLowerCase();
    const unit: "kg" | "lbs" =
      unitRaw === "kg" ? "kg" : unitRaw.startsWith("lb") || unitRaw.startsWith("funt") ? "lbs" : "kg";
    return { type: "weight", value, unit, text };
  }

  // Wykryj sam numer z kg jako domyślna jednostka (np. "5" → 5 kg)
  const numberOnlyMatch = text.match(/^(\d+(?:[.,]\d+)?)\s*$/);
  if (numberOnlyMatch) {
    const value = parseFloat(numberOnlyMatch[1].replace(",", "."));
    return { type: "weight", value, unit: "kg", text: `${value} kg` };
  }

  // Domyślnie - other
  return { type: "other", text };
}

/**
 * Formatuje ExerciseLoad do wyświetlenia użytkownikowi.
 * Zwraca oryginalny tekst lub pusty string.
 */
export function formatLoad(load: ExerciseLoad | undefined | null): string {
  if (!load) return "";
  return load.text || "";
}

/**
 * Sprawdza czy load ma wartość (nie jest pusty).
 */
export function hasLoad(load: ExerciseLoad | undefined | null): boolean {
  if (!load) return false;
  return Boolean(load.text && load.text.trim().length > 0);
}

/**
 * Zwraca kolor badge'a dla typu obciążenia.
 */
export function getLoadBadgeColor(load: ExerciseLoad | undefined | null): string {
  if (!load || !hasLoad(load)) return "";

  switch (load.type) {
    case "weight":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    case "band":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
    case "bodyweight":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-400";
  }
}

/**
 * Zwraca ikonę dla typu obciążenia (jako string - nazwa ikony Lucide).
 */
export function getLoadIcon(load: ExerciseLoad | undefined | null): string | null {
  if (!load || !hasLoad(load)) return null;

  switch (load.type) {
    case "weight":
      return "Dumbbell";
    case "band":
      return "Activity";
    case "bodyweight":
      return "User";
    default:
      return "HelpCircle";
  }
}

/**
 * Zwraca skrócony opis obciążenia dla badge'a.
 */
export function getLoadBadgeLabel(load: ExerciseLoad | undefined | null): string {
  if (!load || !hasLoad(load)) return "";

  // Dla weight z wartością - pokaż "5 kg"
  if (load.type === "weight" && load.value !== undefined && load.unit) {
    return `${load.value} ${load.unit}`;
  }

  // Dla band z poziomem - "Lvl 3"
  if (load.type === "band" && load.value !== undefined) {
    return `Lvl ${load.value}`;
  }

  // Dla bodyweight - "BW"
  if (load.type === "bodyweight") {
    return "BW";
  }

  // Skróć długi tekst
  const text = load.text;
  if (text.length > 10) {
    return text.substring(0, 8) + "…";
  }

  return text;
}
