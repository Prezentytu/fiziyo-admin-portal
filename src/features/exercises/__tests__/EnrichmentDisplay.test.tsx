import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { EnrichmentDisplay } from '../EnrichmentDisplay';

describe('EnrichmentDisplay', () => {
  it('disables editing controls when editable mode has no persistence callbacks', () => {
    render(<EnrichmentDisplay editable enrichmentData={{ patient: { mistakes: [{ mistake: 'Kolano schodzi', fix: '' }] } }} />);

    expect(screen.getByTestId('exercise-enrichment-add-mistake-btn')).toBeDisabled();
    expect(screen.getByTestId('exercise-enrichment-mistake-text-0')).toBeDisabled();
    expect(screen.getByTestId('exercise-enrichment-mistake-remove-0')).toBeDisabled();
  });
});
