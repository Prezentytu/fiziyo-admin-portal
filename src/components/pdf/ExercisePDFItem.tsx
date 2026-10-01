import { View, Text, Image as PdfImage } from '@react-pdf/renderer';
import { pdfStyles } from './styles';
import { getMediaUrl } from '@/utils/mediaUrl';
import { translateExerciseSidePolish } from './polishUtils';
import { formatExecutionParameters, shouldAllowExerciseRowWrap } from './pdfPageUtils';
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
  const imageUrl = exercise.imageUrl?.startsWith('data:')
    ? exercise.imageUrl
    : getMediaUrl(exercise.imageUrl);
  const sideLabel = translateExerciseSidePolish(exercise.exerciseSide);
  const parameterItems = formatExecutionParameters({
    sets: exercise.sets,
    reps: exercise.reps,
    duration: exercise.duration,
    executionTime: exercise.executionTime,
    restSets: exercise.restSets,
  });
  const allowWrap = shouldAllowExerciseRowWrap(displayDescription);

  if (compact) {
    return (
      <View style={pdfStyles.exerciseRowCompact} wrap={false}>
        <Text style={pdfStyles.exerciseCompactNumber}>{index + 1}.</Text>
        <Text style={pdfStyles.exerciseCompactName}>{displayName}</Text>
        <View style={pdfStyles.exerciseCompactParams}>
          {parameterItems.slice(0, 3).map((item) => (
            <Text key={item.label} style={pdfStyles.exerciseCompactParam}>
              {item.value}
            </Text>
          ))}
          {sideLabel && <Text style={pdfStyles.exerciseCompactParam}>{sideLabel}</Text>}
        </View>
      </View>
    );
  }

  return (
    <View style={pdfStyles.exerciseRowClean} wrap={allowWrap}>
      {showImage && (
        <View style={pdfStyles.exerciseColImageClean}>
          {imageUrl ? (
            <PdfImage src={imageUrl} style={pdfStyles.exerciseThumbnailClean} />
          ) : (
            <View style={pdfStyles.exerciseThumbnailPlaceholderClean}>
              <Text style={pdfStyles.exerciseThumbnailPlaceholderText}>Rysunek</Text>
            </View>
          )}
        </View>
      )}

      <View style={pdfStyles.exerciseColContentClean}>
        <View style={pdfStyles.exerciseHeaderClean}>
          <Text style={pdfStyles.exerciseNumberClean}>{index + 1}.</Text>
          <Text style={pdfStyles.exerciseNameClean}>{displayName.toUpperCase()}</Text>
          {sideLabel && <Text style={pdfStyles.exerciseSideTagClean}>{sideLabel}</Text>}
        </View>

        {displayDescription ? (
          <Text style={pdfStyles.exerciseDescriptionClean}>{displayDescription}</Text>
        ) : (
          <Text style={pdfStyles.exerciseDescriptionClean}>
            Wykonuj ćwiczenie zgodnie z instrukcjami terapeuty. Pamiętaj o prawidłowym oddychaniu.
          </Text>
        )}

        {exercise.notes && (
          <View style={pdfStyles.exerciseTherapistNotesClean}>
            <Text style={pdfStyles.exerciseTherapistNotesTextClean}>Uwaga: {exercise.notes}</Text>
          </View>
        )}

        <View style={pdfStyles.exerciseNotesSection}>
          <Text style={pdfStyles.exerciseNotesLabelClean}>Notatki terapeuty:</Text>
          <View style={pdfStyles.exerciseNotesLineClean} />
          <View style={pdfStyles.exerciseNotesLineClean} />
        </View>
      </View>

      <View style={pdfStyles.exerciseColParamsClean}>
        {parameterItems.map((item, itemIndex) => (
          <View
            key={item.label}
            style={itemIndex < parameterItems.length - 1 ? pdfStyles.paramItemCleanWithBorder : pdfStyles.paramItemClean}
          >
            <Text style={pdfStyles.paramLabelClean}>{item.label}</Text>
            <Text
              style={
                item.label === 'Serie'
                  ? pdfStyles.paramValueCleanLarge
                  : item.label === 'Powtórzenia'
                    ? pdfStyles.paramValueCleanMedium
                    : pdfStyles.paramValueCleanSmall
              }
            >
              {item.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
