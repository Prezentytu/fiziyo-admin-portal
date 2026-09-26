import { Document, Page, View, Text } from '@react-pdf/renderer';
import { differenceInDays, format, startOfDay } from 'date-fns';
import { pl } from 'date-fns/locale';

import { pdfStyles } from './styles';
import { PDFHeader } from './PDFHeader';
import { PDFFooter } from './PDFFooter';
import { ExercisePDFItem } from './ExercisePDFItem';
import { formatExercises } from './polishUtils';
import { chunkExercisesForPages, PDF_EXERCISES_PER_COMPACT_PAGE, PDF_EXERCISES_PER_FULL_PAGE } from './pdfPageUtils';
import type { ExerciseSetPDFProps } from './types';

const DAYS = [
  { key: 'monday', label: 'Pn' },
  { key: 'tuesday', label: 'Wt' },
  { key: 'wednesday', label: 'Śr' },
  { key: 'thursday', label: 'Cz' },
  { key: 'friday', label: 'Pt' },
  { key: 'saturday', label: 'Sb' },
  { key: 'sunday', label: 'Nd' },
] as const;

/**
 * Clean Medical PDF - Total Flat Design
 *
 * Zmiany:
 * - Info Strip zamiast dublowanych sekcji (4 kolumny: Pacjent | Terapeuta | Data | Częstotliwość)
 * - Dni tygodnia TYLKO jeśli wybrano konkretne (brak szarych kółek)
 * - Czyste parametry (bez guzikowych obwódek)
 */
export function ExerciseSetPDF({
  exerciseSet,
  organization,
  patient,
  therapist,
  options,
  qrCodeDataUrl,
  joinUrl,
}: ExerciseSetPDFProps) {
  const now = new Date();
  const formattedDate = format(now, 'd MMMM yyyy', { locale: pl });
  const formattedDateTime = format(now, 'd.MM.yyyy, HH:mm', { locale: pl });

  // Sortuj ćwiczenia
  const sortedExercises = [...exerciseSet.exercises].sort((a, b) => (a.order || 0) - (b.order || 0));
  const exercisePages = chunkExercisesForPages(sortedExercises, { compact: options.compactMode });

  const exerciseCountText = formatExercises(sortedExercises.length);

  // LOGIKA DNI: sprawdź czy są wybrane konkretne dni (nie wszystkie, nie żadne)
  const frequency = exerciseSet.frequency;
  const selectedDays = frequency ? DAYS.filter((day) => frequency[day.key as keyof typeof frequency] === true) : [];
  const hasSpecificDays = selectedDays.length > 0 && selectedDays.length < 7;
  const isEveryDay = selectedDays.length === 7;

  // Tekst częstotliwości
  const frequencyText = frequency?.timesPerDay ? `${frequency.timesPerDay}x dziennie` : '1x dziennie';
  const daysText = isEveryDay || selectedDays.length === 0 ? '(Codziennie)' : null;
  const hasPlanPeriod = Boolean(exerciseSet.startDate && exerciseSet.endDate);
  const periodText = hasPlanPeriod
    ? (() => {
        const startDate = new Date(exerciseSet.startDate as string);
        const endDate = new Date(exerciseSet.endDate as string);
        const durationDays = Math.max(1, differenceInDays(startOfDay(endDate), startOfDay(startDate)));
        return `${format(startDate, 'dd.MM.yyyy', { locale: pl })} - ${format(endDate, 'dd.MM.yyyy', { locale: pl })} (${durationDays} dni)`;
      })()
    : null;

  return (
    <Document
      title={`Plan rehabilitacji - ${exerciseSet.name}`}
      author={organization.name}
      subject={`Program ćwiczeń dla ${patient?.name || 'pacjenta'}`}
      creator="FiziYo - Aplikacja dla fizjoterapeutów"
    >
      {exercisePages.map((pageExercises, pageIndex) => {
        const isFirstPage = pageIndex === 0;
        const globalOffset = pageIndex * (options.compactMode ? PDF_EXERCISES_PER_COMPACT_PAGE : PDF_EXERCISES_PER_FULL_PAGE);

        return (
          <Page key={`pdf-page-${pageIndex}`} size="A4" style={pdfStyles.page}>
            <PDFHeader organization={organization} date={formattedDate} />

            {isFirstPage && (
              <View style={pdfStyles.infoStrip}>
                <View style={pdfStyles.infoStripRow}>
                  <View style={pdfStyles.infoStripColumn}>
                    <Text style={pdfStyles.infoStripLabel}>Pacjent</Text>
                    <Text style={pdfStyles.infoStripValue}>{patient?.name || 'Nieznany'}</Text>
                  </View>

                  <View style={pdfStyles.infoStripColumn}>
                    <Text style={pdfStyles.infoStripLabel}>Terapeuta</Text>
                    <Text style={pdfStyles.infoStripValueSmall}>{therapist?.name || '-'}</Text>
                  </View>

                  <View style={pdfStyles.infoStripColumn}>
                    <Text style={pdfStyles.infoStripLabel}>Data</Text>
                    <Text style={pdfStyles.infoStripValueSmall}>{formattedDate}</Text>
                  </View>

                  <View style={pdfStyles.infoStripColumnLast}>
                    <Text style={pdfStyles.infoStripLabel}>Częstotliwość</Text>
                    <Text style={pdfStyles.infoStripValueAccent}>
                      {frequencyText}
                      {daysText && <Text style={pdfStyles.infoStripValueSmall}> {daysText}</Text>}
                    </Text>
                  </View>
                </View>

                {hasSpecificDays && (
                  <View style={pdfStyles.infoStripDaysRow}>
                    <Text style={pdfStyles.infoStripDaysLabel}>Dni treningowe:</Text>
                    <View style={pdfStyles.infoStripDaysContainer}>
                      {DAYS.map((day) => {
                        const isActive = frequency?.[day.key as keyof typeof frequency] === true;
                        return (
                          <View
                            key={day.key}
                            style={[
                              pdfStyles.infoStripDayBox,
                              isActive ? pdfStyles.infoStripDayBoxActive : pdfStyles.infoStripDayBoxInactive,
                            ]}
                          >
                            <Text
                              style={[
                                pdfStyles.infoStripDayText,
                                isActive ? pdfStyles.infoStripDayTextActive : pdfStyles.infoStripDayTextInactive,
                              ]}
                            >
                              {day.label}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                )}

                {periodText && <Text style={pdfStyles.infoStripNote}>Okres planu: {periodText}</Text>}

                {frequency?.breakBetweenSets && frequency.timesPerDay && frequency.timesPerDay > 1 && (
                  <Text style={pdfStyles.infoStripNote}>
                    * Pamiętaj o zachowaniu min. {frequency.breakBetweenSets}h przerwy między sesjami.
                  </Text>
                )}
              </View>
            )}

            {isFirstPage && options.notes && (
              <View style={pdfStyles.generalNotes}>
                <Text style={pdfStyles.sectionTitle}>Zalecenia ogólne</Text>
                <Text style={pdfStyles.generalNotesText}>{options.notes}</Text>
              </View>
            )}

            <View style={pdfStyles.exercisesSection}>
              <View style={pdfStyles.exercisesSectionHeader}>
                <Text style={pdfStyles.exercisesSectionTitle}>
                  {isFirstPage ? 'Plan Treningowy' : `${exerciseSet.name} — kontynuacja`}
                </Text>
                <Text style={pdfStyles.exercisesSectionCount}>{exerciseCountText}</Text>
              </View>

              {pageExercises.map((exercise, indexOnPage) => (
                <ExercisePDFItem
                  key={exercise.id}
                  exercise={exercise}
                  index={globalOffset + indexOnPage}
                  showImage={options.showImages}
                  compact={options.compactMode}
                />
              ))}
            </View>

            <PDFFooter
              generatedAt={formattedDateTime}
              therapistName={therapist?.name}
              qrCodeDataUrl={options.showQRCode ? qrCodeDataUrl : undefined}
              joinUrl={joinUrl}
            />

            <Text
              style={pdfStyles.pageNumber}
              render={({ pageNumber, totalPages }) => `Strona ${pageNumber} z ${totalPages}`}
              fixed
            />
          </Page>
        );
      })}
    </Document>
  );
}
