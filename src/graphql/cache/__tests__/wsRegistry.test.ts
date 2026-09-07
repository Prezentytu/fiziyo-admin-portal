import { describe, expect, it, vi } from 'vitest';
import { disposeGraphqlWs, registerGraphqlWsDispose } from '@/graphql/cache/wsRegistry';

describe('wsRegistry', () => {
  it('disposes the registered GraphQL WS client', () => {
    const dispose = vi.fn();
    registerGraphqlWsDispose(dispose);
    disposeGraphqlWs();
    expect(dispose).toHaveBeenCalledTimes(1);
  });
});
