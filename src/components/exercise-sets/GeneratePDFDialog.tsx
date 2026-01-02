'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery } from '@apollo/client/react';
import { useUser } from '@clerk/nextjs';
import { pdf } from '@react-pdf/renderer';
import { QRCodeCanvas } from 'qrcode.react';
import {
  FileDown,
  FileText,
  Image,
  Calendar,
  QrCode,
  Loader2,
  Download,
  Eye,
  List,
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import { ExerciseSetPDF, formatExercises } from '@/components/pdf';
import type {
  PDFExerciseSet,
  PDFOrganization,
  PDFPatient,
  PDFTherapist,
  PDFOptions,
  PDFExercise,
} from '@/components/pdf';

import { GET_ORGANIZATION_BY_ID_QUERY } from '@/graphql/queries/organizations.queries';
import { GET_USER_BY_CLERK_ID_QUERY } from '@/graphql/queries/users.queries';
import type { OrganizationByIdResponse, UserByClerkIdResponse } from '@/types/apollo';

interface ExerciseMapping {
  id: string;
  exerciseId: string;
  order?: number;
  sets?: number;
  reps?: number;
  duration?: number;
  restSets?: number;
  restReps?: number;
  notes?: string;
  customName?: string;
  customDescription?: string;
  exercise?: {
    id: string;
    name: string;
    description?: string;
    type?: string;
    imageUrl?: string;
    images?: string[];
    exerciseSide?: string;
    notes?: string;
  };
}

interface ExerciseSetInput {
  id: string;
  name: string;
  description?: string;
  exerciseMappings?: ExerciseMapping[];
  frequency?: {
    timesPerDay?: number;
    timesPerWeek?: number;
    breakBetweenSets?: number;
    monday?: boolean;
    tuesday?: boolean;
    wednesday?: boolean;
    thursday?: boolean;
    friday?: boolean;
    saturday?: boolean;
    sunday?: boolean;
  };
}

interface PatientInput {
  name: string;
  email?: string;
}

interface GeneratePDFDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exerciseSet: ExerciseSetInput;
  patient?: PatientInput;
  organizationId: string;
}

type ViewMode = 'full' | 'compact';

export function GeneratePDFDialog({
  open,
  onOpenChange,
  exerciseSet,
  patient,
  organizationId,
}: GeneratePDFDialogProps) {
  const { user } = useUser();
  const qrRef = useRef<HTMLDivElement>(null);

  // Opcje generowania
  const [viewMode, setViewMode] = useState<ViewMode>('full');
  const [showImages, setShowImages] = useState(true);
  const [showFrequency, setShowFrequency] = useState(true);
  const [showQRCode, setShowQRCode] = useState(true);
  const [notes, setNotes] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Pobierz dane organizacji
  const { data: orgData } = useQuery(GET_ORGANIZATION_BY_ID_QUERY, {
    variables: { id: organizationId },
    skip: !organizationId,
  });

  // Pobierz dane terapeuty
  const { data: userData } = useQuery(GET_USER_BY_CLERK_ID_QUERY, {
    variables: { clerkId: user?.id },
    skip: !user?.id,
  });

  const organization = (orgData as OrganizationByIdResponse)?.organizationById;
  const therapistUser = (userData as UserByClerkIdResponse)?.userByClerkId;

  // Generuj QR code data URL
  const getQRCodeDataUrl = useCallback((): string | undefined => {
    if (!showQRCode || !qrRef.current) return undefined;
    const canvas = qrRef.current.querySelector('canvas');
    if (!canvas) return undefined;
    return canvas.toDataURL('image/png');
  }, [showQRCode]);

  // Generuj PDF
  const handleGeneratePDF = async () => {
    if (!organization) return;

    setIsGenerating(true);

    try {
      // Przygotuj dane organizacji
      const pdfOrganization: PDFOrganization = {
        name: organization.name || 'Gabinet Fizjoterapii',
        logoUrl: organization.logoUrl,
        address: organization.address,
        phone: organization.contactInfo,
        email: organization.email,
        website: organization.website,
      };

      // Mapuj ćwiczenia
      const pdfExercises: PDFExercise[] = (exerciseSet.exerciseMappings || []).map((mapping) => ({
        id: mapping.id,
        name: mapping.exercise?.name || 'Nieznane ćwiczenie',
        description: mapping.exercise?.description,
        type: mapping.exercise?.type as PDFExercise['type'],
        exerciseSide: mapping.exercise?.exerciseSide as PDFExercise['exerciseSide'],
        imageUrl: mapping.exercise?.imageUrl,
        images: mapping.exercise?.images,
        notes: mapping.notes || mapping.exercise?.notes,
        sets: mapping.sets,
        reps: mapping.reps,
        duration: mapping.duration,
        restSets: mapping.restSets,
        restReps: mapping.restReps,
        order: mapping.order,
        customName: mapping.customName,
        customDescription: mapping.customDescription,
      }));

      const pdfExerciseSet: PDFExerciseSet = {
        id: exerciseSet.id,
        name: exerciseSet.name,
        description: exerciseSet.description,
        exercises: pdfExercises,
        frequency: exerciseSet.frequency,
      };

      const pdfPatient: PDFPatient | undefined = patient
        ? { name: patient.name, email: patient.email }
        : undefined;

      const pdfTherapist: PDFTherapist | undefined = therapistUser?.fullname
        ? { name: therapistUser.fullname }
        : undefined;

      const pdfOptions: PDFOptions = {
        showImages: viewMode === 'full' && showImages,
        showFrequency,
        showQRCode,
        compactMode: viewMode === 'compact',
        notes: notes.trim() || undefined,
      };

      // Pobierz QR code
      const qrCodeDataUrl = getQRCodeDataUrl();

      // Generuj dokument PDF
      const doc = (
        <ExerciseSetPDF
          exerciseSet={pdfExerciseSet}
          organization={pdfOrganization}
          patient={pdfPatient}
          therapist={pdfTherapist}
          options={pdfOptions}
          qrCodeDataUrl={qrCodeDataUrl}
        />
      );

      const blob = await pdf(doc).toBlob();

      // Przygotuj nazwę pliku (bezpieczne znaki)
      const safeName = exerciseSet.name
        .replace(/[^a-zA-Z0-9ąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s-]/g, '')
        .replace(/\s+/g, '_')
        .substring(0, 50);
      
      const patientSuffix = patient 
        ? `_${patient.name.split(' ')[0]}` 
        : '';
      
      const fileName = `${safeName}${patientSuffix}_program.pdf`;

      // Pobierz plik
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      onOpenChange(false);
    } catch (error) {
      console.error('Błąd generowania PDF:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Reset opcji przy otwarciu
  useEffect(() => {
    if (open) {
      setViewMode('full');
      setShowImages(true);
      setShowFrequency(true);
      setShowQRCode(true);
      setNotes('');
    }
  }, [open]);

  const exerciseCount = exerciseSet.exerciseMappings?.length || 0;
  const exerciseCountText = formatExercises(exerciseCount);
  const qrUrl = `https://app.fiziyo.pl/sets/${exerciseSet.id}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5 text-primary" />
            Generuj PDF dla pacjenta
          </DialogTitle>
          <DialogDescription>
            Stwórz profesjonalny dokument z programem ćwiczeń do wydruku
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Info o zestawie */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <p className="font-semibold text-foreground">{exerciseSet.name}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {exerciseCountText}
              {patient && (
                <span className="text-primary font-medium"> • {patient.name}</span>
              )}
            </p>
          </div>

          {/* Tryb widoku */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Rodzaj dokumentu</Label>
            <div className="grid grid-cols-2 gap-3">
              <Card
                className={cn(
                  'cursor-pointer transition-all hover:shadow-md',
                  viewMode === 'full'
                    ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                    : 'border-border/60 hover:border-border'
                )}
                onClick={() => setViewMode('full')}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "h-10 w-10 rounded-lg flex items-center justify-center",
                      viewMode === 'full' ? 'bg-primary text-white' : 'bg-surface-light'
                    )}>
                      <Eye className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Szczegółowy</p>
                      <p className="text-xs text-muted-foreground">
                        Ze zdjęciami i opisami
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card
                className={cn(
                  'cursor-pointer transition-all hover:shadow-md',
                  viewMode === 'compact'
                    ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                    : 'border-border/60 hover:border-border'
                )}
                onClick={() => setViewMode('compact')}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "h-10 w-10 rounded-lg flex items-center justify-center",
                      viewMode === 'compact' ? 'bg-primary text-white' : 'bg-surface-light'
                    )}>
                      <List className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Kompaktowy</p>
                      <p className="text-xs text-muted-foreground">
                        Lista na 1-2 strony
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Opcje dodatkowe */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Zawartość dokumentu</Label>
            <div className="space-y-3 pl-1">
              {viewMode === 'full' && (
                <label className="flex items-center gap-3 cursor-pointer group">
                  <Checkbox
                    checked={showImages}
                    onCheckedChange={(checked) => setShowImages(checked === true)}
                  />
                  <div className="flex items-center gap-2 text-sm group-hover:text-foreground transition-colors">
                    <Image className="h-4 w-4 text-muted-foreground" />
                    <span>Zdjęcia ćwiczeń</span>
                  </div>
                </label>
              )}

              <label className="flex items-center gap-3 cursor-pointer group">
                <Checkbox
                  checked={showFrequency}
                  onCheckedChange={(checked) => setShowFrequency(checked === true)}
                />
                <div className="flex items-center gap-2 text-sm group-hover:text-foreground transition-colors">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Harmonogram (kiedy ćwiczyć)</span>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group">
                <Checkbox
                  checked={showQRCode}
                  onCheckedChange={(checked) => setShowQRCode(checked === true)}
                />
                <div className="flex items-center gap-2 text-sm group-hover:text-foreground transition-colors">
                  <QrCode className="h-4 w-4 text-muted-foreground" />
                  <span>Kod QR do aplikacji mobilnej</span>
                </div>
              </label>
            </div>
          </div>

          {/* Notatki dla pacjenta */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-semibold">
              Uwagi dla pacjenta
              <span className="text-muted-foreground font-normal ml-1">(opcjonalne)</span>
            </Label>
            <Textarea
              id="notes"
              placeholder="Np. Wykonuj ćwiczenia powoli, unikaj gwałtownych ruchów. W razie silnego bólu przerwij ćwiczenie i skontaktuj się ze mną..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="resize-none min-h-[80px]"
              rows={3}
            />
          </div>
        </div>

        {/* Ukryty QR Code do generowania obrazu */}
        <div ref={qrRef} className="hidden">
          <QRCodeCanvas value={qrUrl} size={200} level="M" />
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Anuluj
          </Button>
          <Button
            onClick={handleGeneratePDF}
            disabled={isGenerating || !organization}
            className="gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generowanie...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Pobierz PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
