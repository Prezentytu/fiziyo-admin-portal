"use client";

import * as React from "react";
import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation } from "@apollo/client/react";
import {
  Loader2,
  Mail,
  Link2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShareSheet } from "@/components/organization/ShareSheet";
import {
  SEND_INVITATION_MUTATION,
  GENERATE_INVITE_LINK_MUTATION,
} from "@/graphql/mutations/organizations.mutations";
import type { GenerateInviteLinkResponse } from "@/types/apollo";

// ========================================
// Schema & Types
// ========================================

const inviteFormSchema = z.object({
  email: z.string().email("Podaj prawidłowy adres email"),
  role: z.enum(["admin", "member", "therapist"]),
  message: z.string().optional(),
});

type InviteFormValues = z.infer<typeof inviteFormSchema>;

interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  organizationName?: string;
  onSuccess?: () => void;
}

interface GeneratedLink {
  token: string;
  url: string;
  expiresAt: string;
  role: string;
}

// ========================================
// Component
// ========================================

export function InviteMemberDialog({
  open,
  onOpenChange,
  organizationId,
  organizationName = "organizacji",
  onSuccess,
}: InviteMemberDialogProps) {
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState("email");
  const [generatedLink, setGeneratedLink] = useState<GeneratedLink | null>(
    null
  );
  const [linkRole, setLinkRole] = useState<string>("therapist");

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      email: "",
      role: "therapist",
      message: "",
    },
  });

  const isDirty = form.formState.isDirty;

  const handleCloseAttempt = useCallback(() => {
    if (isDirty) {
      setShowCloseConfirm(true);
    } else {
      onOpenChange(false);
    }
  }, [isDirty, onOpenChange]);

  const handleConfirmClose = useCallback(() => {
    setShowCloseConfirm(false);
    form.reset();
    setGeneratedLink(null);
    onOpenChange(false);
  }, [form, onOpenChange]);

  // Reset form when dialog closes
  React.useEffect(() => {
    if (!open) {
      form.reset();
      setGeneratedLink(null);
    }
  }, [open, form]);

  // Mutations
  const [sendInvitation, { loading: sendingEmail }] = useMutation(
    SEND_INVITATION_MUTATION
  );

  const [generateLink, { loading: generatingLink }] = useMutation<GenerateInviteLinkResponse>(
    GENERATE_INVITE_LINK_MUTATION
  );

  // Email submission
  const handleSubmit = async (values: InviteFormValues) => {
    try {
      await sendInvitation({
        variables: {
          organizationId,
          email: values.email,
          role: values.role.toUpperCase(),
          message: values.message || null,
        },
      });
      toast.success("Zaproszenie zostało wysłane");
      form.reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Nieznany błąd";
      console.error("Błąd podczas wysyłania zaproszenia:", error);
      toast.error(errorMessage || "Nie udało się wysłać zaproszenia");
    }
  };

  // Generate link
  const handleGenerateLink = async () => {
    try {
      const { data } = await generateLink({
        variables: {
          organizationId,
          role: linkRole.toUpperCase(),
          expirationDays: 7,
        },
      });

      if (data?.generateInviteLink) {
        const invitation = data.generateInviteLink;
        const token = invitation.invitationToken;
        if (!token) {
          toast.error("Brak tokenu w odpowiedzi");
          return;
        }
        const baseUrl =
          typeof window !== "undefined"
            ? window.location.origin
            : "https://app.fizjo.pl";
        const url = `${baseUrl}/invite?token=${token}`;

        setGeneratedLink({
          token,
          url,
          expiresAt: invitation.expiresAt,
          role: invitation.role,
        });

        toast.success("Link został wygenerowany");
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Nieznany błąd";
      console.error("Błąd podczas generowania linku:", error);
      toast.error(errorMessage || "Nie udało się wygenerować linku");
    }
  };

  const roleLabels: Record<string, string> = {
    OWNER: "Właściciel",
    ADMIN: "Administrator",
    THERAPIST: "Fizjoterapeuta",
    MEMBER: "Członek",
  };

  return (
    <Dialog open={open} onOpenChange={() => handleCloseAttempt()}>
      <DialogContent
        className="max-w-[95vw] sm:max-w-xl md:max-w-2xl"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => {
          e.preventDefault();
          handleCloseAttempt();
        }}
      >
        <DialogHeader>
          <DialogTitle>Zaproś osobę</DialogTitle>
          <DialogDescription>
            Wyślij zaproszenie emailem lub wygeneruj link do udostępnienia
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="email" className="gap-2">
              <Mail className="h-4 w-4" />
              Email
            </TabsTrigger>
            <TabsTrigger value="link" className="gap-2">
              <Link2 className="h-4 w-4" />
              Link
            </TabsTrigger>
          </TabsList>

          {/* Email Tab */}
          <TabsContent value="email" className="mt-4">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="jan.kowalski@email.com"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Na ten adres zostanie wysłane zaproszenie
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rola *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Wybierz rolę" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="therapist">
                            Fizjoterapeuta
                          </SelectItem>
                          <SelectItem value="admin">Administrator</SelectItem>
                          <SelectItem value="member">Członek</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Fizjoterapeuci mogą tworzyć ćwiczenia i zarządzać
                        pacjentami
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Wiadomość</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Opcjonalna wiadomość dla zapraszanej osoby..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseAttempt}
                  >
                    Anuluj
                  </Button>
                  <Button type="submit" disabled={sendingEmail}>
                    {sendingEmail && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Wyślij zaproszenie
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>

          {/* Link Tab */}
          <TabsContent value="link" className="mt-4 space-y-4">
            <div className="space-y-4">
              {/* Role selection - only show when no link generated yet */}
              {!generatedLink && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Rola</label>
                  <Select value={linkRole} onValueChange={setLinkRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="Wybierz rolę" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="therapist">Fizjoterapeuta</SelectItem>
                      <SelectItem value="admin">Administrator</SelectItem>
                      <SelectItem value="member">Członek</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Każda osoba z tym linkiem dołączy jako{" "}
                    {roleLabels[linkRole.toUpperCase()] || linkRole}
                  </p>
                </div>
              )}

              {/* Generate button or ShareSheet */}
              {!generatedLink ? (
                <Button
                  onClick={handleGenerateLink}
                  disabled={generatingLink}
                  className="w-full"
                >
                  {generatingLink ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Link2 className="mr-2 h-4 w-4" />
                  )}
                  Wygeneruj link zaproszenia
                </Button>
              ) : (
                <div className="space-y-3">
                  <ShareSheet
                    url={generatedLink.url}
                    organizationName={organizationName}
                    role={generatedLink.role}
                    expiresAt={generatedLink.expiresAt}
                  />

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setGeneratedLink(null);
                    }}
                    className="w-full"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Wygeneruj nowy link
                  </Button>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={handleCloseAttempt}>
                Zamknij
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>

      <ConfirmDialog
        open={showCloseConfirm}
        onOpenChange={setShowCloseConfirm}
        title="Porzucić zmiany?"
        description="Masz niezapisane zmiany. Czy na pewno chcesz zamknąć bez zapisywania?"
        confirmText="Tak, zamknij"
        cancelText="Kontynuuj edycję"
        variant="destructive"
        onConfirm={handleConfirmClose}
      />
    </Dialog>
  );
}
