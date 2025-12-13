"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useSignUp } from "@clerk/nextjs";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Mail,
  Lock,
  User,
  Building2,
  Check,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phone: string;
  companyName: string;
  companyNameEdited: boolean;
}

const STEPS = [
  { id: 1, name: "Email" },
  { id: 2, name: "Hasło" },
  { id: 3, name: "Dane" },
];

const organizationTypeConfig = {
  individual: {
    title: "Praktyka Indywidualna",
    subtitle:
      "Załóż darmowe konto. Zawsze możesz rozszerzyć na Starter lub Professional",
    nameLabel: "Nazwa praktyki",
    namePlaceholder: "np. Jan Kowalski - Fizjoterapia",
    namePrefix: "",
    nameSuffix: " - Fizjoterapia",
  },
  small: {
    title: "Mały Gabinet",
    subtitle:
      "Zacznij bezpłatnie. Gdy zespół urośnie, przejdź na Professional lub Business",
    nameLabel: "Nazwa gabinetu",
    namePlaceholder: "np. Fizjo Zdrowie",
    namePrefix: "Gabinet ",
    nameSuffix: "",
  },
  large: {
    title: "Duża Klinika",
    subtitle:
      "Rozpocznij bezpłatnie. W każdej chwili upgrade do Business lub Enterprise",
    nameLabel: "Nazwa kliniki",
    namePlaceholder: "np. Centrum Rehabilitacji Medycznej",
    namePrefix: "Klinika ",
    nameSuffix: "",
  },
};

type OrganizationType = keyof typeof organizationTypeConfig;

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {STEPS.map((step, index) => (
        <div key={step.id} className="flex items-center">
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-all",
              currentStep > step.id
                ? "bg-primary text-primary-foreground"
                : currentStep === step.id
                ? "bg-primary text-primary-foreground"
                : "bg-surface-light text-muted-foreground"
            )}
          >
            {currentStep > step.id ? <Check className="h-4 w-4" /> : step.id}
          </div>
          {index < STEPS.length - 1 && (
            <div
              className={cn(
                "mx-2 h-0.5 w-8 transition-colors",
                currentStep > step.id ? "bg-primary" : "bg-border"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function generatePracticeName(
  firstName: string,
  lastName: string,
  orgType: OrganizationType
): string {
  if (!firstName.trim() || !lastName.trim()) return "";
  const fullName = `${firstName.trim()} ${lastName.trim()}`;
  const config = organizationTypeConfig[orgType];
  return `${config.namePrefix}${fullName}${config.nameSuffix}`;
}

interface PracticeNamePreviewProps {
  name: string;
  label: string;
  onEdit: () => void;
}

function PracticeNamePreview({
  name,
  label,
  onEdit,
}: PracticeNamePreviewProps) {
  if (!name) return null;

  return (
    <button
      type="button"
      onClick={onEdit}
      className="mb-4 flex w-full items-center justify-between rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:bg-surface-light"
    >
      <div className="flex flex-1 items-center gap-3">
        <Building2 className="h-5 w-5 text-primary" />
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="font-medium text-foreground">{name}</p>
        </div>
      </div>
      <div className="flex items-center gap-1 rounded-md bg-surface-light px-2 py-1">
        <Pencil className="h-3 w-3 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Edytuj</span>
      </div>
    </button>
  );
}

export default function RegisterFormPage() {
  const params = useParams();
  const orgType = (params.type as OrganizationType) || "individual";
  const config =
    organizationTypeConfig[orgType] || organizationTypeConfig.individual;

  const { signUp, isLoaded } = useSignUp();
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    phone: "",
    companyName: "",
    companyNameEdited: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showNameEditor, setShowNameEditor] = useState(false);

  const generatedName = useMemo(
    () => generatePracticeName(formData.firstName, formData.lastName, orgType),
    [formData.firstName, formData.lastName, orgType]
  );

  useEffect(() => {
    if (!formData.companyNameEdited && generatedName) {
      setFormData((prev) => ({ ...prev, companyName: generatedName }));
    }
  }, [generatedName, formData.companyNameEdited]);

  const handleInputChange = useCallback(
    (field: keyof FormData, value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      setError("");
    },
    []
  );

  const handleCompanyNameChange = useCallback((value: string) => {
    setFormData((prev) => ({
      ...prev,
      companyName: value,
      companyNameEdited: true,
    }));
    setError("");
  }, []);

  const validateStep1 = useCallback((): boolean => {
    if (!formData.email.trim()) {
      setError("Podaj adres email");
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Podaj poprawny adres email");
      return false;
    }
    return true;
  }, [formData.email]);

  const validateStep2 = useCallback((): boolean => {
    if (!formData.password) {
      setError("Podaj hasło");
      return false;
    }
    if (formData.password.length < 8) {
      setError("Hasło musi mieć minimum 8 znaków");
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Hasła nie są identyczne");
      return false;
    }
    return true;
  }, [formData.password, formData.confirmPassword]);

  const validateStep3 = useCallback((): boolean => {
    if (!formData.firstName.trim()) {
      setError("Podaj swoje imię");
      return false;
    }
    if (!formData.lastName.trim()) {
      setError("Podaj swoje nazwisko");
      return false;
    }
    return true;
  }, [formData.firstName, formData.lastName]);

  const handleNextStep = useCallback(() => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
      setError("");
    } else if (currentStep === 2 && validateStep2()) {
      setCurrentStep(3);
      setError("");
    }
  }, [currentStep, validateStep1, validateStep2]);

  const handlePrevStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
      setError("");
    }
  }, [currentStep]);

  const handleRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep3()) return;

    if (!isLoaded || !signUp) {
      setError("System rejestracji niedostępny. Spróbuj ponownie później.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      await signUp.create({
        emailAddress: formData.email,
        password: formData.password,
      });

      try {
        await signUp.update({
          unsafeMetadata: {
            firstName: formData.firstName.trim(),
            lastName: formData.lastName.trim(),
            phone: formData.phone.trim(),
            companyName: formData.companyName.trim() || generatedName,
            isCompanyAccount: true,
            organizationType: orgType,
          },
        });
      } catch (updateError) {
        console.error("Error setting metadata:", updateError);
      }

      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      router.push("/verify");
    } catch (err) {
      console.error("Registration error:", err);
      const error = err as {
        errors?: Array<{ message?: string }>;
        message?: string;
      };
      const errorMessage =
        error?.errors?.[0]?.message || error?.message || "Nieznany błąd";
      setError(`Błąd rejestracji: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Back link */}
      <button
        type="button"
        onClick={currentStep > 1 ? handlePrevStep : undefined}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        {currentStep > 1 ? (
          <>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Wstecz
          </>
        ) : (
          <Link href="/register" className="inline-flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zmień typ
          </Link>
        )}
      </button>

      {/* Header */}
      <div className="space-y-2">
        <div className="mb-1 text-xs font-medium uppercase tracking-wider text-primary">
          {config.title}
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Utwórz konto
        </h1>
        <p className="text-sm text-muted-foreground">{config.subtitle}</p>
      </div>

      {/* Step indicator */}
      <StepIndicator currentStep={currentStep} />

      {/* Forms */}
      <form
        onSubmit={
          currentStep === 3
            ? handleRegistration
            : (e) => {
                e.preventDefault();
                handleNextStep();
              }
        }
      >
        {/* Step 1: Email */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Adres email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="jan@fizjoterapia.pl"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className="h-11 pl-10"
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Password */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Hasło</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Minimum 8 znaków"
                  value={formData.password}
                  onChange={(e) =>
                    handleInputChange("password", e.target.value)
                  }
                  className="h-11 pl-10"
                  autoComplete="new-password"
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Potwierdź hasło</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Powtórz hasło"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    handleInputChange("confirmPassword", e.target.value)
                  }
                  className="h-11 pl-10"
                  autoComplete="new-password"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Personal data */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">Imię</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="Jan"
                    value={formData.firstName}
                    onChange={(e) =>
                      handleInputChange("firstName", e.target.value)
                    }
                    className="h-11 pl-10"
                    autoComplete="given-name"
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Nazwisko</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Kowalski"
                    value={formData.lastName}
                    onChange={(e) =>
                      handleInputChange("lastName", e.target.value)
                    }
                    className="h-11 pl-10"
                    autoComplete="family-name"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefon</Label>
              <PhoneInput
                id="phone"
                placeholder="123 456 789"
                value={formData.phone}
                onChange={(value) => handleInputChange("phone", value)}
                className="h-11"
              />
            </div>

            {/* Practice name preview/editor */}
            {showNameEditor ? (
              <div className="space-y-2">
                <Label htmlFor="companyName">{config.nameLabel}</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="companyName"
                    type="text"
                    placeholder={config.namePlaceholder}
                    value={formData.companyName}
                    onChange={(e) => handleCompanyNameChange(e.target.value)}
                    className="h-11 pl-10"
                    autoFocus
                    onBlur={() => setShowNameEditor(false)}
                  />
                </div>
              </div>
            ) : (
              <PracticeNamePreview
                name={formData.companyName || generatedName}
                label={config.nameLabel}
                onEdit={() => setShowNameEditor(true)}
              />
            )}

            {/* Free plan info */}
            <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
              <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
              <p className="text-xs text-muted-foreground">
                Bezpłatny start • Bez karty kredytowej • Upgrade w każdej chwili
              </p>
            </div>
          </div>
        )}

        {/* Clerk CAPTCHA */}
        <div id="clerk-captcha" className="mt-4" />

        {/* Error message */}
        {error && (
          <div className="mt-4 rounded-lg bg-error/10 p-3 text-sm text-error">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="mt-6">
          <Button
            type="submit"
            disabled={loading}
            className="h-11 w-full rounded-xl text-base font-semibold"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : currentStep < 3 ? (
              <>
                Dalej
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            ) : (
              "Załóż darmowe konto"
            )}
          </Button>
        </div>
      </form>

      {/* Login link */}
      <p className="text-center text-sm text-muted-foreground">
        Masz już konto?{" "}
        <Link
          href="/sign-in"
          className="font-semibold text-primary hover:text-primary-light"
        >
          Zaloguj się
        </Link>
      </p>
    </div>
  );
}





