import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { usePatientVisibility } from './usePatientVisibility';

let role: string;
let settingResult: { data?: unknown; loading: boolean; error?: Error };
const queryMock = vi.fn();
const cache = { evict: vi.fn(), gc: vi.fn() };

vi.mock('@apollo/client/react', () => ({
  useQuery: (...args: unknown[]) => {
    queryMock(...args);
    return { ...settingResult, client: { cache } };
  },
}));

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: () => ({ currentOrganization: { organizationId: 'org-1', role }, isLoading: false }),
}));

const answer = (value: boolean) => ({
  data: { organizationById: { id: 'org-1', therapistsSeeAllPatients: value } },
  loading: false,
});

describe('usePatientVisibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    role = 'therapist';
  });

  it('restricts a therapist only when the clinic answered that the setting is off', () => {
    settingResult = answer(false);
    expect(renderHook(() => usePatientVisibility()).result.current.isRestricted).toBe(true);

    settingResult = answer(true);
    expect(renderHook(() => usePatientVisibility()).result.current.isRestricted).toBe(false);
  });

  it.each([
    ['the API without the field rejects the query', { data: undefined, loading: false, error: new Error('Cannot query field') }],
    ['the answer has not arrived', { data: undefined, loading: true }],
    ['the organization came back empty', { data: { organizationById: null }, loading: false }],
    ['the field is missing in the answer', { data: { organizationById: { id: 'org-1' } }, loading: false }],
  ])('treats no answer as unknown, not as off: %s', (_case, result) => {
    settingResult = result;

    expect(renderHook(() => usePatientVisibility()).result.current.isRestricted).toBe(false);
    expect(cache.evict).not.toHaveBeenCalled();
  });

  it('asks with the small visibility query, never with the shared organization document', () => {
    settingResult = answer(false);
    renderHook(() => usePatientVisibility());

    const [document, options] = queryMock.mock.calls[0] as [
      { definitions: Array<{ name?: { value?: string } }> },
      { variables: { id: string }; skip: boolean },
    ];
    expect(document.definitions[0].name?.value).toBe('GetOrganizationPatientVisibility');
    expect(options).toMatchObject({ variables: { id: 'org-1' }, skip: false });
  });

  it('does not ask for owner and admin, who always see the whole clinic', () => {
    role = 'OWNER';
    settingResult = { data: undefined, loading: false };

    expect(renderHook(() => usePatientVisibility()).result.current.isRestricted).toBe(false);
    expect((queryMock.mock.calls[0][1] as { skip: boolean }).skip).toBe(true);
  });

  it('drops cached patient lists when the setting changes during the session, not on the first answer', () => {
    settingResult = answer(true);
    const { rerender } = renderHook(() => usePatientVisibility());
    expect(cache.evict).not.toHaveBeenCalled();

    settingResult = answer(false);
    rerender();
    expect(cache.evict).toHaveBeenCalledWith({ id: 'ROOT_QUERY', fieldName: 'organizationPatients' });
  });
});
