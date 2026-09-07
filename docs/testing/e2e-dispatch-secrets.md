# E2E_DISPATCH_PAT — rotacja i diagnostyka

Objaw runu #98: `401 Bad credentials` na `POST /repos/Prezentytu/fiziyo-tests/dispatches`. Testy się nie uruchomiły.

## Nowy token

1. Konto techniczne (nie osobiste na stałe).
2. Fine-grained PAT tylko do `Prezentytu/fiziyo-tests`.
3. Contents: read and write (Metadata: read dołącza się samo).
4. Autoryzuj SSO organizacji.
5. Sekret `E2E_DISPATCH_PAT` w `fiziyo-admin-portal` (i analogicznie w `fizjo-app` dla Release).
6. Unieważnij stary token.
7. Owner + data wygaśnięcia + przypomnienie 14 dni wcześniej.

Nie poszerzaj do klasycznego `repo`, jeśli fine-grained działa.

Docelowo: GitHub App z installation tokenem tylko do dispatch i statuses.

## Weryfikacja (tylko DEV)

1. Actions → Trigger E2E / ręczny `e2e-dev-run` na `https://devportal.fiziyo.pl`.
2. Dispatch API `204`.
3. Run w `fiziyo-tests`.
4. Status wraca na właściwy SHA.
5. Brak ostrzeżenia Node 20 (`github-script@v8` / własny skrypt Node).

Nie weryfikuj naprawy na PROD.
