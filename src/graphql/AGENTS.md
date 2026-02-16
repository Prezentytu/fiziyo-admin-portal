# AGENTS.md — GraphQL / Apollo Client

## Zakres

Zapytania, mutacje, subskrypcje, konfiguracja Apollo Client.

## Struktura

```
graphql/
├── queries/       # GET_*_QUERY
├── mutations/     # CREATE_*, UPDATE_*, DELETE_*
├── subscriptions/ # Subskrypcje real-time
├── types/         # Typy GraphQL
├── links/         # auth, http, ws, error
├── providers/     # ApolloProvider
└── config/        # Konfiguracja
```

## Konwencje

### useQuery z skip (NIE useLazyQuery)

```typescript
const { data, loading } = useQuery(GET_EXERCISES_QUERY, {
  variables: { organizationId: orgId || '' },
  skip: !orgId,
  fetchPolicy: 'cache-first',
});
```

### Nazewnictwo

- Queries: `GET_{ENTITY}_QUERY`, `GET_{ENTITY}_BY_ID_QUERY`
- Mutations: `CREATE_{ENTITY}_MUTATION`, `UPDATE_{ENTITY}_MUTATION`, `DELETE_{ENTITY}_MUTATION`

### Zmienne

- Zawsze waliduj `organizationId` — zapytania organizacyjne wymagają org
- Używaj `skip: !orgId` gdy org jest wymagane

### fetchPolicy

- `cache-first` — domyślnie dla list
- `cache-and-network` — gdy potrzebna świeżość
- `no-cache` — tylko gdy konieczne

## Typy

- Centralizuj w `graphql/types/`
- Importuj z `@/graphql/types`

## Referencje

- Apollo Provider: `lib/apollo/provider.tsx`
- Dokumentacja Apollo 4: https://www.apollographql.com/docs/react/
