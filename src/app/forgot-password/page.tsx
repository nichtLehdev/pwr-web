"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useToast } from "@/app/_components/ui/toast";
import { Mail, ArrowLeft } from "lucide-react";
import { Button, Input, Label } from "@/app/_components/ui";

function ForgotPasswordForm() {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsSuccess(true);
        toast.success(data.message || "E-Mail wurde gesendet.");
      } else {
        toast.error(data.message || "Fehler beim Senden der E-Mail.");
      }
    } catch {
      toast.error(
        "Ein Fehler ist aufgetreten. Bitte versuche es später erneut.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="bg-background-secondary dark:bg-dark-background-secondary flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="dark:bg-dark-surface rounded-lg bg-white p-6 shadow-lg md:p-8">
            <div className="mb-4 text-center">
              <div className="bg-primary/10 dark:bg-primary-light/20 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
                <Mail className="text-primary dark:text-primary-light h-8 w-8" />
              </div>
              <h1 className="text-dark dark:text-dark-text mb-2 text-2xl font-bold">
                E-Mail gesendet
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Falls ein Konto mit dieser E-Mail existiert, wurde eine E-Mail
                zum Zurücksetzen des Passworts gesendet. Bitte überprüfe dein
                E-Mail-Postfach und folge den Anweisungen.
              </p>
            </div>

            <div className="mt-6 text-center">
              <Link
                href="/login"
                className="text-primary hover:text-primary-dark dark:text-primary-light dark:hover:text-primary inline-flex items-center gap-2 font-medium"
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

  return (
    <div className="bg-background-secondary dark:bg-dark-background-secondary flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-dark dark:text-dark-text mb-2 text-3xl font-bold">
            Passwort vergessen?
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gib deine E-Mail-Adresse ein und wir senden dir einen Link zum
            Zurücksetzen deines Passworts.
          </p>
        </div>

        <div className="dark:bg-dark-surface rounded-lg bg-white p-6 shadow-lg md:p-8">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <Label htmlFor="email">E-Mail-Adresse</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="deine@email.de"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              isLoading={isLoading}
              className="w-full"
            >
              Link senden
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

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
        </div>
      }
    >
      <ForgotPasswordForm />
    </Suspense>
  );
}
