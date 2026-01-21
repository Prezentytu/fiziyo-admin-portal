'use client';

import { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
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
  therapistId: string;
  /** ID organizacji (dla QR) */
  organizationId: string;
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
  onAssignAnother,
}: AssignmentSuccessDialogProps) {
  const [copied, setCopied] = useState(false);
  const [selectedPatientIndex, setSelectedPatientIndex] = useState(0);
  const qrContainerRef = useRef<HTMLDivElement>(null);

  const selectedPatient = patients[selectedPatientIndex];
  const isSinglePatient = patients.length === 1;

  if (!selectedPatient) return null;

  // Generowanie linku do aplikacji pacjenta
  const appDeepLink = `fiziyo://connect?patient=${selectedPatient.id}&therapist=${therapistId}&org=${organizationId}`;
  const webLink = `https://app.fiziyo.pl/connect?patient=${selectedPatient.id}&therapist=${therapistId}&org=${organizationId}`;

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
        downloadLink.download = `QR-${selectedPatient.name.replace(/\s+/g, '-')}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

        toast.success('QR kod pobrany');
      }
    };

    // Convert SVG to base64 without deprecated unescape
    const encoder = new TextEncoder();
    const data = encoder.encode(svgData);
    const base64 = btoa(String.fromCharCode(...data));
    img.src = 'data:image/svg+xml;base64,' + base64;
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Nie można otworzyć okna drukowania');
      return;
    }

    const svg = qrContainerRef.current?.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR kod - ${selectedPatient.name}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              margin: 0;
              padding: 40px;
              display: flex;
              flex-direction: column;
              align-items: center;
            }
            .header { text-align: center; margin-bottom: 24px; }
            .logo-text { font-size: 24px; font-weight: 700; color: #32965d; }
            .title { font-size: 18px; margin-bottom: 4px; }
            .qr-container { background: white; padding: 20px; border-radius: 16px; margin-bottom: 20px; }
            .patient-name { font-size: 16px; font-weight: 600; margin-bottom: 16px; }
            .premium-info { background: #f0fdf4; padding: 12px 16px; border-radius: 8px; color: #166534; font-size: 14px; }
            .instructions { max-width: 350px; margin-top: 24px; }
            .step { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 8px; }
            .step-number { width: 20px; height: 20px; background: #32965d; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; flex-shrink: 0; }
            .step-text { font-size: 13px; color: #555; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo-text">FiziYo</div>
            <div class="title">Twój program ćwiczeń</div>
          </div>
          <div class="qr-container">${svgData}</div>
          <div class="patient-name">${selectedPatient.name}</div>
          ${formattedPremiumDate ? `<div class="premium-info">✨ Dostęp aktywny do ${formattedPremiumDate}</div>` : ''}
          <div class="instructions">
            <div class="step"><div class="step-number">1</div><div class="step-text">Pobierz aplikację FiziYo</div></div>
            <div class="step"><div class="step-number">2</div><div class="step-text">Zeskanuj kod QR</div></div>
            <div class="step"><div class="step-number">3</div><div class="step-text">Zacznij ćwiczyć!</div></div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

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
      <DialogContent className="sm:max-w-lg" data-testid="assign-success-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-primary" />
            </div>
            Zestaw przypisany!
          </DialogTitle>
          <DialogDescription>
            {isSinglePatient
              ? `Pacjent ${selectedPatient.name} otrzymał zestaw "${setName}"`
              : `${patients.length} pacjentów otrzymało zestaw "${setName}"`}
          </DialogDescription>
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

          {/* QR Code */}
          <div ref={qrContainerRef} className="mx-auto flex flex-col items-center">
            <div className="rounded-2xl bg-white p-4 shadow-lg ring-1 ring-border/10">
              <QRCodeSVG
                value={appDeepLink}
                size={180}
                level="H"
                includeMargin={false}
                bgColor="#ffffff"
                fgColor="#121212"
                imageSettings={{
                  src: '/images/icon.png',
                  height: 36,
                  width: 36,
                  excavate: true,
                }}
              />
            </div>
            <p className="mt-3 text-sm font-medium text-foreground">{selectedPatient.name}</p>
            {selectedPatient.email && (
              <p className="text-xs text-muted-foreground">{selectedPatient.email}</p>
            )}
          </div>

          {/* Instructions */}
          <div className="rounded-xl border border-border/60 bg-surface p-4 space-y-2">
            <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-primary" />
              Instrukcja dla pacjenta
            </h4>
            <div className="space-y-1.5">
              {[
                'Pobierz aplikację FiziYo',
                'Zeskanuj kod QR aparatem',
                'Zacznij ćwiczyć!',
              ].map((step, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                    {index + 1}
                  </div>
                  <span className="text-muted-foreground">{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={handleDownloadQR}
              className="gap-2"
              data-testid="assign-success-download-btn"
            >
              <Download className="h-4 w-4" />
              Pobierz QR
            </Button>
            <Button
              variant="outline"
              onClick={handlePrint}
              className="gap-2"
            >
              <Printer className="h-4 w-4" />
              Drukuj
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={handleCopyLink}
              className="gap-2"
              data-testid="assign-success-copy-btn"
            >
              {copied ? (
                <Check className="h-4 w-4 text-primary" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {copied ? 'Skopiowano!' : 'Kopiuj link'}
            </Button>
            <Button
              variant="outline"
              onClick={handleShare}
              className="gap-2"
            >
              <Share2 className="h-4 w-4" />
              Udostępnij
            </Button>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex justify-between pt-2 border-t border-border">
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
              data-testid="assign-success-another-btn"
            >
              Przypisz kolejnemu
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
