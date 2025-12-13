"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@apollo/client/react";
import { Loader2, User, Mail, Phone, MapPin } from "lucide-react";
import { toast } from "sonner";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { UPDATE_USER_PROFILE_MUTATION } from "@/graphql/mutations/users.mutations";
import { GET_USER_BY_CLERK_ID_QUERY } from "@/graphql/queries/users.queries";

const profileFormSchema = z.object({
  firstName: z.string().min(2, "Imię musi mieć minimum 2 znaki"),
  lastName: z.string().min(2, "Nazwisko musi mieć minimum 2 znaki"),
  phone: z.string().optional(),
  address: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

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

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card className="border-border/60">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <Avatar className="h-24 w-24 ring-4 ring-surface-light">
              <AvatarImage src={user.image} alt={displayName} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary-dark text-primary-foreground text-2xl font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="text-center sm:text-left">
              <h2 className="text-2xl font-bold text-foreground">{displayName}</h2>
              <p className="text-muted-foreground flex items-center justify-center sm:justify-start gap-2 mt-1">
                <Mail className="h-4 w-4" />
                {user.email}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Form */}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Dane osobowe
          </CardTitle>
          <CardDescription>
            Zaktualizuj swoje dane osobowe i kontaktowe
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Imię *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Jan"
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
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nazwisko *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Kowalski"
                          className="h-11"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      Telefon
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="+48 123 456 789"
                        className="h-11"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Używany do kontaktu z pacjentami
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      Adres
                    </FormLabel>
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

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  disabled={loading || !form.formState.isDirty}
                  className="rounded-xl shadow-lg shadow-primary/20"
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Zapisz zmiany
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}




