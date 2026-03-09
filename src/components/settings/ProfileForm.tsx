'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@apollo/client/react';
import { useUser, useReverification } from '@clerk/nextjs';
import type { EmailAddressResource } from '@clerk/types';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import * as z from 'zod';

import AvatarEditor from 'react-avatar-editor';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { UPDATE_USER_PROFILE_MUTATION, UPDATE_USER_MUTATION } from '@/graphql/mutations/users.mutations';
import { GET_USER_BY_CLERK_ID_QUERY } from '@/graphql/queries/users.queries';

// ========================================
// Schema
// ========================================

const profileFormSchema = z.object({
  firstName: z.string().min(2, 'Imię musi mieć minimum 2 znaki'),
  lastName: z.string().min(2, 'Nazwisko musi mieć minimum 2 znaki'),
  email: z.string().min(1, 'Email jest wymagany').email('Nieprawidłowy adres email'),
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

const ACCEPTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif']);

export function ProfileForm({ user, clerkId, onSuccess }: Readonly<ProfileFormProps>) {
  const { user: clerkUser } = useUser();
  const createEmailAddress = useReverification((email: string) => clerkUser?.createEmailAddress({ email }));
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [emailVerifying, setEmailVerifying] = useState(false);
  const [emailVerificationCode, setEmailVerificationCode] = useState('');
  const [pendingEmailAddress, setPendingEmailAddress] = useState<EmailAddressResource | null>(null);

  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [cropImageFile, setCropImageFile] = useState<File | null>(null);
  const [cropScale, setCropScale] = useState(1.2);
  const avatarEditorRef = useRef<AvatarEditor | null>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: '',
    },
  });

  // Reset form when user data loads
  useEffect(() => {
    if (user) {
      const names = user.fullname?.split(' ') || [];
      form.reset({
        firstName: user.personalData?.firstName || names[0] || '',
        lastName: user.personalData?.lastName || names.slice(1).join(' ') || '',
        email: user.email || clerkUser?.primaryEmailAddress?.emailAddress || '',
        phone: user.contactData?.phone || '',
        address: user.contactData?.address || '',
      });
    }
  }, [user, clerkUser?.primaryEmailAddress?.emailAddress, form]);

  const [updateProfile, { loading }] = useMutation(UPDATE_USER_PROFILE_MUTATION, {
    refetchQueries: [{ query: GET_USER_BY_CLERK_ID_QUERY, variables: { clerkId } }],
  });

  const [updateUser, { loading: updateUserLoading }] = useMutation(UPDATE_USER_MUTATION, {
    refetchQueries: [{ query: GET_USER_BY_CLERK_ID_QUERY, variables: { clerkId } }],
  });

  const onSubmit = async (values: ProfileFormValues) => {
    if (!clerkUser) {
      toast.error('Brak sesji użytkownika');
      return;
    }
    try {
      const currentEmail = clerkUser.primaryEmailAddress?.emailAddress || user.email || '';
      const emailChanged = values.email.trim() !== currentEmail;

      if (emailChanged && !emailVerifying) {
        const res = await createEmailAddress(values.email.trim());
        await clerkUser.reload();
        const emailAddress = clerkUser.emailAddresses.find((a) => a.id === res?.id);
        if (emailAddress) {
          await emailAddress.prepareVerification({ strategy: 'email_code' });
          setPendingEmailAddress(emailAddress);
          setEmailVerifying(true);
          toast.info('Wpisz kod weryfikacyjny wysłany na nowy adres email');
          return;
        }
      }

      let emailToSync: string | undefined;
      if (emailVerifying && pendingEmailAddress && emailVerificationCode) {
        const attempt = await pendingEmailAddress.attemptVerification({ code: emailVerificationCode });
        if (attempt?.verification?.status !== 'verified') {
          toast.error('Nieprawidłowy kod weryfikacyjny');
          return;
        }
        await clerkUser.update({ primaryEmailAddressId: pendingEmailAddress.id });
        await clerkUser.reload();
        emailToSync = values.email.trim();
        setEmailVerifying(false);
        setPendingEmailAddress(null);
        setEmailVerificationCode('');
      } else {
        emailToSync = undefined;
      }

      await clerkUser.update({
        firstName: values.firstName,
        lastName: values.lastName,
      });
      await updateProfile({
        variables: {
          userId: user.id,
          firstName: values.firstName,
          lastName: values.lastName,
          email: emailToSync,
          phone: values.phone || null,
          address: values.address || null,
        },
      });
      toast.success('Profil został zaktualizowany');
      onSuccess?.();
    } catch (error) {
      console.error('Błąd podczas aktualizacji:', error);
      toast.error('Nie udało się zaktualizować profilu');
    }
  };

  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !clerkUser) return;
    if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
      toast.error('Dozwolone formaty: JPG, PNG, GIF');
      return;
    }
    setCropImageFile(file);
    setCropScale(1.2);
    setCropDialogOpen(true);
    event.target.value = '';
  };

  const handleCropConfirm = async () => {
    const editor = avatarEditorRef.current;
    if (!editor || !cropImageFile || !clerkUser) return;

    try {
      const canvas = editor.getImageScaledToCanvas();
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.9)
      );
      if (!blob) {
        toast.error('Nie udało się przygotować zdjęcia');
        return;
      }
      const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg', lastModified: Date.now() });
      const imageResource = await clerkUser.setProfileImage({ file });
      const newImageUrl = imageResource?.publicUrl ?? clerkUser.imageUrl;
      if (newImageUrl && clerkId) {
        await updateUser({
          variables: {
            clerkId,
            image: newImageUrl,
          },
        });
      }
      toast.success('Zdjęcie profilowe zostało zaktualizowane');
      setCropDialogOpen(false);
      setCropImageFile(null);
      onSuccess?.();
    } catch (error) {
      console.error('Błąd podczas uploadu zdjęcia:', error);
      toast.error('Nie udało się zmienić zdjęcia');
    }
  };

  const handleCropCancel = () => {
    setCropDialogOpen(false);
    setCropImageFile(null);
  };

  const displayName =
    user.fullname ||
    `${user.personalData?.firstName || ''} ${user.personalData?.lastName || ''}`.trim() ||
    user.email ||
    'Użytkownik';

  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const isDirty = form.formState.isDirty;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" data-testid="settings-profile-form">
        {/* Section 1: Profile Photo */}
        <Card className="rounded-xl border border-border/50 bg-card/30">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold tracking-tight">Zdjęcie profilowe</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Widoczne dla innych członków organizacji
            </CardDescription>
          </CardHeader>
          <CardContent>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif"
              className="hidden"
              onChange={handlePhotoSelect}
            />
            <div className="flex items-center gap-6">
              <Avatar className="h-24 w-24 ring-4 ring-zinc-100 dark:ring-zinc-800">
                <AvatarImage
                  src={clerkUser?.imageUrl ?? user.image}
                  alt={displayName}
                />
                <AvatarFallback className="bg-linear-to-br from-primary to-primary-dark text-primary-foreground text-2xl font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-lg border-border/50 hover:border-primary/50 transition-all"
                  disabled={updateUserLoading || !clerkUser}
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="settings-profile-photo-upload-btn"
                >
                  {updateUserLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Zmień zdjęcie
                </Button>
                <p className="text-xs text-muted-foreground">
                  JPG, PNG lub GIF. Przed zapisem możesz kadrować i dostosować zdjęcie.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Basic Info */}
        <Card className="rounded-xl border border-border/50 bg-card/30">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold tracking-tight">Informacje podstawowe</CardTitle>
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

            {/* Email - editable */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Email *</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="jan@example.com"
                      className="bg-background border-input hover:border-primary/50 focus:ring-primary rounded-lg transition-all"
                      data-testid="settings-profile-email-input"
                      {...field}
                      disabled={emailVerifying}
                    />
                  </FormControl>
                  {emailVerifying && (
                    <div className="space-y-2 pt-2">
                      <Label className="text-sm font-medium">Kod weryfikacyjny</Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Wpisz kod z emaila"
                          value={emailVerificationCode}
                          onChange={(e) => setEmailVerificationCode(e.target.value)}
                          data-testid="settings-profile-email-code-input"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEmailVerifying(false);
                            setPendingEmailAddress(null);
                            setEmailVerificationCode('');
                          }}
                          data-testid="settings-profile-email-cancel-btn"
                        >
                          Anuluj
                        </Button>
                      </div>
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Section 3: Contact Info */}
        <Card className="rounded-xl border border-border/50 bg-card/30">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold tracking-tight">Dane kontaktowe</CardTitle>
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
                    <FormLabel className="text-sm font-medium">Telefon</FormLabel>
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
                    <FormLabel className="text-sm font-medium">Adres</FormLabel>
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
        {(isDirty || emailVerifying) && (
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

      {/* Dialog kadrowania zdjęcia */}
      <Dialog open={cropDialogOpen} onOpenChange={(open) => !open && handleCropCancel()}>
        <DialogContent
          className="sm:max-w-md"
          onEscapeKeyDown={handleCropCancel}
          data-testid="settings-profile-crop-dialog"
        >
          <DialogHeader>
            <DialogTitle>Kadruj zdjęcie</DialogTitle>
            <DialogDescription>
              Przesuń i powiększ obraz, aby ustawić kadr. Okrągły podgląd pokazuje, jak będzie wyglądać awatar.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="relative overflow-hidden rounded-2xl border border-border bg-surface">
              {cropImageFile && (
              <AvatarEditor
                ref={(ref) => {
                  avatarEditorRef.current = ref;
                }}
                image={cropImageFile}
                width={256}
                height={256}
                border={32}
                borderRadius={128}
                color={[0, 0, 0, 0.6]}
                scale={cropScale}
                rotate={0}
              />
              )}
            </div>
            <div className="w-full space-y-2">
              <Label className="text-sm">Powiększenie</Label>
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={cropScale}
                onChange={(e) => setCropScale(parseFloat(e.target.value))}
                className="w-full accent-primary"
                data-testid="settings-profile-crop-scale"
              />
            </div>
          </div>
          <DialogFooter className="flex items-center justify-between sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={handleCropCancel}
              data-testid="settings-profile-crop-cancel-btn"
            >
              Anuluj
            </Button>
            <Button
              type="button"
              onClick={handleCropConfirm}
              disabled={updateUserLoading}
              data-testid="settings-profile-crop-confirm-btn"
            >
              {updateUserLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Zapisz zdjęcie
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Form>
  );
}
