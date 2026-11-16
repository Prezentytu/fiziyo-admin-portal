# Podgląd ćwiczenia w zestawie i „Edytuj parametry” spójne

- Issue / spec: zgłoszenie właściciela z 16.11.2026 (DEV, gabinet PrzemTeraTest Bar, plan „Adrian 16.11 – przegląd 25 ćwiczeń”, `przem-fx-7001`); SPEC-022 (sekcja „Podgląd ćwiczenia ↔ edycja parametrów”)
- Owning repo: fiziyo-admin-portal
- Status runu: working
- Upoważnienie: zadanie od sesji koordynującej Przemka 16.11: worktree z `origin/main`, szkic PR z testami
- Writer: Claude Code (sesja lokalna)
- Dozwolone pliki: `src/components/shared/exercise/*` (podgląd, pola parametrów, rejestr, normalizator, resolver), `EditExerciseInSetDialog.tsx`, strona zestawu (punkt odniesienia sprzętu), testy, SPEC-022, mapa testid
- Wykluczenia: treści ćwiczeń (inna sesja), backend, kontrakt GraphQL
- Acceptance: te same pola w obu widokach mają ten sam tekst (0 = „0 s”, brak = „—”); kroki w podglądzie osobno i w całości; czas ćwiczenia główny, seria pomocnicza; sprzęt, kroki, wskazówki, oddech i strona z v3.3

## Repo i baseline

- Repo / checkout / branch / HEAD: worktree `fiziyo-admin-portal-wt-parametry`, `fix/podglad-i-edycja-parametrow-spojne` od `origin/main` @ 83532684
- Dostępność: available

## Progress

- [x] Testy, które padają na `main` (przerwa 0 → „—”, sprzęt v3.3 pusty, kroki jednym blokiem)
- [x] Jedna semantyka i formatter, sprzęt v3.3 w resolverze i punkcie odniesienia zapisu, wspólny czas wyliczany, treść w podglądzie sekcjami edycji
- [x] Zrzuty przed/po (jasny, ciemny): `.ai/reports/2026-11-16-podglad-i-edycja-parametrow/`
- [ ] Sprawdzenie na DEV po merge'u (E2E Dev Full)

## Decyzje

- Sekundy jako „30 s” (jak pole edycji z jednostką), także na stronie ćwiczenia i w karcie pacjenta: ten sam rejestr.
- Podgląd nie ma własnego czytnika treści: używa `ExercisePatientContentFields` w trybie odczytu.
- Zrzuty to prawdziwe komponenty z rekordem fx-7001 z paczki adr1 (render w happy-dom, CSS portalu, Playwright). Serwera dev nie dało się uruchomić (limit 5 serwerów w folderze, CORS backendu tylko dla `localhost:3000`), a devportal w panelu nie był zalogowany.

## Handoff

- Następny krok: przegląd PR; po merge'u sprawdzić `przem-fx-7001` na devportal.
- Do backendu: kolumna `Equipment` z `equipment_items` (KONTRAKT-v3.3 §1) nie jest liczona na DEV; portal czyta dokument, ale inne miejsca (kreator, dodawanie do planu) wciąż sieją sprzęt z kolumny.
