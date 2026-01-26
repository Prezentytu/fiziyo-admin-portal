import { StyleSheet } from '@react-pdf/renderer';

// Importuj rejestrację fontów
import './registerFonts';

// Kolory - CLEAN MEDICAL: Flat Design, Economy of Ink
const colors = {
  // Podstawowe
  text: '#18181b',           // zinc-900
  textMuted: '#52525b',      // zinc-600
  textLight: '#a1a1aa',      // zinc-400
  
  // Tła - minimalne!
  background: '#ffffff',
  surface: '#fafafa',        // zinc-50
  
  // Ramki
  border: '#e4e4e7',         // zinc-200
  borderLight: '#f4f4f5',    // zinc-100
  borderDark: '#18181b',     // zinc-900
  
  // Akcenty - tylko tekst!
  accent: '#047857',         // emerald-700
  
  // Ostrzeżenia
  warning: '#fef9c3',
  warningText: '#854d0e',
};

export const pdfStyles = StyleSheet.create({
  // ==================== DOKUMENT ====================
  page: {
    flexDirection: 'column',
    backgroundColor: colors.background,
    padding: 40,
    paddingBottom: 80,
    fontFamily: 'OpenSans',
    fontSize: 10,
    color: colors.text,
  },

  // ==================== NAGŁÓWEK (Minimalistyczny) ====================
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 20,
    paddingBottom: 14,
    borderBottomWidth: 2,
    borderBottomColor: colors.borderDark,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logo: {
    width: 36,
    height: 36,
    objectFit: 'contain',
  },
  logoPlaceholder: {
    width: 36,
    height: 36,
    backgroundColor: colors.accent,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoPlaceholderText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: 'bold',
  },
  organizationInfo: {
    flexDirection: 'column',
    gap: 1,
  },
  organizationName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  organizationSubtitle: {
    fontSize: 7,
    color: colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  headerContact: {
    fontSize: 8,
    color: colors.textMuted,
    textAlign: 'right',
  },
  headerWebsite: {
    fontSize: 8,
    color: colors.accent,
    fontWeight: 'bold',
  },

  // ==================== INFO STRIP (Scalona sekcja) ====================
  infoStrip: {
    marginBottom: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 6,
    padding: 14,
  },
  infoStripRow: {
    flexDirection: 'row',
    gap: 0,
  },
  infoStripColumn: {
    flex: 1,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  infoStripColumnLast: {
    flex: 1,
    paddingHorizontal: 8,
    borderRightWidth: 0,
  },
  infoStripLabel: {
    fontSize: 7,
    color: colors.textLight,
    textTransform: 'uppercase',
    fontWeight: 'bold',
    marginBottom: 3,
  },
  infoStripValue: {
    fontSize: 10,
    color: colors.text,
    fontWeight: 'bold',
  },
  infoStripValueSmall: {
    fontSize: 9,
    color: colors.textMuted,
  },
  infoStripValueAccent: {
    fontSize: 10,
    color: colors.accent,
    fontWeight: 'bold',
  },
  infoStripNote: {
    fontSize: 7,
    color: colors.textLight,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  // Dni tygodnia w Info Strip
  infoStripDaysRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  infoStripDaysLabel: {
    fontSize: 7,
    color: colors.textLight,
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  infoStripDaysContainer: {
    flexDirection: 'row',
    gap: 3,
  },
  infoStripDayBox: {
    width: 18,
    height: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 2,
  },
  infoStripDayBoxActive: {
    backgroundColor: colors.accent,
  },
  infoStripDayBoxInactive: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  infoStripDayText: {
    fontSize: 6,
    fontWeight: 'bold',
  },
  infoStripDayTextActive: {
    color: colors.background,
  },
  infoStripDayTextInactive: {
    color: colors.borderLight,
  },

  // ==================== LISTA ĆWICZEŃ ====================
  exercisesSection: {
    flex: 1,
  },
  exercisesSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  exercisesSectionTitle: {
    fontSize: 8,
    fontWeight: 'bold',
    color: colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  exercisesSectionCount: {
    fontSize: 8,
    color: colors.textLight,
  },

  // ==================== CLEAN EXERCISE ROW ====================
  exerciseRowClean: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  
  // Kolumna 1: Obrazek
  exerciseColImageClean: {
    width: 70,
    flexShrink: 0,
  },
  exerciseThumbnailClean: {
    width: 70,
    height: 70,
    borderRadius: 6,
    objectFit: 'cover',
    borderWidth: 1,
    borderColor: colors.border,
  },
  exerciseThumbnailPlaceholderClean: {
    width: 70,
    height: 70,
    borderRadius: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exerciseThumbnailPlaceholderText: {
    fontSize: 7,
    color: colors.textLight,
    textAlign: 'center',
  },

  // Kolumna 2: Treść
  exerciseColContentClean: {
    flex: 1,
    minWidth: 0,
    paddingRight: 10,
  },
  exerciseHeaderClean: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 6,
  },
  exerciseNumberClean: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
  },
  exerciseNameClean: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.text,
    textTransform: 'uppercase',
    flex: 1,
  },
  exerciseSideTagClean: {
    fontSize: 7,
    color: colors.textMuted,
    paddingHorizontal: 4,
    paddingVertical: 2,
    backgroundColor: colors.surface,
    borderRadius: 2,
  },
  exerciseDescriptionClean: {
    fontSize: 9,
    color: colors.textMuted,
    lineHeight: 1.6,
    marginBottom: 10,
  },
  // Notatki - liniatura
  exerciseNotesSection: {
    marginTop: 6,
  },
  exerciseNotesLabelClean: {
    fontSize: 7,
    color: colors.textLight,
    textTransform: 'uppercase',
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  exerciseNotesLineClean: {
    height: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 2,
  },
  // Uwagi terapeuty
  exerciseTherapistNotesClean: {
    marginTop: 8,
    padding: 8,
    backgroundColor: colors.warning,
    borderRadius: 4,
  },
  exerciseTherapistNotesTextClean: {
    fontSize: 8,
    color: colors.warningText,
    lineHeight: 1.4,
  },

  // Kolumna 3: Parametry (Czysta tabelka)
  exerciseColParamsClean: {
    width: 90,
    flexShrink: 0,
    backgroundColor: colors.surface,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: 10,
  },
  paramItemClean: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  paramItemCleanWithBorder: {
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  paramLabelClean: {
    fontSize: 7,
    color: colors.textLight,
    textTransform: 'uppercase',
    fontWeight: 'bold',
    marginBottom: 2,
  },
  paramValueCleanLarge: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.accent,
  },
  paramValueCleanMedium: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  paramValueCleanSmall: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.textMuted,
  },

  // ==================== KOMPAKTOWY WIDOK ====================
  exerciseRowCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    paddingBottom: 6,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  exerciseCompactNumber: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.text,
    marginRight: 8,
    width: 20,
  },
  exerciseCompactNumberText: {
    color: colors.background,
    fontSize: 9,
    fontWeight: 'bold',
  },
  exerciseCompactName: {
    flex: 1,
    fontSize: 10,
    fontWeight: 'semibold',
    color: colors.text,
  },
  exerciseCompactParams: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  exerciseCompactParam: {
    fontSize: 9,
    color: colors.textMuted,
  },

  // ==================== STOPKA Z QR ====================
  qrFooterSection: {
    marginTop: 'auto',
    paddingTop: 14,
    borderTopWidth: 2,
    borderTopColor: colors.borderDark,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  qrCode: {
    width: 60,
    height: 60,
  },
  qrContent: {
    flex: 1,
  },
  qrTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 3,
  },
  qrDescription: {
    fontSize: 8,
    color: colors.textMuted,
    lineHeight: 1.4,
  },
  qrMeta: {
    alignItems: 'flex-end',
  },
  qrMetaDate: {
    fontSize: 7,
    color: colors.textLight,
  },
  qrMetaBrand: {
    fontSize: 7,
    color: colors.accent,
    fontWeight: 'bold',
  },

  // ==================== APP BANNER (Marketing Footer) ====================
  appBanner: {
    marginTop: 'auto',
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: colors.borderDark,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  appBannerQR: {
    width: 72,
    height: 72,
    backgroundColor: colors.text,
    flexShrink: 0,
  },
  appBannerQRImage: {
    width: '100%',
    height: '100%',
  },
  appBannerContent: {
    flex: 1,
  },
  appBannerTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  appBannerSubtitle: {
    fontSize: 9,
    color: colors.text,
    lineHeight: 1.5,
    marginBottom: 8,
  },
  appBannerFeatures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  appBannerFeature: {
    fontSize: 8,
    color: colors.textMuted,
  },
  appBannerLegal: {
    fontSize: 7,
    color: colors.textLight,
    marginTop: 4,
  },

  // ==================== NUMER STRONY ====================
  pageNumber: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    fontSize: 8,
    color: colors.textLight,
    textAlign: 'center',
  },

  // ==================== LEGACY STYLES (dla kompatybilności) ====================
  // ... zachowane dla innych komponentów
  patientInfoSection: {
    marginBottom: 16,
    flexDirection: 'row',
    gap: 20,
  },
  patientInfoMain: {
    flex: 1,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
    paddingLeft: 12,
    paddingVertical: 4,
  },
  patientInfoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  patientInfoGrid: {
    flexDirection: 'column',
    gap: 4,
  },
  patientInfoRow: {
    flexDirection: 'row',
    gap: 8,
  },
  patientInfoLabel: {
    fontSize: 9,
    color: colors.textMuted,
    width: 70,
  },
  patientInfoValue: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.text,
  },
  patientInfoSchedule: {
    width: 180,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    padding: 10,
  },
  scheduleTitle: {
    fontSize: 8,
    fontWeight: 'bold',
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  scheduleLabel: {
    fontSize: 9,
    color: colors.textMuted,
  },
  scheduleValue: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.text,
  },
  scheduleValueAccent: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.accent,
  },
  patientInfoColumn: {
    flexDirection: 'column',
    gap: 2,
  },
  patientInfoValueSmall: {
    fontSize: 9,
    color: colors.text,
  },
  patientInfoAccent: {
    fontSize: 9,
    color: colors.accent,
    fontWeight: 'bold',
  },
  frequencySection: {
    marginBottom: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    padding: 10,
  },
  frequencyTitle: {
    fontSize: 8,
    fontWeight: 'bold',
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  frequencyContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    alignItems: 'center',
  },
  frequencyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  frequencyLabel: {
    fontSize: 9,
    color: colors.textMuted,
  },
  frequencyValue: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.text,
  },
  frequencyValueAccent: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.accent,
  },
  daysContainer: {
    flexDirection: 'row',
    gap: 3,
  },
  dayBox: {
    width: 18,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 2,
    borderWidth: 1,
  },
  dayBoxActive: {
    backgroundColor: colors.borderDark,
    borderColor: colors.borderDark,
  },
  dayBoxInactive: {
    backgroundColor: colors.background,
    borderColor: colors.border,
  },
  dayText: {
    fontSize: 7,
    fontWeight: 'bold',
  },
  dayTextActive: {
    color: colors.background,
  },
  dayTextInactive: {
    color: colors.textLight,
  },
  generalNotes: {
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
    paddingLeft: 12,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  generalNotesText: {
    fontSize: 9,
    color: colors.text,
    lineHeight: 1.6,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 7,
    color: colors.textLight,
  },
  footerBrand: {
    fontSize: 8,
    color: colors.textLight,
  },
  qrSection: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  qrText: {
    flex: 1,
  },
  qrLegal: {
    fontSize: 7,
    color: colors.textLight,
    lineHeight: 1.4,
  },
  exerciseRowFixed: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  exerciseColImage: {
    width: 60,
    flexShrink: 0,
  },
  exerciseThumbnailFixed: {
    width: 60,
    height: 60,
    borderRadius: 4,
    objectFit: 'cover',
    borderWidth: 1,
    borderColor: colors.border,
  },
  exerciseThumbnailPlaceholderFixed: {
    width: 60,
    height: 60,
    borderRadius: 4,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exerciseColContent: {
    flex: 1,
    minWidth: 0,
  },
  exerciseHeaderFixed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  exerciseNumberFixed: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.borderDark,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  exerciseNumberTextFixed: {
    color: colors.background,
    fontSize: 10,
    fontWeight: 'bold',
  },
  exerciseNameFixed: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
  },
  exerciseSideTagFixed: {
    fontSize: 7,
    color: colors.textMuted,
    paddingHorizontal: 4,
    paddingVertical: 2,
    backgroundColor: colors.surface,
    borderRadius: 2,
  },
  exerciseDescriptionFixed: {
    fontSize: 9,
    color: colors.textMuted,
    lineHeight: 1.5,
    marginBottom: 6,
  },
  exerciseTherapistNotesFixed: {
    marginBottom: 6,
    padding: 6,
    backgroundColor: colors.warning,
    borderRadius: 3,
  },
  exerciseTherapistNotesTextFixed: {
    fontSize: 8,
    color: colors.warningText,
    lineHeight: 1.4,
  },
  exerciseNotesLineFixed: {
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopStyle: 'dotted',
    borderTopColor: colors.border,
  },
  exerciseNotesLabelFixed: {
    fontSize: 7,
    color: colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  exerciseColParams: {
    width: 80,
    flexShrink: 0,
    flexDirection: 'column',
    gap: 4,
  },
  paramBoxFixed: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    padding: 6,
    alignItems: 'center',
  },
  paramBoxLight: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    padding: 6,
    alignItems: 'center',
  },
  paramLabelFixed: {
    fontSize: 7,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  paramValueFixed: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.accent,
  },
  paramValueLight: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
  },
  paramValueSmallFixed: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.text,
  },
});
