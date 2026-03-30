import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { VerificationEditorPanel } from './VerificationEditorPanel';
import type { AdminExercise } from '@/graphql/types/adminExercise.types';

vi.mock('./VerificationStickyHeader', () => ({
  VerificationStickyHeader: () => <div data-testid="verification-editor-header-mock" />,
}));

vi.mock('./TagSmartChips', () => ({
  TagSmartChips: () => <div data-testid="verification-editor-main-tags-mock" />,
}));

const exerciseFixture: AdminExercise = {
  id: 'exercise-1',
  name: 'Przysiad',
  type: 'REPS',
  isActive: true,
  status: 'PENDING_REVIEW',
  defaultSets: 3,
  defaultReps: 10,
  defaultDuration: 30,
  defaultRestBetweenSets: 60,
  patientDescription:
    'Stań stabilnie, aktywuj brzuch i wykonaj kontrolowany ruch z pełnym zakresem przy neutralnym kręgosłupie.',
  clinicalDescription: 'Kontrolowany przysiad z naciskiem na tor kolana i stabilizację miednicy.',
};

describe('VerificationEditorPanel', () => {
  it('renderuje ikonki info dla parametrów i pokazuje techniczne pola po rozwinięciu', async () => {
    const user = userEvent.setup();

    render(
      <VerificationEditorPanel
        exercise={exerciseFixture}
        onFieldChange={vi.fn().mockResolvedValue(undefined)}
        mainTags={['nogi']}
        onMainTagsChange={vi.fn().mockResolvedValue(undefined)}
        additionalTags={[]}
        onAdditionalTagsChange={vi.fn().mockResolvedValue(undefined)}
      />
    );

    expect(screen.getByTestId('verification-sets-info-icon')).toBeInTheDocument();
    expect(screen.getByTestId('verification-reps-info-icon')).toBeInTheDocument();
    expect(screen.getByTestId('verification-duration-info-icon')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /szczegóły techniczne/i }));

    expect(screen.getByText('Bez zmian')).toBeInTheDocument();
    expect(screen.getByTestId('verification-tempo-info-icon')).toBeInTheDocument();
    expect(screen.getByTestId('verification-execution-time-info-icon')).toBeInTheDocument();
  });

  it('zapisuje obciążenie przez defaultLoad po zmianie typu', async () => {
    const user = userEvent.setup();
    const onFieldChange = vi.fn().mockResolvedValue(undefined);

    render(
      <VerificationEditorPanel
        exercise={exerciseFixture}
        onFieldChange={onFieldChange}
        mainTags={['nogi']}
        onMainTagsChange={vi.fn().mockResolvedValue(undefined)}
        additionalTags={[]}
        onAdditionalTagsChange={vi.fn().mockResolvedValue(undefined)}
      />
    );

    await user.click(screen.getByRole('button', { name: /szczegóły techniczne/i }));
    await user.click(screen.getByTestId('property-load-unit'));
    await user.click(screen.getByRole('option', { name: 'Guma oporowa' }));

    expect(onFieldChange).toHaveBeenCalledWith(
      'defaultLoad',
      expect.objectContaining({
        type: 'band',
      })
    );
    expect(screen.getByTestId('verification-technical-status-badge')).toBeInTheDocument();
  });
});
