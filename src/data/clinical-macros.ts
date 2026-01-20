/**
 * Clinical Macros - Profesjonalne frazy medyczne dla opisów ćwiczeń
 *
 * Filozofia: Standaryzacja opisów = profesjonalny wizerunek + lepsze zrozumienie przez pacjenta
 *
 * Struktura:
 * - POSTURE: Instrukcje dotyczące prawidłowej postawy
 * - BREATHING: Techniki oddechowe
 * - SAFETY: Ostrzeżenia bezpieczeństwa
 * - TEMPO: Wskazówki dotyczące tempa wykonania
 * - RANGE: Zakres ruchu
 *
 * Użycie:
 * - Makra są wyświetlane kontekstowo na podstawie tagów ćwiczenia
 * - Kliknięcie = dodanie frazy do opisu
 */

// ============================================
// TYPES
// ============================================

export type MacroCategory = "posture" | "breathing" | "safety" | "tempo" | "range";

export interface ClinicalMacro {
  /** Unikalny identyfikator */
  id: string;
  /** Pełny tekst frazy do wstawienia */
  text: string;
  /** Krótki label wyświetlany na przycisku */
  shortLabel: string;
  /** Tagi triggery - jeśli ćwiczenie ma któryś z tych tagów, makro jest sugerowane */
  tags: string[];
  /** Kategoria makra */
  category: MacroCategory;
  /** Ikona (opcjonalna) - nazwa z lucide-react */
  icon?: string;
}

// ============================================
// CLINICAL MACROS DATABASE
// ============================================

export const CLINICAL_MACROS: ClinicalMacro[] = [
  // ============================================
  // POSTURA (prawidłowa pozycja ciała)
  // ============================================
  {
    id: "straight-back",
    text: "Zachowaj proste plecy przez cały czas trwania ćwiczenia. Wyobraź sobie, że ktoś ciągnie Cię za czubek głowy ku górze.",
    shortLabel: "Proste plecy",
    tags: ["Kręgosłup", "Plecy górne", "Plecy dolne", "Core"],
    category: "posture",
    icon: "ArrowUp",
  },
  {
    id: "neutral-spine",
    text: "Utrzymuj neutralną pozycję kręgosłupa - zachowaj naturalne krzywizny bez nadmiernego wyginania lub prostowania.",
    shortLabel: "Neutralny kręgosłup",
    tags: ["Kręgosłup", "Core", "Plecy"],
    category: "posture",
  },
  {
    id: "knee-axis",
    text: "Kolano utrzymuj w osi ze stopą - nie pozwól mu wpadać do środka. Wyobraź sobie linię od biodra przez kolano do drugiego palca stopy.",
    shortLabel: "Kolano w osi",
    tags: ["Kolana", "Staw kolanowy", "Uda", "Staw biodrowy"],
    category: "posture",
    icon: "Target",
  },
  {
    id: "shoulders-down",
    text: "Barki ściągaj w dół i do tyłu - nie unoś ich do uszu. Łopatki powinny być stabilne i przylegać do klatki piersiowej.",
    shortLabel: "Barki w dół",
    tags: ["Barki", "Głowa i szyja", "Klatka piersiowa", "Szyja"],
    category: "posture",
  },
  {
    id: "core-engaged",
    text: "Napnij delikatnie mięśnie brzucha, jakbyś przygotowywał się na lekki cios. Utrzymuj to napięcie przez całe ćwiczenie.",
    shortLabel: "Napięty core",
    tags: ["Core", "Brzuch", "Miednica", "Stabilizacja"],
    category: "posture",
  },
  {
    id: "chin-tucked",
    text: "Delikatnie cofnij brodę, jakbyś chciał zrobić sobie podwójny podbródek. Nie zadzieraj głowy do góry.",
    shortLabel: "Broda w tył",
    tags: ["Głowa i szyja", "Kręgosłup szyjny", "Szyja"],
    category: "posture",
  },
  {
    id: "feet-hip-width",
    text: "Stopy ustaw na szerokość bioder, palce skierowane lekko na zewnątrz. Ciężar ciała rozłóż równomiernie na całe stopy.",
    shortLabel: "Stopy na biodra",
    tags: ["Stopy", "Biodra", "Równowaga"],
    category: "posture",
  },
  {
    id: "soft-knees",
    text: "Kolana utrzymuj lekko ugięte - nie blokuj ich w pełnym wyproście, aby nie obciążać stawów.",
    shortLabel: "Miękkie kolana",
    tags: ["Kolana", "Staw kolanowy"],
    category: "posture",
  },

  // ============================================
  // ODDYCHANIE (techniki oddechowe)
  // ============================================
  {
    id: "exhale-effort",
    text: "Wydychaj powietrze podczas fazy wysiłkowej ruchu (np. przy unoszeniu ciężaru lub napinaniu mięśni).",
    shortLabel: "Wydech przy wysiłku",
    tags: [],
    category: "breathing",
    icon: "Wind",
  },
  {
    id: "inhale-return",
    text: "Wdychaj podczas powrotu do pozycji wyjściowej lub w fazie rozluźnienia.",
    shortLabel: "Wdech przy powrocie",
    tags: [],
    category: "breathing",
  },
  {
    id: "dont-hold-breath",
    text: "Nie wstrzymuj oddechu - oddychaj płynnie przez cały czas trwania ćwiczenia.",
    shortLabel: "Nie wstrzymuj oddechu",
    tags: [],
    category: "breathing",
    icon: "AlertCircle",
  },
  {
    id: "diaphragm-breathing",
    text: "Oddychaj przeponą - przy wdechu brzuch powinien się unosić, przy wydechu opadać. Klatka piersiowa pozostaje względnie nieruchoma.",
    shortLabel: "Oddech przeponowy",
    tags: ["Oddychanie", "Core", "Brzuch", "Przepona"],
    category: "breathing",
  },
  {
    id: "rhythmic-breathing",
    text: "Utrzymuj rytmiczny oddech - np. 2 sekundy wdech, 2 sekundy wydech. Nie przyspieszaj oddechu.",
    shortLabel: "Oddech rytmiczny",
    tags: ["Relaksacja", "Rozciąganie"],
    category: "breathing",
  },

  // ============================================
  // BEZPIECZEŃSTWO (ostrzeżenia)
  // ============================================
  {
    id: "stop-if-pain",
    text: "Jeżeli odczuwasz ból (inny niż delikatne rozciąganie mięśni), przerwij ćwiczenie i skonsultuj się z fizjoterapeutą.",
    shortLabel: "Stop przy bólu",
    tags: [],
    category: "safety",
    icon: "AlertTriangle",
  },
  {
    id: "controlled-movement",
    text: "Wykonuj ruch powoli i kontrolowanie, bez szarpania. Jakość ruchu jest ważniejsza niż liczba powtórzeń.",
    shortLabel: "Kontrolowany ruch",
    tags: [],
    category: "safety",
  },
  {
    id: "warm-up-first",
    text: "Przed wykonaniem tego ćwiczenia wykonaj krótką rozgrzewkę - kilka minut marszu lub delikatne ruchy rozluźniające.",
    shortLabel: "Najpierw rozgrzewka",
    tags: ["Wzmacnianie", "Rozciąganie"],
    category: "safety",
  },
  {
    id: "avoid-momentum",
    text: "Unikaj wykorzystywania rozpędu ciała. Każdy ruch powinien wynikać z kontrolowanej pracy mięśni.",
    shortLabel: "Bez rozpędu",
    tags: ["Wzmacnianie"],
    category: "safety",
  },
  {
    id: "listen-to-body",
    text: "Słuchaj swojego ciała. Jeśli czujesz nadmierne zmęczenie, zawroty głowy lub dyskomfort, zrób przerwę.",
    shortLabel: "Słuchaj ciała",
    tags: [],
    category: "safety",
  },

  // ============================================
  // TEMPO (szybkość wykonania)
  // ============================================
  {
    id: "slow-tempo",
    text: "Wykonuj ćwiczenie w wolnym tempie, licząc do 3 przy każdej fazie ruchu (3 sekundy w górę, 3 sekundy w dół).",
    shortLabel: "Wolne tempo",
    tags: ["Wzmacnianie", "Stabilizacja"],
    category: "tempo",
    icon: "Clock",
  },
  {
    id: "hold-position",
    text: "Zatrzymaj się na 2-3 sekundy w pozycji końcowej, aby maksymalnie zaangażować mięśnie.",
    shortLabel: "Zatrzymaj na 2-3s",
    tags: ["Wzmacnianie", "Stabilizacja"],
    category: "tempo",
  },
  {
    id: "smooth-movement",
    text: "Ruch powinien być płynny i ciągły, bez zatrzymywania się w połowie drogi (chyba że ćwiczenie tego wymaga).",
    shortLabel: "Płynny ruch",
    tags: ["Mobilizacja"],
    category: "tempo",
  },

  // ============================================
  // ZAKRES RUCHU (ROM)
  // ============================================
  {
    id: "full-range",
    text: "Wykonuj pełny zakres ruchu, na jaki pozwala Twoja mobilność. Z czasem zakres będzie się zwiększał.",
    shortLabel: "Pełny zakres",
    tags: ["Mobilizacja", "Rozciąganie"],
    category: "range",
    icon: "Maximize2",
  },
  {
    id: "pain-free-range",
    text: "Pracuj tylko w zakresie bezbolesnym. Delikatne napięcie przy rozciąganiu jest normalne, ale ostry ból - nie.",
    shortLabel: "Zakres bezbolesny",
    tags: ["Rozciąganie", "Rehabilitacja pourazowa"],
    category: "range",
  },
  {
    id: "progressive-range",
    text: "Z każdym powtórzeniem staraj się delikatnie zwiększać zakres ruchu, nie przekraczając granicy bólu.",
    shortLabel: "Stopniowo zwiększaj",
    tags: ["Rozciąganie", "Mobilizacja"],
    category: "range",
  },
  {
    id: "symmetric-movement",
    text: "Staraj się wykonywać ruch symetrycznie po obu stronach ciała. Jeśli zauważasz różnice, skup się bardziej na słabszej stronie.",
    shortLabel: "Symetrycznie",
    tags: [],
    category: "range",
  },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Pobiera makra pasujące do podanych tagów ćwiczenia
 * Zwraca: najpierw tag-specific, potem uniwersalne (bez tagów)
 */
export function getMacrosForTags(exerciseTags: string[]): ClinicalMacro[] {
  const normalizedTags = exerciseTags.map(t => t.toLowerCase());

  // Makra pasujące do tagów (specific)
  const tagSpecificMacros = CLINICAL_MACROS.filter(macro =>
    macro.tags.length > 0 &&
    macro.tags.some(macroTag =>
      normalizedTags.some(exTag => exTag.includes(macroTag.toLowerCase()))
    )
  );

  // Makra uniwersalne (bez tagów)
  const universalMacros = CLINICAL_MACROS.filter(macro => macro.tags.length === 0);

  // Połącz i usuń duplikaty
  const allMacros = [...tagSpecificMacros, ...universalMacros];
  const uniqueMacros = allMacros.filter((macro, index, self) =>
    index === self.findIndex(m => m.id === macro.id)
  );

  return uniqueMacros;
}

/**
 * Pobiera makra według kategorii
 */
export function getMacrosByCategory(category: MacroCategory): ClinicalMacro[] {
  return CLINICAL_MACROS.filter(macro => macro.category === category);
}

/**
 * Grupuje makra według kategorii
 */
export function groupMacrosByCategory(macros: ClinicalMacro[]): Record<MacroCategory, ClinicalMacro[]> {
  const groups: Record<MacroCategory, ClinicalMacro[]> = {
    posture: [],
    breathing: [],
    safety: [],
    tempo: [],
    range: [],
  };

  for (const macro of macros) {
    groups[macro.category].push(macro);
  }

  return groups;
}

/**
 * Tłumaczenie kategorii na polski
 */
export function getCategoryLabel(category: MacroCategory): string {
  const labels: Record<MacroCategory, string> = {
    posture: "Postawa",
    breathing: "Oddychanie",
    safety: "Bezpieczeństwo",
    tempo: "Tempo",
    range: "Zakres ruchu",
  };
  return labels[category];
}

/**
 * Ikona dla kategorii (lucide-react name)
 */
export function getCategoryIcon(category: MacroCategory): string {
  const icons: Record<MacroCategory, string> = {
    posture: "User",
    breathing: "Wind",
    safety: "Shield",
    tempo: "Clock",
    range: "Maximize2",
  };
  return icons[category];
}
