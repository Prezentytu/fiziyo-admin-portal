import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ImportReviewDashboard } from './ImportReviewDashboard';
import type { ExerciseDecision, ExtractedExercise, MatchSuggestion } from '@/types/import.types';

const baseExercise: ExtractedExercise = {
  tempId: 'tmp-1',
  name: 'Przysiad',
  type: 'reps',
  suggestedTags: [],
  confidence: 0.9,
};

const baseDecision: ExerciseDecision = {
  tempId: 'tmp-1',
  action: 'create',
};

describe('ImportReviewDashboard', () => {
  it('kieruje ćwiczenie bez sugestii do sekcji nowych', () => {
    render(
      <ImportReviewDashboard
        exercises={[baseExercise]}
        matchSuggestions={{}}
        decisions={{ 'tmp-1': baseDecision }}
        onDecisionChange={vi.fn()}
        onApproveAllConfident={vi.fn()}
        onNext={vi.fn()}
        createSetAfterImport={false}
        onCreateSetChange={vi.fn()}
      />
    );

    expect(screen.getByText('Nowe ćwiczenia (1)')).toBeInTheDocument();
    expect(screen.queryByText('Wymaga decyzji (1)')).not.toBeInTheDocument();
  });

  it('kieruje sugestię 0.79 do sekcji wymagającej decyzji', () => {
    const suggestions: Record<string, MatchSuggestion[]> = {
      'tmp-1': [
        {
          existingExerciseId: 'existing-1',
          existingExerciseName: 'Przysiad',
          confidence: 0.79,
          matchReason: 'fallback',
          source: 'frontend_fallback',
          matchStatus: 'normalized_exact',
        },
      ],
    };

    render(
      <ImportReviewDashboard
        exercises={[baseExercise]}
        matchSuggestions={suggestions}
        decisions={{ 'tmp-1': baseDecision }}
        onDecisionChange={vi.fn()}
        onApproveAllConfident={vi.fn()}
        onNext={vi.fn()}
        createSetAfterImport={false}
        onCreateSetChange={vi.fn()}
      />
    );

    expect(screen.getByText('Wymaga decyzji (1)')).toBeInTheDocument();
    expect(screen.queryByText('Nowe ćwiczenia (1)')).not.toBeInTheDocument();
  });
});
