'use client';

import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useQuery } from '@apollo/client/react';
import { useUser } from '@clerk/nextjs';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import { pdf } from '@react-pdf/renderer';
import {
  Download,
  Printer,
  Copy,
  Check,
  Smartphone,
  Share2,
  User,
  FilePlus,
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { GET_PATIENT_ASSIGNMENTS_BY_USER_QUERY } from '@/graphql/queries/patientAssignments.queries';
import type { OrganizationByIdResponse, UserByClerkIdResponse } from '@/types/apollo';

// ==================== TYPY ====================

interface ExerciseMapping {
  id: string;
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
    patientDescription?: string;
    type?: string;
    side?: string;
    exerciseSide?: string;
    thumbnailUrl?: string;
    imageUrl?: string;
    images?: string[];
    notes?: string;
    defaultSets?: number;
    defaultReps?: number;
    defaultDuration?: number;
    defaultRestBetweenSets?: number;
    defaultRestBetweenReps?: number;
    sets?: number;
    reps?: number;
    duration?: number;
    restSets?: number;
    restReps?: number;
  };
}

interface PatientPlan {
  id: string;
  name: string;
  description?: string;
  exerciseMappings?: ExerciseMapping[];
  validUntil?: string;
  createdAt?: string;
  status?: 'active' | 'archived' | 'expired';
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

interface PatientQRCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: {
    id: string;
    name: string;
    email?: string;
    /** Plany mogą być zagnieżdżone w obiekcie pacjenta */
    plans?: PatientPlan[];
    assignedSets?: PatientPlan[];
    exerciseSets?: PatientPlan[];
    assignments?: Array<{
      id: string;
      exerciseSet?: PatientPlan;
      validUntil?: string;
      createdAt?: string;
    }>;
  } | null;
  therapistId: string;
  organizationId: string;
  /** Lista planów pacjenta (może być pusta) - nadpisuje dane z patient */
  plans?: PatientPlan[];
  /** Callback do tworzenia nowego planu */
  onCreatePlan?: () => void;
}

// ==================== DOCUMENT PREVIEW COMPONENT ====================

/**
 * Wizualna miniaturka PDF - "Live Preview"
 * Biała kartka A4 z akcentami nawiązującymi do designu PDF
 */
function DocumentPreview({ exerciseCount = 0 }: Readonly<{ exerciseCount?: number }>) {
  const rowCount = Math.min(exerciseCount, 3);
  return (
    <div className="w-[110px] aspect-210/297 bg-white rounded-lg shadow-xl border border-border/30 flex flex-col overflow-hidden relative group cursor-default">
      {/* Zielony pasek (Header) - jak w prawdziwym PDF */}
      <div className="h-3 bg-primary w-full" />

      {/* Content area */}
      <div className="p-2.5 flex-1 flex flex-col">
        {/* Tytuł */}
        <div className="h-2 w-3/4 bg-foreground/70 rounded-sm mb-2" />
        <div className="h-1.5 w-1/2 bg-muted-foreground/20 rounded-sm mb-3" />

        {/* Info strip mock */}
        <div className="h-5 w-full bg-muted/40 rounded mb-3" />

        {/* Ćwiczenia (rows) */}
        {rowCount > 0 ? (
          Array.from({ length: rowCount }, (_, i) => (
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
  );
}

// ==================== MAIN COMPONENT ====================

/**
 * Patient Access Hub - Smart Context Modal
 *
 * Dwie ścieżki:
 * 1. LEWA: Aplikacja mobilna (QR kod) - ZAWSZE aktywna
 * 2. PRAWA: Wydruk karty - kontekstowa:
 *    - Ma plany: Selector + Preview + Drukuj
 *    - Brak planów: CTA "Przypisz nowy zestaw"
 */
export function PatientQRCodeDialog({
  open,
  onOpenChange,
  patient,
  therapistId,
  organizationId,
  plans: propPlans,
  onCreatePlan,
}: PatientQRCodeDialogProps) {
  const { user } = useUser();
  const [copied, setCopied] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const qrContainerRef = useRef<HTMLDivElement>(null);
  const qrCanvasRef = useRef<HTMLDivElement>(null);

  // ==================== QUERIES (MUSZĄ BYĆ PRZED useMemo!) ====================

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

  // ==================== KLUCZOWE: Pobierz przypisania pacjenta ====================
  const { data: assignmentsData, loading: loadingAssignments } = useQuery(
    GET_PATIENT_ASSIGNMENTS_BY_USER_QUERY,
    {
      variables: { userId: patient?.id },
      skip: !patient?.id || !open,
    }
  );

  const organization = (orgData as OrganizationByIdResponse)?.organizationById;
  const therapistUser = (userData as UserByClerkIdResponse)?.userByClerkId;

  // Wyciągnij przypisania z danych GraphQL
  const fetchedAssignments = useMemo(() => {
    const data = assignmentsData as { patientAssignments?: unknown[] } | undefined;
    return data?.patientAssignments || [];
  }, [assignmentsData]);

  // ==================== AUTO-DISCOVERY PLANÓW ====================
  // Szukamy planów w różnych miejscach obiektu pacjenta
  const discoveredPlans = useMemo((): PatientPlan[] => {
    // 1. Jeśli przekazano plans jako prop - użyj ich
    if (propPlans && propPlans.length > 0) {
      return propPlans;
    }

    // 2. KLUCZOWE: Użyj danych z GraphQL (fetchedAssignments)
    if (fetchedAssignments && fetchedAssignments.length > 0) {
      return fetchedAssignments
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((a: any) => a.exerciseSet)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((a: any) => ({
          id: a.exerciseSet.id,
          name: a.exerciseSet.name,
          description: a.exerciseSet.description,
          exerciseMappings: a.exerciseSet.exerciseMappings,
          createdAt: a.assignedAt || a.exerciseSet.creationTime,
          validUntil: a.endDate,
          status: a.status === 'active' ? 'active' : undefined,
          frequency: a.frequency,
        }));
    }

    if (!patient) return [];

    // 3. Sprawdź patient.plans
    if (patient.plans && patient.plans.length > 0) {
      return patient.plans;
    }

    // 4. Sprawdź patient.assignedSets
    if (patient.assignedSets && patient.assignedSets.length > 0) {
      return patient.assignedSets;
    }

    // 5. Sprawdź patient.exerciseSets
    if (patient.exerciseSets && patient.exerciseSets.length > 0) {
      return patient.exerciseSets;
    }

    // 6. Sprawdź patient.assignments (zagnieżdżone w assignment)
    if (patient.assignments && patient.assignments.length > 0) {
      return patient.assignments
        .filter(a => a.exerciseSet)
        .map(a => ({
          ...a.exerciseSet!,
          validUntil: a.validUntil,
          createdAt: a.createdAt || a.exerciseSet?.createdAt,
        }));
    }

    return [];
  }, [propPlans, fetchedAssignments, patient]);

  // Filtruj aktywne plany
  const activePlans = useMemo(() =>
    discoveredPlans.filter(p => p.status === 'active' || !p.status),
    [discoveredPlans]
  );

  // Stan wyboru planu
  const [selectedPlanId, setSelectedPlanId] = useState<string | undefined>(undefined);

  // Auto-selekcja pierwszego planu przy otwarciu modala
  useEffect(() => {
    if (open && discoveredPlans.length > 0 && !selectedPlanId) {
      // Wybierz pierwszy aktywny lub pierwszy dostępny
      const defaultPlan = activePlans[0] || discoveredPlans[0];
      setSelectedPlanId(defaultPlan?.id);
    }
  }, [open, discoveredPlans, activePlans, selectedPlanId]);

  // Reset przy zamknięciu
  useEffect(() => {
    if (!open) {
      setSelectedPlanId(undefined);
    }
  }, [open]);

  const selectedPlan = discoveredPlans.find(p => p.id === selectedPlanId);

  // Generuj QR code data URL dla PDF
  const getQRCodeDataUrl = useCallback((): string | undefined => {
    if (!qrCanvasRef.current) return undefined;
    const canvas = qrCanvasRef.current.querySelector('canvas');
    if (!canvas) return undefined;
    return canvas.toDataURL('image/png');
  }, []);

  // Early return after all hooks
  if (!patient) return null;

  // Sprawdź czy są plany
  const hasPlans = discoveredPlans.length > 0;
  const hasMultiplePlans = discoveredPlans.length > 1;
  const exerciseCount = selectedPlan?.exerciseMappings?.length || 0;

  // Generowanie linków
  const appDeepLink = `fiziyo://connect?patient=${patient.id}&therapist=${therapistId}&org=${organizationId}`;
  const webLink = `https://fiziyo.pl/instrukcja`;

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
        downloadLink.download = `QR-${patient.name.replaceAll(/\s+/g, '-')}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        downloadLink.remove();

        toast.success('QR kod pobrany');
      }
    };

    const encoder = new TextEncoder();
    const data = encoder.encode(svgData);
    const base64 = btoa(String.fromCodePoint(...data));
    img.src = 'data:image/svg+xml;base64,' + base64;
  };

  // Generuj PDF z kartą pacjenta
  const generatePatientCardPDF = async (download: boolean = false) => {
    if (!organization || !selectedPlan) {
      toast.error('Brak danych do wygenerowania PDF');
      return;
    }

    setIsGeneratingPDF(true);

    try {
      const pdfOrganization: PDFOrganization = {
        name: organization.name || 'Gabinet Fizjoterapii',
        logoUrl: organization.logoUrl,
        address: organization.address,
        phone: organization.contactPhone,
        email: organization.contactEmail,
        website: organization.website,
      };

      const pdfExercises: PDFExercise[] = (selectedPlan.exerciseMappings || []).map((mapping) => ({
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
        id: selectedPlan.id,
        name: selectedPlan.name,
        description: selectedPlan.description,
        exercises: pdfExercises,
        frequency: selectedPlan.frequency,
      };

      const pdfPatient: PDFPatient = {
        name: patient.name,
        email: patient.email,
      };

      const pdfTherapist: PDFTherapist | undefined = therapistUser?.fullname
        ? { name: therapistUser.fullname }
        : undefined;

      const pdfOptions: PDFOptions = {
        showImages: true,
        showFrequency: !!selectedPlan.frequency,
        showQRCode: true,
        compactMode: false,
        notes: undefined,
      };

      const qrCodeDataUrl = getQRCodeDataUrl();

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

      const safeName = selectedPlan.name
        .replaceAll(/[^a-zA-Z0-9ąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s-]/g, '')
        .replaceAll(/\s+/g, '_')
        .substring(0, 50);
      const patientSuffix = `_${patient.name.split(' ')[0]}`;
      const fileName = `Karta_Pacjenta_${safeName}${patientSuffix}.pdf`;

      if (download) {
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
        const url = URL.createObjectURL(blob);
        const printWindow = window.open(url, '_blank');
        if (printWindow) {
          printWindow.onload = () => {
            printWindow.print();
          };
        } else {
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
          title: `FiziYo - Program ćwiczeń dla ${patient.name}`,
          text: 'Pobierz aplikację FiziYo, aby ćwiczyć w domu',
          url: webLink,
        });
      } catch {
        // User cancelled
      }
    } else {
      handleCopyLink();
    }
  };

  const handleCreatePlan = () => {
    onOpenChange(false);
    onCreatePlan?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl" data-testid="patient-qr-dialog">
        {/* HEADER */}
        <DialogHeader className="pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg">Dostęp: {patient.name}</DialogTitle>
              <DialogDescription>
                Zarządzaj dostępem pacjenta do aplikacji i wydrukami
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="pt-4">
          {/* BODY: DWIE ŚCIEŻKI - Clean & Center (Bez linii, symetryczne) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* ==================== LEWA: APP (Zawsze aktywna) ==================== */}
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
                  data-testid="patient-qr-share-btn"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  Wyślij link SMS-em
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyLink}
                  className="w-full gap-2"
                  data-testid="patient-qr-copy-btn"
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

            {/* ==================== PRAWA: WYDRUK (Kontekstowa) ==================== */}
            <div className="flex flex-col p-5 rounded-xl border border-border/60 bg-surface/50 min-h-[320px] hover:border-border transition-colors">

              {loadingAssignments ? (
                /* ===== LOADING STATE ===== */
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                  <div className="w-14 h-14 rounded-full bg-muted/30 border-2 border-border flex items-center justify-center mb-3 animate-pulse">
                    <Printer className="w-6 h-6 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm text-muted-foreground">Ładowanie planów...</p>
                </div>
              ) : hasPlans ? (
                /* ===== SCENARIUSZ A: JEST PLAN ===== */
                <>
                  {/* 1. SELECTOR - subtelny na górze (bez linii!) */}
                  {hasMultiplePlans && (
                    <div className="mb-2">
                      <Select
                        value={selectedPlanId}
                        onValueChange={setSelectedPlanId}
                      >
                        <SelectTrigger
                          className="w-full bg-muted/30 border-border/50 text-xs"
                          data-testid="patient-qr-plan-select"
                        >
                          <SelectValue placeholder="Wybierz plan" />
                        </SelectTrigger>
                        <SelectContent>
                          {discoveredPlans.map((plan) => (
                            <SelectItem key={plan.id} value={plan.id}>
                              <div className="flex items-center gap-2">
                                {(plan.status === 'active' || !plan.status) && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                )}
                                <span className="truncate max-w-[180px]">{plan.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* 2. PREVIEW - CENTRUM */}
                  <div className="flex-1 flex flex-col items-center justify-center">
                    <div className="mb-4 hover:scale-105 transition-transform duration-300">
                      <DocumentPreview exerciseCount={exerciseCount} />
                    </div>

                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-1">
                      <Printer className="h-4 w-4 text-primary" />
                      Karta Pacjenta
                    </h3>
                    <p className="text-xs text-muted-foreground text-center max-w-[180px]">
                      {selectedPlan?.name || 'Wydruk A4 z Twoim logo.'}
                    </p>
                  </div>

                  {/* 3. AKCJE - identyczna struktura jak lewa */}
                  <div className="w-full pt-4 mt-auto space-y-2.5">
                    <Button
                      size="sm"
                      onClick={handlePrintCard}
                      disabled={isGeneratingPDF || !organization}
                      className="w-full gap-2 bg-primary hover:bg-primary-dark shadow-lg shadow-primary/20"
                      data-testid="patient-qr-print-btn"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      {isGeneratingPDF ? 'Generowanie...' : 'Drukuj Kartę'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDownloadPDF}
                      disabled={isGeneratingPDF || !organization}
                      className="w-full gap-2"
                      data-testid="patient-qr-download-pdf-btn"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Pobierz PDF
                    </Button>
                  </div>
                </>
              ) : (
                /* ===== SCENARIUSZ B: BRAK PLANU ===== */
                <>
                  <div className="flex-1 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 rounded-full bg-muted/20 border-2 border-dashed border-border/60 flex items-center justify-center mb-4">
                      <FilePlus className="w-7 h-7 text-muted-foreground/40" />
                    </div>

                    <h3 className="text-sm font-bold text-muted-foreground mb-1">
                      Brak aktywnego planu
                    </h3>
                    <p className="text-xs text-muted-foreground max-w-[180px]">
                      Przypisz zestaw ćwiczeń, aby wygenerować kartę.
                    </p>
                  </div>

                  {/* Przycisk - identyczna struktura */}
                  <div className="w-full pt-4 mt-auto space-y-2.5">
                    <Button
                      onClick={handleCreatePlan}
                      size="sm"
                      className="w-full gap-2"
                      data-testid="patient-qr-create-plan-btn"
                    >
                      <FilePlus className="h-3.5 w-3.5" />
                      Przypisz nowy zestaw
                    </Button>
                    <Button variant="ghost" size="sm" className="w-full gap-2 invisible">
                      Placeholder
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Pobierz QR - dodatkowa akcja */}
          <div className="flex items-center justify-center pt-4 pb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownloadQR}
              className="text-xs text-muted-foreground"
              data-testid="patient-qr-download-btn"
            >
              <Download className="h-3 w-3 mr-1.5" />
              Pobierz sam kod QR
            </Button>
          </div>
        </div>

        {/* Ukryty QR Code Canvas do generowania obrazu dla PDF */}
        <div ref={qrCanvasRef} className="hidden">
          <QRCodeCanvas
            value={`https://app.fiziyo.pl/sets/${selectedPlan?.id || ''}`}
            size={200}
            level="M"
          />
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t border-border">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            data-testid="patient-qr-close-btn"
          >
            Zamknij
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
