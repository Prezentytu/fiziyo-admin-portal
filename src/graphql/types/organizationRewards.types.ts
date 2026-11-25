export interface RewardSettings {
  canManage: boolean;
  rewardsEnabled: boolean;
  pausedByFiziyo: boolean;
  recognitionPoints: number;
  badgePointsMax: number;
  enabledBadges: string[];
  availableBadges: string[];
}

export interface RewardTemplate {
  id: string;
  patientTitle: string;
  portalDescription: string;
  kind: 'BADGE' | 'ENVELOPE';
  defaultCost: number;
  minCost: number;
  maxCost: number;
  usable: boolean;
}

export interface RewardTerms {
  cost: number;
  frequency: 'ONCE_PER_PATIENT' | 'EVERY_N_DAYS';
  frequencyDays: number | null;
  monthlyCap: number | null;
}

export interface CabinetReward extends RewardTerms {
  id: string;
  templateId: string;
  title: string;
  portalDescription: string;
  kind: RewardTemplate['kind'];
  status: 'ACTIVE' | 'PAUSED' | 'DRAFT';
}

export interface RewardEnvelope {
  id: string;
  title: string;
  patientId: string;
  patientName: string;
  dueAt: string;
  overdue: boolean;
  requiresExercise: boolean;
  sentenceStarters: string[];
  answerText: string | null;
  exerciseName: string | null;
}

export interface RewardExercise {
  id: string;
  name: string;
}
export interface RewardAssignment {
  exercise: RewardExercise | null;
  exerciseSet: {
    exerciseMappings: { id: string; exercise: RewardExercise | null; customName: string | null }[];
  } | null;
  exerciseOverrides: string | null;
}

export interface PatientRewards {
  balance: number;
  rewardsEnabled: boolean;
  enabledBadges: string[];
  badgePoints: number;
  canAwardBadge: boolean;
  nextBadgeAt: string | null;
  badges: { id: string; badgeKey: string; awardedByName: string; awardedAt: string; points: number }[];
  envelopes: RewardEnvelope[];
}
