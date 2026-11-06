'use client';

import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useQuery } from '@apollo/client/react';
import { useUser } from '@clerk/nextjs';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import { Download, Printer, Copy, Check, Smartphone, Share2, User, FilePlus, QrCode } from 'lucide-react';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

import { buildPatientCardPdf } from '@/components/pdf/patientCardPdf';
import { toPdfExercises } from '@/components/pdf/pdfExerciseUtils';
import { PRINT_UNAVAILABLE_MESSAGE, downloadBlob, openPendingWindow, showPdfInWindow } from '@/components/pdf/pdfOutput';

import { GET_ORGANIZATION_BY_ID_QUERY } from '@/graphql/queries/organizations.queries';
import { GET_USER_BY_CLERK_ID_QUERY } from '@/graphql/queries/users.queries';
import { GET_PATIENT_ASSIGNMENTS_BY_USER_QUERY } from '@/graphql/queries/patientAssignments.queries';
import { isHttpsUrl, tryBuildPatientConnectUrl } from '@/lib/patientJoinUrl';
import { downloadQrSvgAsPng } from '@/lib/qrPng';
import { buildPatientAccessPlans } from './utils/patientAccessPlans';
import type { OrganizationByIdResponse, UserByClerkIdResponse } from '@/types/apollo';
import type { PatientAssignmentsByUserQueryData } from '@/graphql/types/operation-responses';

// ==================== TYPY ====================

interface PatientQRCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: {
    id: string;
    name: string;
    email?: string;
  } | null;
  therapistId: string;
  organizationId: string;
  /** Otwiera kreator przypisania dla tego pacjenta (stan „Brak aktywnego planu”). */
  onCreatePlan?: () => void;
}

// ==================== DOCUMENT PREVIEW COMPONENT ====================

/**
 * Wizualna miniaturka PDF - "Live Preview"
 * Biała kartka A4 z akcentami nawiązującymi do designu PDF
 */
function DocumentPreview({
  exerciseCount = 0,
  onClick,
  disabled,
}: Readonly<{ exerciseCount?: number; onClick: () => void; disabled?: boolean }>) {
  const rowCount = Math.min(exerciseCount, 3);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Podgląd karty pacjenta w nowej karcie"
      data-testid="patient-qr-preview-btn"
      className="w-[110px] aspect-210/297 bg-white rounded-lg shadow-xl border border-border/30 flex flex-col overflow-hidden relative group cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-wait"
    >
      {/* Zielony pasek (Header) - jak w prawdziwym PDF */}
      <div className="h-3 bg-primary w-full" />

      {/* Content area */}
      <div className="p-2.5 flex-1 flex flex-col w-full">
        {/* Tytuł */}
        <div className="h-2 w-3/4 bg-foreground/70 rounded-sm mb-2" />
        <div className="h-1.5 w-1/2 bg-muted-foreground/20 rounded-sm mb-3" />

        {/* Info strip mock */}
        <div className="h-5 w-full bg-muted/40 rounded mb-3" />

        {/* Ćwiczenia (rows) */}
        {Array.from({ length: Math.max(rowCount, 1) }, (_, i) => (
          <div key={`row-${i}`} className="flex gap-2 mb-2.5">
            <div className="w-5 h-5 bg-muted rounded border border-border/20 shrink-0" />
            <div className="flex-1 space-y-1">
              <div className="h-1.5 w-2/3 bg-foreground/30 rounded-sm" />
              <div className="h-1 w-full bg-muted-foreground/15 rounded-sm" />
            </div>
          </div>
        ))}

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

      {/* Hover / focus overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 group-focus-visible:bg-black/5 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100">
        <div className="bg-white/95 px-2 py-1 rounded text-[9px] font-bold text-foreground shadow-sm">Podgląd</div>
      </div>
    </button>
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
 *    - Brak planów: CTA "Personalizuj i przypisz"
 */
export function PatientQRCodeDialog({
  open,
  onOpenChange,
  patient,
  therapistId,
  organizationId,
  onCreatePlan,
}: PatientQRCodeDialogProps) {
  const { user } = useUser();
  const [copied, setCopied] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const qrContainerRef = useRef<HTMLDivElement>(null);
  const qrCanvasRef = useRef<HTMLDivElement>(null);

  // ==================== QUERIES (MUSZĄ BYĆ PRZED useMemo!) ====================

  const { data: orgData } = useQuery(GET_ORGANIZATION_BY_ID_QUERY, {
    variables: { id: organizationId },
    skip: !organizationId || !open,
  });

  const { data: userData } = useQuery(GET_USER_BY_CLERK_ID_QUERY, {
    variables: { clerkId: user?.id },
    skip: !user?.id || !open,
  });

  // Backend zawęża przypisania do organizacji z tokenu (AssignmentVisibilityService).
  const { data: assignmentsData, loading: loadingAssignments } = useQuery<PatientAssignmentsByUserQueryData>(
    GET_PATIENT_ASSIGNMENTS_BY_USER_QUERY,
    {
      variables: { userId: patient?.id },
      skip: !patient?.id || !open,
    }
  );

  const organization = (orgData as OrganizationByIdResponse)?.organizationById;
  const therapistUser = (userData as UserByClerkIdResponse)?.userByClerkId;

  const plans = useMemo(
    () => buildPatientAccessPlans(assignmentsData?.patientAssignments),
    [assignmentsData]
  );

  const [selectedPlanId, setSelectedPlanId] = useState<string | undefined>(undefined);

  // Reset przy zamknięciu; przy otwarciu domyślnie pierwszy plan (aktywne są na początku).
  useEffect(() => {
    if (!open) setSelectedPlanId(undefined);
  }, [open]);

  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId) ?? plans[0];
  const exerciseCount = useMemo(
    () => (selectedPlan ? toPdfExercises(selectedPlan.exerciseMappings, selectedPlan.exerciseOverrides).length : 0),
    [selectedPlan]
  );

  const getQRCodeDataUrl = useCallback((): string | undefined => {
    const canvas = qrCanvasRef.current?.querySelector('canvas');
    return canvas ? canvas.toDataURL('image/png') : undefined;
  }, []);

  // Early return after all hooks
  if (!patient) return null;

  const joinUrl = tryBuildPatientConnectUrl({
    patientId: patient.id,
    organizationId,
    therapistId,
  });
  const canRenderQr = isHttpsUrl(joinUrl);

  const hasPlans = plans.length > 0;
  const hasMultiplePlans = plans.length > 1;
  // Karta bez ćwiczeń (wszystkie ukryte dla pacjenta) nie ma czego pokazać.
  const canGeneratePdf = !isGeneratingPDF && !!organization && !!selectedPlan && exerciseCount > 0;

  const handleCopyLink = async () => {
    if (!joinUrl) {
      toast.error('Brak kompletnego linku do aplikacji');
      return;
    }
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      toast.success('Link skopiowany do schowka');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Nie udało się skopiować linku');
    }
  };

  const handleDownloadQR = async () => {
    const svg = qrContainerRef.current?.querySelector('svg');
    if (!svg) return;
    try {
      await downloadQrSvgAsPng(svg, `QR-${patient.name.replaceAll(/\s+/g, '-')}.png`);
      toast.success('QR kod pobrany');
    } catch (error) {
      toast.error('Nie udało się pobrać kodu QR', {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  /** Składa PDF karty dla wybranego planu; null, gdy brakuje danych. */
  const buildCard = async (): Promise<{ blob: Blob; fileName: string } | null> => {
    if (!organization || !selectedPlan) {
      toast.error('Brak danych do wygenerowania PDF');
      return null;
    }
    return buildPatientCardPdf({
      organization,
      patient,
      therapistName: therapistUser?.fullname,
      plan: {
        ...selectedPlan,
        id: selectedPlan.exerciseSetId,
        startDate: selectedPlan.startDate || selectedPlan.assignedAt,
      },
      qrCodeDataUrl: getQRCodeDataUrl(),
      joinUrl: joinUrl ?? undefined,
    });
  };

  const runPdfAction = async (
    action: (pdf: { blob: Blob; fileName: string }) => Promise<void> | void,
    onFail?: () => void
  ) => {
    setIsGeneratingPDF(true);
    try {
      const result = await buildCard();
      if (!result) {
        onFail?.();
        return;
      }
      await action(result);
    } catch (error) {
      onFail?.();
      const message = error instanceof Error ? error.message : 'Nieznany błąd';
      toast.error('Nie udało się wygenerować PDF', { description: message });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  /** Karta otwarta w geście kliknięcia; `window.open` po await blokuje popup blocker. */
  const openPdfTab = (print: boolean) => {
    const pending = openPendingWindow();
    void runPdfAction(
      ({ blob, fileName }) => {
        const onPrintUnavailable = () => toast.info(PRINT_UNAVAILABLE_MESSAGE);
        if (showPdfInWindow(blob, pending, fileName, { print, onPrintUnavailable }) === 'downloaded') {
          toast.info(
            print
              ? 'Przeglądarka zablokowała nową kartę - pobrano PDF, otwórz i wydrukuj'
              : 'Przeglądarka zablokowała nową kartę - pobrano PDF'
          );
        }
      },
      () => pending?.close()
    );
  };

  const handlePrintCard = () => openPdfTab(true);

  const handleDownloadPDF = () =>
    runPdfAction(({ blob, fileName }) => {
      downloadBlob(blob, fileName);
      toast.success('PDF pobrany');
    });

  const handlePreviewPDF = () => openPdfTab(false);

  const handleShare = async () => {
    if (!joinUrl) {
      toast.error('Brak kompletnego linku do aplikacji');
      return;
    }
    if (navigator.share) {
      try {
        await navigator.share({
          title: `FiziYo - Program ćwiczeń dla ${patient.name}`,
          text: 'Pobierz aplikację FiziYo, aby ćwiczyć w domu',
          url: joinUrl,
        });
      } catch {
        // User cancelled
      }
    } else {
      await handleCopyLink();
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
              <DialogDescription>Zarządzaj dostępem pacjenta do aplikacji i wydrukami</DialogDescription>
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
                {canRenderQr && joinUrl ? (
                  <div
                    ref={qrContainerRef}
                    className="mb-4 p-3 bg-white rounded-xl shadow-lg hover:scale-105 transition-transform duration-300"
                    data-testid="patient-qr-code"
                    data-qr-url={joinUrl}
                  >
                    <QRCodeSVG
                      value={joinUrl}
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
                ) : (
                  <div
                    className="mb-4 flex h-[156px] w-[156px] flex-col items-center justify-center rounded-xl border border-border/40 bg-surface-light px-3 text-center"
                    data-testid="patient-qr-unavailable"
                  >
                    <QrCode className="h-6 w-6 text-muted-foreground" />
                    <p className="mt-2 text-xs text-muted-foreground">Brak pacjenta albo terapeuty</p>
                  </div>
                )}

                <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-1">
                  <Smartphone className="h-4 w-4 text-status-info" />
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
                  disabled={!canRenderQr}
                  className="w-full gap-2"
                  data-testid="patient-qr-share-btn"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  Udostępnij link
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyLink}
                  disabled={!canRenderQr}
                  className="w-full gap-2"
                  data-testid="patient-qr-copy-btn"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
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
                        data-testid="patient-qr-plan-select-root"
                        value={selectedPlan?.id}
                        onValueChange={setSelectedPlanId}
                      >
                        <SelectTrigger
                          data-testid="patient-qr-plan-select"
                          className="w-full bg-muted/30 border-border/50 text-xs"
                        >
                          <SelectValue placeholder="Wybierz plan" />
                        </SelectTrigger>
                        <SelectContent>
                          {plans.map((plan) => (
                            <SelectItem key={plan.id} value={plan.id}>
                              <div className="flex items-center gap-2">
                                {plan.isActive && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                                <span className="truncate max-w-[180px]">{plan.name}</span>
                                {!plan.isActive && <span className="text-muted-foreground">· nieaktywny</span>}
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
                      <DocumentPreview
                        exerciseCount={exerciseCount}
                        onClick={handlePreviewPDF}
                        disabled={!canGeneratePdf}
                      />
                    </div>

                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-1">
                      <Printer className="h-4 w-4 text-primary" />
                      Karta Pacjenta
                    </h3>
                    <p className="text-xs text-muted-foreground text-center max-w-[180px]">
                      {selectedPlan?.name || 'Wydruk A4 z Twoim logo.'}
                    </p>
                    {selectedPlan && !selectedPlan.isActive && (
                      <p className="text-xs text-muted-foreground mt-1" data-testid="patient-qr-plan-inactive">
                        Plan nieaktywny
                      </p>
                    )}
                    {selectedPlan && exerciseCount === 0 && (
                      <p className="text-xs text-muted-foreground mt-1" data-testid="patient-qr-plan-empty">
                        Wszystkie ćwiczenia są ukryte dla pacjenta
                      </p>
                    )}
                  </div>

                  {/* 3. AKCJE - identyczna struktura jak lewa */}
                  <div className="w-full pt-4 mt-auto space-y-2.5">
                    <Button
                      size="sm"
                      onClick={handlePrintCard}
                      disabled={!canGeneratePdf}
                      className="w-full gap-2"
                      data-testid="patient-qr-print-btn"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      {isGeneratingPDF ? 'Generowanie...' : 'Drukuj Kartę'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDownloadPDF}
                      disabled={!canGeneratePdf}
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

                    <h3 className="text-sm font-bold text-muted-foreground mb-1">Brak aktywnego planu</h3>
                    <p className="text-xs text-muted-foreground max-w-[180px]">
                      Personalizuj i przypisz zestaw, aby wygenerować kartę.
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
                      Personalizuj i przypisz
                    </Button>
                    <Button
                      data-testid="patient-qr-create-plan-placeholder-btn"
                      variant="ghost"
                      size="sm"
                      className="w-full gap-2 invisible"
                    >
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
              onClick={() => void handleDownloadQR()}
              disabled={!canRenderQr}
              className="text-xs text-muted-foreground"
              data-testid="patient-qr-download-btn"
            >
              <Download className="h-3 w-3 mr-1.5" />
              Pobierz sam kod QR
            </Button>
          </div>
        </div>

        {/* Ukryty QR Code Canvas do generowania obrazu dla PDF */}
        {canRenderQr && joinUrl && (
          <div ref={qrCanvasRef} className="hidden" data-testid="patient-qr-payload" data-qr-url={joinUrl}>
            <QRCodeCanvas value={joinUrl} size={200} level="M" />
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t border-border">
          <Button variant="ghost" onClick={() => onOpenChange(false)} data-testid="patient-qr-close-btn">
            Zamknij
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
