'use client';

import { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Download,
  Printer,
  Copy,
  Check,
  Smartphone,
  QrCode,
  Share2,
  ChevronRight,
  X,
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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
}

export function PatientQRCodeDialog({
  open,
  onOpenChange,
  patient,
  therapistId,
  organizationId,
}: PatientQRCodeDialogProps) {
  const [copied, setCopied] = useState(false);
  const qrContainerRef = useRef<HTMLDivElement>(null);

  if (!patient) return null;

  // Generowanie linku do aplikacji pacjenta
  // Format: fiziyo://connect?patient={patientId}&therapist={therapistId}&org={orgId}
  const appDeepLink = `fiziyo://connect?patient=${patient.id}&therapist=${therapistId}&org=${organizationId}`;

  // Alternatywny link webowy (dla uniwersalnych linków)
  const webLink = `https://app.fiziyo.pl/connect?patient=${patient.id}&therapist=${therapistId}&org=${organizationId}`;

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

    // Tworzenie canvas z SVG
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();

    canvas.width = 400;
    canvas.height = 400;

    img.onload = () => {
      if (ctx) {
        // Białe tło
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Pobieranie jako PNG
        const pngUrl = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.href = pngUrl;
        downloadLink.download = `QR-${patient.name.replace(/\s+/g, '-')}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

        toast.success('QR kod pobrany');
      }
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
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
          <title>QR kod - ${patient.name}</title>
          <style>
            @page {
              size: A4;
              margin: 2cm;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              margin: 0;
              padding: 40px;
              display: flex;
              flex-direction: column;
              align-items: center;
              min-height: 100vh;
              box-sizing: border-box;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo {
              font-size: 28px;
              font-weight: 700;
              color: #32965d;
              margin-bottom: 8px;
            }
            .title {
              font-size: 22px;
              font-weight: 600;
              margin-bottom: 4px;
            }
            .subtitle {
              font-size: 14px;
              color: #666;
            }
            .qr-container {
              background: white;
              padding: 24px;
              border-radius: 16px;
              box-shadow: 0 4px 20px rgba(0,0,0,0.1);
              margin-bottom: 30px;
            }
            .qr-container svg {
              display: block;
            }
            .patient-name {
              text-align: center;
              font-size: 18px;
              font-weight: 600;
              margin-bottom: 24px;
              color: #333;
            }
            .instructions {
              max-width: 400px;
              background: #f8f9fa;
              border-radius: 12px;
              padding: 24px;
              margin-top: 20px;
            }
            .instructions h3 {
              font-size: 16px;
              font-weight: 600;
              margin: 0 0 16px 0;
              color: #333;
            }
            .step {
              display: flex;
              align-items: flex-start;
              gap: 12px;
              margin-bottom: 12px;
            }
            .step-number {
              width: 24px;
              height: 24px;
              background: #32965d;
              color: white;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 12px;
              font-weight: 600;
              flex-shrink: 0;
            }
            .step-text {
              font-size: 14px;
              color: #555;
              line-height: 1.5;
            }
            .app-stores {
              display: flex;
              gap: 12px;
              justify-content: center;
              margin-top: 24px;
            }
            .store-badge {
              height: 40px;
            }
            .footer {
              margin-top: auto;
              padding-top: 30px;
              text-align: center;
              font-size: 12px;
              color: #888;
            }
            @media print {
              body { padding: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">FiziYo</div>
            <div class="title">Twój program ćwiczeń</div>
            <div class="subtitle">Zeskanuj kod QR, aby rozpocząć</div>
          </div>

          <div class="qr-container">
            ${svgData}
          </div>

          <div class="patient-name">${patient.name}</div>

          <div class="instructions">
            <h3>📱 Jak zacząć?</h3>
            <div class="step">
              <div class="step-number">1</div>
              <div class="step-text">Pobierz aplikację <strong>FiziYo</strong> ze sklepu App Store lub Google Play</div>
            </div>
            <div class="step">
              <div class="step-number">2</div>
              <div class="step-text">Otwórz aplikację i zeskanuj kod QR powyżej</div>
            </div>
            <div class="step">
              <div class="step-number">3</div>
              <div class="step-text">Automatycznie połączysz się z terapeutą i otrzymasz swój program ćwiczeń</div>
            </div>
          </div>

          <div class="footer">
            Wygenerowano w FiziYo Admin • fiziyo.pl
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    // Poczekaj na załadowanie i drukuj
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `FiziYo - Program ćwiczeń dla ${patient.name}`,
          text: 'Zeskanuj kod QR lub kliknij link, aby połączyć się z aplikacją FiziYo',
          url: webLink,
        });
      } catch {
        // User cancelled or error
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" data-testid="patient-qr-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            QR kod dla pacjenta
          </DialogTitle>
          <DialogDescription>
            Pacjent może zeskanować ten kod aparatem, aby połączyć się z aplikacją FiziYo
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* QR Code */}
          <div
            ref={qrContainerRef}
            className="mx-auto flex flex-col items-center"
          >
            <div className="rounded-2xl bg-white p-5 shadow-lg ring-1 ring-border/10">
              <QRCodeSVG
                value={appDeepLink}
                size={200}
                level="H"
                includeMargin={false}
                bgColor="#ffffff"
                fgColor="#121212"
                imageSettings={{
                  src: "/images/icon.png",
                  height: 40,
                  width: 40,
                  excavate: true,
                }}
              />
            </div>
            <p className="mt-3 text-sm font-medium text-foreground">{patient.name}</p>
            {patient.email && (
              <p className="text-xs text-muted-foreground">{patient.email}</p>
            )}
          </div>

          {/* Instructions */}
          <div className="rounded-xl border border-border/60 bg-surface p-4 space-y-3">
            <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-primary" />
              Instrukcja dla pacjenta
            </h4>
            <div className="space-y-2">
              {[
                'Pobierz aplikację FiziYo (App Store / Google Play)',
                'Otwórz aparat i zeskanuj kod QR',
                'Gotowe! Ćwiczenia są już w aplikacji',
              ].map((step, index) => (
                <div key={index} className="flex items-center gap-3 text-sm">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                    {index + 1}
                  </div>
                  <span className="text-muted-foreground">{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={handleDownloadQR}
              className="gap-2"
              data-testid="patient-qr-download-btn"
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

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={handleCopyLink}
              className="gap-2"
              data-testid="patient-qr-copy-btn"
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
      </DialogContent>
    </Dialog>
  );
}
