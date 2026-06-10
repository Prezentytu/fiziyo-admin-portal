import { formatFrequencyDisplay } from '@/utils/frequencyDisplay';
import { differenceInDays, format, startOfDay } from 'date-fns';
import { pl } from 'date-fns/locale';
import { View, Text } from '@react-pdf/renderer';
import { pdfStyles } from './styles';
import { formatTimes } from './polishUtils';
import type { PDFFrequency as PDFFrequencyType } from './types';

interface PDFFrequencyProps {
  readonly frequency: PDFFrequencyType;
  readonly startDate?: string;
  readonly endDate?: string;
}

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
 * Kompaktowy harmonogram ćwiczeń
 * LOGIKA DNI:
 * - Jeśli są wybrane konkretne dni -> pokaż kółka z dniami
 * - Jeśli brak wybranych dni -> pokaż rekomendację tygodniową (jeśli istnieje)
 */
export function PDFFrequency({ frequency, startDate, endDate }: PDFFrequencyProps) {
  const timesPerDayText = frequency.timesPerDay ? `${formatTimes(frequency.timesPerDay)} dziennie` : null;
  const frequencyDisplay = formatFrequencyDisplay(frequency);

  // Sprawdź czy są wybrane konkretne dni
  const selectedDays = DAYS.filter((day) => frequency[day.key as keyof PDFFrequencyType] === true);
  const hasSpecificDays = selectedDays.length > 0 && selectedDays.length < 7;
  const isEveryDay = selectedDays.length === 7;
  const periodText =
    startDate && endDate
      ? (() => {
          const parsedStartDate = new Date(startDate);
          const parsedEndDate = new Date(endDate);
          const durationDays = Math.max(1, differenceInDays(startOfDay(parsedEndDate), startOfDay(parsedStartDate)));
          return `${format(parsedStartDate, 'dd.MM.yyyy', { locale: pl })} - ${format(parsedEndDate, 'dd.MM.yyyy', {
            locale: pl,
          })} (${durationDays} dni)`;
        })()
      : null;

  return (
    <View style={pdfStyles.frequencySection}>
      <Text style={pdfStyles.frequencyTitle}>HARMONOGRAM ĆWICZEŃ</Text>

      <View style={pdfStyles.frequencyContent}>
        {/* Ile razy dziennie */}
        {timesPerDayText && (
          <View style={pdfStyles.frequencyItem}>
            <Text style={pdfStyles.frequencyLabel}>Częstotliwość: </Text>
            <Text style={pdfStyles.frequencyValue}>{timesPerDayText}</Text>
          </View>
        )}

        {periodText && (
          <View style={pdfStyles.frequencyItem}>
            <Text style={pdfStyles.frequencyLabel}>Okres planu: </Text>
            <Text style={pdfStyles.frequencyValue}>{periodText}</Text>
          </View>
        )}

        {/* LOGIKA DNI */}
        {hasSpecificDays ? (
          // Konkretne dni - pokaż wizualizację
          <>
            <View style={pdfStyles.frequencyItem}>
              <Text style={pdfStyles.frequencyLabel}>Dni treningowe: </Text>
            </View>
            <View style={pdfStyles.daysContainer}>
              {DAYS.map((day) => {
                const isActive = frequency[day.key as keyof PDFFrequencyType] === true;
                return (
                  <View
                    key={day.key}
                    style={[pdfStyles.dayBox, isActive ? pdfStyles.dayBoxActive : pdfStyles.dayBoxInactive]}
                  >
                    <Text style={[pdfStyles.dayText, isActive ? pdfStyles.dayTextActive : pdfStyles.dayTextInactive]}>
                      {day.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </>
        ) : (
          // Brak konkretnych dni lub wszystkie dni - czytelny fallback tekstowy
          <View style={pdfStyles.frequencyItem}>
            <Text style={pdfStyles.frequencyLabel}>Dni treningowe: </Text>
            <Text style={pdfStyles.frequencyValueAccent}>{isEveryDay ? 'Codziennie' : frequencyDisplay}</Text>
          </View>
        )}

        {/* Przerwa między sesjami - tylko jeśli sensowna wartość */}
        {frequency.breakBetweenSets &&
          frequency.breakBetweenSets > 0 &&
          frequency.timesPerDay &&
          frequency.timesPerDay > 1 && (
            <View style={pdfStyles.frequencyItem}>
              <Text style={pdfStyles.frequencyLabel}>Min. przerwa między sesjami: </Text>
              <Text style={pdfStyles.frequencyValue}>{frequency.breakBetweenSets}h</Text>
            </View>
          )}
      </View>
    </View>
  );
}
