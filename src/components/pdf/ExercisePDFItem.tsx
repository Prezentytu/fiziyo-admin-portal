import { View, Text, Image } from '@react-pdf/renderer';
import { pdfStyles } from './styles';
import { 
  formatSets, 
  formatReps, 
  formatDurationPolish, 
  formatSeconds,
  translateExerciseTypePolish, 
  translateExerciseSidePolish 
} from './polishUtils';
import type { PDFExercise } from './types';

interface ExercisePDFItemProps {
  exercise: PDFExercise;
  index: number;
  showImage: boolean;
  compact: boolean;
}

export function ExercisePDFItem({ exercise, index, showImage, compact }: ExercisePDFItemProps) {
  const displayName = exercise.customName || exercise.name;
  const displayDescription = exercise.customDescription || exercise.description;
  const imageUrl = exercise.imageUrl || exercise.images?.[0];
  const typeLabel = translateExerciseTypePolish(exercise.type);
  const sideLabel = translateExerciseSidePolish(exercise.exerciseSide);

  // Formatowanie parametrów z polską odmianą
  const setsText = exercise.sets ? formatSets(exercise.sets) : null;
  const repsText = exercise.reps ? formatReps(exercise.reps) : null;
  const durationText = exercise.duration ? formatDurationPolish(exercise.duration) : null;
  const restText = exercise.restSets ? formatSeconds(exercise.restSets) : null;

  // Kompaktowy widok - lista bez obrazków
  if (compact) {
    return (
      <View style={pdfStyles.exerciseCardCompact} wrap={false}>
        <View style={pdfStyles.exerciseCompactNumber}>
          <Text style={pdfStyles.exerciseCompactNumberText}>{index + 1}</Text>
        </View>
        <Text style={pdfStyles.exerciseCompactName}>{displayName}</Text>
        <View style={pdfStyles.exerciseCompactParams}>
          {setsText && (
            <Text style={pdfStyles.exerciseCompactParam}>{setsText}</Text>
          )}
          {repsText && (
            <Text style={pdfStyles.exerciseCompactParam}>{repsText}</Text>
          )}
          {durationText && (
            <Text style={pdfStyles.exerciseCompactParam}>{durationText}</Text>
          )}
          {sideLabel && (
            <Text style={pdfStyles.exerciseCompactParam}>{sideLabel}</Text>
          )}
        </View>
      </View>
    );
  }

  // Pełny widok z obrazkiem i szczegółami
  return (
    <View style={pdfStyles.exerciseCard} wrap={false}>
      {/* Nagłówek z numerem i nazwą */}
      <View style={pdfStyles.exerciseHeader}>
        <View style={pdfStyles.exerciseNumber}>
          <Text style={pdfStyles.exerciseNumberText}>{index + 1}</Text>
        </View>
        <View style={pdfStyles.exerciseTitle}>
          <Text style={pdfStyles.exerciseName}>{displayName}</Text>
          {typeLabel && (
            <Text style={pdfStyles.exerciseType}>{typeLabel}</Text>
          )}
        </View>
      </View>

      {/* Treść - obrazek + szczegóły */}
      <View style={pdfStyles.exerciseContent}>
        {/* Obrazek */}
        {showImage && imageUrl ? (
          <Image src={imageUrl} style={pdfStyles.exerciseImage} />
        ) : showImage ? (
          <View style={pdfStyles.exerciseImagePlaceholder}>
            <Text style={pdfStyles.exerciseImagePlaceholderText}>Brak{'\n'}zdjęcia</Text>
          </View>
        ) : null}

        {/* Szczegóły ćwiczenia */}
        <View style={pdfStyles.exerciseDetails}>
          {/* Parametry - duże, widoczne */}
          <View style={pdfStyles.exerciseParams}>
            {setsText && (
              <View style={pdfStyles.paramBox}>
                <Text style={pdfStyles.paramLabel}>Serie</Text>
                <Text style={pdfStyles.paramValue}>{exercise.sets}</Text>
              </View>
            )}
            {repsText && (
              <View style={pdfStyles.paramBox}>
                <Text style={pdfStyles.paramLabel}>Powtórzenia</Text>
                <Text style={pdfStyles.paramValue}>{exercise.reps}</Text>
              </View>
            )}
            {durationText && (
              <View style={pdfStyles.paramBox}>
                <Text style={pdfStyles.paramLabel}>Czas</Text>
                <Text style={pdfStyles.paramValue}>{durationText}</Text>
              </View>
            )}
            {restText && (
              <View style={pdfStyles.paramBox}>
                <Text style={pdfStyles.paramLabel}>Przerwa</Text>
                <Text style={pdfStyles.paramValue}>{restText}</Text>
              </View>
            )}
          </View>

          {/* Strona ćwiczenia (lewa/prawa) */}
          {sideLabel && (
            <View style={pdfStyles.exerciseSide}>
              <Text style={pdfStyles.exerciseSideText}>{sideLabel}</Text>
            </View>
          )}

          {/* Opis - jak wykonać */}
          {displayDescription && (
            <Text style={pdfStyles.exerciseDescription}>{displayDescription}</Text>
          )}

          {/* Dodatkowe uwagi terapeuty */}
          {exercise.notes && (
            <View style={pdfStyles.exerciseNotes}>
              <Text style={pdfStyles.exerciseNotesLabel}>UWAGA OD TERAPEUTY:</Text>
              <Text style={pdfStyles.exerciseNotesText}>{exercise.notes}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
