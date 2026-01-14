"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@apollo/client/react";
import { Loader2, User } from "lucide-react";
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" data-testid="settings-profile-form">
        {/* Section 1: Profile Photo */}
        <Card className="rounded-xl border border-border/50 bg-card/30">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold tracking-tight">
              Zdjęcie profilowe
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Widoczne dla innych członków organizacji
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <Avatar className="h-24 w-24 ring-4 ring-zinc-100 dark:ring-zinc-800">
                <AvatarImage src={user.image} alt={displayName} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary-dark text-primary-foreground text-2xl font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" className="rounded-lg border-border/50 hover:border-primary/50 transition-all" disabled>
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
        <Card className="rounded-xl border border-border/50 bg-card/30">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold tracking-tight">
              Informacje podstawowe
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
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
                    <FormLabel className="text-sm font-medium">Imię *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Jan"
                        className="bg-background border-input hover:border-primary/50 focus:ring-primary rounded-lg transition-all"
                        data-testid="settings-profile-firstname-input"
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
                    <FormLabel className="text-sm font-medium">Nazwisko *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Kowalski"
                        className="bg-background border-input hover:border-primary/50 focus:ring-primary rounded-lg transition-all"
                        data-testid="settings-profile-lastname-input"
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
              <Label className="text-sm font-medium">
                Email
              </Label>
              <Input
                value={user.email || ""}
                disabled
                className="bg-muted text-muted-foreground rounded-lg opacity-70 cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground">
                Email można zmienić w ustawieniach konta Clerk
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Contact Info */}
        <Card className="rounded-xl border border-border/50 bg-card/30">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold tracking-tight">
              Dane kontaktowe
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
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
                    <FormLabel className="text-sm font-medium">
                      Telefon
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="+48 123 456 789"
                        className="bg-background border-input hover:border-primary/50 focus:ring-primary rounded-lg transition-all"
                        data-testid="settings-profile-phone-input"
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
                    <FormLabel className="text-sm font-medium">
                      Adres
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="ul. Przykładowa 123, 00-000 Miasto"
                        className="bg-background border-input hover:border-primary/50 focus:ring-primary rounded-lg transition-all"
                        data-testid="settings-profile-address-input"
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

        {/* Sticky Footer: Save Action */}
        {isDirty && (
          <div className="sticky bottom-0 -mx-8 lg:-mx-12 px-8 lg:px-12 py-4 mt-8 border-t bg-background/95 backdrop-blur-md z-10 flex justify-end animate-in fade-in slide-in-from-bottom-4 duration-300">
            <Button
              type="submit"
              disabled={loading}
              className="bg-primary hover:bg-primary/90 text-white font-bold h-11 px-8 rounded-xl shadow-lg shadow-primary/20 transition-all"
              data-testid="settings-profile-submit-btn"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Zapisz zmiany
            </Button>
          </div>
        )}
      </form>
    </Form>
  );
}
