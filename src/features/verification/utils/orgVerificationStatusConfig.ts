export type OrgVerificationStatus =
  | 'NOT_SUBMITTED'
  | 'PENDING_ORG_REVIEW'
  | 'ORG_CHANGES_REQUESTED'
  | 'ORG_VERIFIED'
  | 'ORG_ARCHIVED';

export interface OrgStatusConfig {
  label: string;
  color: string;
}

export const ORG_VERIFICATION_STATUS_CONFIG: Record<OrgVerificationStatus, OrgStatusConfig> = {
  NOT_SUBMITTED: { label: 'Nie zgłoszone', color: 'bg-muted text-muted-foreground border-border' },
  PENDING_ORG_REVIEW: { label: 'Oczekuje na weryfikację', color: 'bg-amber-500/20 text-amber-500 border-amber-500/30' },
  ORG_CHANGES_REQUESTED: { label: 'Do poprawy', color: 'bg-orange-500/20 text-orange-500 border-orange-500/30' },
  ORG_VERIFIED: { label: 'Zweryfikowane', color: 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30' },
  ORG_ARCHIVED: { label: 'Zarchiwizowane', color: 'bg-muted text-muted-foreground border-border' },
};

export function getOrgVerificationStatusConfig(status: string | null | undefined): OrgStatusConfig {
  const key = (status ?? 'NOT_SUBMITTED') as OrgVerificationStatus;
  return ORG_VERIFICATION_STATUS_CONFIG[key] ?? ORG_VERIFICATION_STATUS_CONFIG.NOT_SUBMITTED;
}
