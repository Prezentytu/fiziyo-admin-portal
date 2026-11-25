# Lokalny portal nagród gabinetu

Zlecenie lokalnego przekroju SPEC-060. Punkt wyjścia portalu: `origin/main` na `b199bd72`, gałąź `feat/nagrody-lokalnie`. Źródłem kontraktu jest `backend/schema.graphql` z worktree `fizjo-app-wt-nagrody`; schemat R1 wyznacza gabinet z tokenu.

W menu konta na desktopie i telefonie właściciel, administrator i fizjoterapeuta widzą Nagrody po uzyskaniu ustawień bieżącego gabinetu. Backend zwraca null, jeśli choć jedna z flag gabinetu jest wyłączona. Tylko osoba z `canManage` widzi przełącznik, wybór nagród z szablonów, uzupełnianie zestawu startowego, ustawienia odznak oraz cenę i częstość odbioru. Kolejka kopert i karta pacjenta korzystają z tych samych komponentów odpowiedzi. Lista ćwiczeń dla wskazówki pochodzi z przypisań pacjenta w bieżącym gabinecie.

## Uruchomienie

W lokalnym środowisku zespołu foldery portalu, backendu nagród i portalu laboratorium są obok siebie. Uruchom próbę SPEC-060 z repozytorium backendu. W tym worktree wystartuj portal na pętli zwrotnej poleceniem poniżej. Korzysta z kluczy deweloperskiego Clerka istniejącego laboratorium.

```sh
NEXT_PUBLIC_APP_URL=http://localhost:3360 NEXT_PUBLIC_API_URL=http://localhost:5260 NEXT_PUBLIC_POSTHOG_KEY= \
  node --env-file=../fiziyo-admin-portal-wt-lab/.env.local "$(command -v npm)" exec -- next dev --hostname 127.0.0.1 --port 3360
```

Strona `http://localhost:3360/rewards` wymaga zwykłego logowania portalu i konta powiązanego z lokalnym gabinetem. Osobny podgląd trzech ról w laboratorium ma własne sesje syntetyczne.

## Sprawdzenie

```sh
GRAPHQL_SCHEMA_PATH=../fizjo-app-wt-nagrody/backend/schema.graphql npm run graphql:validate
REWARDS_PILOT_SESSIONS="/ścieżka/z-logu-laboratorium/sessions.json" \
  npx vitest run src/components/rewards/RewardsPage.pilot.test.tsx
```

Test integracyjny renderuje rzeczywistą stronę i kartę pacjenta z Apollo po HTTP. Czyta role właściciela, terapeuty i gabinetu kontrolnego. Plik sesji pozostaje w prywatnym katalogu lokalnej próby. Test wykrywa niezgodność między odpowiedziami API a widocznością ustawień, szablonów i odznak. Dodatkowe przypadki jednostkowe obejmują menu konta oraz ćwiczenia dodatkowe, ukryte, starsze nadpisania i powtórzenia między planami.

Pełna walidacja lokalna 20 listopada zakończyła się kodem 0. Lint, identyfikatory E2E, kolory, typy i build przeszły. Vitest z sesjami laboratorium sprawdził 358 plików: 3628 testów przeszło, 2 mają w repozytorium status oczekiwanej porażki. Walidator potwierdził zgodność wszystkich 234 dokumentów GraphQL ze schematem R1. Wejście na chroniony adres w przeglądarce bez sesji otrzymuje przekierowanie 307 do logowania Clerk DEV.
