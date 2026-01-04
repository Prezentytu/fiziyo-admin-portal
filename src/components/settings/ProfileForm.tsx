"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@apollo/client/react";
import { Loader2, Mail, Phone, MapPin } from "lucide-react";
import { toast } from "sonner";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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
    <Card className="border-border/60">
      <CardContent className="p-5">
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Avatar Section - Left */}
          <div className="flex flex-col items-center gap-4 lg:col-span-3 lg:border-r lg:border-border/60 lg:pr-6">
            <Avatar className="h-20 w-20 ring-4 ring-surface-light">
              <AvatarImage src={user.image} alt={displayName} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary-dark text-primary-foreground text-xl font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="text-center">
              <h2 className="text-lg font-bold text-foreground">{displayName}</h2>
              <p className="text-muted-foreground flex items-center justify-center gap-1.5 text-sm mt-1">
                <Mail className="h-3.5 w-3.5" />
                {user.email}
              </p>
            </div>
          </div>

          {/* Form Section - Right */}
          <div className="lg:col-span-9">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Imię *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Jan"
                            className="h-9"
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
                        <FormLabel className="text-xs">Nazwisko *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Kowalski"
                            className="h-9"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1.5 text-xs">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          Telefon
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="+48 123 456 789"
                            className="h-9"
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
                        <FormLabel className="flex items-center gap-1.5 text-xs">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          Adres
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="ul. Przykładowa 123, 00-000 Miasto"
                            className="h-9"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={loading || !form.formState.isDirty}
                    className="rounded-lg shadow-lg shadow-primary/20"
                  >
                    {loading && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                    Zapisz zmiany
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}








