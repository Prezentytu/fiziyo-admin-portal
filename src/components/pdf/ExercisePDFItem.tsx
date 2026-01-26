import { View, Text, Image } from '@react-pdf/renderer';
import { pdfStyles } from './styles';
import { getMediaUrl } from '@/utils/mediaUrl';
import {
  formatDurationPolish,
  formatSeconds,
  translateExerciseSidePolish
} from './polishUtils';
import type { PDFExercise } from './types';

interface ExercisePDFItemProps {
  exercise: PDFExercise;
  index: number;
  showImage: boolean;
  compact: boolean;
}

/**
 * Clean Exercise Row - Total Flat Design
 * 
 * Struktura: [Obrazek] [Treść + Notatki] [Parametry]
 * - Parametry w czystej tabelce (bez guzikowych obwódek)
 * - Liniatura na notatki (zamiast pustego miejsca)
 */
export function ExercisePDFItem({ exercise, index, showImage, compact }: ExercisePDFItemProps) {
  const displayName = exercise.customName || exercise.name;
  const displayDescription = exercise.customDescription || exercise.description;
  const imageUrl = getMediaUrl(exercise.imageUrl || exercise.images?.[0]);
  const sideLabel = translateExerciseSidePolish(exercise.exerciseSide);

  // Formatowanie parametrów
  const durationText = exercise.duration ? formatDurationPolish(exercise.duration) : null;
  const restText = exercise.restSets ? formatSeconds(exercise.restSets) : null;

  // Kompaktowy widok
  if (compact) {
    return (
      <View style={pdfStyles.exerciseRowCompact} wrap={false}>
        <Text style={pdfStyles.exerciseCompactNumber}>{index + 1}.</Text>
        <Text style={pdfStyles.exerciseCompactName}>{displayName}</Text>
        <View style={pdfStyles.exerciseCompactParams}>
          {exercise.sets && (
            <Text style={pdfStyles.exerciseCompactParam}>{exercise.sets} serii</Text>
          )}
          {exercise.reps && (
            <Text style={pdfStyles.exerciseCompactParam}>{exercise.reps} powt.</Text>
          )}
          {durationText && !exercise.reps && (
            <Text style={pdfStyles.exerciseCompactParam}>{durationText}</Text>
          )}
          {sideLabel && (
            <Text style={pdfStyles.exerciseCompactParam}>{sideLabel}</Text>
          )}
        </View>
      </View>
    );
  }

  // Pełny widok - Clean Layout
  return (
    <View style={pdfStyles.exerciseRowClean} wrap={false}>
      
      {/* KOLUMNA 1: OBRAZEK */}
      {showImage && (
        <View style={pdfStyles.exerciseColImageClean}>
          {imageUrl ? (
            <Image src={imageUrl} style={pdfStyles.exerciseThumbnailClean} />
          ) : (
            <View style={pdfStyles.exerciseThumbnailPlaceholderClean}>
              <Text style={pdfStyles.exerciseThumbnailPlaceholderText}>
                Rysunek
              </Text>
            </View>
          )}
        </View>
      )}

      {/* KOLUMNA 2: TREŚĆ */}
      <View style={pdfStyles.exerciseColContentClean}>
        {/* Nagłówek */}
        <View style={pdfStyles.exerciseHeaderClean}>
          <Text style={pdfStyles.exerciseNumberClean}>{index + 1}.</Text>
          <Text style={pdfStyles.exerciseNameClean}>{displayName.toUpperCase()}</Text>
          {sideLabel && (
            <Text style={pdfStyles.exerciseSideTagClean}>{sideLabel}</Text>
          )}
        </View>

        {/* Opis */}
        {displayDescription ? (
          <Text style={pdfStyles.exerciseDescriptionClean}>{displayDescription}</Text>
        ) : (
          <Text style={pdfStyles.exerciseDescriptionClean}>
            Wykonuj ćwiczenie zgodnie z instrukcjami terapeuty. Pamiętaj o prawidłowym oddychaniu.
          </Text>
        )}

        {/* Uwagi terapeuty (jeśli są) */}
        {exercise.notes && (
          <View style={pdfStyles.exerciseTherapistNotesClean}>
            <Text style={pdfStyles.exerciseTherapistNotesTextClean}>
              Uwaga: {exercise.notes}
            </Text>
          </View>
        )}

        {/* Notatki - liniatura */}
        <View style={pdfStyles.exerciseNotesSection}>
          <Text style={pdfStyles.exerciseNotesLabelClean}>Notatki terapeuty:</Text>
          <View style={pdfStyles.exerciseNotesLineClean} />
          <View style={pdfStyles.exerciseNotesLineClean} />
        </View>
      </View>

      {/* KOLUMNA 3: PARAMETRY (Czysta tabelka) */}
      <View style={pdfStyles.exerciseColParamsClean}>
        {exercise.sets && (
          <View style={pdfStyles.paramItemCleanWithBorder}>
            <Text style={pdfStyles.paramLabelClean}>Serie</Text>
            <Text style={pdfStyles.paramValueCleanLarge}>{exercise.sets}</Text>
          </View>
        )}
        
        {exercise.reps && (
          <View style={pdfStyles.paramItemCleanWithBorder}>
            <Text style={pdfStyles.paramLabelClean}>Powtórzenia</Text>
            <Text style={pdfStyles.paramValueCleanMedium}>{exercise.reps}</Text>
          </View>
        )}
        
        {durationText && !exercise.reps && (
          <View style={pdfStyles.paramItemCleanWithBorder}>
            <Text style={pdfStyles.paramLabelClean}>Czas</Text>
            <Text style={pdfStyles.paramValueCleanSmall}>{durationText}</Text>
          </View>
        )}
        
        {restText && (
          <View style={pdfStyles.paramItemClean}>
            <Text style={pdfStyles.paramLabelClean}>Przerwa</Text>
            <Text style={pdfStyles.paramValueCleanSmall}>{restText}</Text>
          </View>
        )}
        
        {/* Fallback */}
        {!exercise.sets && !exercise.reps && !exercise.duration && (
          <View style={pdfStyles.paramItemClean}>
            <Text style={pdfStyles.paramLabelClean}>Dawkowanie</Text>
            <Text style={pdfStyles.paramValueCleanSmall}>Wg zaleceń</Text>
          </View>
        )}
      </View>
    </View>
  );
}
