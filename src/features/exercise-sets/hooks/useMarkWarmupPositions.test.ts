import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useMarkWarmupPositions } from './useMarkWarmupPositions';

const query = vi.hoisted(() => vi.fn());
const mutate = vi.hoisted(() => vi.fn());
const warning = vi.hoisted(() => vi.fn());

vi.mock('@apollo/client/react', () => ({
  useApolloClient: () => ({ query }),
  useMutation: () => [mutate, { loading: false }],
}));
vi.mock('sonner', () => ({ toast: { warning } }));

const mappings = [
  { id: 'm1', order: 1, isWarmup: false, requiresMappingIds: [] },
  { id: 'm2', order: 2, isWarmup: false, requiresMappingIds: [] },
];

describe('useMarkWarmupPositions', () => {
  beforeEach(() => {
    query.mockReset();
    mutate.mockReset();
    warning.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  const mark = () => renderHook(() => useMarkWarmupPositions()).result.current;

  it('flags the warm-up positions of the saved set, by set order', async () => {
    query.mockResolvedValue({ data: { exerciseSetById: { id: 's1', exerciseMappings: mappings } } });
    mutate.mockResolvedValue({});
    await mark()('s1', [true, false]);
    expect(mutate).toHaveBeenCalledWith({
      variables: {
        exerciseSetId: 's1',
        items: [{ mappingId: 'm1', isWarmup: true, requiresMappingIds: [], dependencyMode: null }],
      },
    });
    expect(warning).not.toHaveBeenCalled();
  });

  it('does nothing without a warm-up', async () => {
    await mark()('s1', [false, false]);
    expect(query).not.toHaveBeenCalled();
  });

  it('stays silent when the API does not know the dependency fields yet (before fizjo-app#682)', async () => {
    query.mockResolvedValue({ data: undefined, error: new Error('Cannot query field "isWarmup"') });
    await mark()('s1', [true, false]);
    expect(mutate).not.toHaveBeenCalled();
    expect(warning).not.toHaveBeenCalled();
  });

  it('warns but keeps the saved set when flagging fails', async () => {
    query.mockResolvedValue({ data: { exerciseSetById: { id: 's1', exerciseMappings: mappings } } });
    mutate.mockRejectedValue(new Error('network'));
    await mark()('s1', [true, false]);
    expect(warning).toHaveBeenCalledTimes(1);
  });

  it('warns when the saved positions do not match what was proposed', async () => {
    query.mockResolvedValue({ data: { exerciseSetById: { id: 's1', exerciseMappings: [mappings[0]] } } });
    await mark()('s1', [true, false]);
    expect(mutate).not.toHaveBeenCalled();
    expect(warning).toHaveBeenCalledTimes(1);
  });
});
