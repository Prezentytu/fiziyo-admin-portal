---
spec: SPEC-034
repo: fiziyo-admin-portal
issues: []
prs: []
board:
---

# Nagłówek kolejek weryfikacji

## Cel biznesowy

Weryfikator od razu widzi, w której kolejce jest, kto zobaczy zatwierdzone ćwiczenie i ile pracy czeka. Pierwsze oczekujące otwiera jednym kliknięciem, bez szukania karty.

## Decyzje

- Jeden tytuł „Weryfikacja” na trzech listach (`/organization/verification`, `/verification`, `/verification/organizations`). Opis pod tytułem i zakładki mówią, która kolejka jest otwarta (`VerificationPageHeader`, opisy w `utils/verificationScopes.ts`).
- Zakładki kolejek to linki z podkreśleniem (`tabLinkVariants` w `ui/tabs`), nie przełącznik segmentowy: zmieniają stronę, a nie filtr. Każda ma podpis „kto zobaczy wynik” i licznik oczekujących. Własna kolejka nosi nazwę organizacji; kolejki backoffice stoją za podpisem „Moderacja FiziYo”.
- Licznik przy „Weryfikacji” w menu to suma oczekujących ze wszystkich kolejek, które użytkownik widzi (`useVerificationPendingCounts`). Kolejka organizacji klientów obejmuje też własną organizację, więc przy niej licznik własnej kolejki nie wchodzi do sumy. Świeżość liczników katalogu i klientów poza listami daje `useVerificationQueuesRealtime` w layoucie (subskrypcja zgłoszeń i poll 30 s statystyk cross-org), obok `useOrganizationVerificationRealtime`.
- „Zacznij weryfikację” bierze pierwsze oczekujące z osobnego zapytania `pageSize: 1`; każde odświeżenie listy (`refetchQueue`) odświeża też je, a na liście klientów ma ten sam poll co lista.
- Panel `VerificationQueueHero` pokazuje liczbę oczekujących i „Zacznij weryfikację” (pierwsza pozycja filtra `pending`, zapytanie listy z `pageSize: 1`). Zastępuje przyciski „Wróć do organizacji” i „Przejdź do katalogu FiziYo” na listach.
- Karty statystyk są przełącznikiem statusów z licznikami w jednym wierszu z wyszukiwarką. `VerificationStatsCards` zachowuje API i `data-testid`.
- Karta w kolejkach organizacji pokazuje status organizacyjny (`utils/statusBadge.ts`), bo globalny `status` to tam zwykle „Szkic”.
- Ekran startowy kolejki globalnej bez zadań (`VerificationIntro`) zostaje bez zmian.

## Verification plan

- Unit: `utils/__tests__/statusBadge.test.ts`, `verificationScopes.test.ts` (nazwa organizacji, grupy, suma liczników), `queueHero.test.ts`, `VerificationTaskCard.test.tsx` (status organizacyjny), `verification/organizations/__tests__/page.test.tsx` (panel).
- E2E: Page Objecty weryfikacji w `fiziyo-tests` szukające zakładki „Moja organizacja”, nagłówka „Weryfikacja organizacji” lub przycisków powrotu z list trzeba przestawić na `data-testid` z `docs/testing/data-testid-map.md`.
