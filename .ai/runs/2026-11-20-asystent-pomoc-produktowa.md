# Pomoc produktowa w czacie portalu

Pierwszy etap po audycie z 20 listopada. Zakres jest opisany w SPEC-031 i w dokumencie funkcji czatu. Repozytorium fiziyo-admin-portal, gałąź feat/asystent-pomoc-produktowa, czysty punkt wyjścia 7bdeab1c. Użytkownik zlecił rozpoczęcie implementacji.

Dwa testy nowego przebiegu najpierw zakończyły się błędem na kodzie bazowym. Po zmianie przejście od braku planu do zgłoszenia jest sprawdzane przy włączonym i wyłączonym modelu. Testy kart obejmują ponowne wyświetlenie po zmianie uprawnień, flagę Poleceń oraz anulowanie, błąd i ponowienie wysyłki przez formularz.

Kolejnym sprawdzeniem na DEV po integracji jest przejście pytań z audytu na kontach właściciela i terapeuty oraz otwarcie formularza bez wysyłania wiadomości do rzeczywistego zespołu wsparcia.

Pełne `npm run validate` zakończone kodem 0 na bieżącej zmianie. 3621 testów przeszło, 2 testy repozytorium mają status oczekiwanej porażki. Chromium z testowymi danymi i odbiornikiem zgłoszeń w pamięci potwierdziło link do Zespołu oraz przejście brak zestawu → sprawdzenie przypisania → formularz → anulowanie → ponowne otwarcie → wysłanie jednego zgłoszenia. Próba objęła jasny motyw przy szerokości 1024 px i ciemny przy 390 px.

Przed otwarciem PR uruchomiono cztery pliki testowe obejmujące tę zmianę. Wszystkie 73 przypadki przeszły. Regresja historii sprawdza zachowanie statusu wysłanego zgłoszenia i pominięcie błędnie zapisanej karty. Zrzuty rzeczywistych kart z sesji syntetycznej znajdują się w `docs/screenshots/asystent-pomoc-produktowa/`.
