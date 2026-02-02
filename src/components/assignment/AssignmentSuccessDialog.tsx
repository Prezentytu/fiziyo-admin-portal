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
  Copy,
  Check,
  Smartphone,
  Share2,
  Calendar,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

interface AssignmentSuccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Dane pacjenta/pacjentów */
  patients: Array<{
    id: string;
    name: string;
    email?: string;
  }>;
  /** Nazwa zestawu ćwiczeń */
  setName: string;
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
}

export function AssignmentSuccessDialog({
  open,
  onOpenChange,
  patients,
  setName,
  premiumValidUntil,
  therapistId,
  organizationId,
  exerciseSet,
  frequency,
  onAssignAnother,
}: AssignmentSuccessDialogProps) {
  const { user } = useUser();
  const [copied, setCopied] = useState(false);
  const [selectedPatientIndex, setSelectedPatientIndex] = useState(0);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
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
  const formattedPremiumDate = premiumDate
    ? format(premiumDate, 'd MMMM yyyy', { locale: pl })
    : null;

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
        exerciseSide: (mapping.exercise?.side?.toLowerCase() || mapping.exercise?.exerciseSide) as PDFExercise['exerciseSide'],
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
        frequency: frequency ? {
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
        } : undefined,
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

  const exerciseCount = exerciseSet?.exerciseMappings?.length || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl" data-testid="assign-success-dialog">
        {/* HEADER: SUKCES */}
        <DialogHeader className="pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 shadow-[0_0_20px_-5px_rgba(34,197,94,0.3)]">
              <CheckCircle2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg">Zestaw przypisany!</DialogTitle>
              <DialogDescription>
                {isSinglePatient
                  ? `Pacjent ${selectedPatient.name} otrzymał zestaw "${setName}"`
                  : `${patients.length} pacjentów otrzymało zestaw "${setName}"`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Premium info */}
          {formattedPremiumDate && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/10 border border-primary/20">
              <Sparkles className="h-5 w-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">Dostęp Premium aktywny</p>
                <p className="text-xs text-muted-foreground">
                  Pacjent ma dostęp do {formattedPremiumDate}
                </p>
              </div>
              <Badge variant="secondary" className="shrink-0 bg-primary/20 text-primary border-0">
                <Calendar className="h-3 w-3 mr-1" />
                {formattedPremiumDate}
              </Badge>
            </div>
          )}

          {/* Patient selector (for multiple patients) */}
          {!isSinglePatient && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {patients.map((patient, index) => (
                <Button
                  key={patient.id}
                  variant={index === selectedPatientIndex ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedPatientIndex(index)}
                  className="shrink-0"
                >
                  {patient.name}
                </Button>
              ))}
            </div>
          )}

          {/* BODY: DWIE ŚCIEŻKI - Clean & Center (Bez linii, symetryczne) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* ==================== LEWA: APP ==================== */}
            <div className="flex flex-col p-5 rounded-xl border border-border/60 bg-surface/50 min-h-[320px] hover:border-border transition-colors">

              {/* Treść główna - CENTRUM */}
              <div className="flex-1 flex flex-col items-center justify-center">
                <div
                  ref={qrContainerRef}
                  className="mb-4 p-3 bg-white rounded-xl shadow-lg hover:scale-105 transition-transform duration-300"
                >
                  <QRCodeSVG
                    value={appDeepLink}
                    size={130}
                    level="H"
                    bgColor="#ffffff"
                    fgColor="#121212"
                    imageSettings={{
                      src: '/images/icon.png',
                      height: 26,
                      width: 26,
                      excavate: true,
                    }}
                  />
                </div>

                <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-1">
                  <Smartphone className="h-4 w-4 text-blue-400" />
                  Aplikacja Mobilna
                </h3>
                <p className="text-xs text-muted-foreground text-center max-w-[180px]">
                  Wideo, timer i historia postępów.
                </p>
              </div>

              {/* Przyciski */}
              <div className="w-full pt-4 mt-auto space-y-2.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShare}
                  className="w-full gap-2"
                  data-testid="assign-success-share-btn"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  Wyślij link SMS-em
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyLink}
                  className="w-full gap-2"
                  data-testid="assign-success-copy-btn"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-primary" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {copied ? 'Skopiowano!' : 'Kopiuj link'}
                </Button>
              </div>
            </div>

            {/* ==================== PRAWA: WYDRUK ==================== */}
            <div className="flex flex-col p-5 rounded-xl border border-border/60 bg-surface/50 min-h-[320px] hover:border-border transition-colors">

              {/* Treść główna - CENTRUM */}
              <div className="flex-1 flex flex-col items-center justify-center">
                <div className="mb-4 hover:scale-105 transition-transform duration-300">
                  <div className="w-[110px] aspect-210/297 bg-white rounded-lg shadow-xl border border-border/30 flex flex-col overflow-hidden relative group cursor-default">
                    {/* Zielony pasek (Header) */}
                    <div className="h-3 bg-primary w-full" />

                    {/* Content area */}
                    <div className="p-2.5 flex-1 flex flex-col">
                      {/* Tytuł */}
                      <div className="h-2 w-3/4 bg-foreground/70 rounded-sm mb-2" />
                      <div className="h-1.5 w-1/2 bg-muted-foreground/20 rounded-sm mb-3" />

                      {/* Info strip mock */}
                      <div className="h-5 w-full bg-muted/40 rounded mb-3" />

                      {/* Ćwiczenia (rows) */}
                      {exerciseCount > 0 ? (
                        Array.from({ length: Math.min(exerciseCount, 3) }, (_, i) => (
                          <div key={`row-${i}`} className="flex gap-2 mb-2.5">
                            <div className="w-5 h-5 bg-muted rounded border border-border/20 shrink-0" />
                            <div className="flex-1 space-y-1">
                              <div className="h-1.5 w-2/3 bg-foreground/30 rounded-sm" />
                              <div className="h-1 w-full bg-muted-foreground/15 rounded-sm" />
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="flex gap-2 mb-2.5">
                          <div className="w-5 h-5 bg-muted rounded border border-border/20 shrink-0" />
                          <div className="flex-1 space-y-1">
                            <div className="h-1.5 w-2/3 bg-foreground/30 rounded-sm" />
                            <div className="h-1 w-full bg-muted-foreground/15 rounded-sm" />
                          </div>
                        </div>
                      )}

                      {/* Spacer */}
                      <div className="flex-1" />

                      {/* Footer (QR area) */}
                      <div className="border-t border-border/20 pt-2 flex gap-2 items-center">
                        <div className="w-5 h-5 bg-foreground/80 rounded-sm shrink-0" />
                        <div className="flex-1 space-y-1">
                          <div className="h-1 w-full bg-muted-foreground/20 rounded-sm" />
                          <div className="h-1 w-2/3 bg-muted-foreground/15 rounded-sm" />
                        </div>
                      </div>
                    </div>

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="bg-white/95 px-2 py-1 rounded text-[9px] font-bold text-foreground shadow-sm">
                        Podgląd
                      </div>
                    </div>
                  </div>
                </div>

                <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-1">
                  <Printer className="h-4 w-4 text-primary" />
                  Karta Pacjenta
                </h3>
                <p className="text-xs text-muted-foreground text-center max-w-[180px]">
                  Wydruk A4 z Twoim logo.
                </p>
              </div>

              {/* Przyciski - identyczna struktura jak lewa */}
              <div className="w-full pt-4 mt-auto space-y-2.5">
                <Button
                  size="sm"
                  onClick={handlePrintCard}
                  disabled={isGeneratingPDF || !organization || !exerciseSet}
                  className="w-full gap-2 bg-primary hover:bg-primary-dark shadow-lg shadow-primary/20"
                  data-testid="assign-success-print-btn"
                >
                  <Printer className="h-3.5 w-3.5" />
                  {isGeneratingPDF ? 'Generowanie...' : 'Drukuj Kartę'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDownloadPDF}
                  disabled={isGeneratingPDF || !organization || !exerciseSet}
                  className="w-full gap-2"
                  data-testid="assign-success-download-pdf-btn"
                >
                  <Download className="h-3.5 w-3.5" />
                  Pobierz PDF
                </Button>
              </div>
            </div>
          </div>

          {/* Pobierz QR - dodatkowa akcja */}
          <div className="flex items-center justify-center pt-4 pb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownloadQR}
              className="text-xs text-muted-foreground"
              data-testid="assign-success-download-qr-btn"
            >
              <Download className="h-3 w-3 mr-1.5" />
              Pobierz sam kod QR
            </Button>
          </div>
        </div>

        {/* Ukryty QR Code Canvas do generowania obrazu dla PDF */}
        <div ref={qrCanvasRef} className="hidden">
          <QRCodeCanvas
            value={`https://app.fiziyo.pl/sets/${exerciseSet?.id || ''}`}
            size={200}
            level="M"
          />
        </div>

        {/* Footer actions */}
        <div className="flex justify-between pt-4 border-t border-border">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            data-testid="assign-success-close-btn"
          >
            Zamknij
          </Button>
          {onAssignAnother && (
            <Button
              onClick={() => {
                onOpenChange(false);
                onAssignAnother();
              }}
              className="gap-2"
              data-testid="assign-success-another-btn"
            >
              Przypisz kolejny zestaw
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
