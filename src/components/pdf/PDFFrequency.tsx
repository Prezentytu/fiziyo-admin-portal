import { View, Text } from '@react-pdf/renderer';
import { pdfStyles } from './styles';
import { formatDaysPolish, formatTimes } from './polishUtils';
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

export function PDFFrequency({ frequency }: PDFFrequencyProps) {
  const daysText = formatDaysPolish(frequency);
  const timesPerDayText = frequency.timesPerDay
    ? `${formatTimes(frequency.timesPerDay)} dziennie`
    : null;

  return (
    <View style={pdfStyles.frequencySection}>
      <Text style={pdfStyles.frequencyTitle}>KIEDY ĆWICZYĆ?</Text>

      <View style={pdfStyles.frequencyContent}>
        {/* Dni tygodnia */}
        <View style={pdfStyles.frequencyRow}>
          <Text style={pdfStyles.frequencyLabel}>Dni ćwiczeń:</Text>
          <Text style={pdfStyles.frequencyValue}>{daysText}</Text>
        </View>

        {/* Ile razy dziennie */}
        {timesPerDayText && (
          <View style={pdfStyles.frequencyRow}>
            <Text style={pdfStyles.frequencyLabel}>Częstotliwość:</Text>
            <Text style={pdfStyles.frequencyValue}>{timesPerDayText}</Text>
          </View>
        )}

        {/* Przerwa między sesjami */}
        {frequency.breakBetweenSets && (
          <View style={pdfStyles.frequencyRow}>
            <Text style={pdfStyles.frequencyLabel}>Przerwa między sesjami:</Text>
            <Text style={pdfStyles.frequencyValue}>
              Minimum {frequency.breakBetweenSets} godzin
            </Text>
          </View>
        )}

        {/* Wizualizacja dni tygodnia */}
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
      </View>
    </View>
  );
}
