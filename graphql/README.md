# GraphQL schema snapshot

Skopiuj `fizjo-app/backend/schema.graphql` tutaj po eksporcie:

```bash
./scripts/export-graphql-schema.sh
cp backend/schema.graphql ../fiziyo-admin-portal/graphql/schema.graphql
```

`npm run graphql:validate` sprawdza składnię dokumentów; gdy ten plik istnieje, waliduje też pola względem SDL.
