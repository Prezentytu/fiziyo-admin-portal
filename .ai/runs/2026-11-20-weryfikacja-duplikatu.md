# Wskazanie oryginału podczas weryfikacji duplikatu

- Zgłoszenie w rozmowie z Przemkiem i [SPEC-030](../specs/SPEC-030-2026-10-26-verification-stages.md).
- Panel `fiziyo-admin-portal`, `fix/weryfikacja-sugestie-lagodne`, `5514b555`. Zastane zmiany dotyczą placówek i instrukcji repozytorium.
- API `fizjo-app`, `main`, `146c62db`. Przed zadaniem bez lokalnych zmian backendu.
- Zakres obejmuje dialog weryfikacji globalnej, wspólny podgląd oraz zapis decyzji i notatki w API.

## Decyzje

- Przycisk wskazuje weryfikowane ćwiczenie. Zaznaczony kandydat dostaje etykietę „To jest oryginał”. Podgląd korzysta ze wspólnego komponentu i przywraca fokus do przycisku podglądu.
- Mutacja `RejectExercise` dopisuje nazwę i ID duplikatu do istniejących notatek roboczych. Oryginał rozpoznaje po ID w formacie informacji dla autora. Oba zapisy są w jednej transakcji, a ponowienie rozpoznaje już zapisany ID.

## Dowody

- Chrome z danymi testowymi i rzeczywistymi komponentami. Jasny i ciemny motyw, układ przy 320 px, powrót przez `Esc`, zachowanie wyboru, potwierdzenie właściwego ID oraz wyświetlanie GIF-u i osadzonego filmu.
- `npm run validate` zakończone kodem 0. Vitest wykonał 2991 testów i dwa przypadki oznaczone jako oczekiwane niepowodzenia.
- Lokalny PostgreSQL. 23 testy zapisu i dostępu do notatek. Test dwóch równoległych zapisów potwierdza zachowanie obu wpisów. Osobne przypadki obejmują ponowienie, przekroczenie limitu i zwykłą informację zwrotną.
- Standardowy zestaw testów API zakończony kodem 0. 3265 zaliczonych, 35 pominiętych testów wymagających dodatkowych danych lub usług.
