'use client';

import { Dumbbell } from 'lucide-react';

import { EmptyState } from '@/components/shared/EmptyState';
import { resolveCatalogEmptyCopy } from '@/utils/catalogEmptyState';
import type { ExerciseSourceFilter } from '@/utils/exerciseSourceFilter';

interface CatalogEmptyStateProps {
  sourceFilter: ExerciseSourceFilter;
  isSearch: boolean;
  fiziyoCount: number;
  ownCount: number;
  onBrowseCatalog: () => void;
  onCreate: () => void;
  onImport: () => void;
  importLoading?: boolean;
}

export function CatalogEmptyState({
  sourceFilter,
  isSearch,
  fiziyoCount,
  ownCount,
  onBrowseCatalog,
  onCreate,
  onImport,
  importLoading = false,
}: CatalogEmptyStateProps) {
  const copy = resolveCatalogEmptyCopy({ sourceFilter, isSearch, fiziyoCount, ownCount });

  return (
    <EmptyState
      icon={Dumbbell}
      title={copy.title}
      description={copy.description}
      actionLabel={copy.showBrowseCatalog ? 'Przeglądaj katalog FiziYo' : copy.showCreate ? 'Utwórz ćwiczenie' : undefined}
      onAction={copy.showBrowseCatalog ? onBrowseCatalog : copy.showCreate ? onCreate : undefined}
      actionTestId={copy.showBrowseCatalog ? 'exercise-empty-browse-catalog-btn' : 'exercise-empty-create-btn'}
      secondaryActionLabel={
        copy.showBrowseCatalog && copy.showCreate
          ? 'Utwórz ćwiczenie'
          : copy.showImport
            ? 'Importuj paczkę'
            : undefined
      }
      onSecondaryAction={
        copy.showBrowseCatalog && copy.showCreate ? onCreate : copy.showImport ? onImport : undefined
      }
      secondaryActionLoading={!(copy.showBrowseCatalog && copy.showCreate) && importLoading}
      secondaryActionTestId={
        copy.showBrowseCatalog && copy.showCreate ? 'exercise-empty-create-btn' : 'exercise-empty-import-btn'
      }
      tertiaryActionLabel={copy.showBrowseCatalog && copy.showImport ? 'Importuj paczkę' : undefined}
      onTertiaryAction={copy.showBrowseCatalog && copy.showImport ? onImport : undefined}
      tertiaryActionTestId="exercise-empty-import-btn"
    />
  );
}
