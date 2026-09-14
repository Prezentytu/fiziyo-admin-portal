# Szablon runu

Skopiuj treść poniżej do `.ai/runs/<date>-<slug>.md` i wypełnij przed pracą.
Nie migruj automatycznie wcześniejszych runów. To protokół ręczny, bez parsera.

```markdown
# <cel>

- Issue / spec: <wskaźnik; status specu tylko w indeksie>
- Owning repo: <repo>
- Status runu: working
- Upoważnienie: <źródło i zakres; commit/push/PR/deploy tylko za osobną zgodą>
- Writer: <koordynator>
- Dozwolone pliki: <konkretne ścieżki>
- Wykluczenia: <poza zakresem>
- Acceptance: <obserwowalny wynik>

## Repo i baseline

Dla każdego potrzebnego repo:

- Repo / checkout / branch / HEAD:
- Instrukcje:
- Zastane zmiany i ich tożsamość (tracked patch SHA-256 + nowe pliki z hashami):
- Wymagany zakres i kontrole:
- Dostępność: available / blocked (powód)

## Progress

- [ ] <krok i kryterium ukończenia>

## Decyzje

- <wybór, przyczyna, źródło zgody jeśli wymagane>

## Dowody

- Kandydat: <repo, HEAD, fingerprint dirty diffa i nowych plików>
- Kontrola: <czas, dokładna komenda, exit code, wynik i ograniczenia>
- Reviewer: <raport/werdykt, kandydat; unverified jeśli brak>

## Handoff

- Następny krok: <jedna konkretna akcja>
- Blokady: <powód, co odblokuje>
- Transfer kodu: <ten sam checkout / zatwierdzony commit / patch + nowe pliki>
- BOARD: <istniejąca pozycja lub proponowana linia do źródłowej tablicy>
```
