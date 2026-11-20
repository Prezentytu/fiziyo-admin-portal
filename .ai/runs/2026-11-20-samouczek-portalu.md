# Samouczek startowy portalu

- Źródło: zatwierdzony prototyp z rozmowy i prośba o kod oraz PR, [SPEC-031](../specs/SPEC-031-2026-10-30-chat-view.md).
- Owning repo: `fiziyo-admin-portal`
- Status runu: ready-for-review
- Zakres: pulpit czatu, sidebar, stan i geometria samouczka, testy i dokumentacja portalu.
- Acceptance: trzy podświetlane miejsca, po jednym zdaniu, pominięcie na każdym kroku, brak ponownego otwarcia po pominięciu lub ukończeniu.
- Upoważnienie obejmuje commit, push gałęzi i PR.

## Repo i baseline

- `feat/samouczek-portalu` od `origin/main` @ `104bc00b`, osobny, czysty worktree.

## Decyzje

- Samouczek używa sesji utworzenia konta i metadanych interfejsu, bez zmiany kontraktów i polityki dostępu. Rozpoznawanie nowego konta jest zapisane w SPEC-031.
- Menu konta ma wariant zależny od uprawnień. Podczas samouczka pozostaje informacyjne, a przyciski samouczka obsługuje pojedynczy dialog.

## Dowody

- `npm run validate`: exit 0 na kandydacie PR, 368 plików, 3680 testów zakończonych sukcesem i 2 oczekiwane porażki, build zakończony sukcesem.
- Chromium: rzeczywiste komponenty `ChatShell`, `ChatSidebar`, `ChatView` i `ChatFirstRunTour` z syntetycznymi sesjami oraz danymi. Przeszły trzy podświetlenia, pominięcie każdego kroku, odświeżenie, Wstecz, Gotowe, Escape i Ctrl+Enter. Sprawdzono jasny i ciemny motyw, ekran 320 px, rolę terapeuty oraz zwinięty sidebar. [Zrzuty](../reports/2026-11-20-samouczek-portalu/).
- Przegląd niezależny: automatyczne review na PR. Rejestracja z usługą Clerk na DEV wymaga osobnego sprawdzenia po wdrożeniu na DEV.

## Handoff

- Następny krok: review PR, a po wdrożeniu DEV sprawdzenie wejścia z nowego konta Clerk zgodnie z SPEC-031.
