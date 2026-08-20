/**
 * Import katalogu JSON jest dla każdego fizjo w org, bez osobnego uprawnienia.
 * Owner / Admin / Therapist wystarczą — ten sam gate co mutacja backendowa.
 */
export function canImportCatalog(role: string | null | undefined): boolean {
  switch (role?.toLowerCase()) {
    case 'owner':
    case 'admin':
    case 'therapist':
    case 'staff':
      return true;
    default:
      return false;
  }
}
