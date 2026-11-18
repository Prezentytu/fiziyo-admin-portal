import { SUPPORT_EMAIL } from '@/lib/support';

/**
 * Po tylu sekundach od wysłania kodu bez udanej weryfikacji pokazujemy podpowiedź, co zrobić, gdy kod nie dochodzi.
 * Pierwszy zły kod pokazuje ją od razu.
 */
export const CODE_HELP_DELAY_S = 30;

export const CODE_HELP_MAILTO_URL = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Nie dochodzi kod weryfikacyjny')}`;
