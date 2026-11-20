import { MessageSquareText, UserCheck } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import type { ExerciseReviewWorkflow } from '@/graphql/types/adminExercise.types';

interface ReviewWorkflowBadgesProps {
  workflow: ExerciseReviewWorkflow | null | undefined;
  testIdPrefix: string;
}

/** Who took the exercise, internal fixes state and open notes, on queue cards. Renders nothing without data. */
export function ReviewWorkflowBadges({ workflow, testIdPrefix }: Readonly<ReviewWorkflowBadgesProps>) {
  if (!workflow) return null;
  const hasAnything = workflow.assigneeId || workflow.internalFixStatus !== 'NONE' || workflow.openNoteCount > 0;
  if (!hasAnything) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5" data-testid={`${testIdPrefix}-review-workflow`}>
      {workflow.internalFixStatus === 'WAITING' && <Badge variant="warning">Czeka na poprawki</Badge>}
      {workflow.internalFixStatus === 'FIXED' && <Badge variant="success">Poprawione, sprawdź</Badge>}
      {workflow.assigneeId && (
        <Badge variant={workflow.assignedToMe ? 'default' : 'secondary'} data-testid={`${testIdPrefix}-assignee`}>
          <UserCheck className="mr-1 h-3 w-3" aria-hidden />
          {workflow.assignedToMe ? 'Moje' : workflow.assigneeName || 'Przypisane'}
        </Badge>
      )}
      {workflow.openNoteCount > 0 && (
        <Badge variant="secondary">
          <MessageSquareText className="mr-1 h-3 w-3" aria-hidden />
          Uwagi: {workflow.openNoteCount}
        </Badge>
      )}
    </div>
  );
}
