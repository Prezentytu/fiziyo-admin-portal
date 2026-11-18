/** Rodzaj w schemacie to enum `ReleaseNoteItemKind`; nowa wartość z backendu nie może wywrócić listy. */
export type ReleaseNoteItemKind = 'NEW' | 'IMPROVEMENT' | 'FIX' | 'OPT_IN';

export interface ReleaseNoteItem {
  kind: string;
  title: string;
  body: string;
  linkLabel: string | null;
  deeplink: string | null;
  screenshotUrl: string | null;
}

export interface ReleaseNote {
  id: string;
  title: string;
  lead: string | null;
  publishedAt: string;
  items: ReleaseNoteItem[];
  fixes: string[];
  notified: boolean;
  /** Zalogowany użytkownik obejrzał to wydanie albo nowsze. */
  seen: boolean;
}

export interface GetReleaseNotesResponse {
  releaseNotes: ReleaseNote[];
}

export interface GetUnseenReleaseNoteResponse {
  unseenReleaseNote: ReleaseNote | null;
}

export interface MarkReleaseNoteSeenResponse {
  markReleaseNoteSeen: boolean;
}

export interface MarkReleaseNoteSeenVariables {
  releaseNoteId: string;
}
