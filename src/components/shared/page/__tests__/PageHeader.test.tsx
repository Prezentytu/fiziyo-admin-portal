import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageHeader } from '../PageHeader';

describe('PageHeader', () => {
  it('renders title and description', () => {
    render(<PageHeader title="Ćwiczenia" description="Katalog" />);
    expect(screen.getByTestId('page-header-title')).toHaveTextContent('Ćwiczenia');
    expect(screen.getByText('Katalog')).toBeInTheDocument();
  });
});
