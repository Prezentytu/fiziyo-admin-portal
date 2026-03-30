'use client';

import { useState, useEffect, useMemo } from 'react';
import { useMutation } from '@apollo/client/react';
import { Mail, Phone, User, Loader2, Copy, Check, Link2, Ticket, QrCode, Send } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { CREATE_PATIENT_INVITE_LINK_MUTATION } from '@/graphql/mutations';
import { GET_PATIENT_INVITE_LINKS_QUERY } from '@/graphql/queries';
import type { CreatePatientInviteLinkResponse } from '@/types/apollo';

// ========================================
// Types
// ========================================

interface PatientInviteDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly organizationId?: string;
}

// ========================================
// Helper Components
// ========================================

function SendButtonLabel({ sendMode }: { readonly sendMode: 'email' | 'sms' | null }) {
  if (sendMode === 'email') return <>Wyślij email</>;
  if (sendMode === 'sms') return <>Wyślij SMS</>;
  return <>Wpisz dane kontaktowe</>;
}

function resolveSendMode(hasValidEmail: boolean, hasValidPhone: boolean): 'email' | 'sms' | null {
  if (hasValidEmail) {
    return 'email';
  }

  if (hasValidPhone) {
    return 'sms';
  }

  return null;
}

// ========================================
// Component
// ========================================

export function PatientInviteDialog({ open, onOpenChange, organizationId }: PatientInviteDialogProps) {
  // State
  const [activeTab, setActiveTab] = useState('link');
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [patientName, setPatientName] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [sendSuccess, setSendSuccess] = useState(false);
  const [sentTo, setSentTo] = useState('');

  // Personalized link with name parameter
  const personalizedLink = useMemo(() => {
    if (!generatedLink) return '';
    if (!patientName.trim()) return generatedLink;
    try {
      const url = new URL(generatedLink);
      url.searchParams.set('name', patientName.trim());
      return url.toString();
    } catch {
      return generatedLink;
    }
  }, [generatedLink, patientName]);

  const normalizedEmail = patientEmail.trim();
  const normalizedPhone = patientPhone.trim();
  const hasValidEmail = normalizedEmail.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
  const phoneDigits = normalizedPhone.replaceAll(/\D/g, '');
  const hasValidPhone = phoneDigits.length >= 9;
  const sendMode = resolveSendMode(hasValidEmail, hasValidPhone);

  // Create invite mutation
  const [createInvite, { loading }] = useMutation<CreatePatientInviteLinkResponse>(
    CREATE_PATIENT_INVITE_LINK_MUTATION,
    {
      refetchQueries: [
        {
          query: GET_PATIENT_INVITE_LINKS_QUERY,
          variables: { organizationId, limit: 20 },
        },
      ],
      onCompleted: (data) => {
        if (data.createPatientInviteLink.success) {
          const url = data.createPatientInviteLink.fullUrl;
          setGeneratedLink(url || null);
        } else {
          toast.error('Nie udało się utworzyć zaproszenia');
        }
      },
      onError: (error) => {
        toast.error(`Błąd: ${error.message}`);
      },
    }
  );

  // Auto-generate link on open
  useEffect(() => {
    if (open && !generatedLink && organizationId) {
      createInvite({
        variables: {
          organizationId,
          patientName: null,
          patientEmail: null,
          patientPhone: null,
          linkType: 'qr',
          expirationDays: 7,
        },
      });
    }
  }, [open, organizationId, generatedLink, createInvite]);

  // Handle copy link
  const handleCopyLink = async () => {
    const linkToCopy = personalizedLink || generatedLink;
    if (!linkToCopy) return;
    try {
      await navigator.clipboard.writeText(linkToCopy);
      setCopied(true);
      toast.success('Link skopiowany!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Nie udało się skopiować');
    }
  };

  // Handle send invite
  const handleSendInvite = async () => {
    if (!organizationId || !sendMode) return;

    try {
      await createInvite({
        variables: {
          organizationId,
          patientName: patientName || null,
          patientEmail: sendMode === 'email' ? normalizedEmail : null,
          patientPhone: sendMode === 'sms' ? normalizedPhone : null,
          linkType: sendMode,
          expirationDays: 7,
        },
      });

      setSentTo(sendMode === 'email' ? normalizedEmail : normalizedPhone);
      setSendSuccess(true);

      // Auto-close after 1.5s
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch {
      toast.error('Nie udało się wysłać zaproszenia');
    }
  };

  // Handle close
  const handleClose = () => {
    setActiveTab('link');
    setGeneratedLink(null);
    setCopied(false);
    setPatientName('');
    setPatientEmail('');
    setPatientPhone('');
    setSendSuccess(false);
    setSentTo('');
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          handleClose();
        }
      }}
    >
      <DialogContent
        className="max-w-[95vw] sm:max-w-xl overflow-hidden"
        data-testid="invite-dialog"
      >
        <div className="flex items-start gap-4 rounded-xl border border-border/50 bg-linear-to-r from-primary/5 via-emerald-500/5 to-primary/5 p-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm">
            <Ticket className="h-6 w-6" />
          </div>
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle>Zaproś pacjenta</DialogTitle>
            <DialogDescription>
              Wygeneruj link, pokaż kod QR albo wyślij zaproszenie bezpośrednio do pacjenta.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Loading state */}
        {loading && !generatedLink ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground mt-3">Generuję link zaproszenia...</p>
          </div>
        ) : (
          /* Tabs */
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger
                value="link"
                className="gap-2"
                data-testid="invite-tab-link"
              >
                <Link2 className="h-4 w-4 shrink-0" />
                Link
              </TabsTrigger>
              <TabsTrigger
                value="qr"
                className="gap-2"
                data-testid="invite-tab-qr"
              >
                <QrCode className="h-4 w-4 shrink-0" />
                QR kod
              </TabsTrigger>
              <TabsTrigger
                value="send"
                className="gap-2"
                data-testid="invite-tab-send"
              >
                <Send className="h-4 w-4 shrink-0" />
                Wyślij
              </TabsTrigger>
            </TabsList>

            {/* Tab: Link */}
            <TabsContent value="link" className="mt-4 space-y-4">
              <div className="space-y-2">
                <label htmlFor="invite-name-input" className="text-sm text-muted-foreground">
                  Personalizacja
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="invite-name-input"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="Imię pacjenta (opcjonalne)"
                    className="pl-10 h-11"
                    data-testid="invite-name-input"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Jeśli podasz imię, dodamy je do linku, żeby pacjent od razu widział bardziej osobiste zaproszenie.
                </p>
              </div>

              <div className="rounded-xl border border-border/60 bg-surface/50 p-4 space-y-3">
                <div className="relative">
                  <Input value={personalizedLink} readOnly className="pr-20 h-11 text-sm" data-testid="invite-link-display" />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    onClick={handleCopyLink}
                    data-testid="invite-copy-inline-btn"
                  >
                    {copied ? <Check className="h-4 w-4" /> : 'Kopiuj'}
                  </Button>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    Link otworzy ekran startowy pacjenta z dostępem do aktywacji Premium.
                  </p>
                  <Button onClick={handleCopyLink} className="shrink-0" data-testid="invite-copy-main-btn">
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Skopiowano
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Kopiuj link
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Tab: QR Code */}
            <TabsContent value="qr" className="mt-4">
              <div className="rounded-xl border border-border/60 bg-surface/50 p-5">
                <div className="flex flex-col items-center gap-4">
                  <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5" data-testid="invite-qr-code">
                    <QRCodeSVG
                      value={personalizedLink || 'https://fiziyo.app/invite'}
                      size={200}
                      level="H"
                      imageSettings={{
                        src: '/images/logo_new.png',
                        x: undefined,
                        y: undefined,
                        height: 40,
                        width: 40,
                        excavate: true,
                      }}
                    />
                  </div>
                  <div className="space-y-1 text-center">
                    <p className="text-sm font-medium text-foreground">Pokaż pacjentowi kod do zeskanowania</p>
                    <p className="text-xs text-muted-foreground">
                      Kod prowadzi do tego samego linku co zakładka `Link`, więc możesz wygodnie przełączać kanał przekazania.
                    </p>
                  </div>
                  <div className="w-full flex items-center justify-between gap-3 border-t border-border/50 pt-4">
                    <p className="text-xs text-muted-foreground">Jeśli pacjent jest z Tobą w gabinecie, QR zwykle daje najmniejsze tarcie.</p>
                    <Button variant="outline" onClick={handleCopyLink}>
                      <Copy className="h-4 w-4 mr-2" />
                      Kopiuj link
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Tab: Send */}
            <TabsContent value="send" className="mt-4">
              {sendSuccess ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-primary/20 bg-primary/5 px-6 py-10" data-testid="invite-success-view">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
                    <Check className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Zaproszenie wysłane</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Zaproszenie zostało wysłane do {sentTo}</p>
                </div>
              ) : (
                <div className="space-y-4 rounded-xl border border-border/60 bg-surface/50 p-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">Wyślij zaproszenie bezpośrednio</p>
                    <p className="text-xs text-muted-foreground">
                      Wybierz jeden kanał kontaktu. Gdy wpiszesz email, pole telefonu zostanie wyłączone i odwrotnie.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className={`relative transition-opacity duration-200 ${normalizedPhone ? 'opacity-50' : 'opacity-100'}`}>
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="email"
                        value={patientEmail}
                        onChange={(e) => {
                          setPatientEmail(e.target.value);
                          if (e.target.value) setPatientPhone('');
                        }}
                        placeholder="Adres email pacjenta"
                        className="pl-10 h-11"
                        data-testid="invite-email-input"
                      />
                    </div>

                    <div className={`relative transition-opacity duration-200 ${normalizedEmail ? 'opacity-50' : 'opacity-100'}`}>
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="tel"
                        value={patientPhone}
                        onChange={(e) => {
                          setPatientPhone(e.target.value);
                          if (e.target.value) setPatientEmail('');
                        }}
                        placeholder="Numer telefonu (np. 500 600 700)"
                        className="pl-10 h-11"
                        data-testid="invite-phone-input"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 border-t border-border/50 pt-4">
                    <Button variant="outline" onClick={handleClose}>
                      Anuluj
                    </Button>
                    <Button onClick={handleSendInvite} disabled={!sendMode || loading} data-testid="invite-send-btn">
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          <SendButtonLabel sendMode={sendMode} />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
