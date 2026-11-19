'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Eye, UserPlus } from 'lucide-react';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { buildSetAssignHref } from '@/features/exercise-sets/utils/setAssignHref';

export interface CreatedSetInfo {
  id: string;
  name: string;
}

interface SetCreatedDialogProps {
  /** Świeżo utworzony zestaw; `null` = okno zamknięte. */
  createdSet: CreatedSetInfo | null;
  onClose: () => void;
  /** Tekst przycisku powrotu (zamyka okno i zostawia użytkownika tam, gdzie był). */
  backLabel?: string;
}

/** Wspólny następny krok po utworzeniu zestawu: przypisz pacjentowi, zobacz zestaw albo wróć. */
export function SetCreatedDialog({ createdSet, onClose, backLabel = 'Zamknij' }: SetCreatedDialogProps) {
  const router = useRouter();

  const goTo = (href: string) => {
    onClose();
    router.push(href);
  };

  return (
    <Dialog open={createdSet !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md" data-testid="set-created-dialog">
        <DialogHeader className="items-center text-center">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-status-success-muted">
            <CheckCircle2 className="h-6 w-6 text-status-success" />
          </div>
          <DialogTitle>Zestaw utworzony</DialogTitle>
          <DialogDescription>„{createdSet?.name}” jest gotowy. Co dalej?</DialogDescription>
        </DialogHeader>

        {createdSet && (
          <div className="flex flex-col gap-2 pt-2">
            <Button onClick={() => goTo(buildSetAssignHref(createdSet.id))} data-testid="set-created-assign-btn">
              <UserPlus className="mr-2 h-4 w-4" />
              Przypisz pacjentowi
            </Button>
            <Button
              variant="outline"
              onClick={() => goTo(`/exercise-sets/${createdSet.id}`)}
              data-testid="set-created-view-btn"
            >
              <Eye className="mr-2 h-4 w-4" />
              Zobacz zestaw
            </Button>
            <Button variant="ghost" onClick={onClose} data-testid="set-created-back-btn">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {backLabel}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
