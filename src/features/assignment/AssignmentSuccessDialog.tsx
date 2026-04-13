'use client';

import { useState, useRef, useCallback } from 'react';
import { useQuery } from '@apollo/client/react';
import { useUser } from '@clerk/nextjs';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import { pdf } from '@react-pdf/renderer';
import {
  CheckCircle2,
  Download,
  Printer,
  ChevronDown,
  Copy,
  Check,
  Smartphone,
  Share2,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';

import { ExerciseSetPDF } from '@/components/pdf';
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
import type { ExerciseSet, Frequency } from './types';
import type { AssignmentExecutionMode } from './utils/assignmentPlanDecision';

interface AssignmentSuccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Dane pacjenta/pacjentów */
  patients: Array<{
    id: string;
    name: string;
    email?: string;
  }>;
  /** Nazwa planu pacjenta */
  setName: string;
  /** Zachowane dla kompatybilności API komponentu (nie wpływa na UI). */
  assignmentMode?: AssignmentExecutionMode;
  /** Data wygaśnięcia Premium (z backendu) */
  premiumValidUntil?: string | null;
  /** ID terapeuty (dla QR) */
  therapistId?: string;
  /** ID organizacji (dla QR i PDF) */
  organizationId: string;
  /** Zestaw ćwiczeń z exerciseMappings */
  exerciseSet?: ExerciseSet;
  /** Częstotliwość ćwiczeń */
  frequency?: Frequency;
  /** Callback do przypisania kolejnemu pacjentowi */
  onAssignAnother?: () => void;
  /** Przejście do nowo utworzonego planu */
  onViewPlan?: () => void;
}

export function AssignmentSuccessDialog({
  open,
  onOpenChange,
  patients,
  setName,
  assignmentMode: _assignmentMode = 'PERSONALIZED_PLAN',
  premiumValidUntil,
  therapistId,
  organizationId,
  exerciseSet,
  frequency,
  onAssignAnother,
  onViewPlan,
}: AssignmentSuccessDialogProps) {
  const { user } = useUser();
  const [copied, setCopied] = useState(false);
  const [selectedPatientIndex, setSelectedPatientIndex] = useState(0);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isMoreOptionsOpen, setIsMoreOptionsOpen] = useState(false);
  const qrContainerRef = useRef<HTMLDivElement>(null);
  const qrCanvasRef = useRef<HTMLDivElement>(null);

  const selectedPatient = patients[selectedPatientIndex];
  const isSinglePatient = patients.length === 1;

  // Pobierz dane organizacji
  const { data: orgData } = useQuery(GET_ORGANIZATION_BY_ID_QUERY, {
    variables: { id: organizationId },
    skip: !organizationId || !open,
  });

  // Pobierz dane terapeuty
  const { data: userData } = useQuery(GET_USER_BY_CLERK_ID_QUERY, {
    variables: { clerkId: user?.id },
    skip: !user?.id || !open,
  });

  const organization = (orgData as OrganizationByIdResponse)?.organizationById;
  const therapistUser = (userData as UserByClerkIdResponse)?.userByClerkId;

  // Generuj QR code data URL dla PDF
  const getQRCodeDataUrl = useCallback((): string | undefined => {
    if (!qrCanvasRef.current) return undefined;
    const canvas = qrCanvasRef.current.querySelector('canvas');
    if (!canvas) return undefined;
    return canvas.toDataURL('image/png');
  }, []);

  // Early return after all hooks
  if (!selectedPatient) return null;

  // Generowanie linku do aplikacji pacjenta
  const appDeepLink = `fiziyo://connect?patient=${selectedPatient.id}${therapistId ? `&therapist=${therapistId}` : ''}&org=${organizationId}`;
  const webLink = `https://fiziyo.pl/instrukcja`;

  // Formatowanie daty premium
  const premiumDate = premiumValidUntil ? new Date(premiumValidUntil) : null;
  const formattedPremiumDate = premiumDate ? format(premiumDate, 'd MMMM yyyy', { locale: pl }) : null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(webLink);
      setCopied(true);
      toast.success('Link skopiowany do schowka');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Nie udało się skopiować linku');
    }
  };

  const handleDownloadQR = () => {
    const svg = qrContainerRef.current?.querySelector('svg');
    if (!svg) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();

    canvas.width = 400;
    canvas.height = 400;

    img.onload = () => {
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const pngUrl = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.href = pngUrl;
        downloadLink.download = `QR-${selectedPatient.name.replaceAll(/\s+/g, '-')}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        downloadLink.remove();

        toast.success('QR kod pobrany');
      }
    };

    // Convert SVG to base64
    const encoder = new TextEncoder();
    const data = encoder.encode(svgData);
    const base64 = btoa(String.fromCodePoint(...data));
    img.src = 'data:image/svg+xml;base64,' + base64;
  };

  // Generuj PDF z kartą pacjenta
  const generatePatientCardPDF = async (download: boolean = false) => {
    if (!organization || !exerciseSet) {
      toast.error('Brak danych do wygenerowania PDF');
      return;
    }

    setIsGeneratingPDF(true);

    try {
      // Przygotuj dane organizacji
      const pdfOrganization: PDFOrganization = {
        name: organization.name || 'Gabinet Fizjoterapii',
        logoUrl: organization.logoUrl,
        address: organization.address,
        phone: organization.contactPhone,
        email: organization.contactEmail,
        website: organization.website,
      };

      // Mapuj ćwiczenia z exerciseMappings
      const pdfExercises: PDFExercise[] = (exerciseSet.exerciseMappings || []).map((mapping) => ({
        id: mapping.id,
        name: mapping.exercise?.name || 'Nieznane ćwiczenie',
        description: mapping.exercise?.patientDescription || mapping.exercise?.description,
        type: mapping.exercise?.type?.toLowerCase() as PDFExercise['type'],
        exerciseSide: (mapping.exercise?.side?.toLowerCase() ||
          mapping.exercise?.exerciseSide) as PDFExercise['exerciseSide'],
        imageUrl: mapping.exercise?.thumbnailUrl || mapping.exercise?.imageUrl,
        images: mapping.exercise?.images,
        notes: mapping.notes || mapping.exercise?.notes,
        sets: mapping.sets ?? mapping.exercise?.defaultSets ?? mapping.exercise?.sets,
        reps: mapping.reps ?? mapping.exercise?.defaultReps ?? mapping.exercise?.reps,
        duration: mapping.duration ?? mapping.exercise?.defaultDuration ?? mapping.exercise?.duration,
        restSets: mapping.restSets ?? mapping.exercise?.defaultRestBetweenSets ?? mapping.exercise?.restSets,
        restReps: mapping.restReps ?? mapping.exercise?.defaultRestBetweenReps ?? mapping.exercise?.restReps,
        order: mapping.order,
        customName: mapping.customName,
        customDescription: mapping.customDescription,
      }));

      const pdfExerciseSet: PDFExerciseSet = {
        id: exerciseSet.id,
        name: setName || exerciseSet.name,
        description: exerciseSet.description,
        exercises: pdfExercises,
        frequency: frequency
          ? {
              timesPerDay: frequency.timesPerDay,
              timesPerWeek: frequency.timesPerWeek,
              breakBetweenSets: frequency.breakBetweenSets,
              monday: frequency.monday,
              tuesday: frequency.tuesday,
              wednesday: frequency.wednesday,
              thursday: frequency.thursday,
              friday: frequency.friday,
              saturday: frequency.saturday,
              sunday: frequency.sunday,
            }
          : undefined,
      };

      const pdfPatient: PDFPatient = {
        name: selectedPatient.name,
        email: selectedPatient.email,
      };

      const pdfTherapist: PDFTherapist | undefined = therapistUser?.fullname
        ? { name: therapistUser.fullname }
        : undefined;

      const pdfOptions: PDFOptions = {
        showImages: true,
        showFrequency: !!frequency,
        showQRCode: true,
        compactMode: false,
        notes: undefined,
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

      // Przygotuj nazwę pliku
      const safeName = setName
        .replaceAll(/[^a-zA-Z0-9ąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s-]/g, '')
        .replaceAll(/\s+/g, '_')
        .substring(0, 50);
      const patientSuffix = `_${selectedPatient.name.split(' ')[0]}`;
      const fileName = `Karta_Pacjenta_${safeName}${patientSuffix}.pdf`;

      if (download) {
        // Pobierz plik
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        toast.success('PDF pobrany');
      } else {
        // Otwórz w nowym oknie i drukuj
        const url = URL.createObjectURL(blob);
        const printWindow = window.open(url, '_blank');
        if (printWindow) {
          printWindow.onload = () => {
            printWindow.print();
          };
        } else {
          // Fallback - pobierz jeśli nie można otworzyć okna
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          link.remove();
          toast.info('Pobrano PDF - otwórz i wydrukuj');
        }
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Błąd generowania PDF:', error);
      toast.error('Nie udało się wygenerować PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handlePrintCard = () => generatePatientCardPDF(false);
  const handleDownloadPDF = () => generatePatientCardPDF(true);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `FiziYo - Program ćwiczeń dla ${selectedPatient.name}`,
          text: 'Zeskanuj kod QR lub kliknij link, aby połączyć się z aplikacją FiziYo',
          url: webLink,
        });
      } catch {
        // User cancelled
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1.5rem)] max-w-2xl p-4 sm:p-6" data-testid="assign-success-dialog">
        <DialogHeader className="pb-3 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
              <CheckCircle2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">
                Plan pacjenta utworzony i przypisany!
              </DialogTitle>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="bg-surface-light text-foreground border-border">
              {isSinglePatient ? selectedPatient.name : `${patients.length} pacjentów`}
            </Badge>
            <Badge
              variant="secondary"
              className="max-w-full bg-surface-light text-foreground border-border"
              title={setName}
            >
              <span className="truncate">{setName}</span>
            </Badge>
          </div>

          {formattedPremiumDate && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 sm:flex-nowrap sm:justify-between sm:gap-3">
              <Sparkles className="h-4 w-4 text-primary shrink-0" />
              <p className="text-sm font-medium text-foreground flex-1 min-w-0">Dostęp Premium aktywny</p>
              <Badge variant="secondary" className="shrink-0 bg-surface-light text-foreground border-border">
                <Calendar className="h-3 w-3 mr-1" />
                {formattedPremiumDate}
              </Badge>
            </div>
          )}

          {!isSinglePatient && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {patients.map((patient, index) => (
                <Button
                  key={patient.id}
                  variant={index === selectedPatientIndex ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setSelectedPatientIndex(index)}
                  className="shrink-0 h-8"
                >
                  {patient.name}
                </Button>
              ))}
            </div>
          )}

          <div className="flex flex-col items-center rounded-xl bg-surface/50 p-5 border border-border/60">
            <div
              ref={qrContainerRef}
              className="p-3 bg-white rounded-xl shadow-sm border border-border/40"
            >
              <QRCodeSVG
                value={appDeepLink}
                size={120}
                level="H"
                bgColor="#ffffff"
                fgColor="#121212"
                imageSettings={{
                  src: '/images/icon.png',
                  height: 24,
                  width: 24,
                  excavate: true,
                }}
              />
            </div>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-border bg-surface-light px-3 py-1.5 text-sm font-medium text-foreground">
              <Smartphone className="h-4 w-4 text-muted-foreground" />
              Aplikacja mobilna
            </div>
          </div>

          <Collapsible
            open={isMoreOptionsOpen}
            onOpenChange={setIsMoreOptionsOpen}
            className="rounded-xl border border-border bg-surface/30"
            data-testid="assign-success-more-options-collapsible"
          >
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium text-foreground hover:bg-surface-light transition-colors rounded-xl"
                data-testid="assign-success-more-options-trigger"
              >
                <span>Więcej opcji</span>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform ${isMoreOptionsOpen ? 'rotate-180' : ''}`}
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-3 pb-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyLink}
                  className="justify-start text-xs text-muted-foreground h-8"
                  data-testid="assign-success-copy-btn"
                >
                  {copied ? <Check className="h-3 w-3 mr-1.5 text-primary" /> : <Copy className="h-3 w-3 mr-1.5" />}
                  {copied ? 'Skopiowano link' : 'Kopiuj link'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleShare}
                  className="justify-start text-xs text-muted-foreground h-8"
                  data-testid="assign-success-share-btn"
                >
                  <Share2 className="h-3 w-3 mr-1.5" />
                  Wyślij link
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePrintCard}
                  disabled={isGeneratingPDF || !organization || !exerciseSet}
                  className="justify-start text-xs text-muted-foreground h-8"
                  data-testid="assign-success-print-btn"
                >
                  <Printer className="h-3 w-3 mr-1.5" />
                  Drukuj kartę
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDownloadPDF}
                  disabled={isGeneratingPDF || !organization || !exerciseSet}
                  className="justify-start text-xs text-muted-foreground h-8"
                  data-testid="assign-success-download-pdf-btn"
                >
                  <Download className="h-3 w-3 mr-1.5" />
                  Pobierz PDF
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDownloadQR}
                  className="justify-start text-xs text-muted-foreground h-8"
                  data-testid="assign-success-download-qr-btn"
                >
                  <Download className="h-3 w-3 mr-1.5" />
                  Pobierz kod QR
                </Button>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <div ref={qrCanvasRef} className="hidden">
          <QRCodeCanvas value={`https://app.fiziyo.pl/sets/${exerciseSet?.id || ''}`} size={200} level="M" />
        </div>

        <div className="flex flex-col gap-3 pt-4 border-t border-border sm:flex-row sm:items-center sm:justify-between">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            data-testid="assign-success-close-btn"
            className="w-full sm:w-auto"
          >
            Zamknij
          </Button>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            {onViewPlan && (
              <Button
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  onViewPlan();
                }}
                data-testid="assign-success-view-plan-btn"
                className="w-full sm:w-auto"
              >
                Zobacz utworzony plan
              </Button>
            )}
            {onAssignAnother && (
              <Button
                onClick={() => {
                  onOpenChange(false);
                  onAssignAnother();
                }}
                data-testid="assign-success-assign-another-primary-btn"
                className="w-full sm:w-auto"
              >
                Personalizuj i przypisz
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
