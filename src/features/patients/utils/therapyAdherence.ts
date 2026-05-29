export const ADHERENCE_THRESHOLDS = {
  gentleNoticeDays: 3,
  sustainedGapDays: 5,
  contactSuggestedDays: 7,
  minPlanAgeDays: 3,
  discomfortPainLevel: 5,
  hardDifficultyLevel: 6,
  missedTrainingsWarning: 2,
  hardSessionsWarning: 3,
} as const;

export type TherapyReason = 'on_track' | 'inactivity' | 'missed_schedule' | 'high_difficulty' | 'discomfort';
export type TherapyTone = 'positive' | 'informative' | 'caution';

export interface TherapyStatusViewModel {
  tone: TherapyTone;
  reason: TherapyReason;
  title: string;
  description: string;
  nextStep: string;
  badgeLabel: string;
  daysSinceLastActivity?: number;
  lastActivityAt?: string;
}

interface TherapyAdherenceMetrics {
  daysSinceStart: number;
  daysSinceLastActivity: number;
  missedTrainings: number;
  hardCount: number;
  hasDiscomfort: boolean;
  requiredSoFar: number;
  activeDays: number;
  lastActivityAt?: string;
}

export function evaluateTherapyAdherence(metrics: TherapyAdherenceMetrics): TherapyStatusViewModel {
  if (metrics.hasDiscomfort) {
    return {
      tone: 'caution',
      reason: 'discomfort',
      title: 'Skontroluj plan',
      description: 'Pacjent zgłosił dyskomfort podczas ćwiczeń. Warto sprawdzić obciążenie i tempo programu.',
      nextStep: 'Skontaktuj się z pacjentem i rozważ korektę planu',
      badgeLabel: 'SKONTROLUJ PLAN',
      daysSinceLastActivity: metrics.daysSinceLastActivity,
      lastActivityAt: metrics.lastActivityAt,
    };
  }

  const canEvaluateInactivity = metrics.daysSinceStart >= ADHERENCE_THRESHOLDS.minPlanAgeDays;
  if (canEvaluateInactivity && metrics.daysSinceLastActivity >= ADHERENCE_THRESHOLDS.gentleNoticeDays) {
    if (metrics.daysSinceLastActivity >= ADHERENCE_THRESHOLDS.contactSuggestedDays) {
      return {
        tone: 'caution',
        reason: 'inactivity',
        title: 'Dłuższa przerwa',
        description: `Pacjent nie ćwiczył od ${metrics.daysSinceLastActivity} dni. Warto sprawdzić, czy plan nadal jest dopasowany.`,
        nextStep: 'Zadzwoń do pacjenta i zaproponuj dalsze kroki',
        badgeLabel: 'UWAGA',
        daysSinceLastActivity: metrics.daysSinceLastActivity,
        lastActivityAt: metrics.lastActivityAt,
      };
    }

    if (metrics.daysSinceLastActivity >= ADHERENCE_THRESHOLDS.sustainedGapDays) {
      return {
        tone: 'caution',
        reason: 'inactivity',
        title: 'Spadek regularności',
        description: `Pacjent nie ćwiczył od ${metrics.daysSinceLastActivity} dni. Delikatne przypomnienie może pomóc wrócić do rutyny.`,
        nextStep: 'Rozważ kontakt i krótką korektę planu',
        badgeLabel: 'UWAGA',
        daysSinceLastActivity: metrics.daysSinceLastActivity,
        lastActivityAt: metrics.lastActivityAt,
      };
    }

    return {
      tone: 'informative',
      reason: 'inactivity',
      title: 'Mniejsza aktywność',
      description: `Pacjent miał przerwę ${metrics.daysSinceLastActivity} dni. To dobry moment na lekkie przypomnienie.`,
      nextStep: 'Wyślij przypomnienie lub krótką wiadomość',
      badgeLabel: 'MONITORUJ',
      daysSinceLastActivity: metrics.daysSinceLastActivity,
      lastActivityAt: metrics.lastActivityAt,
    };
  }

  const hasMissedSchedule = metrics.missedTrainings >= ADHERENCE_THRESHOLDS.missedTrainingsWarning;
  const hasHighDifficulty = metrics.hardCount >= ADHERENCE_THRESHOLDS.hardSessionsWarning;

  if ((hasMissedSchedule && canEvaluateInactivity) || hasHighDifficulty) {
    const reasons: string[] = [];
    if (hasMissedSchedule) {
      reasons.push(`pominął ${metrics.missedTrainings} zaplanowanych treningów`);
    }
    if (hasHighDifficulty) {
      reasons.push(`ostatnie treningi ocenia jako ciężkie (${metrics.hardCount}x)`);
    }

    return {
      tone: 'caution',
      reason: hasMissedSchedule ? 'missed_schedule' : 'high_difficulty',
      title: 'Wymaga monitorowania',
      description: `Pacjent ${reasons.join(' oraz ')}. Warto zweryfikować obciążenie programu.`,
      nextStep: 'Rozważ kontakt i dopasowanie intensywności planu',
      badgeLabel: 'UWAGA',
      daysSinceLastActivity: metrics.daysSinceLastActivity,
      lastActivityAt: metrics.lastActivityAt,
    };
  }

  const completionPercent = metrics.requiredSoFar > 0 ? Math.round((metrics.activeDays / metrics.requiredSoFar) * 100) : 100;

  return {
    tone: 'positive',
    reason: 'on_track',
    title: 'Regularna aktywność',
    description: `Pacjent realizuje plan zgodnie z założeniami${completionPercent < 100 ? ` (${completionPercent}% wykonania)` : ''}.`,
    nextStep: 'Brak pilnej interwencji',
    badgeLabel: 'W NORMIE',
    daysSinceLastActivity: metrics.daysSinceLastActivity,
    lastActivityAt: metrics.lastActivityAt,
  };
}
