import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CatalogEmptyState } from './CatalogEmptyState';

describe('CatalogEmptyState', () => {
  it('renders import and create CTAs when the FiziYo catalog is empty', () => {
    render(
      <CatalogEmptyState
        sourceFilter="fiziyo"
        isSearch={false}
        fiziyoCount={0}
        ownCount={0}
        onBrowseCatalog={vi.fn()}
        onCreate={vi.fn()}
        onImport={vi.fn()}
      />
    );

    expect(screen.getByTestId('common-empty-state')).toBeInTheDocument();
    expect(screen.getByTestId('exercise-empty-create-btn')).toHaveTextContent('Utwórz ćwiczenie');
    expect(screen.getByTestId('exercise-empty-import-btn')).toHaveTextContent('Importuj paczkę');
    expect(screen.queryByTestId('exercise-empty-browse-catalog-btn')).not.toBeInTheDocument();
    expect(screen.getByText('Katalog FiziYo jest pusty')).toBeInTheDocument();
  });

  it('offers browse catalog from the organization tab', () => {
    render(
      <CatalogEmptyState
        sourceFilter="organization"
        isSearch={false}
        fiziyoCount={200}
        ownCount={0}
        onBrowseCatalog={vi.fn()}
        onCreate={vi.fn()}
        onImport={vi.fn()}
      />
    );

    expect(screen.getByTestId('exercise-empty-browse-catalog-btn')).toHaveTextContent('Przeglądaj katalog FiziYo');
  });
});
