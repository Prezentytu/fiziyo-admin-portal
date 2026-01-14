"use client";

import { useState, useEffect, useMemo } from "react";
import { useMutation } from "@apollo/client/react";
import {
  Mail,
  Phone,
  User,
  Loader2,
  Copy,
  Check,
  Link2,
  X,
  Ticket,
  QrCode,
  Send,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { CREATE_PATIENT_INVITE_LINK_MUTATION } from "@/graphql/mutations";
import { GET_PATIENT_INVITE_LINKS_QUERY } from "@/graphql/queries";
import type { CreatePatientInviteLinkResponse } from "@/types/apollo";

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

function SendButtonLabel({
  email,
  phone,
}: {
  readonly email: string;
  readonly phone: string;
}) {
  if (email) return <>Wyślij Email</>;
  if (phone) return <>Wyślij SMS</>;
  return <>Wpisz dane kontaktowe</>;
}

// ========================================
// Component
// ========================================

export function PatientInviteDialog({
  open,
  onOpenChange,
  organizationId,
}: PatientInviteDialogProps) {
  // State
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [patientName, setPatientName] = useState("");
  const [patientEmail, setPatientEmail] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [sendSuccess, setSendSuccess] = useState(false);
  const [sentTo, setSentTo] = useState("");

  // Personalized link with name parameter
  const personalizedLink = useMemo(() => {
    if (!generatedLink) return "";
    if (!patientName.trim()) return generatedLink;
    try {
      const url = new URL(generatedLink);
      url.searchParams.set("name", patientName.trim());
      return url.toString();
    } catch {
      return generatedLink;
    }
  }, [generatedLink, patientName]);

  // Create invite mutation
  const [createInvite, { loading }] =
    useMutation<CreatePatientInviteLinkResponse>(
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
            toast.error("Nie udało się utworzyć zaproszenia");
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
          linkType: "qr",
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
      toast.success("Link skopiowany!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Nie udało się skopiować");
    }
  };

  // Handle send invite
  const handleSendInvite = async () => {
    if (!organizationId || (!patientEmail && !patientPhone)) return;

    try {
      await createInvite({
        variables: {
          organizationId,
          patientName: patientName || null,
          patientEmail: patientEmail || null,
          patientPhone: patientPhone || null,
          linkType: patientEmail ? "email" : "sms",
          expirationDays: 7,
        },
      });

      setSentTo(patientEmail || patientPhone);
      setSendSuccess(true);

      // Auto-close after 1.5s
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch {
      toast.error("Nie udało się wysłać zaproszenia");
    }
  };

  // Handle close
  const handleClose = () => {
    setGeneratedLink(null);
    setCopied(false);
    setPatientName("");
    setPatientEmail("");
    setPatientPhone("");
    setSendSuccess(false);
    setSentTo("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="bg-zinc-950 border-white/10 shadow-2xl rounded-2xl max-w-md p-0 overflow-hidden gap-0"
        hideCloseButton
        data-testid="invite-dialog"
      >
        {/* Accessibility: Hidden title for screen readers */}
        <DialogTitle className="sr-only">Zaproś Pacjenta</DialogTitle>

        {/* Gradient Header with overlapping icon */}
        <div className="relative">
          {/* Gradient background */}
          <div className="h-20 bg-linear-to-br from-emerald-900/50 to-black" />

          {/* Close button */}
          <DialogClose
            className="absolute right-3 top-3 rounded-full p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors z-10"
            data-testid="invite-dialog-close-btn"
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Zamknij</span>
          </DialogClose>

          {/* Centered icon overlapping gradient */}
          <div className="absolute left-1/2 -translate-x-1/2 -bottom-8">
            <div className="bg-zinc-900 border border-emerald-500/30 rounded-full p-4 shadow-lg shadow-emerald-900/20">
              <Ticket className="h-8 w-8 text-emerald-500" />
            </div>
          </div>
        </div>

        {/* Title section */}
        <div className="flex flex-col items-center pt-12 px-6">
          <h2 className="text-xl font-semibold text-white">Zaproś Pacjenta</h2>
          <p className="text-sm text-zinc-400 mt-1 text-center">
            Pacjent otrzyma dostęp do aplikacji i 30 dni Premium.
          </p>
        </div>

        {/* Loading state */}
        {loading && !generatedLink ? (
          <div className="flex flex-col items-center justify-center py-12 px-6">
            <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
            <p className="text-sm text-zinc-400 mt-3">Generuję link...</p>
          </div>
        ) : (
          /* Tabs */
          <Tabs defaultValue="link" className="px-6 pb-6 pt-6">
            <TabsList className="bg-zinc-900 p-1 rounded-lg w-full grid grid-cols-3 gap-1 mb-6 h-auto">
              <TabsTrigger
                value="link"
                className="flex items-center justify-center gap-1.5 py-2.5 text-sm data-[state=active]:bg-zinc-800 data-[state=active]:text-white data-[state=active]:shadow-sm text-zinc-500 hover:text-zinc-300 transition-colors rounded-md"
                data-testid="invite-tab-link"
              >
                <Link2 className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">Link</span>
              </TabsTrigger>
              <TabsTrigger
                value="qr"
                className="flex items-center justify-center gap-1.5 py-2.5 text-sm data-[state=active]:bg-zinc-800 data-[state=active]:text-white data-[state=active]:shadow-sm text-zinc-500 hover:text-zinc-300 transition-colors rounded-md"
                data-testid="invite-tab-qr"
              >
                <QrCode className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">QR Kod</span>
              </TabsTrigger>
              <TabsTrigger
                value="send"
                className="flex items-center justify-center gap-1.5 py-2.5 text-sm data-[state=active]:bg-zinc-800 data-[state=active]:text-white data-[state=active]:shadow-sm text-zinc-500 hover:text-zinc-300 transition-colors rounded-md"
                data-testid="invite-tab-send"
              >
                <Send className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">Wyślij</span>
              </TabsTrigger>
            </TabsList>

            {/* Tab: Link */}
            <TabsContent
              value="link"
              className="space-y-4 animate-in fade-in-50 slide-in-from-left-2 duration-200 mt-0"
            >
              {/* Personalization input */}
              <div className="space-y-2">
                <label
                  htmlFor="invite-name-input"
                  className="text-sm text-zinc-400"
                >
                  Personalizuj link
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
                  <Input
                    id="invite-name-input"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="Imię pacjenta (opcjonalne)"
                    className="pl-10 bg-zinc-900/50 border-white/5 focus:border-emerald-500/50 focus:ring-emerald-500/20 rounded-xl h-12"
                    data-testid="invite-name-input"
                  />
                </div>
              </div>

              {/* Generated link display */}
              <div className="relative">
                <Input
                  value={personalizedLink}
                  readOnly
                  className="pr-20 bg-zinc-900/50 border-white/5 rounded-xl h-12 text-sm text-zinc-300"
                  data-testid="invite-link-display"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10"
                  onClick={handleCopyLink}
                  data-testid="invite-copy-inline-btn"
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <span className="text-xs font-medium">Kopiuj</span>
                  )}
                </Button>
              </div>

              {/* Main copy button */}
              <Button
                onClick={handleCopyLink}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl h-12 w-full shadow-lg shadow-emerald-900/20 transition-all"
                data-testid="invite-copy-main-btn"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Skopiowano!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Kopiuj Link
                  </>
                )}
              </Button>
            </TabsContent>

            {/* Tab: QR Code */}
            <TabsContent
              value="qr"
              className="flex flex-col items-center py-4 animate-in fade-in-50 duration-200 mt-0"
            >
              {/* Branded QR Code */}
              <div
                className="bg-white p-4 rounded-2xl shadow-xl"
                data-testid="invite-qr-code"
              >
                <QRCodeSVG
                  value={personalizedLink || "https://fiziyo.app/invite"}
                  size={200}
                  level="H"
                  imageSettings={{
                    src: "/images/logo.png",
                    x: undefined,
                    y: undefined,
                    height: 40,
                    width: 40,
                    excavate: true,
                  }}
                />
              </div>

              {/* Instructions */}
              <div className="mt-6 text-center">
                <p className="text-sm font-medium text-zinc-300">
                  Pokaż pacjentowi do zeskanowania
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  Pacjent otworzy link bezpośrednio w przeglądarce
                </p>
              </div>
            </TabsContent>

            {/* Tab: Send */}
            <TabsContent
              value="send"
              className="space-y-4 pt-2 animate-in fade-in-50 slide-in-from-right-2 duration-200 mt-0"
            >
              {sendSuccess ? (
                /* Success view */
                <div
                  className="flex flex-col items-center justify-center py-8 animate-in zoom-in-50 duration-300"
                  data-testid="invite-success-view"
                >
                  <div className="h-16 w-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
                    <Check className="h-8 w-8 text-emerald-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Wysłano!</h3>
                  <p className="text-sm text-zinc-400 mt-1">
                    Zaproszenie zostało wysłane do {sentTo}
                  </p>
                </div>
              ) : (
                /* Form */
                <>
                  <div className="text-center text-xs text-zinc-500 mb-4">
                    Wybierz kanał, którym chcesz dostarczyć zaproszenie.
                  </div>

                  {/* Input group - mutually exclusive */}
                  <div className="space-y-3">
                    {/* Email input */}
                    <div
                      className={`relative transition-opacity duration-200 ${
                        patientPhone ? "opacity-40" : "opacity-100"
                      }`}
                    >
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                      <Input
                        type="email"
                        value={patientEmail}
                        onChange={(e) => {
                          setPatientEmail(e.target.value);
                          if (e.target.value) setPatientPhone("");
                        }}
                        placeholder="Adres email pacjenta"
                        className="pl-10 bg-zinc-900/50 border-white/5 focus:border-emerald-500/50 rounded-xl h-11 text-sm"
                        data-testid="invite-email-input"
                      />
                    </div>

                    {/* Phone input */}
                    <div
                      className={`relative transition-opacity duration-200 ${
                        patientEmail ? "opacity-40" : "opacity-100"
                      }`}
                    >
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                      <Input
                        type="tel"
                        value={patientPhone}
                        onChange={(e) => {
                          setPatientPhone(e.target.value);
                          if (e.target.value) setPatientEmail("");
                        }}
                        placeholder="Numer telefonu (np. 500 600 700)"
                        className="pl-10 bg-zinc-900/50 border-white/5 focus:border-emerald-500/50 rounded-xl h-11 text-sm"
                        data-testid="invite-phone-input"
                      />
                    </div>
                  </div>

                  {/* Dynamic button */}
                  <Button
                    onClick={handleSendInvite}
                    disabled={(!patientEmail && !patientPhone) || loading}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl h-12 w-full mt-4 shadow-lg shadow-emerald-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    data-testid="invite-send-btn"
                  >
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        <SendButtonLabel
                          email={patientEmail}
                          phone={patientPhone}
                        />
                      </>
                    )}
                  </Button>
                </>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
