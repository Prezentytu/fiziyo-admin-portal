"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@apollo/client/react";
import { Loader2, Mail, Phone, MapPin, User, Camera } from "lucide-react";
import { toast } from "sonner";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { UPDATE_USER_PROFILE_MUTATION } from "@/graphql/mutations/users.mutations";
import { GET_USER_BY_CLERK_ID_QUERY } from "@/graphql/queries/users.queries";

// ========================================
// Schema
// ========================================

const profileFormSchema = z.object({
  firstName: z.string().min(2, "Imię musi mieć minimum 2 znaki"),
  lastName: z.string().min(2, "Nazwisko musi mieć minimum 2 znaki"),
  phone: z.string().optional(),
  address: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

// ========================================
// Types
// ========================================

export interface UserProfile {
  id: string;
  clerkId?: string;
  email?: string;
  fullname?: string;
  image?: string;
  personalData?: {
    firstName?: string;
    lastName?: string;
  };
  contactData?: {
    phone?: string;
    address?: string;
  };
}

interface ProfileFormProps {
  user: UserProfile;
  clerkId: string;
  onSuccess?: () => void;
}

// ========================================
// Component
// ========================================

export function ProfileForm({ user, clerkId, onSuccess }: ProfileFormProps) {
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      address: "",
    },
  });

  // Reset form when user data loads
  useEffect(() => {
    if (user) {
      const names = user.fullname?.split(" ") || [];
      form.reset({
        firstName: user.personalData?.firstName || names[0] || "",
        lastName: user.personalData?.lastName || names.slice(1).join(" ") || "",
        phone: user.contactData?.phone || "",
        address: user.contactData?.address || "",
      });
    }
  }, [user, form]);

  const [updateProfile, { loading }] = useMutation(UPDATE_USER_PROFILE_MUTATION, {
    refetchQueries: [
      { query: GET_USER_BY_CLERK_ID_QUERY, variables: { clerkId } },
    ],
  });

  const onSubmit = async (values: ProfileFormValues) => {
    try {
      await updateProfile({
        variables: {
          userId: user.id,
          firstName: values.firstName,
          lastName: values.lastName,
          phone: values.phone || null,
          address: values.address || null,
        },
      });
      toast.success("Profil został zaktualizowany");
      onSuccess?.();
    } catch (error) {
      console.error("Błąd podczas aktualizacji:", error);
      toast.error("Nie udało się zaktualizować profilu");
    }
  };

  const displayName =
    user.fullname ||
    `${user.personalData?.firstName || ""} ${user.personalData?.lastName || ""}`.trim() ||
    user.email ||
    "Użytkownik";

  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const isDirty = form.formState.isDirty;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Section 1: Profile Photo */}
        <Card className="border-border/60">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Camera className="h-4 w-4 text-primary" />
              </div>
              Zdjęcie profilowe
            </CardTitle>
            <CardDescription>
              Widoczne dla innych członków organizacji
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <Avatar className="h-24 w-24 ring-4 ring-surface-light">
                <AvatarImage src={user.image} alt={displayName} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary-dark text-primary-foreground text-2xl font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" disabled>
                    Zmień zdjęcie
                  </Button>
                  <span className="text-xs text-muted-foreground">(wkrótce)</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  JPG, PNG lub GIF. Maksymalnie 2MB.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Basic Info */}
        <Card className="border-border/60">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-info/10">
                <User className="h-4 w-4 text-info" />
              </div>
              Dane podstawowe
            </CardTitle>
            <CardDescription>
              Twoje imię i nazwisko widoczne w aplikacji
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Imię *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Jan"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nazwisko *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Kowalski"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Email - read only */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-sm font-medium">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                Email
              </Label>
              <Input
                value={user.email || ""}
                disabled
                className="bg-surface-light text-muted-foreground"
              />
              <p className="text-xs text-muted-foreground">
                Email można zmienić w ustawieniach konta Clerk
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Contact Info */}
        <Card className="border-border/60">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/10">
                <Phone className="h-4 w-4 text-secondary" />
              </div>
              Dane kontaktowe
            </CardTitle>
            <CardDescription>
              Opcjonalne informacje kontaktowe
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      Telefon
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="+48 123 456 789"
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
                    <FormLabel className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      Adres
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="ul. Przykładowa 123, 00-000 Miasto"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Save Button - always visible when dirty */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={loading || !isDirty}
            className="shadow-lg shadow-primary/20"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Zapisz zmiany
          </Button>
        </div>
      </form>
    </Form>
  );
}
