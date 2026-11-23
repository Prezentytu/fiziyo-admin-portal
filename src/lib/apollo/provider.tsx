'use client';

import { ApolloClient, InMemoryCache, ApolloLink, split } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { getMainDefinition } from '@apollo/client/utilities';
import { useAuth } from '@clerk/nextjs';
import { useMemo, useRef } from 'react';
import { AuthLinkFactory } from '@/graphql/links/authLink';
import { HttpLinkFactory } from '@/graphql/links/httpLink';
import { ErrorLinkFactory } from '@/graphql/links/errorLink';
import { restartSubscriptionConnection, WsLinkFactory } from '@/graphql/links/wsLink';
import { setActiveBackendTokenSource } from '@/graphql/providers/activeBackendToken';
import { BackendAuthTokenProvider } from '@/graphql/providers/BackendAuthTokenProvider';
import { clearUserBrowserState } from '@/lib/auth/userBrowserState';
import { clearBackendToken } from '@/lib/tokenCache';
import { useResetOnUserChange } from './useResetOnUserChange';

// ZMIANA 2025: Używamy BackendAuthTokenProvider zamiast bezpośrednio Clerk
// Provider automatycznie wymienia token Clerk na JWT backendu i cache'uje go

// ZMIANA 2026: Dodano WebSocket link dla real-time subscriptions
// Split link kieruje subscriptions przez WebSocket, a queries/mutations przez HTTP

export function ApolloWrapper({ children }: { children: React.ReactNode }) {
  const { getToken, userId, isLoaded } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  // Apollo Client configuration for Next.js - created once; tokenProvider uses ref for latest getToken
  const client = useMemo(() => {
    const tokenProvider = new BackendAuthTokenProvider(() => getTokenRef.current());
    // Set during render: child effects (REST fetches) run before this component's effects.
    setActiveBackendTokenSource(() => tokenProvider.getToken());

    // HTTP link dla queries i mutations
    const httpLink = ApolloLink.from([
      new ErrorLinkFactory().create(),
      new AuthLinkFactory(tokenProvider).create(),
      new HttpLinkFactory({
        getGraphQLEndpoint: () => `${process.env.NEXT_PUBLIC_API_URL}/graphql`,
        getBaseUrl: () => process.env.NEXT_PUBLIC_API_URL!,
      }).create(),
    ]);

    // WebSocket link dla subscriptions (real-time updates)
    // Przekazujemy funkcję która pobiera token z tokenProvider
    const wsLink = new WsLinkFactory(async () => {
      return tokenProvider.getToken();
    }).create();

    // Split link - kieruje operacje do odpowiedniego transportu
    // Subscriptions → WebSocket, Queries/Mutations → HTTP
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
      cache: new InMemoryCache(),
    });
  }, []); // Pusty array - client tworzony tylko raz

  // The client lives as long as the tab. When the person changes (also after sign-out in another tab
  // or session expiry), the next one starts with an empty cache. Components that stay mounted keep
  // what they rendered until they unmount; sign-out always navigates away, so they do.
  useResetOnUserChange({
    userId,
    isLoaded,
    onUserChange: (previousUserId) => {
      // Signing in from a signed-out tab has nothing to clear; resetting then would only fail queries in flight.
      if (!previousUserId) return;
      clearBackendToken();
      clearUserBrowserState();
      restartSubscriptionConnection();
      void client.clearStore().catch(() => undefined);
    },
  });

  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}
