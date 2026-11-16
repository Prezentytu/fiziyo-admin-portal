import { describe, expect, it, vi } from 'vitest';
import { ApolloLink, Observable, gql } from '@apollo/client';
import { execute } from '@apollo/client/link';
import { AuthLinkFactory } from '../authLink';
import { BackendTokenUnavailableError } from '@/graphql/providers/tokenExchangeRetry';

const QUERY = gql`
  query Probe {
    probe
  }
`;

function terminating(spy: (headers: Record<string, string>) => void): ApolloLink {
  return new ApolloLink((operation) => {
    spy(operation.getContext().headers);
    return new Observable((observer) => {
      observer.next({ data: { probe: true } });
      observer.complete();
    });
  });
}

function run(link: ApolloLink): Promise<unknown> {
  return new Promise((resolve, reject) => {
    execute(link, { query: QUERY }, { client: {} as never }).subscribe({ next: resolve, error: reject });
  });
}

describe('AuthLinkFactory', () => {
  it('sends the backend token as Bearer', async () => {
    const forward = vi.fn();
    const auth = new AuthLinkFactory({ getToken: async () => 'backend-jwt' }).create();

    await run(ApolloLink.from([auth, terminating(forward)]));

    expect(forward).toHaveBeenCalledWith(expect.objectContaining({ Authorization: 'Bearer backend-jwt' }));
  });

  it('fails the operation instead of sending it unauthenticated when the token is unavailable', async () => {
    const forward = vi.fn();
    const auth = new AuthLinkFactory({
      getToken: async () => {
        throw new BackendTokenUnavailableError();
      },
    }).create();

    await expect(run(ApolloLink.from([auth, terminating(forward)]))).rejects.toBeInstanceOf(
      BackendTokenUnavailableError
    );
    expect(forward).not.toHaveBeenCalled();
  });
});
