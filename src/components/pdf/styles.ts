import { StyleSheet } from '@react-pdf/renderer';

// Importuj rejestrację fontów
import './registerFonts';

// Kolory - profesjonalne, czytelne
const colors = {
  primary: '#16a34a', // Ciemniejszy zielony dla lepszej czytelności
  primaryLight: '#22c55e',
  text: '#1f2937',
  textMuted: '#6b7280',
  textLight: '#9ca3af',
  border: '#e5e7eb',
  borderLight: '#f3f4f6',
  background: '#ffffff',
  surface: '#f9fafb',
  accent: '#ecfdf5', // Jasny zielony tło
  warning: '#fef3c7',
  warningText: '#92400e',
};

export const pdfStyles = StyleSheet.create({
  // ==================== DOKUMENT ====================
  page: {
    flexDirection: 'column',
    backgroundColor: colors.background,
    padding: 36,
    paddingBottom: 60,
    fontFamily: 'OpenSans',
    fontSize: 10,
    color: colors.text,
  },

  // ==================== NAGŁÓWEK ====================
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 3,
    borderBottomColor: colors.primary,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  logo: {
    width: 56,
    height: 56,
    objectFit: 'contain',
  },
  logoPlaceholder: {
    width: 56,
    height: 56,
    backgroundColor: colors.primary,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoPlaceholderText: {
    color: colors.background,
    fontSize: 20,
    fontWeight: 'bold',
  },
  organizationInfo: {
    flexDirection: 'column',
    gap: 2,
  },
  organizationName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  organizationDetails: {
    fontSize: 9,
    color: colors.textMuted,
    lineHeight: 1.5,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  date: {
    fontSize: 10,
    color: colors.textMuted,
  },

  // ==================== SEKCJA TYTUŁOWA ====================
  titleSection: {
    marginBottom: 20,
    padding: 18,
    backgroundColor: colors.accent,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 12,
  },
  patientInfoRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  patientLabel: {
    fontSize: 10,
    color: colors.textMuted,
    width: 80,
  },
  patientValue: {
    fontSize: 11,
    fontWeight: 'semibold',
    color: colors.text,
  },
  description: {
    fontSize: 10,
    color: colors.text,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.primaryLight,
    lineHeight: 1.5,
  },

  // ==================== HARMONOGRAM ====================
  frequencySection: {
    marginBottom: 20,
    padding: 14,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  frequencyTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 10,
  },
  frequencyContent: {
    flexDirection: 'column',
    gap: 8,
  },
  frequencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  frequencyLabel: {
    fontSize: 10,
    color: colors.textMuted,
    width: 100,
  },
  frequencyValue: {
    fontSize: 11,
    fontWeight: 'semibold',
    color: colors.text,
    flex: 1,
  },
  daysContainer: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  dayBox: {
    width: 32,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
    borderWidth: 1,
  },
  dayBoxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayBoxInactive: {
    backgroundColor: colors.background,
    borderColor: colors.border,
  },
  dayText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  dayTextActive: {
    color: colors.background,
  },
  dayTextInactive: {
    color: colors.textLight,
  },

  // ==================== LISTA ĆWICZEŃ ====================
  exercisesSection: {
    flex: 1,
  },
  exercisesSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  exercisesSectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
  },
  exercisesSectionCount: {
    fontSize: 10,
    color: colors.textMuted,
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },

  // ==================== ĆWICZENIE - PEŁNY WIDOK ====================
  exerciseCard: {
    marginBottom: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.background,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  exerciseNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  exerciseNumberText: {
    color: colors.background,
    fontSize: 13,
    fontWeight: 'bold',
  },
  exerciseTitle: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 3,
  },
  exerciseType: {
    fontSize: 9,
    color: colors.textMuted,
  },
  exerciseContent: {
    flexDirection: 'row',
    gap: 14,
  },
  exerciseImage: {
    width: 90,
    height: 90,
    borderRadius: 8,
    objectFit: 'cover',
    backgroundColor: colors.surface,
  },
  exerciseImagePlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 8,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderStyle: 'dashed',
  },
  exerciseImagePlaceholderText: {
    fontSize: 8,
    color: colors.textLight,
    textAlign: 'center',
  },
  exerciseDetails: {
    flex: 1,
  },
  
  // Parametry ćwiczenia - bardziej widoczne
  exerciseParams: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  paramBox: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: colors.accent,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  paramLabel: {
    fontSize: 8,
    color: colors.textMuted,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  paramValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.primary,
  },
  
  // Opis ćwiczenia
  exerciseDescription: {
    fontSize: 10,
    color: colors.text,
    lineHeight: 1.6,
  },
  
  // Dodatkowe uwagi do ćwiczenia
  exerciseNotes: {
    marginTop: 8,
    padding: 8,
    backgroundColor: colors.warning,
    borderRadius: 6,
  },
  exerciseNotesLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: colors.warningText,
    marginBottom: 2,
  },
  exerciseNotesText: {
    fontSize: 9,
    color: colors.warningText,
    lineHeight: 1.5,
  },

  // Strona ćwiczenia (lewa/prawa)
  exerciseSide: {
    marginTop: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: colors.surface,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  exerciseSideText: {
    fontSize: 9,
    color: colors.textMuted,
    fontWeight: 'semibold',
  },

  // ==================== ĆWICZENIE - KOMPAKTOWY WIDOK ====================
  exerciseCardCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  exerciseCompactNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  exerciseCompactNumberText: {
    color: colors.background,
    fontSize: 11,
    fontWeight: 'bold',
  },
  exerciseCompactName: {
    flex: 1,
    fontSize: 11,
    fontWeight: 'semibold',
    color: colors.text,
  },
  exerciseCompactParams: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  exerciseCompactParam: {
    fontSize: 10,
    color: colors.text,
  },

  // ==================== NOTATKI OGÓLNE ====================
  notesSection: {
    marginTop: 16,
    padding: 14,
    backgroundColor: colors.warning,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fcd34d',
  },
  notesTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.warningText,
    marginBottom: 6,
  },
  notesText: {
    fontSize: 10,
    color: colors.warningText,
    lineHeight: 1.6,
  },

  // ==================== KOD QR ====================
  qrSection: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  qrCode: {
    width: 70,
    height: 70,
    marginRight: 14,
  },
  qrText: {
    flex: 1,
  },
  qrTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  qrDescription: {
    fontSize: 9,
    color: colors.textMuted,
    lineHeight: 1.5,
  },

  // ==================== SEKCJA KONTAKTOWA ====================
  contactSection: {
    marginTop: 16,
    padding: 12,
    backgroundColor: colors.accent,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactText: {
    fontSize: 10,
    color: colors.primary,
    textAlign: 'center',
  },
  contactBold: {
    fontWeight: 'bold',
  },

  // ==================== STOPKA ====================
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 36,
    right: 36,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 8,
    color: colors.textLight,
  },
  footerBrand: {
    fontSize: 9,
    color: colors.primary,
    fontWeight: 'bold',
  },

  // ==================== NUMER STRONY ====================
  pageNumber: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    fontSize: 9,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
