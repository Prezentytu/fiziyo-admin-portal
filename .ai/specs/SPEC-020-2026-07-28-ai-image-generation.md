# SPEC-020 — AI Image Generation (OpenRouter Image API)

## Cel biznesowy

Generowanie ilustracji ćwiczeń fizjoterapeutycznych musi być deterministyczne: użytkownik zawsze dostaje obraz albo czytelny błąd z możliwością ponowienia. Nie może wracać tekst zamiast obrazu (regresja `isTextOnly` / pusty `imageBase64` z `success: true`).

## Architektura

```
UI (useExerciseImageGeneration)
  → POST /api/ai/generate-image
  → CheckAndUseCredits(5)
  → ExerciseImageGenerationService
       → POST {OpenRouter}/images  (kaskada modeli)
       → walidacja bajtów (magic number, min size)
  → 200 + imageBase64  |  502 + errorCode + TryRefundCredits
  → decodeGeneratedImage → File → preview / uploadExerciseImage
```

### Kaskada modeli (OpenRouter Image API)

| Priorytet | Model                               | Parametry                               |
| --------- | ----------------------------------- | --------------------------------------- |
| 1         | `google/gemini-3.1-flash-image`     | `resolution=1K`, `aspect_ratio=3:4`     |
| 2         | `bytedance-seed/seedream-4.5`       | `resolution=1K`, `aspect_ratio=3:4`     |
| 3         | `black-forest-labs/flux.2-klein-4b` | `aspect_ratio=3:4`, `output_format=png` |

Konfiguracja: `Ai:ImageGeneration` w `appsettings.json` (`ImageGenerationOptions`).

## Interfejsy

### REST

`POST /api/ai/generate-image`

Request:

```json
{
  "exerciseName": "Landmine Press",
  "exerciseDescription": "...",
  "exerciseType": "reps",
  "style": "illustration"
}
```

Success `200`:

```json
{
  "imageBase64": "...",
  "contentType": "image/png",
  "prompt": "...",
  "success": true,
  "modelUsed": "google/gemini-3.1-flash-image",
  "attempts": 1,
  "costUsd": 0.04
}
```

Failure `502`:

```json
{
  "error": "provider_unavailable",
  "message": "Asystent AI jest chwilowo niedostępny. Spróbuj ponownie."
}
```

`IsTextOnly` / `TextDescription` — deprecated, zawsze `false` / `null`.

### Komponenty (admin)

| Komponent                         | Lokalizacja                                            | Opis                                              |
| --------------------------------- | ------------------------------------------------------ | ------------------------------------------------- |
| `useExerciseImageGeneration`      | `src/features/exercises/useExerciseImageGeneration.ts` | Wspólny hook: loading, abort, toast z retry, styl |
| `ImageStylePicker`                | `src/features/exercises/ImageStylePicker.tsx`          | Ilustracja / Diagram / Zdjęcie                    |
| `decodeGeneratedImage`            | `src/features/exercises/utils/decodeGeneratedImage.ts` | base64 → File z walidacją                         |
| `aiService.generateExerciseImage` | `src/services/aiService.ts`                            | Discriminated union `ok` / `error`                |

### Backend

| Klasa                             | Lokalizacja                          |
| --------------------------------- | ------------------------------------ |
| `IExerciseImageGenerationService` | `fizjo-app/backend/.../Services/AI/` |
| `ExerciseImageGenerationService`  | j.w.                                 |
| `ImageGenerationOptions`          | j.w.                                 |

## Data-testid

| data-testid                                 | Element                      |
| ------------------------------------------- | ---------------------------- |
| `exercise-form-media-ai-generate-btn`       | Generuj AI (ExerciseDialog)  |
| `exercise-form-media-ai-style-*`            | Wybór stylu                  |
| `exercise-form-media-ai-skeleton`           | Skeleton podczas generowania |
| `exercise-create-ai-image-btn`              | Generuj AI (wizard)          |
| `exercise-create-ai-style-*`                | Styl w wizardzie             |
| `exercise-detail-ai-image-btn`              | Generuj AI (detal)           |
| `exercise-detail-ai-style-*`                | Styl na detalu               |
| `verification-media-ai-generate-btn`        | Generuj AI (weryfikacja)     |
| `verification-media-ai-style-*`             | Styl w weryfikacji           |
| `patient-exercise-override-ai-generate-btn` | Generuj AI (override)        |

## Verification plan

### Unit

- Backend: pusty `b64_json`, kaskada po 502, invalid magic, brak ścieżki tekstowej, prompt ze style/type
- Frontend: `decodeGeneratedImage`, `useExerciseImageGeneration` (sukces / błąd / missing name), `ExerciseDialog` failure path

### Manual / E2E

- Generowanie z kreatora i z detalu ćwiczenia → obraz pojawia się w galerii
- Awaria providera → toast z „Spróbuj ponownie”, kredyty zwrócone (backend)

## Changelog

### 2026-07-28

- Utworzenie specyfikacji
- Migracja z `/chat/completions` + `modalities` na dedykowane `/images`
- Kaskada modeli, refund kredytów, wspólny hook UI
