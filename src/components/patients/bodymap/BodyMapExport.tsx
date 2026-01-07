'use client';

import { useState, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import {
  Download,
  FileImage,
  FileText,
  Printer,
  Loader2,
  Check,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

import type { PainSession, BodyView } from '@/types/painMap';
import { PAIN_TYPES, ANATOMICAL_REGIONS, PAIN_INTENSITY_COLORS } from './BodyMapRegions';

interface BodyMapExportProps {
  session: PainSession;
  patientName?: string;
  therapistName?: string;
  onExportComplete?: (format: 'png' | 'pdf') => void;
}

interface ExportOptions {
  includeAllViews: boolean;
  includeNotes: boolean;
  includeLegend: boolean;
  includePatientInfo: boolean;
}

export function BodyMapExport({
  session,
  patientName,
  therapistName,
  onExportComplete,
}: BodyMapExportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [options, setOptions] = useState<ExportOptions>({
    includeAllViews: true,
    includeNotes: true,
    includeLegend: true,
    includePatientInfo: true,
  });

  const handleExport = useCallback(
    async (exportFormat: 'png' | 'pdf') => {
      setIsExporting(true);
      setExportSuccess(false);

      try {
        // Create a canvas element to render the body map
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas not supported');

        // Set canvas dimensions
        const width = 800;
        const height = options.includeAllViews ? 1200 : 600;
        canvas.width = width;
        canvas.height = height;

        // Fill background
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, width, height);

        // Draw header
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px system-ui';
        ctx.fillText('Mapa Bólu - Raport', 40, 50);

        ctx.font = '14px system-ui';
        ctx.fillStyle = '#9ca3af';
        ctx.fillText(
          `Data: ${format(new Date(session.date), 'd MMMM yyyy, HH:mm', { locale: pl })}`,
          40,
          80
        );

        if (options.includePatientInfo && patientName) {
          ctx.fillText(`Pacjent: ${patientName}`, 40, 100);
        }

        if (options.includePatientInfo && therapistName) {
          ctx.fillText(`Terapeuta: ${therapistName}`, 40, 120);
        }

        // Draw pain points summary
        let yOffset = 160;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px system-ui';
        ctx.fillText('Podsumowanie', 40, yOffset);

        yOffset += 30;
        ctx.font = '14px system-ui';
        ctx.fillStyle = '#9ca3af';
        ctx.fillText(`Liczba oznaczeń: ${session.painPoints.length + session.painAreas.length}`, 40, yOffset);

        // Calculate average intensity
        const allIntensities = [
          ...session.painPoints.map((p) => p.intensity),
          ...session.painAreas.map((a) => a.intensity),
        ];
        const avgIntensity = allIntensities.length > 0
          ? (allIntensities.reduce((a, b) => a + b, 0) / allIntensities.length).toFixed(1)
          : '0';

        yOffset += 20;
        ctx.fillText(`Średnia intensywność: ${avgIntensity}/10`, 40, yOffset);

        // Draw affected regions
        const affectedRegions = new Set<string>();
        session.painPoints.forEach((p) => p.region && affectedRegions.add(p.region));
        session.painAreas.forEach((a) => affectedRegions.add(a.regionId));

        if (affectedRegions.size > 0) {
          yOffset += 30;
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 16px system-ui';
          ctx.fillText('Dotknięte regiony', 40, yOffset);

          yOffset += 25;
          ctx.font = '12px system-ui';
          ctx.fillStyle = '#9ca3af';

          const regionNames = Array.from(affectedRegions)
            .map((r) => ANATOMICAL_REGIONS[r as keyof typeof ANATOMICAL_REGIONS]?.namePolish || r)
            .join(', ');

          // Word wrap for region names
          const words = regionNames.split(', ');
          let line = '';
          for (const word of words) {
            const testLine = line + (line ? ', ' : '') + word;
            if (ctx.measureText(testLine).width > width - 80) {
              ctx.fillText(line, 40, yOffset);
              yOffset += 18;
              line = word;
            } else {
              line = testLine;
            }
          }
          if (line) {
            ctx.fillText(line, 40, yOffset);
            yOffset += 18;
          }
        }

        // Draw legend if enabled
        if (options.includeLegend) {
          yOffset += 30;
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 16px system-ui';
          ctx.fillText('Legenda typów bólu', 40, yOffset);

          yOffset += 25;
          let xOffset = 40;

          Object.values(PAIN_TYPES).forEach((painType) => {
            // Draw color circle
            ctx.beginPath();
            ctx.arc(xOffset + 8, yOffset - 4, 8, 0, Math.PI * 2);
            ctx.fillStyle = painType.color;
            ctx.fill();

            // Draw label
            ctx.fillStyle = '#ffffff';
            ctx.font = '12px system-ui';
            ctx.fillText(painType.labelPolish, xOffset + 22, yOffset);

            xOffset += 120;
            if (xOffset > width - 100) {
              xOffset = 40;
              yOffset += 25;
            }
          });
        }

        // Draw notes if enabled
        if (options.includeNotes && session.notes) {
          yOffset += 40;
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 16px system-ui';
          ctx.fillText('Notatki', 40, yOffset);

          yOffset += 25;
          ctx.font = '12px system-ui';
          ctx.fillStyle = '#9ca3af';

          // Word wrap notes
          const noteWords = session.notes.split(' ');
          let noteLine = '';
          for (const word of noteWords) {
            const testLine = noteLine + (noteLine ? ' ' : '') + word;
            if (ctx.measureText(testLine).width > width - 80) {
              ctx.fillText(noteLine, 40, yOffset);
              yOffset += 18;
              noteLine = word;
            } else {
              noteLine = testLine;
            }
          }
          if (noteLine) {
            ctx.fillText(noteLine, 40, yOffset);
          }
        }

        // Generate filename
        const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm');
        const filename = `mapa-bolu_${patientName?.replace(/\s+/g, '-') || 'pacjent'}_${timestamp}`;

        if (exportFormat === 'png') {
          // Export as PNG
          const link = document.createElement('a');
          link.download = `${filename}.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
        } else {
          // For PDF, we'd need a library like jsPDF
          // For now, we'll just export as PNG with a note
          toast.info('Eksport PDF wymaga dodatkowej biblioteki. Eksportuję jako PNG.');
          const link = document.createElement('a');
          link.download = `${filename}.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
        }

        setExportSuccess(true);
        onExportComplete?.(exportFormat);
        toast.success(`Wyeksportowano mapę bólu jako ${exportFormat.toUpperCase()}`);

        // Reset success state after delay
        setTimeout(() => {
          setExportSuccess(false);
          setIsOpen(false);
        }, 1500);
      } catch (error) {
        console.error('Export error:', error);
        toast.error('Wystąpił błąd podczas eksportu');
      } finally {
        setIsExporting(false);
      }
    },
    [session, patientName, therapistName, options, onExportComplete]
  );

  const handlePrint = useCallback(() => {
    // Open print dialog with the current view
    window.print();
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Eksportuj
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DialogTrigger asChild>
            <DropdownMenuItem>
              <FileImage className="mr-2 h-4 w-4" />
              Eksportuj jako obraz
            </DropdownMenuItem>
          </DialogTrigger>
          <DropdownMenuItem onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Drukuj
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Eksportuj mapę bólu</DialogTitle>
          <DialogDescription>
            Wybierz opcje eksportu i format pliku.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Export options */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="includeAllViews" className="text-sm">
                Uwzględnij wszystkie widoki
              </Label>
              <Switch
                id="includeAllViews"
                checked={options.includeAllViews}
                onCheckedChange={(checked) =>
                  setOptions((prev) => ({ ...prev, includeAllViews: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="includeNotes" className="text-sm">
                Uwzględnij notatki
              </Label>
              <Switch
                id="includeNotes"
                checked={options.includeNotes}
                onCheckedChange={(checked) =>
                  setOptions((prev) => ({ ...prev, includeNotes: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="includeLegend" className="text-sm">
                Uwzględnij legendę
              </Label>
              <Switch
                id="includeLegend"
                checked={options.includeLegend}
                onCheckedChange={(checked) =>
                  setOptions((prev) => ({ ...prev, includeLegend: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="includePatientInfo" className="text-sm">
                Uwzględnij dane pacjenta
              </Label>
              <Switch
                id="includePatientInfo"
                checked={options.includePatientInfo}
                onCheckedChange={(checked) =>
                  setOptions((prev) => ({ ...prev, includePatientInfo: checked }))
                }
              />
            </div>
          </div>

          {/* Export buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={() => handleExport('png')}
              disabled={isExporting}
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : exportSuccess ? (
                <Check className="h-4 w-4 text-primary" />
              ) : (
                <FileImage className="h-4 w-4" />
              )}
              PNG
            </Button>
            <Button
              className="flex-1 gap-2"
              onClick={() => handleExport('pdf')}
              disabled={isExporting}
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : exportSuccess ? (
                <Check className="h-4 w-4" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}






