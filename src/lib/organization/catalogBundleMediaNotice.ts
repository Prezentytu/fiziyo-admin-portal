import { readMediaCopy, summarizeMediaCopy } from './catalogBundleMediaCopy';

export interface MediaNotice {
  /** `not-copied`: import udany, ale media zostały pod pierwotnymi adresami; `rejected`: import wstrzymany przez media. */
  kind: 'not-copied' | 'rejected';
  message: string;
}

interface ImportOutcome {
  success: boolean;
  mode?: unknown;
  mediaCopy?: unknown;
  items?: unknown;
}

const MEDIA_REJECTION_TEXT: Record<string, string> = {
  MEDIA_DEFERRED: 'kopia mediów nie zmieściła się w limicie jednego żądania; wyślij ten sam plik ponownie',
  MEDIA_COPY_FAILED: 'nie udało się skopiować pliku medium',
  MEDIA_DEMO_ONLY: 'medium jest dostępne tylko w puli demo',
  MEDIA_TOO_LARGE_FOR_REQUEST: 'plik medium jest za duży na jedno żądanie; ponowne wysłanie nie pomoże',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasText(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

/** Czy paczka niesie jakikolwiek adres medium (`media[].url` albo `legacyMedia`). Nieczytelny plik = false. */
export function bundleHasMedia(bundleText: string): boolean {
  let parsed: unknown;
  try {
    parsed = JSON.parse(bundleText);
  } catch {
    return false;
  }
  const exercises = isRecord(parsed) && Array.isArray(parsed.exercises) ? parsed.exercises : [];
  return exercises.some((exercise) => {
    if (!isRecord(exercise)) return false;
    const media = Array.isArray(exercise.media) ? exercise.media : [];
    if (media.some((entry) => isRecord(entry) && hasText(entry.url))) return true;
    const legacy = exercise.legacyMedia;
    if (!isRecord(legacy)) return false;
    const images = Array.isArray(legacy.images) ? legacy.images : [];
    return (
      images.some(hasText) ||
      [legacy.thumbnailUrl, legacy.gifUrl, legacy.imageUrl, legacy.videoUrl].some(hasText)
    );
  });
}

function mediaRejections(items: unknown): string[] {
  const rejections = (Array.isArray(items) ? items : []).flatMap((item) => {
    if (!isRecord(item) || typeof item.reasonCode !== 'string' || !item.reasonCode.startsWith('MEDIA_')) return [];
    const why = MEDIA_REJECTION_TEXT[item.reasonCode] ?? (hasText(item.reason) ? String(item.reason) : item.reasonCode);
    return [`${hasText(item.name) ? String(item.name) : String(item.id ?? 'pozycja')}: ${why}`];
  });
  return rejections;
}

/**
 * Sygnał o mediach po imporcie, żeby sukces nie był cichy. Karta wysyła import w trybie domyślnym (REPLACE), który
 * mediów nie kopiuje: backend zwraca wtedy `mediaCopy` bez pozycji, a rekordy zostają z adresami spoza magazynu
 * środowiska. Null = nie ma o czym mówić (raport kopii pokazuje karta albo paczka nie niesie mediów).
 */
export function describeMediaNotice(bundleText: string, result: ImportOutcome): MediaNotice | null {
  const rejections = mediaRejections(result.items);
  if (!result.success) {
    if (rejections.length === 0) return null;
    const shown = rejections.slice(0, 3).join('; ');
    const more = rejections.length > 3 ? ` (i ${rejections.length - 3} kolejnych)` : '';
    return { kind: 'rejected', message: `Import wstrzymany z powodu mediów. ${shown}${more}.` };
  }

  if (summarizeMediaCopy(readMediaCopy(result.mediaCopy)) !== null || !bundleHasMedia(bundleText)) return null;

  const mode = typeof result.mode === 'string' ? ` (tryb ${result.mode})` : '';
  return {
    kind: 'not-copied',
    message: `Zaimportowano, ale mediów nie skopiowano do magazynu tego środowiska${mode}: rekordy mają adresy z pierwotnego źródła i mogą nie działać.`,
  };
}
