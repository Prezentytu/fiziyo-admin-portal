# SPEC-025 — Import katalogu JSON w ustawieniach zaawansowanych

## Cel biznesowy

Terapeuta (każdy fizjo w org) wgrywa poprawiony katalog ćwiczeń z laptopa na
[portal.fiziyo.pl](https://portal.fiziyo.pl). Bez extra uprawnień, bez nowej
aplikacji mobilnej, bez CSV (CSV nadaje nowe ID i gubi zdjęcia).

## Architektura

1. Ustawienia → **Zaawansowane** (owner / admin / therapist).
2. Jeden plik JSON na request → mutacja `importExerciseBundle`.
3. `asGlobal=false` — katalog gabinetu. Global wymaga `ReviewExercises`.
4. Backend (fizjo-app) waliduje i upsertuje po oryginalnym `id`.

Kolejność: `tag-categories.json` → `tags.json` → `exercises-00x.json`.
Zestawy poza zakresem — fizjo składa je w panelu.

## Interfejsy

```
importExerciseBundle(organizationId: String!, json: String!, asGlobal: Boolean): ExerciseBundleImportResult
```

Uprawnienia: Owner / Admin / Therapist. Bez osobnego permission.

## Komponenty

| Element | Lokalizacja |
| ------- | ----------- |
| Zakładka | `app/(dashboard)/settings/page.tsx` |
| Karta | `components/organization/CatalogBundleImportCard.tsx` |
| Gate | `lib/organization/catalogImportAccess.ts` |

## Data-testid

`settings-tab-advanced`, `settings-catalog-import-card`,
`settings-catalog-import-pick`, `settings-catalog-import-input`,
`settings-catalog-import-result`

## Verification plan

- Unit: `canImportCatalog`, `checkCatalogBundleText`.
- Smoke: fizjo → Ustawienia → Zaawansowane → `tag-categories.json` → Zaimportowano.

## Changelog

### 2026-08-20

- Utworzenie specyfikacji i implementacja v1.
