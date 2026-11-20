'use client';

import { Copy } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ShareSheetProps {
  url: string;
  role: string;
  expiresAt: string;
}

const roleLabels: Record<string, string> = {
  OWNER: 'Właściciel',
  ADMIN: 'Administrator',
  THERAPIST: 'Fizjoterapeuta',
  STAFF: 'Personel',
};

export function ShareSheet({ url, role, expiresAt }: ShareSheetProps) {
  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link skopiowany do schowka');
    } catch {
      toast.error('Nie udało się skopiować linku. Możesz zaznaczyć adres i skopiować go ręcznie.');
    }
  }

  const formattedExpiry = new Date(expiresAt).toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="@container rounded-xl border border-border/60 bg-surface p-4 sm:p-5" data-testid="org-share-sheet">
      <h3 className="text-base font-semibold text-foreground">Udostępnij zaproszenie</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {roleLabels[role.toUpperCase()] || role} • Ważne do {formattedExpiry}
      </p>

      <div className="mt-4 flex flex-col gap-4 @min-[26rem]:flex-row @min-[26rem]:items-center">
        <figure className="flex shrink-0 flex-col items-center gap-2">
          <QRCodeSVG
            value={url}
            size={176}
            level="M"
            marginSize={4}
            className="h-auto max-w-full rounded-lg"
            aria-label="Kod QR zaproszenia"
            data-testid="org-share-qr"
          />
          <figcaption className="text-center text-xs text-muted-foreground">Zeskanuj kod QR telefonem</figcaption>
        </figure>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Input
            aria-label="Link zaproszenia"
            value={url}
            readOnly
            className="min-w-0 text-ellipsis font-mono focus:text-clip"
            data-testid="org-share-url-input"
          />
          <Button variant="outline" onClick={handleCopyLink} className="self-start" data-testid="org-share-copy-url-btn">
            <Copy className="h-4 w-4" />
            Kopiuj link
          </Button>
        </div>
      </div>
    </div>
  );
}
