/**
 * Czy bieżący użytkownik może edytować i usuwać tag w panelu.
 * Tag globalny (katalog FiziYo) zmienia tylko zespół FiziYo (ContentManager, SiteSuperAdmin);
 * backend odrzuca to każdemu innemu (`RequireTagWriteAccess`), więc nie pokazujemy akcji,
 * która skończy się błędem.
 */
export function canManageTag(tag: { isGlobal?: boolean | null }, canManageGlobalTags: boolean): boolean {
  return !tag.isGlobal || canManageGlobalTags;
}
