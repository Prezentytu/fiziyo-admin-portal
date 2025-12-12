"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation } from "@apollo/client/react";
import { Loader2 } from "lucide-react";
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
import { SEND_INVITATION_MUTATION } from "@/graphql/mutations/organizations.mutations";

const inviteFormSchema = z.object({
  email: z.string().email("Podaj prawidłowy adres email"),
  role: z.enum(["admin", "member"]),
  message: z.string().optional(),
});

type InviteFormValues = z.infer<typeof inviteFormSchema>;

interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  onSuccess?: () => void;
}

export function InviteMemberDialog({
  open,
  onOpenChange,
  organizationId,
  onSuccess,
}: InviteMemberDialogProps) {
  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      email: "",
      role: "member",
      message: "",
    },
  });

  const [sendInvitation, { loading }] = useMutation(SEND_INVITATION_MUTATION);

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
    } catch (error: any) {
      console.error("Błąd podczas wysyłania zaproszenia:", error);
      toast.error(error?.message || "Nie udało się wysłać zaproszenia");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Zaproś</DialogTitle>
          <DialogDescription>
            Wyślij zaproszenie do dołączenia do organizacji
          </DialogDescription>
        </DialogHeader>
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
                    <Input placeholder="jan.kowalski@email.com" {...field} />
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
                      <SelectItem value="member">Członek</SelectItem>
                      <SelectItem value="admin">Administrator</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Administratorzy mogą zarządzać użytkownikami i ustawieniami
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
                onClick={() => onOpenChange(false)}
              >
                Anuluj
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Wyślij zaproszenie
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
