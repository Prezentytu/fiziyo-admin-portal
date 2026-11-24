'use client';

import { useState } from 'react';
import { Loader2, UserPlus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { VerificationTeam, VerificationTeamMember } from '@/graphql/types/adminExercise.types';
import { cn } from '@/lib/utils';

import { CLAIM_BATCH_SIZES } from './utils/claimQueue';

interface VerificationTeamBarProps {
  readonly team: VerificationTeam;
  /** Pokazuje „Do sprawdzenia” tej osoby. */
  readonly onShowQueue: (member: VerificationTeamMember) => void;
  /** Pokazuje „Poprawki wewnętrzne” tej osoby. */
  readonly onShowFixes: (member: VerificationTeamMember) => void;
  /** Przydziela następne `count` wolnych ćwiczeń w kolejności listy. */
  readonly onClaim: (count: number, member: VerificationTeamMember) => void;
  readonly claimingCount: number | null;
  readonly className?: string;
}

function memberLabel(member: VerificationTeamMember): string {
  return member.isMe ? 'Ty' : member.fullname;
}

/**
 * Kto co weryfikuje (SPEC-041): każda osoba z zespołu z liczbą ćwiczeń do sprawdzenia, w poprawkach i dziś
 * zrobionych, a obok „Przydziel następne N” dla wybranej osoby w kolejności listy.
 */
export function VerificationTeamBar({
  team,
  onShowQueue,
  onShowFixes,
  onClaim,
  claimingCount,
  className,
}: VerificationTeamBarProps) {
  const me = team.members.find((member) => member.isMe) ?? team.members[0];
  const [targetId, setTargetId] = useState<string | undefined>(me?.userId);
  const target = team.members.find((member) => member.userId === targetId) ?? me;
  const nothingFree = team.unassignedPending === 0;

  return (
    <section
      className={cn('flex flex-col gap-3 rounded-xl border border-border/60 bg-surface p-3', className)}
      aria-label="Zespół weryfikacji"
      data-testid="verification-team-bar"
    >
      <ul className="flex flex-wrap gap-2">
        {team.members.map((member) => (
          <li
            key={member.userId}
            className={cn(
              'flex items-center gap-3 rounded-lg border px-3 py-1.5 text-sm',
              member.isMe ? 'border-primary/40 bg-primary/5' : 'border-border/60'
            )}
            data-testid={`verification-team-member-${member.userId}`}
          >
            <span className="font-medium text-foreground">{memberLabel(member)}</span>
            <button
              type="button"
              onClick={() => onShowQueue(member)}
              data-testid={`verification-team-member-${member.userId}-queue`}
              className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              aria-label={`${memberLabel(member)}: do sprawdzenia ${member.assignedPending}`}
            >
              <span className="font-semibold tabular-nums text-foreground">{member.assignedPending}</span> do
              sprawdzenia
            </button>
            <button
              type="button"
              onClick={() => onShowFixes(member)}
              data-testid={`verification-team-member-${member.userId}-fixes`}
              className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              aria-label={`${memberLabel(member)}: w poprawkach ${member.waitingFixes}`}
            >
              <span className="font-semibold tabular-nums text-foreground">{member.waitingFixes}</span> w poprawkach
            </button>
            <span className="text-muted-foreground">
              dziś <span className="font-semibold tabular-nums text-primary">{member.decidedToday}</span>
            </span>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground" data-testid="verification-team-free">
          Wolne: <span className="font-semibold tabular-nums text-foreground">{team.unassignedPending}</span>
        </span>
        <span className="mx-1 hidden h-4 w-px bg-border sm:block" aria-hidden />
        <span className="text-muted-foreground">Przydziel następne dla</span>
        <Select value={target?.userId} onValueChange={setTargetId} data-testid="verification-claim-assignee-select">
          <SelectTrigger
            size="sm"
            className="w-[180px] border-border/60 bg-surface"
            aria-label="Komu przydzielić"
            data-testid="verification-claim-assignee"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {team.members.map((member) => (
              <SelectItem key={member.userId} value={member.userId}>
                {member.isMe ? 'Mnie' : member.fullname}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {CLAIM_BATCH_SIZES.map((count) => (
          <Button
            key={count}
            variant="outline"
            size="sm"
            onClick={() => target && onClaim(count, target)}
            disabled={!target || nothingFree || claimingCount !== null}
            className="gap-1.5"
            aria-label={`Przydziel następne ${count}: ${target ? memberLabel(target) : ''}`}
            data-testid={`verification-claim-${count}`}
          >
            {claimingCount === count ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <UserPlus className="h-3.5 w-3.5" />
            )}
            {count}
          </Button>
        ))}
      </div>
    </section>
  );
}
