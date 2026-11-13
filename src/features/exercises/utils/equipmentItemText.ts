import type { ExerciseContentEquipmentItem } from '@/components/shared/exercise/readExerciseContent';

export interface EquipmentItemText {
  /** Nazwa z liczbą sztuk, gdy potrzeba więcej niż jednej („taśma × 2”). */
  name: string;
  /** `null`, gdy źródło nie mówi, czy sprzęt jest wymagany (rekord stary). */
  requirement: 'wymagany' | 'opcjonalny' | null;
  /** Zamienniki sklejone przecinkiem; `null`, gdy ich nie ma. */
  substitutes: string | null;
}

/** Tekst jednej pozycji sprzętu (v3.3 `equipment_items`) w widoku ćwiczenia. */
export function describeEquipmentItem(item: ExerciseContentEquipmentItem): EquipmentItemText {
  const name = item.qty !== null && item.qty > 1 ? `${item.label} × ${item.qty}` : item.label;
  const requirement = item.required === null ? null : item.required ? 'wymagany' : 'opcjonalny';
  return { name, requirement, substitutes: item.substitutes.length > 0 ? item.substitutes.join(', ') : null };
}
