import { readMediaCopy, summarizeMediaCopy } from './catalogBundleMediaCopy';

interface ImportOutcome {
  success: boolean;
  mediaCopy?: unknown;
}

/** Hosty filmów osadzanych: backend ich nie kopiuje (zostają bez zmian), więc nie są powodem do ostrzeżenia. */
const EMBEDDED_VIDEO_HOSTS = ['vimeo.com', 'vimeocdn.com', 'youtube.com', 'youtu.be', 'youtube-nocookie.com'];

export const MEDIA_NOT_COPIED_MESSAGE =
  'Zaimportowano, ale mediów nie skopiowano: zostały pod adresami z paczki. Jeśli adresy wskazują inne środowisko, mogą nie działać; import z kopią mediów robi zespół FiziYo.';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Adres obrazu albo pliku (nie film osadzany). Portal nie zna hosta magazynu środowiska, więc go nie rozróżnia. */
function isCopyableUrl(value: unknown): boolean {
  if (typeof value !== 'string' || value.trim().length === 0) return false;
  try {
    const host = new URL(value.trim()).hostname.toLowerCase();
    return !EMBEDDED_VIDEO_HOSTS.some((embedded) => host === embedded || host.endsWith(`.${embedded}`));
  } catch {
    return false;
  }
}

/** Czy paczka niesie adres obrazu lub pliku, który backend z kopią mediów by skopiował. Nieczytelny plik = false. */
export function bundleHasCopyableMedia(bundleText: string): boolean {
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
    if (media.some((entry) => isRecord(entry) && isCopyableUrl(entry.url))) return true;
    const legacy = exercise.legacyMedia;
    if (!isRecord(legacy)) return false;
    const images = Array.isArray(legacy.images) ? legacy.images : [];
    return (
      images.some(isCopyableUrl) ||
      [legacy.thumbnailUrl, legacy.gifUrl, legacy.imageUrl, legacy.videoUrl].some(isCopyableUrl)
    );
  });
}

/**
 * Sygnał po udanym imporcie, żeby sukces nie był cichy. Karta wysyła import w trybie domyślnym, który mediów nie
 * kopiuje: backend zwraca wtedy `mediaCopy` bez pozycji, a rekordy zostają z adresami z paczki. Null = nie ma o czym
 * mówić (raport kopii pokazuje karta albo paczka nie niesie obrazów ani plików).
 */
export function describeMediaNotice(bundleText: string, result: ImportOutcome): string | null {
  if (!result.success) return null;
  if (summarizeMediaCopy(readMediaCopy(result.mediaCopy)) !== null) return null;
  return bundleHasCopyableMedia(bundleText) ? MEDIA_NOT_COPIED_MESSAGE : null;
}
