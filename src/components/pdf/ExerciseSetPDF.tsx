import { Document, Page, View, Text, Image } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

import { pdfStyles } from './styles';
import { PDFHeader } from './PDFHeader';
import { PDFFooter } from './PDFFooter';
import { PDFFrequency } from './PDFFrequency';
import { ExercisePDFItem } from './ExercisePDFItem';
import { formatExercises } from './polishUtils';
import type { ExerciseSetPDFProps } from './types';

export function ExerciseSetPDF({
  exerciseSet,
  organization,
  patient,
  therapist,
  options,
  qrCodeDataUrl,
}: ExerciseSetPDFProps) {
  const now = new Date();
  const formattedDate = format(now, 'd MMMM yyyy', { locale: pl });
  const formattedDateTime = format(now, 'd.MM.yyyy, HH:mm', { locale: pl });

  // Sortuj ćwiczenia po kolejności
  const sortedExercises = [...exerciseSet.exercises].sort(
    (a, b) => (a.order || 0) - (b.order || 0)
  );

  const exerciseCountText = formatExercises(sortedExercises.length);

  return (
    <Document
      title={`Program ćwiczeń - ${exerciseSet.name}`}
      author={organization.name}
      subject={`Zestaw ćwiczeń dla ${patient?.name || 'pacjenta'}`}
      creator="fiziYo - Aplikacja dla fizjoterapeutów"
    >
      <Page size="A4" style={pdfStyles.page}>
        {/* Nagłówek z logo gabinetu */}
        <PDFHeader organization={organization} date={formattedDate} />

        {/* Sekcja tytułowa - informacje o programie */}
        <View style={pdfStyles.titleSection}>
          <Text style={pdfStyles.title}>{exerciseSet.name}</Text>
          
          {patient && (
            <View style={pdfStyles.patientInfoRow}>
              <Text style={pdfStyles.patientLabel}>Pacjent:</Text>
              <Text style={pdfStyles.patientValue}>{patient.name}</Text>
            </View>
          )}
          
          {therapist && (
            <View style={pdfStyles.patientInfoRow}>
              <Text style={pdfStyles.patientLabel}>Terapeuta:</Text>
              <Text style={pdfStyles.patientValue}>{therapist.name}</Text>
            </View>
          )}
          
          <View style={pdfStyles.patientInfoRow}>
            <Text style={pdfStyles.patientLabel}>Data:</Text>
            <Text style={pdfStyles.patientValue}>{formattedDate}</Text>
          </View>

          {exerciseSet.description && (
            <Text style={pdfStyles.description}>{exerciseSet.description}</Text>
          )}
        </View>

        {/* Harmonogram - kiedy ćwiczyć */}
        {options.showFrequency && exerciseSet.frequency && (
          <PDFFrequency frequency={exerciseSet.frequency} />
        )}

        {/* Lista ćwiczeń */}
        <View style={pdfStyles.exercisesSection}>
          <View style={pdfStyles.exercisesSectionHeader}>
            <Text style={pdfStyles.exercisesSectionTitle}>TWOJE ĆWICZENIA</Text>
            <Text style={pdfStyles.exercisesSectionCount}>{exerciseCountText}</Text>
          </View>
          
          {sortedExercises.map((exercise, index) => (
            <ExercisePDFItem
              key={exercise.id}
              exercise={exercise}
              index={index}
              showImage={options.showImages}
              compact={options.compactMode}
            />
          ))}
        </View>

        {/* Notatki od terapeuty */}
        {options.notes && (
          <View style={pdfStyles.notesSection}>
            <Text style={pdfStyles.notesTitle}>WAŻNE UWAGI OD TERAPEUTY</Text>
            <Text style={pdfStyles.notesText}>{options.notes}</Text>
          </View>
        )}

        {/* Kod QR do aplikacji */}
        {options.showQRCode && qrCodeDataUrl && (
          <View style={pdfStyles.qrSection}>
            <Image src={qrCodeDataUrl} style={pdfStyles.qrCode} />
            <View style={pdfStyles.qrText}>
              <Text style={pdfStyles.qrTitle}>Otwórz w aplikacji mobilnej</Text>
              <Text style={pdfStyles.qrDescription}>
                Zeskanuj kod QR aparatem telefonu, aby otworzyć ten program 
                ćwiczeń w aplikacji fiziYo. Będziesz mógł śledzić swoje postępy 
                i otrzymywać przypomnienia o ćwiczeniach.
              </Text>
            </View>
          </View>
        )}

        {/* Sekcja kontaktowa */}
        {(organization.phone || organization.email) && (
          <View style={pdfStyles.contactSection}>
            <Text style={pdfStyles.contactText}>
              Masz pytania? Skontaktuj się z nami: 
              {organization.phone && (
                <Text style={pdfStyles.contactBold}> tel. {organization.phone}</Text>
              )}
              {organization.phone && organization.email && ' lub '}
              {organization.email && (
                <Text style={pdfStyles.contactBold}>{organization.email}</Text>
              )}
            </Text>
          </View>
        )}

        {/* Stopka */}
        <PDFFooter generatedAt={formattedDateTime} />

        {/* Numer strony */}
        <Text
          style={pdfStyles.pageNumber}
          render={({ pageNumber, totalPages }) => 
            `Strona ${pageNumber} z ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  );
}
