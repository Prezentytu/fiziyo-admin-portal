import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { useState } from 'react';

import { LabeledStepper } from '../LabeledStepper';

function StepperHarness({
  initialValue,
  min,
}: Readonly<{
  initialValue: number;
  min: number;
}>) {
  const [value, setValue] = useState(initialValue);

  return (
    <div>
      <span data-testid="committed-value">{value}</span>
      <LabeledStepper value={value} onChange={setValue} label="POWT." min={min} max={30} />
    </div>
  );
}

describe('LabeledStepper', () => {
  it('pozwala wyczyścić input i wpisać nową wartość bez narzucania fallbacku', async () => {
    const user = userEvent.setup();

    render(<StepperHarness initialValue={1} min={1} />);

    const input = screen.getByTestId('stepper-input');

    await user.clear(input);
    expect(input).toHaveValue('');
    expect(screen.getByTestId('committed-value')).toHaveTextContent('1');

    await user.type(input, '4');
    expect(input).toHaveValue('4');
    expect(screen.getByTestId('committed-value')).toHaveTextContent('1');

    await user.tab();
    expect(screen.getByTestId('committed-value')).toHaveTextContent('4');
    expect(input).toHaveValue('4');
  });

  it('nie utrzymuje prefiksu 0 po wpisaniu nowej cyfry', async () => {
    const user = userEvent.setup();

    render(<StepperHarness initialValue={0} min={0} />);

    const input = screen.getByTestId('stepper-input');

    await user.clear(input);
    await user.type(input, '4');
    expect(input).toHaveValue('4');

    await user.tab();
    expect(screen.getByTestId('committed-value')).toHaveTextContent('4');
  });
});
