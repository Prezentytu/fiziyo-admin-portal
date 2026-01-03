"use client";

import * as React from "react";
import { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@apollo/client/react";
import { Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  CREATE_CLINIC_MUTATION,
  UPDATE_CLINIC_MUTATION,
} from "@/graphql/mutations/clinics.mutations";
import { GET_ORGANIZATION_CLINICS_QUERY } from "@/graphql/queries/clinics.queries";

const clinicFormSchema = z.object({
  name: z.string().min(2, "Nazwa musi mieć minimum 2 znaki"),
  address: z.string().min(5, "Adres musi mieć minimum 5 znaków"),
  contactInfo: z.string().optional(),
});

type ClinicFormValues = z.infer<typeof clinicFormSchema>;

export interface Clinic {
  id: string;
  name: string;
  address?: string;
  contactInfo?: string;
  isActive?: boolean;
  organizationId?: string;
}

interface ClinicDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clinic?: Clinic | null;
  organizationId: string;
  onSuccess?: () => void;
}

export function ClinicDialog({
  open,
  onOpenChange,
  clinic,
  organizationId,
  onSuccess,
}: ClinicDialogProps) {
  const isEditing = !!clinic;
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const form = useForm<ClinicFormValues>({
    resolver: zodResolver(clinicFormSchema),
    defaultValues: {
      name: "",
      address: "",
      contactInfo: "",
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
    onOpenChange(false);
  }, [form, onOpenChange]);

  // Reset form when dialog opens/closes or clinic changes
  useEffect(() => {
    if (open) {
      form.reset({
        name: clinic?.name || "",
        address: clinic?.address || "",
        contactInfo: clinic?.contactInfo || "",
      });
    }
  }, [open, clinic, form]);

  const [createClinic, { loading: creating }] = useMutation(
    CREATE_CLINIC_MUTATION,
    {
      refetchQueries: [
        { query: GET_ORGANIZATION_CLINICS_QUERY, variables: { organizationId } },
      ],
    }
  );

  const [updateClinic, { loading: updating }] = useMutation(
    UPDATE_CLINIC_MUTATION,
    {
      refetchQueries: [
        { query: GET_ORGANIZATION_CLINICS_QUERY, variables: { organizationId } },
      ],
    }
  );

  const isLoading = creating || updating;

  const onSubmit = async (values: ClinicFormValues) => {
    try {
      if (isEditing && clinic) {
        await updateClinic({
          variables: {
            clinicId: clinic.id,
            name: values.name,
            address: values.address,
            contactInfo: values.contactInfo || null,
          },
        });
        toast.success("Gabinet został zaktualizowany");
      } else {
        await createClinic({
          variables: {
            organizationId,
            name: values.name,
            address: values.address,
            contactInfo: values.contactInfo || null,
          },
        });
        toast.success("Gabinet został utworzony");
      }
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Błąd podczas zapisywania:", error);
      toast.error(
        isEditing
          ? "Nie udało się zaktualizować gabinetu"
          : "Nie udało się utworzyć gabinetu"
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => handleCloseAttempt()}>
      <DialogContent
        className="sm:max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => {
          e.preventDefault();
          handleCloseAttempt();
        }}
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <MapPin className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle>
                {isEditing ? "Edytuj gabinet" : "Nowy gabinet"}
              </DialogTitle>
              <DialogDescription>
                {isEditing
                  ? "Zaktualizuj dane gabinetu"
                  : "Dodaj nowy gabinet do organizacji"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nazwa gabinetu *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="np. Gabinet Główny"
                      className="h-11"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adres *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="ul. Przykładowa 123, 00-000 Miasto"
                      className="min-h-[80px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contactInfo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dane kontaktowe</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Telefon, email lub inne dane"
                      className="h-11"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseAttempt}
                className="rounded-xl"
              >
                Anuluj
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="rounded-xl shadow-lg shadow-primary/20"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Zapisz zmiany" : "Utwórz gabinet"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
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









