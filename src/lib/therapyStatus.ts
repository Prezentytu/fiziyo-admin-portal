/**
 * Algorytmy mapowania danych i statusu terapii
 * Dashboard Diagnostyczny - "Na Pierwszy Rzut Oka"
 */

export type TherapyStatus = 'success' | 'warning' | 'alert';
export type FeelingType = 'easy' | 'ok' | 'hard';
export type WellbeingType = 'ok' | 'discomfort';

export interface Frequency {
  timesPerDay?: number | string | null;
  timesPerWeek?: number | string | null;
  monday?: boolean | null;
  tuesday?: boolean | null;
  wednesday?: boolean | null;
  thursday?: boolean | null;
  friday?: boolean | null;
  saturday?: boolean | null;
  sunday?: boolean | null;
}

export interface PatientAssignmentData {
  id: string;
  startDate?: string | null;
  endDate?: string | null;
  status?: string | null;
  frequency?: Frequency | null;
}

export interface ExerciseProgressData {
  id: string;
  completedAt?: string | null;
  status: string;
  painLevel?: number | null;
  difficultyLevel?: number | null;
  patientNotes?: string | null;
}

export interface DayData {
  date: Date;
  dateStr: string;
  feeling: FeelingType | null;
  wellbeing: WellbeingType | null;
  hasActivity: boolean;
  isScheduled: boolean; // czy dzień był zaplanowany
  isBeforeStart: boolean; // czy dzień jest przed rozpoczęciem planu
  notes?: string | null;
}

export interface TherapyStatusResult {
  status: TherapyStatus;
  title: string;
  description: string;
  nextStep: string;
}

/**
 * Sprawdza czy frequency ma określone konkretne dni tygodnia
 */
export function hasSpecificDays(frequency: Frequency | null | undefined): boolean {
  if (!frequency) return false;
  return !!(
    frequency.monday ||
    frequency.tuesday ||
    frequency.wednesday ||
    frequency.thursday ||
    frequency.friday ||
    frequency.saturday ||
    frequency.sunday
  );
}

/**
 * Sprawdza czy dany dzień tygodnia jest zaplanowany w frequency
 * dayOfWeek: 0 = niedziela, 1 = poniedziałek, ..., 6 = sobota
 */
export function isDayScheduled(frequency: Frequency | null | undefined, dayOfWeek: number): boolean {
  if (!frequency) return false;

  // Jeśli nie ma konkretnych dni, ale jest timesPerWeek - każdy dzień jest "potencjalnie" zaplanowany
  if (!hasSpecificDays(frequency)) {
    return false; // Nie możemy określić konkretnego dnia
  }

  switch (dayOfWeek) {
    case 0:
      return !!frequency.sunday;
    case 1:
      return !!frequency.monday;
    case 2:
      return !!frequency.tuesday;
    case 3:
      return !!frequency.wednesday;
    case 4:
      return !!frequency.thursday;
    case 5:
      return !!frequency.friday;
    case 6:
      return !!frequency.saturday;
    default:
      return false;
  }
}

/**
 * Pobiera najwcześniejszą datę rozpoczęcia z przypisań
 */
export function getEarliestStartDate(assignments: PatientAssignmentData[]): Date | null {
  const activeAssignments = assignments.filter(
    (a) => a.status === 'active' || a.status === 'assigned' || a.status === 'in_progress'
  );

  if (activeAssignments.length === 0) return null;

  const startDates = activeAssignments
    .map((a) => (a.startDate ? new Date(a.startDate) : null))
    .filter((d): d is Date => d !== null);

  if (startDates.length === 0) return null;

  return new Date(Math.min(...startDates.map((d) => d.getTime())));
}

/**
 * Pobiera wymaganą liczbę treningów w tygodniu
 */
export function getRequiredWeeklyTrainings(assignments: PatientAssignmentData[]): number {
  const activeAssignments = assignments.filter(
    (a) => a.status === 'active' || a.status === 'assigned' || a.status === 'in_progress'
  );

  let total = 0;
  for (const a of activeAssignments) {
    if (!a.frequency) continue;

    if (hasSpecificDays(a.frequency)) {
      // Policz zaznaczone dni
      const days = [
        a.frequency.monday,
        a.frequency.tuesday,
        a.frequency.wednesday,
        a.frequency.thursday,
        a.frequency.friday,
        a.frequency.saturday,
        a.frequency.sunday,
      ].filter(Boolean).length;
      total += days;
    } else if (a.frequency.timesPerWeek) {
      // Użyj timesPerWeek
      const times =
        typeof a.frequency.timesPerWeek === 'string'
          ? parseInt(a.frequency.timesPerWeek, 10)
          : a.frequency.timesPerWeek;
      if (!isNaN(times)) total += times;
    }
  }

  return total;
}

/**
 * Mapuje painLevel na status samopoczucia
 */
export function mapPainToWellbeing(level: number | null | undefined): WellbeingType {
  if (level === null || level === undefined || level <= 4) return 'ok';
  return 'discomfort';
}

/**
 * Mapuje difficultyLevel na odczucie trudności
 */
export function mapDifficultyToFeeling(level: number | null | undefined): FeelingType {
  if (level === null || level === undefined || level <= 3) return 'easy';
  if (level <= 6) return 'ok';
  return 'hard';
}

/**
 * Zwraca etykietę dla odczucia trudności
 */
export function getFeelingLabel(feeling: FeelingType | null): string {
  switch (feeling) {
    case 'easy':
      return 'Lekko';
    case 'ok':
      return 'W sam raz';
    case 'hard':
      return 'Ciężko';
    default:
      return '';
  }
}

/**
 * Zwraca emoji dla odczucia trudności
 */
export function getFeelingEmoji(feeling: FeelingType | null): string {
  switch (feeling) {
    case 'easy':
      return '😁';
    case 'ok':
      return '🙂';
    case 'hard':
      return '😓';
    default:
      return '';
  }
}

/**
 * Zwraca emoji dla samopoczucia
 */
export function getWellbeingEmoji(wellbeing: WellbeingType | null): string {
  switch (wellbeing) {
    case 'ok':
      return '🙂';
    case 'discomfort':
      return '🤕';
    default:
      return '';
  }
}

/**
 * Oblicza status terapii na podstawie postępów i przypisań
 */
export function calculateTherapyStatus(
  progress: ExerciseProgressData[],
  assignments: PatientAssignmentData[] = []
): TherapyStatusResult {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Sprawdź najwcześniejszą datę rozpoczęcia
  const earliestStart = getEarliestStartDate(assignments);
  const effectiveStartDate = earliestStart && earliestStart > sevenDaysAgo ? earliestStart : sevenDaysAgo;

  // Filtruj postępy od daty rozpoczęcia
  const recentProgress = progress.filter((p) => {
    if (!p.completedAt || p.status !== 'completed') return false;
    const completedDate = new Date(p.completedAt);
    return completedDate >= effectiveStartDate && completedDate <= now;
  });

  // Sprawdź czy jest dyskomfort
  const hasDiscomfort = recentProgress.some((p) => p.painLevel && p.painLevel > 5);

  // Policz unikalne dni z aktywnością
  const uniqueDays = new Set(recentProgress.map((p) => new Date(p.completedAt!).toDateString()));
  const activeDays = uniqueDays.size;

  // Oblicz ile dni minęło od rozpoczęcia (max 7)
  const daysSinceStart = Math.min(7, Math.ceil((now.getTime() - effectiveStartDate.getTime()) / (24 * 60 * 60 * 1000)));

  // Oblicz wymaganą liczbę treningów w tygodniu
  const requiredWeekly = getRequiredWeeklyTrainings(assignments);
  const requiredSoFar = requiredWeekly > 0 ? Math.ceil((requiredWeekly / 7) * daysSinceStart) : daysSinceStart; // Jeśli nie ma frequency, zakładamy że każdy dzień

  // Policz trudne treningi
  const hardCount = recentProgress.filter((p) => p.difficultyLevel && p.difficultyLevel > 6).length;

  // Określ status
  if (hasDiscomfort) {
    return {
      status: 'alert',
      title: 'Wymaga uwagi',
      description:
        'Pacjent zgłosił dyskomfort podczas ostatnich ćwiczeń. Zalecany kontakt w celu weryfikacji planu treningowego.',
      nextStep: 'Zalecany kontakt telefoniczny',
    };
  }

  // Brak aktywności - ale tylko jeśli minęło wystarczająco dużo czasu
  const missedTrainings = Math.max(0, requiredSoFar - activeDays);
  const daysSinceLastActivity =
    recentProgress.length > 0
      ? Math.ceil((now.getTime() - new Date(recentProgress[0].completedAt!).getTime()) / (24 * 60 * 60 * 1000))
      : daysSinceStart;

  if (daysSinceLastActivity >= 5 && daysSinceStart >= 5) {
    return {
      status: 'alert',
      title: 'Brak aktywności',
      description: `Pacjent nie ćwiczył od ${daysSinceLastActivity} dni. Możliwe ryzyko rezygnacji z planu treningowego.`,
      nextStep: 'Zalecany kontakt telefoniczny',
    };
  }

  if ((missedTrainings >= 2 && daysSinceStart >= 3) || hardCount >= 3) {
    const reasons: string[] = [];
    if (missedTrainings >= 2) reasons.push(`pominął ${missedTrainings} zaplanowanych treningów`);
    if (hardCount >= 3) reasons.push(`ostatnie treningi ocenia jako ciężkie (${hardCount}x)`);

    return {
      status: 'warning',
      title: 'Ostrzeżenie',
      description: `Pacjent ${reasons.join(' oraz ')}. Rozważ dostosowanie planu treningowego.`,
      nextStep: 'Rozważ kontakt z pacjentem',
    };
  }

  // Oblicz procent wykonania
  const completionPercent = requiredSoFar > 0 ? Math.round((activeDays / requiredSoFar) * 100) : 100;

  return {
    status: 'success',
    title: 'Aktywny',
    description: `Pacjent realizuje plan zgodnie z założeniami${completionPercent < 100 ? ` (${completionPercent}% wykonania)` : ''}. Ostatnie treningi ocenia pozytywnie. Brak zgłoszeń dyskomfortu.`,
    nextStep: 'Brak wymaganej interwencji',
  };
}

/**
 * Generuje dane dla heatmapy (ostatnie 4 tygodnie)
 * Uwzględnia przypisania - datę rozpoczęcia i zaplanowane dni
 */
export function generateHeatmapData(
  progress: ExerciseProgressData[],
  assignments: PatientAssignmentData[] = []
): DayData[] {
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  const result: DayData[] = [];

  // Pobierz najwcześniejszą datę rozpoczęcia
  const earliestStart = getEarliestStartDate(assignments);

  // Sprawdź czy mamy konkretne dni zaplanowane
  const activeAssignments = assignments.filter(
    (a) => a.status === 'active' || a.status === 'assigned' || a.status === 'in_progress'
  );
  const hasAnySpecificDays = activeAssignments.some((a) => hasSpecificDays(a.frequency));

  // Znajdź początek obecnego tygodnia (poniedziałek)
  const currentDay = now.getDay();
  const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1;
  const startOfCurrentWeek = new Date(now);
  startOfCurrentWeek.setDate(now.getDate() - daysFromMonday);
  startOfCurrentWeek.setHours(0, 0, 0, 0);

  // Cofnij się o 3 tygodnie (łącznie 4 tygodnie)
  const startDate = new Date(startOfCurrentWeek);
  startDate.setDate(startDate.getDate() - 21);

  // Generuj dane dla każdego dnia
  for (let i = 0; i < 28; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    date.setHours(12, 0, 0, 0); // Środek dnia żeby uniknąć problemów z timezone
    const dateStr = date.toDateString();

    // Sprawdź czy dzień jest przed rozpoczęciem planu
    const isBeforeStart = earliestStart ? date < earliestStart : false;

    // Sprawdź czy dzień był zaplanowany (tylko jeśli mamy konkretne dni)
    let isScheduled = false;
    if (hasAnySpecificDays && !isBeforeStart) {
      // Sprawdź czy którekolwiek przypisanie ma ten dzień zaplanowany
      isScheduled = activeAssignments.some((a) => {
        const assignmentStart = a.startDate ? new Date(a.startDate) : null;
        const assignmentEnd = a.endDate ? new Date(a.endDate) : null;

        // Sprawdź czy dzień jest w zakresie przypisania
        if (assignmentStart && date < assignmentStart) return false;
        if (assignmentEnd && date > assignmentEnd) return false;

        return isDayScheduled(a.frequency, date.getDay());
      });
    }

    // Znajdź postępy z tego dnia
    const dayProgress = progress.filter((p) => {
      if (!p.completedAt || p.status !== 'completed') return false;
      return new Date(p.completedAt).toDateString() === dateStr;
    });

    if (dayProgress.length > 0) {
      // Użyj najgorszego statusu z dnia
      const hasDiscomfort = dayProgress.some((p) => p.painLevel && p.painLevel > 5);
      const hasHard = dayProgress.some((p) => p.difficultyLevel && p.difficultyLevel > 6);
      const notes = dayProgress.find((p) => p.patientNotes)?.patientNotes;

      let feeling: FeelingType;
      let wellbeing: WellbeingType = 'ok';

      if (hasDiscomfort) {
        wellbeing = 'discomfort';
      }

      if (hasHard) {
        feeling = 'hard';
      } else {
        // Użyj średniej trudności
        const avgDifficulty =
          dayProgress.filter((p) => p.difficultyLevel).reduce((sum, p) => sum + (p.difficultyLevel || 0), 0) /
          dayProgress.length;
        feeling = mapDifficultyToFeeling(avgDifficulty || null);
      }

      result.push({
        date,
        dateStr,
        feeling,
        wellbeing,
        hasActivity: true,
        isScheduled: true, // Jeśli ćwiczył, to był zaplanowany
        isBeforeStart: false,
        notes,
      });
    } else {
      result.push({
        date,
        dateStr,
        feeling: null,
        wellbeing: null,
        hasActivity: false,
        isScheduled,
        isBeforeStart,
        notes: null,
      });
    }
  }

  return result;
}

/**
 * Zwraca dominujące odczucie z ostatnich treningów
 */
export function getDominantFeeling(progress: ExerciseProgressData[]): FeelingType | null {
  const completed = progress.filter((p) => p.status === 'completed' && p.difficultyLevel);
  if (completed.length === 0) return null;

  const feelings = completed.map((p) => mapDifficultyToFeeling(p.difficultyLevel));
  const counts = { easy: 0, ok: 0, hard: 0 };

  feelings.forEach((f) => counts[f]++);

  if (counts.hard > counts.ok && counts.hard > counts.easy) return 'hard';
  if (counts.easy > counts.ok) return 'easy';
  return 'ok';
}

/**
 * Formatuje datę w formacie "Wczoraj", "Dzisiaj" lub "DD.MM"
 */
export function formatRelativeDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const targetDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  if (targetDate.getTime() === today.getTime()) {
    return 'Dzisiaj';
  }
  if (targetDate.getTime() === yesterday.getTime()) {
    return 'Wczoraj';
  }

  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  return `${day}.${month}`;
}

/**
 * Formatuje datę z godziną
 */
export function formatDateWithTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const relativeDate = formatRelativeDate(d);
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${relativeDate}, ${hours}:${minutes}`;
}
