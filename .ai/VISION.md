# VISION.md — FiziYo Admin Portal (wyciąg)

Źródłem prawdy dla kierunku całego ekosystemu jest `fizjo-app/.ai/VISION.md`; tablica priorytetów: `fizjo-app/.ai/BOARD.md`. Ten plik to **wyciąg dla agenta, który widzi tylko to repo** (Cursor Cloud Agent). Utrzymuje Adam; agenci nie edytują (propozycja = issue `idea` albo komentarz w PR). Przy rozjeździe wygrywa wersja w `fizjo-app`.

## Produkt (z perspektywy panelu)

Panel gabinetu dla **fizjoterapeuty**: katalog ćwiczeń (własne gabinetu + katalog FiziYo, weryfikacja treści), zestawy, pacjenci, przypisania (Assignment Wizard), organizacja i gabinety, plan gabinetu / aktywacja usługi premium dla pacjenta. Ten sam backend `.NET 9 + GraphQL` co aplikacja mobilna (`fizjo-app/backend`). Panel jest miejscem, gdzie fizjoterapeuta **pracuje szybko i masowo**; mobile jest miejscem, gdzie pacjent **wykonuje**.

## Dokąd idziemy

Cel: **fizjoterapeuta nie wpisuje nic ręcznie.** Wizyta prowadzona z FiziYo w tle kończy się gotowym pacjentem, notatką, zestawem i przypisaniem; fizjoterapeuta klika „OK” albo „popraw to i to → OK”. Rola panelu w tej wizji: miejsce **przeglądu i korekty** propozycji copilota (kolejka „do zatwierdzenia”), masowa praca na katalogu i zestawach, konfiguracja gabinetu. Miarą funkcji jest liczba minut i kliknięć oszczędzonych fizjoterapeucie oraz regularność ćwiczeń pacjenta.

## Kto płaci

Fizjoterapeuta oferuje pacjentowi **usługę premium** (opieka między wizytami z aplikacją); **pacjent dopłaca w gabinecie**, gabinet aktywuje plan w panelu (`SPEC-028` w fizjo-app; billing po stronie gabinetu). Aplikacja pacjenta jest darmowa w sklepie, bez IAP. Decyzję „budujemy / nie” podejmuje Adam na podstawie specu `draft` — nie ma automatycznego progu czasowego ani finansowego.

## Co jest ważne w tej kolejności

1. **Izolacja tenantów i autoryzacja** — `organizationId` scoping, token-exchange, role (`SPEC-016`). Zmiana w `auth` / `permission` = skill `sec-report` przed merge.
2. **Szybkość pracy fizjoterapeuty** — od wizyty do przypisanego zestawu bez wpisywania; wizard, import katalogu (`SPEC-025`), parametry ćwiczeń (`SPEC-022`), przegląd propozycji copilota.
3. **Jakość danych katalogu** — weryfikacja dual-track (`SPEC-013`), generacja ilustracji AI (`SPEC-020`, wspólna fala z mobile `SPEC-036`). Katalog jest tym, z czego copilot składa zestawy.
4. **Theme-safe, testowalne UI** — `data-testid` obowiązkowe (E2E w `fiziyo-tests`), light + dark od pierwszej wersji.
5. **Release** — merge do `main` = deploy `devportal.fiziyo.pl`; PROD `portal.fiziyo.pl` = ręczny Promote. Nic na PROD bez człowieka.

## Czego nie robimy

- Nie zmieniamy kontraktu GraphQL inaczej niż additive-first (`BACKWARD_COMPATIBILITY.md`); zmiana cross-repo = Ask First.
- Nie wysyłamy pacjentowi niczego bez zatwierdzenia fizjoterapeuty jednym kliknięciem.
- Nie używamy słowa „dawkowanie” w UI (→ „podstawowe parametry”).
- Nie wpuszczamy danych pacjentów poza PROD; DEV = dane syntetyczne; agenci nie dotykają PROD DB, Clerk PROD, Vercel PROD.

## Skąd biorą się pomysły

Issues: `from-przemek`, `from-sync` (ludzie), `bot-finding` (testy), `idea` (research branży przez bota — konkurencja, praca gabinetów, potrzeby pacjentów; z dowodem i uzasadnieniem wobec wizji). Agenci mogą proponować; decyduje Adam.

## Styleguide

`.cursor/rules/*.mdc`, `AGENTS.md` (Always / Ask First / Never), `src/features/*/AGENTS.md`, skill `product-designer` dla UI/UX. Nie ma osobnego pliku styleguide.

## Agenci

Wąskie zadania, krótkie wątki, dowody. Agent w chmurze: branch `agent/…`, draft PR, nigdy `main`, wg `docs/architecture/cloud-agent-policy.md`. Po zakończonym etapie zaproponuj linię do `fizjo-app/.ai/BOARD.md` w opisie PR.

---

Ostatnia aktualizacja: 2026-09-11 (Adam).
