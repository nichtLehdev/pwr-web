"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useToast } from "@/app/_components/ui/toast";
import { ArrowLeft } from "lucide-react";
import { Button, Input, Label } from "@/app/_components/ui";
import PublicPage from "@/app/_components/general/public-page";
import { PageSection } from "@/app/_components/programmheft/page-section";
import { Note } from "@/app/_components/programmheft/note";

/** Platzhalter, während der Formularabschnitt lädt. */
function FormSkeleton() {
  return (
    <div className="flex justify-center py-12">
      <div
        className="border-ink dark:border-night-text h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
        aria-hidden
      />
      <span className="sr-only">Lädt…</span>
    </div>
  );
}

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
      <div className="mx-auto max-w-md">
        <Note tone="info" title="E-Mail gesendet">
          <p>
            Falls ein Konto mit dieser E-Mail existiert, wurde eine E-Mail zum
            Zurücksetzen des Passworts gesendet. Bitte überprüfe dein
            E-Mail-Postfach und folge den Anweisungen.
          </p>
        </Note>

        <Link
          href="/login"
          className="link-ink mt-8 inline-flex items-center gap-2 text-sm"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Zurück zur Anmeldung
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <p className="text-ink dark:text-night-text mb-8 text-lg leading-relaxed">
        Gib deine E-Mail-Adresse ein und wir senden dir einen Link zum
        Zurücksetzen deines Passworts.
      </p>

      <form className="space-y-6" onSubmit={handleSubmit}>
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

      <Link
        href="/login"
        className="link-ink mt-8 inline-flex items-center gap-2 text-sm"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Zurück zur Anmeldung
      </Link>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <PublicPage
      title="Passwort vergessen?"
      heroSize="compact"
      breadcrumbs={[
        { label: "Start", href: "/" },
        { label: "Passwort vergessen?" },
      ]}
    >
      <PageSection flush="top">
        <Suspense fallback={<FormSkeleton />}>
          <ForgotPasswordForm />
        </Suspense>
      </PageSection>
    </PublicPage>
  );
}
