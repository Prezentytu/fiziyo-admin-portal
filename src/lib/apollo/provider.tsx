"use client";

import { ApolloClient, InMemoryCache, ApolloLink } from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import { useAuth } from "@clerk/nextjs";
import { useMemo } from "react";
import { AuthLinkFactory } from "@/graphql/links/authLink";
import { HttpLinkFactory } from "@/graphql/links/httpLink";
import { ErrorLinkFactory } from "@/graphql/links/errorLink";
import { BackendAuthTokenProvider } from "@/graphql/providers/BackendAuthTokenProvider";

// ZMIANA 2025: Używamy BackendAuthTokenProvider zamiast bezpośrednio Clerk
// Provider automatycznie wymienia token Clerk na JWT backendu i cache'uje go

export function ApolloWrapper({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();

  // Apollo Client configuration for Next.js
  // KRYTYCZNE: useMemo BEZ dependencies - client powinien być tworzony tylko RAZ
  // getToken jest przekazywany jako funkcja więc nie musi być w dependencies
  const client = useMemo(() => {
    // Backend token provider - automatycznie wymienia Clerk token na backend JWT
    const tokenProvider = new BackendAuthTokenProvider(getToken);

    return new ApolloClient({
      link: ApolloLink.from([
        new ErrorLinkFactory().create(),
        new AuthLinkFactory(tokenProvider).create(),
        new HttpLinkFactory({
          getGraphQLEndpoint: () => `${process.env.NEXT_PUBLIC_API_URL}/graphql`,
          getBaseUrl: () => process.env.NEXT_PUBLIC_API_URL!,
        }).create(),
      ]),
      cache: new InMemoryCache(),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Pusty array - client tworzony tylko raz

  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}
