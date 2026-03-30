import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Clock } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import { ExerciseFieldLabelWithTooltip } from './ExerciseFieldLabelWithTooltip';

describe('ExerciseFieldLabelWithTooltip', () => {
  it('renderuje ikonę pola i pokazuje tooltip po hover', async () => {
    const user = userEvent.setup();

    render(
      <ExerciseFieldLabelWithTooltip
        label="Czas serii"
        tooltip="Łączny czas jednej serii."
        icon={<Clock className="h-3 w-3" />}
        testId="verification-duration-info"
      />
    );

    expect(screen.getByTestId('verification-duration-info-icon')).toBeInTheDocument();

    await user.hover(screen.getByTestId('verification-duration-info'));

    expect(await screen.findByRole('tooltip')).toHaveTextContent('Łączny czas jednej serii.');
  });
});
