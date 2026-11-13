import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CatalogBundleImportCard } from './CatalogBundleImportCard';

const importBundleMock = vi.fn();
const toastSuccess = vi.fn();
const toastWarning = vi.fn();
const toastError = vi.fn();

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    warning: (...args: unknown[]) => toastWarning(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}));

vi.mock('@/hooks/useExerciseBundleImport', () => ({
  useExerciseBundleImport: () => [importBundleMock, { loading: false }] as const,
}));

const bundleWithMedia = JSON.stringify({
  exercises: [{ id: 'a', name: 'Przysiad', media: [{ url: 'https://dev.example.test/a.jpg' }] }],
});

const baseResult = {
  success: true,
  fileKind: 'exercises',
  exercisesUpserted: 1,
  mediaReplaced: 0,
  tagsUpserted: 0,
  categoriesUpserted: 0,
  tagLinks: 0,
  relations: 0,
  skipped: 0,
  errors: [],
  warnings: [],
};

const emptyReport = {
  copied: 0,
  alreadyPresent: 0,
  planned: 0,
  kept: 0,
  failed: 0,
  deferred: 0,
  notCopied: 0,
  items: [],
};

async function upload(text: string) {
  render(<CatalogBundleImportCard organizationId="org-1" />);
  const file = new File([text], 'exercises-001.json', { type: 'application/json' });
  Object.defineProperty(file, 'text', { value: () => Promise.resolve(text) });
  fireEvent.change(screen.getByTestId('settings-catalog-import-input'), { target: { files: [file] } });
  await waitFor(() => expect(importBundleMock).toHaveBeenCalled());
}

describe('CatalogBundleImportCard: media po imporcie', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('REPLACE z pustym mediaCopy.items i mediami w paczce: ostrzeżenie, nie toast sukcesu', async () => {
    importBundleMock.mockResolvedValue({
      data: { importExerciseBundle: { ...baseResult, mode: 'REPLACE', mediaCopy: emptyReport } },
    });
    await upload(bundleWithMedia);

    await waitFor(() => expect(toastWarning).toHaveBeenCalled());
    expect(toastWarning.mock.calls[0][0]).toContain('mediów nie skopiowano');
    expect(toastSuccess).not.toHaveBeenCalled();
    expect(await screen.findByTestId('settings-catalog-import-media-notice')).toHaveTextContent('mediów nie skopiowano');
  });

  it('paczka bez mediów: zwykły toast sukcesu, bez ostrzeżenia', async () => {
    importBundleMock.mockResolvedValue({ data: { importExerciseBundle: { ...baseResult, mediaCopy: emptyReport } } });
    await upload(JSON.stringify({ exercises: [{ id: 'a' }] }));

    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
    expect(toastWarning).not.toHaveBeenCalled();
    expect(screen.queryByTestId('settings-catalog-import-media-notice')).toBeNull();
  });

  it('success: false z kodami MEDIA_*: błąd z powodem dla użytkownika', async () => {
    importBundleMock.mockResolvedValue({
      data: {
        importExerciseBundle: {
          ...baseResult,
          success: false,
          errors: ['MEDIA_DEFERRED'],
          items: [{ id: 'a', name: 'Przysiad', reasonCode: 'MEDIA_DEFERRED', reason: 'x' }],
        },
      },
    });
    await upload(bundleWithMedia);

    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(toastError.mock.calls[0][0]).toContain('Przysiad: kopia mediów nie zmieściła się');
    expect(toastSuccess).not.toHaveBeenCalled();
  });
});
