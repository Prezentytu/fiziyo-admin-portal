"use client";

import { useState, useRef, useCallback } from "react";
import { useSignIn } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ArrowLeft, Mail, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignInPage() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);

  const passwordRef = useRef<HTMLInputElement>(null);

  const handleInputChange = useCallback((field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError("");
  }, []);

  const getErrorMessage = (err: unknown): string => {
    const error = err as {
      errors?: Array<{ code?: string; message?: string }>;
      message?: string;
    };
    const errorCode = error?.errors?.[0]?.code;
    const errorMessage = error?.errors?.[0]?.message || error?.message || "";

    switch (errorCode) {
      case "form_identifier_not_found":
        return "Nie znaleziono użytkownika z podanym adresem email";
      case "form_password_incorrect":
        return "Nieprawidłowe hasło";
      case "too_many_requests":
        return "Zbyt wiele prób logowania. Spróbuj ponownie za kilka minut";
      case "session_exists":
        return "Jesteś już zalogowany";
      default:
        if (errorMessage.toLowerCase().includes("identifier is invalid")) {
          return "Wprowadź prawidłowy adres email";
        }
        if (errorMessage.toLowerCase().includes("password")) {
          return "Nieprawidłowe hasło";
        }
        return "Wystąpił błąd podczas logowania. Spróbuj ponownie";
    }
  };

  const handleForgotPassword = async () => {
    if (!isLoaded || !signIn) {
      setError("System niedostępny. Spróbuj ponownie później.");
      return;
    }

    if (!formData.email.trim()) {
      setError("Wprowadź adres email, aby zresetować hasło");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      setError("Wprowadź prawidłowy adres email");
      return;
    }

    try {
      setError("");
      setResetPasswordLoading(true);

      await signIn.create({
        identifier: formData.email.trim(),
        strategy: "reset_password_email_code",
      });

      router.push(
        `/reset-password?email=${encodeURIComponent(formData.email.trim())}`
      );
    } catch (err) {
      console.error("Reset password error:", err);
      setError(getErrorMessage(err));
    } finally {
      setResetPasswordLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isLoaded || !signIn) {
      setError("System logowania niedostępny. Spróbuj ponownie później.");
      return;
    }

    if (!formData.email.trim()) {
      setError("Wprowadź adres email");
      return;
    }

    if (!formData.password) {
      setError("Wprowadź hasło");
      return;
    }

    try {
      setError("");
      setLoading(true);

      const result = await signIn.create({
        identifier: formData.email.trim(),
        password: formData.password,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/login"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Powrót
      </Link>

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Zaloguj się
        </h1>
        <p className="text-muted-foreground">
          Wprowadź swoje dane, aby uzyskać dostęp do konta
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleLogin} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="jan@example.com"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              className="h-11 pl-10"
              autoComplete="email"
              autoCapitalize="none"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Hasło</Label>
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={resetPasswordLoading}
              className="text-sm text-primary hover:text-primary-light disabled:opacity-50"
            >
              {resetPasswordLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Zapomniałeś hasła?"
              )}
            </button>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={passwordRef}
              id="password"
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => handleInputChange("password", e.target.value)}
              className="h-11 pl-10"
              autoComplete="current-password"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-error/10 p-3 text-sm text-error">
            {error}
          </div>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="h-11 w-full rounded-xl text-base font-semibold"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            "Zaloguj się"
          )}
        </Button>
      </form>

      {/* Register link */}
      <p className="text-center text-sm text-muted-foreground">
        Nie masz jeszcze konta?{" "}
        <Link
          href="/register"
          className="font-semibold text-primary hover:text-primary-light"
        >
          Zarejestruj się
        </Link>
      </p>
    </div>
  );
}








