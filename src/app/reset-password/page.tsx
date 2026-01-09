"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/app/_components/ui/toast";
import { CheckCircle, Lock, ArrowLeft } from "lucide-react";
import {
  Button,
  Input,
  Label,
  Alert,
  AlertDescription,
} from "@/app/_components/ui";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");

  if (!token) {
    return (
      <div className="bg-background-secondary dark:bg-dark-background-secondary flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="dark:bg-dark-surface rounded-lg bg-white p-6 shadow-lg md:p-8">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                <Lock className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
              <h1 className="text-dark dark:text-dark-text mb-2 text-3xl font-bold">
                Ungültiger Link
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Der Passwort-Reset-Link ist ungültig oder unvollständig. Bitte
                fordere einen neuen Link an.
              </p>
            </div>

            <div className="space-y-4">
              <Link
                href="/forgot-password"
                className="bg-primary hover:bg-primary-dark dark:bg-primary-light dark:hover:bg-primary block w-full rounded-lg px-4 py-2.5 text-center font-semibold text-white shadow-lg transition-colors"
              >
                Neuen Link anfordern
              </Link>

              <Link
                href="/login"
                className="text-primary hover:text-primary-dark dark:text-primary-light dark:hover:text-primary block text-center text-sm font-medium"
              >
                Zurück zur Anmeldung
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Das Passwort muss mindestens 8 Zeichen lang sein.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Die Passwörter stimmen nicht überein.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsSuccess(true);
        toast.success(
          data.message || "Passwort wurde erfolgreich zurückgesetzt.",
        );
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      } else {
        setError(data.error || "Fehler beim Zurücksetzen des Passworts.");
      }
    } catch {
      setError("Ein Fehler ist aufgetreten. Bitte versuche es später erneut.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="bg-background-secondary dark:bg-dark-background-secondary flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="dark:bg-dark-surface rounded-lg bg-white p-6 shadow-lg md:p-8">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="text-dark dark:text-dark-text mb-2 text-3xl font-bold">
                Passwort zurückgesetzt!
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Dein Passwort wurde erfolgreich zurückgesetzt. Du wirst
                automatisch zur Anmeldeseite weitergeleitet.
              </p>
            </div>

            <Link
              href="/login"
              className="bg-primary hover:bg-primary-dark dark:bg-primary-light dark:hover:bg-primary block w-full rounded-lg px-4 py-2.5 text-center font-semibold text-white shadow-lg transition-colors"
            >
              Zur Anmeldung
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background-secondary dark:bg-dark-background-secondary flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-dark dark:text-dark-text mb-2 text-3xl font-bold">
            Neues Passwort setzen
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gib dein neues Passwort ein. Es muss mindestens 8 Zeichen lang sein.
          </p>
        </div>

        <div className="dark:bg-dark-surface rounded-lg bg-white p-6 shadow-lg md:p-8">
          {error && (
            <Alert variant="error" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <Label htmlFor="password">Neues Passwort</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mindestens 8 Zeichen"
                minLength={8}
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword">Passwort bestätigen</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Passwort wiederholen"
                minLength={8}
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              isLoading={isLoading}
              className="w-full"
            >
              Passwort zurücksetzen
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="text-primary hover:text-primary-dark dark:text-primary-light dark:hover:text-primary inline-flex items-center gap-2 text-sm font-medium"
            >
              <ArrowLeft className="h-4 w-4" />
              Zurück zur Anmeldung
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
