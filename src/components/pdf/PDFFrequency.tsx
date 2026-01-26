import { View, Text } from '@react-pdf/renderer';
import { pdfStyles } from './styles';
import { formatTimes } from './polishUtils';
import type { PDFFrequency as PDFFrequencyType } from './types';

interface PDFFrequencyProps {
  frequency: PDFFrequencyType;
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
 * - Jeśli brak wybranych dni -> pokaż "Codziennie / Wg uznania" (bez pustych kółek!)
 */
export function PDFFrequency({ frequency }: PDFFrequencyProps) {
  const timesPerDayText = frequency.timesPerDay
    ? `${formatTimes(frequency.timesPerDay)} dziennie`
    : null;

  // Sprawdź czy są wybrane konkretne dni
  const selectedDays = DAYS.filter(
    (day) => frequency[day.key as keyof PDFFrequencyType] === true
  );
  const hasSpecificDays = selectedDays.length > 0 && selectedDays.length < 7;
  const isEveryDay = selectedDays.length === 7;

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
                    style={[
                      pdfStyles.dayBox,
                      isActive ? pdfStyles.dayBoxActive : pdfStyles.dayBoxInactive,
                    ]}
                  >
                    <Text
                      style={[
                        pdfStyles.dayText,
                        isActive ? pdfStyles.dayTextActive : pdfStyles.dayTextInactive,
                      ]}
                    >
                      {day.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </>
        ) : (
          // Brak konkretnych dni lub wszystkie dni - elegancki napis
          <View style={pdfStyles.frequencyItem}>
            <Text style={pdfStyles.frequencyLabel}>Dni treningowe: </Text>
            <Text style={pdfStyles.frequencyValueAccent}>
              {isEveryDay ? 'Codziennie' : 'Codziennie / Wg uznania'}
            </Text>
          </View>
        )}

        {/* Przerwa między sesjami - tylko jeśli sensowna wartość */}
        {frequency.breakBetweenSets && frequency.breakBetweenSets > 0 && frequency.timesPerDay && frequency.timesPerDay > 1 && (
          <View style={pdfStyles.frequencyItem}>
            <Text style={pdfStyles.frequencyLabel}>Min. przerwa między sesjami: </Text>
            <Text style={pdfStyles.frequencyValue}>{frequency.breakBetweenSets}h</Text>
          </View>
        )}
      </View>
    </View>
  );
}
