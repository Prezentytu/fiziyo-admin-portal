'use client';

import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { RELEASE_EXERCISE_FROM_DEMO_POOL_MUTATION } from '@/graphql/mutations/demoPool.mutations';
import { GET_EXERCISE_AVAILABILITY_QUERY } from '@/graphql/queries/exercises.queries';

import { describeDemoReleaseError } from './utils/demoRelease';

interface ReleaseResponse {
  releaseExerciseFromDemoPool?: { id: string; availability?: string | null } | null;
}

/**
 * Zdjęcie flagi demo: recenzent katalogu przenosi ćwiczenie z puli demo do zwykłej bazy FiziYo.
 * O tym, czy wolno, rozstrzyga backend (własne zdjęcie i własny film); odmowa wraca z powodem.
 */
export function DemoReleaseButton({ exerciseId }: Readonly<{ exerciseId: string }>) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [release, { loading }] = useMutation<ReleaseResponse>(RELEASE_EXERCISE_FROM_DEMO_POOL_MUTATION, {
    refetchQueries: [{ query: GET_EXERCISE_AVAILABILITY_QUERY, variables: { id: exerciseId } }],
  });

  const handleConfirm = async () => {
    try {
      const { data } = await release({ variables: { exerciseId } });
      if (data?.releaseExerciseFromDemoPool?.availability === 'STANDARD') {
        toast.success('Ćwiczenie jest w zwykłej bazie FiziYo.');
      } else {
        toast.error(describeDemoReleaseError(undefined));
      }
    } catch (error) {
      toast.error(describeDemoReleaseError(error));
    }
  };

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={loading}
        onClick={() => setConfirmOpen(true)}
        data-testid="exercise-detail-demo-release-btn"
      >
        {loading ? 'Przenoszenie...' : 'Przenieś do zwykłej bazy'}
      </Button>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Przenieść ćwiczenie do zwykłej bazy?"
        description="Ćwiczenie przestanie być w puli demo i zobaczą je wszystkie gabinety. Wymaga własnego zdjęcia i własnego filmu."
        confirmText="Przenieś"
        onConfirm={() => void handleConfirm()}
      />
    </>
  );
}
