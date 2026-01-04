"use client";

import { useState, useCallback } from "react";
import { useSignUp } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Loader2, RefreshCw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function VerifyEmailPage() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const router = useRouter();

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [resendSuccess, setResendSuccess] = useState(false);

  const handleVerify = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!isLoaded || !signUp) {
        setError("System weryfikacji niedostępny. Spróbuj ponownie później.");
        return;
      }

      if (!code.trim()) {
        setError("Wprowadź kod weryfikacyjny");
        return;
      }

      try {
        setLoading(true);
        setError("");

        const result = await signUp.attemptEmailAddressVerification({
          code: code.trim(),
        });

        if (result.status === "complete") {
          await setActive({ session: result.createdSessionId });
          router.replace("/");
        } else {
          setError("Weryfikacja nie powiodła się. Spróbuj ponownie.");
        }
      } catch (err) {
        console.error("Verification error:", err);
        const error = err as {
          errors?: Array<{ code?: string; message?: string }>;
        };
        const errorCode = error?.errors?.[0]?.code;

        switch (errorCode) {
          case "form_code_incorrect":
            setError("Nieprawidłowy kod weryfikacyjny");
            break;
          case "verification_expired":
            setError("Kod weryfikacyjny wygasł. Wyślij nowy kod.");
            break;
          default:
            setError("Wystąpił błąd podczas weryfikacji. Spróbuj ponownie.");
        }
      } finally {
        setLoading(false);
      }
    },
    [code, isLoaded, signUp, setActive, router]
  );

  const handleResendCode = async () => {
    if (!isLoaded || !signUp) {
      setError("System niedostępny. Spróbuj ponownie później.");
      return;
    }

    try {
      setResending(true);
      setError("");
      setResendSuccess(false);

      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 5000);
    } catch (err) {
      console.error("Resend error:", err);
      setError("Nie udało się wysłać nowego kodu. Spróbuj ponownie.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/register/individual"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Powrót
      </Link>

      {/* Icon */}
      <div className="flex justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
          <Mail className="h-8 w-8 text-primary" />
        </div>
      </div>

      {/* Header */}
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Sprawdź swoją skrzynkę
        </h1>
        <p className="text-muted-foreground">
          Wysłaliśmy kod weryfikacyjny na Twój adres email. Wprowadź go poniżej,
          aby dokończyć rejestrację.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleVerify} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="code">Kod weryfikacyjny</Label>
          <Input
            id="code"
            type="text"
            placeholder="Wprowadź 6-cyfrowy kod"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setError("");
            }}
            className="h-11 text-center text-lg tracking-widest"
            autoComplete="one-time-code"
            autoFocus
          />
        </div>

        {error && (
          <div className="rounded-lg bg-error/10 p-3 text-sm text-error">
            {error}
          </div>
        )}

        {resendSuccess && (
          <div className="rounded-lg bg-primary/10 p-3 text-sm text-primary">
            Nowy kod został wysłany na Twój email
          </div>
        )}

        <Button
          type="submit"
          disabled={loading || !code.trim()}
          className="h-11 w-full rounded-xl text-base font-semibold"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            "Zweryfikuj email"
          )}
        </Button>
      </form>

      {/* Resend */}
      <div className="text-center">
        <button
          type="button"
          onClick={handleResendCode}
          disabled={resending}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          {resending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Nie dostałeś kodu? Wyślij ponownie
        </button>
      </div>
    </div>
  );
}














