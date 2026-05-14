# SPEC-016 — Admin Portal Access Control (Patient Block)

## Cel biznesowy

Panel webowy FiziYo jest przeznaczony wyłącznie dla fizjoterapeutów i personelu organizacji.
Pacjenci korzystają z aplikacji mobilnej. Celem tej specyfikacji jest:

- zablokowanie pacjentom dostępu do admin portalu,
- zapewnienie eleganckiego i czytelnego przekierowania do aplikacji mobilnej,
- wdrożenie defense-in-depth na backendzie i frontendzie,
- utrzymanie backward compatibility podczas rolloutu cross-repo.

## Architektura

### High-level flow

1. Klient wysyła `POST /api/token-exchange/clerk` z nagłówkiem `X-Client-Type`.
2. Backend rozpoznaje, czy użytkownik jest pacjentem (`isPatient`).
3. Jeśli `X-Client-Type: admin-portal` i `isPatient=true`, backend zwraca `403` z kodem domenowym.
4. Admin frontend mapuje `403` lub fallback `role=patient` na redirect do `/patient-redirect`.
5. Strona `/patient-redirect` prowadzi użytkownika do aplikacji mobilnej (iOS/Android/QR) i umożliwia wylogowanie.

### Kontrakt token exchange

- Endpoint: `POST /api/token-exchange/clerk`
- Request headers:
  - `X-Client-Type: admin-portal` (web admin)
  - `X-Client-Type: mobile-app` (mobile)
  - brak nagłówka = legacy behavior (BC)
- Error response (tylko dla admin + patient):
  - HTTP `403`
  - Body: `{ "code": "PATIENT_NOT_ALLOWED_ON_ADMIN", "message": "Pacjenci korzystają z aplikacji mobilnej." }`

## Implementacja

### Backend (.NET, repo fizjo-app)

- `backend/FizjoApp.Api/Services/TokenExchangeService.cs`
  - refactor zwracanego wyniku, aby endpoint znał `isPatient` bez dekodowania JWT.
- `backend/FizjoApp.Api/ApiExtensions/TokenExchangeExtensions.cs`
  - odczyt `X-Client-Type`,
  - branch `admin-portal && isPatient => 403 PATIENT_NOT_ALLOWED_ON_ADMIN`,
  - log warning dla odrzuconej próby.
- `backend/FizjoApp.Api/Services/PatientNotAllowedOnAdminException.cs`
  - dedykowany wyjątek domenowy dla czytelności warstwy serwisowej.
- Testy:
  - przypadki admin/patient 403,
  - admin/therapist 200,
  - mobile/patient 200,
  - no-header/patient 200 (backward compatibility).

### Admin frontend (repo fiziyo-admin-portal)

- `src/services/tokenExchangeService.ts`
  - wysyłanie `X-Client-Type: admin-portal`,
  - propagacja `status` i `code` z błędu.
- `src/lib/auth/adminAccessDecision.ts`
  - czysta funkcja mapująca status/role/errorCode na decyzję dostępu.
- `src/lib/auth/jwtClaims.ts`
  - helpery do dekodowania JWT i odczytu claim `role`.
- `src/components/layout/OrganizationGuard.tsx`
  - fix regresji: patient nie może być przepuszczony.
- `src/app/(auth)/finalizing/page.tsx`
  - rozpoznanie `403 PATIENT_NOT_ALLOWED_ON_ADMIN` i redirect do `/patient-redirect`.
- `src/app/(blocked)/layout.tsx`
- `src/app/(blocked)/patient-redirect/page.tsx`
  - strona informacyjna z CTA do mobilki i wylogowaniem.

### Mobile frontend (repo fizjo-app)

- `src/services/tokenExchangeService.ts`
  - wysyłanie `X-Client-Type: mobile-app` (additive, bez zmiany UX).

## Deployment i backward compatibility

### Kolejność wdrożenia

1. Deploy backend.
2. Smoke test endpointu dla `admin-portal`, `mobile-app` i braku nagłówka.
3. Deploy admin frontend.
4. Deploy mobile frontend.

### BC strategy

- Brak `X-Client-Type` pozostaje akceptowany.
- Frontend admin ma fallback na `role=patient`, więc nawet przy opóźnionym deployu backendu pacjent nie dostaje dostępu do panelu.
- Brak zmian schematu DB i migracji EF.

## Data-testid

- `patient-redirect-ios-btn`
- `patient-redirect-android-btn`
- `patient-redirect-qr`
- `patient-redirect-signout-btn`
- `patient-redirect-support-link`

## Test plan

- Admin: `npm run validate`
- Backend: `dotnet test`
- Mobile: `npm run lint`
- Manual:
  - patient -> `/patient-redirect`,
  - therapist/admin/owner/staff -> dashboard,
  - 404 user not found -> `/finalizing`,
  - 401 org issue -> `/onboarding`,
  - light/dark i mobile responsive na stronie blokady.

## Ryzyka i mitygacje

- Ryzyko: niespójny rollout cross-repo.
  - Mitygacja: additive kontrakt i backend-first deployment.
- Ryzyko: pacjent otrzyma ogólny błąd zamiast czytelnego flow.
  - Mitygacja: dedykowana strona `/patient-redirect`.
- Ryzyko: twarde linki do sklepów mogą się zmienić.
  - Mitygacja: jawne TODO w kodzie i centralizacja stałych URL.

## Changelog

### 2026-05-14

- Dodano specyfikację blokady pacjentów w admin portalu z architekturą cross-repo (backend + admin + mobile).
