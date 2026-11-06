'use client';

import { useState, useRef, useCallback } from 'react';
import { useQuery } from '@apollo/client/react';
import { useUser } from '@clerk/nextjs';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import { CheckCircle2, Download, Printer, ChevronDown, Copy, Check, Smartphone, Share2, Calendar, Sparkles, User, Users, FileText, QrCode } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScheduleSummary } from '@/components/shared';
import { toast } from 'sonner';

import { buildPatientCardPdf } from '@/components/pdf/patientCardPdf';
import { downloadBlob, openPendingWindow, PRINT_UNAVAILABLE_MESSAGE, showPdfInWindow } from '@/components/pdf/pdfOutput';
import { downloadQrSvgAsPng } from '@/lib/qrPng';

import { GET_ORGANIZATION_BY_ID_QUERY } from '@/graphql/queries/organizations.queries';
import { GET_USER_BY_CLERK_ID_QUERY } from '@/graphql/queries/users.queries';
import { isHttpsUrl, tryBuildPatientConnectUrl } from '@/lib/patientJoinUrl';
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
  /** `exerciseOverrides` przypisania (personalizacja, ukrycie) po id mappingów z `exerciseSet` */
  exerciseOverrides?: string | null;
  /** Częstotliwość ćwiczeń */
  frequency?: Frequency;
  /** Data startu planu pacjenta */
  startDate?: Date;
  /** Data końca planu pacjenta */
  endDate?: Date;
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
  exerciseOverrides,
  frequency,
  startDate,
  endDate,
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
  const joinUrl = tryBuildPatientConnectUrl({
    patientId: selectedPatient?.id,
    organizationId,
    therapistId,
  });
  const canRenderQr = isHttpsUrl(joinUrl);

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

  const premiumDate = premiumValidUntil ? new Date(premiumValidUntil) : null;
  const formattedPremiumDate = premiumDate ? format(premiumDate, 'd MMMM yyyy', { locale: pl }) : null;

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
      await downloadQrSvgAsPng(svg, `QR-${selectedPatient.name.replaceAll(/\s+/g, '-')}.png`);
      toast.success('QR kod pobrany');
    } catch (error) {
      toast.error('Nie udało się pobrać kodu QR', {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const runPdfAction = async (action: (pdf: { blob: Blob; fileName: string }) => void, pending: Window | null = null) => {
    if (!organization || !exerciseSet) {
      pending?.close();
      toast.error('Brak danych do wygenerowania PDF');
      return;
    }
    setIsGeneratingPDF(true);
    try {
      action(
        await buildPatientCardPdf({
          organization,
          patient: selectedPatient,
          therapistName: therapistUser?.fullname,
          plan: {
            id: exerciseSet.id,
            name: setName || exerciseSet.name,
            description: exerciseSet.description,
            exerciseMappings: exerciseSet.exerciseMappings,
            exerciseOverrides,
            frequency,
            startDate: startDate?.toISOString(),
            endDate: endDate?.toISOString(),
          },
          qrCodeDataUrl: getQRCodeDataUrl(),
          joinUrl: joinUrl ?? undefined,
        })
      );
    } catch (error) {
      pending?.close();
      const message = error instanceof Error ? error.message : 'Nieznany błąd';
      toast.error('Nie udało się wygenerować PDF', { description: message });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Karta otwarta w geście kliknięcia; `window.open` po await blokuje popup blocker.
  const handlePrintCard = () => {
    const pending = openPendingWindow();
    void runPdfAction(({ blob, fileName }) => {
      const onPrintUnavailable = () => toast.info(PRINT_UNAVAILABLE_MESSAGE);
      if (showPdfInWindow(blob, pending, fileName, { print: true, onPrintUnavailable }) === 'downloaded') {
        toast.info('Przeglądarka zablokowała nową kartę - pobrano PDF, otwórz i wydrukuj');
      }
    }, pending);
  };

  const handleDownloadPDF = () =>
    runPdfAction(({ blob, fileName }) => {
      downloadBlob(blob, fileName);
      toast.success('PDF pobrany');
    });

  const handleShare = async () => {
    if (!joinUrl) {
      toast.error('Brak kompletnego linku do aplikacji');
      return;
    }
    if (navigator.share) {
      try {
        await navigator.share({
          title: `FiziYo - Program ćwiczeń dla ${selectedPatient.name}`,
          text: 'Zeskanuj kod QR lub kliknij link, aby połączyć się z aplikacją FiziYo',
          url: joinUrl ?? undefined,
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
          <div className="rounded-xl border border-border/60 bg-surface/40 p-4">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 shrink-0 rounded-full bg-surface-light border border-border flex items-center justify-center">
                {isSinglePatient ? (
                  <User className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Users className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-[11px] font-medium uppercase tracking-wide text-text-tertiary">
                  {isSinglePatient ? 'Pacjent' : 'Pacjenci'}
                </p>
                <p
                  className="truncate text-sm font-semibold text-foreground"
                  title={isSinglePatient ? selectedPatient.name : `${patients.length} pacjentów`}
                >
                  {isSinglePatient ? selectedPatient.name : `${patients.length} pacjentów`}
                </p>
                <div className="flex items-center gap-1.5 pt-1 text-sm text-muted-foreground">
                  <FileText className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate" title={setName}>
                    {setName}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {frequency && startDate && endDate && (
            <ScheduleSummary
              startDate={startDate}
              endDate={endDate}
              frequency={frequency}
              variant="card"
              showSessions
              testIdPrefix="assign-success"
            />
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
                  data-testid={`assign-success-patient-${patient.id}`}
                >
                  {patient.name}
                </Button>
              ))}
            </div>
          )}

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

          <div className="flex flex-col items-center rounded-xl bg-surface/50 p-5 border border-border/60">
            {canRenderQr && joinUrl ? (
              <div
                ref={qrContainerRef}
                className="p-3 bg-white rounded-xl shadow-sm border border-border/40"
                data-testid="assign-success-qr"
                data-qr-url={joinUrl}
              >
                <QRCodeSVG
                  value={joinUrl}
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
            ) : (
              <div
                className="flex h-[144px] w-[144px] flex-col items-center justify-center rounded-xl border border-border/40 bg-surface-light px-3 text-center"
                data-testid="assign-success-qr-unavailable"
              >
                <QrCode className="h-6 w-6 text-muted-foreground" />
                <p className="mt-2 text-xs text-muted-foreground">Brak pacjenta albo terapeuty</p>
              </div>
            )}
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-border bg-surface-light px-3 py-1.5 text-sm font-medium text-foreground">
              <Smartphone className="h-4 w-4 text-muted-foreground" />
              Aplikacja mobilna
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                disabled={!canRenderQr}
                data-testid="assign-success-copy-link-btn"
              >
                {copied ? <Check className="h-3.5 w-3.5 mr-1.5 text-primary" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
                {copied ? 'Skopiowano link' : 'Kopiuj link'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
                disabled={!canRenderQr}
                data-testid="assign-success-share-btn"
              >
                <Share2 className="h-3.5 w-3.5 mr-1.5" />
                Udostępnij link
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadPDF}
                disabled={isGeneratingPDF || !organization || !exerciseSet}
                data-testid="assign-success-download-pdf-btn"
              >
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Pobierz PDF
              </Button>
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
                  disabled={!canRenderQr}
                  className="justify-start text-xs text-muted-foreground h-8"
                  data-testid="assign-success-copy-btn"
                >
                  {copied ? <Check className="h-3 w-3 mr-1.5 text-primary" /> : <Copy className="h-3 w-3 mr-1.5" />}
                  {copied ? 'Skopiowano link' : 'Kopiuj link'}
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
                  onClick={() => void handleDownloadQR()}
                  disabled={!canRenderQr}
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

        {canRenderQr && joinUrl && (
          <div ref={qrCanvasRef} className="hidden" data-testid="assign-success-qr-payload" data-qr-url={joinUrl}>
            <QRCodeCanvas value={joinUrl} size={200} level="M" />
          </div>
        )}

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
                <Sparkles className="h-4 w-4 mr-1.5" />
                Personalizuj kolejny zestaw
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
