"use client";

import { ApolloClient, InMemoryCache, ApolloLink } from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import { useAuth } from "@clerk/nextjs";
import { useMemo } from "react";
import { AuthLinkFactory } from "@/graphql/links/authLink";
import { HttpLinkFactory } from "@/graphql/links/httpLink";
import { ErrorLinkFactory } from "@/graphql/links/errorLink";

export function ApolloWrapper({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();

  const client = useMemo(() => {
    const tokenProvider = {
      getToken: async () => {
        const token = await getToken();
        return token;
      },
    };

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
  }, [getToken]);

  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}
