'use client';

import { ApolloClient, InMemoryCache, ApolloLink, split } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { getMainDefinition } from '@apollo/client/utilities';
import { useAuth } from '@clerk/nextjs';
import { useMemo, useRef } from 'react';
import { AuthLinkFactory } from '@/graphql/links/authLink';
import { HttpLinkFactory } from '@/graphql/links/httpLink';
import { ErrorLinkFactory } from '@/graphql/links/errorLink';
import { WsLinkFactory } from '@/graphql/links/wsLink';
import { BackendAuthTokenProvider } from '@/graphql/providers/BackendAuthTokenProvider';
import { apolloDefaultOptions, possibleTypes, typePolicies } from '@/graphql/cache/typePolicies';
import { registerGraphqlWsDispose } from '@/graphql/cache/wsRegistry';

export function ApolloWrapper({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const client = useMemo(() => {
    const tokenProvider = new BackendAuthTokenProvider(() => getTokenRef.current());
    const wsLinkFactory = new WsLinkFactory(async () => tokenProvider.getToken());

    const httpLink = ApolloLink.from([
      new ErrorLinkFactory(tokenProvider).create(),
      new AuthLinkFactory(tokenProvider).create(),
      new HttpLinkFactory({
        getGraphQLEndpoint: () => `${process.env.NEXT_PUBLIC_API_URL}/graphql`,
        getBaseUrl: () => process.env.NEXT_PUBLIC_API_URL!,
      }).create(),
    ]);

    const wsLink = wsLinkFactory.create();
    registerGraphqlWsDispose(() => wsLinkFactory.dispose());

    const splitLink = split(
      ({ query }) => {
        const definition = getMainDefinition(query);
        return definition.kind === 'OperationDefinition' && definition.operation === 'subscription';
      },
      wsLink,
      httpLink
    );

    return new ApolloClient({
      link: splitLink,
      cache: new InMemoryCache({ possibleTypes, typePolicies }),
      defaultOptions: apolloDefaultOptions,
    });
  }, []);

  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}
