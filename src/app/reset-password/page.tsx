"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/app/_components/ui/toast";
import { ArrowLeft } from "lucide-react";
import { Button, Input, Label } from "@/app/_components/ui";
import PublicPage from "@/app/_components/general/public-page";
import { PageSection } from "@/app/_components/programmheft/page-section";
import { Note } from "@/app/_components/programmheft/note";

/** Primäraktion als Link statt Knopf (Weiterleitung, kein Submit). */
const PRIMARY_LINK =
  "semi-condensed bg-ink text-paper hover:bg-dark dark:bg-night-text dark:text-night dark:hover:bg-night-muted inline-flex min-h-12 w-full items-center justify-center px-6 text-lg font-semibold transition-colors";

/** Platzhalter, während der Formularabschnitt (Token aus der URL) lädt. */
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
      <div className="mx-auto max-w-md">
        <Note tone="error" title="Ungültiger Link">
          <p>
            Der Passwort-Reset-Link ist ungültig oder unvollständig. Bitte
            fordere einen neuen Link an.
          </p>
        </Note>

        <div className="mt-8 space-y-4">
          <Link href="/forgot-password" className={PRIMARY_LINK}>
            Neuen Link anfordern
          </Link>

          <Link href="/login" className="link-ink block text-center text-sm">
            Zurück zur Anmeldung
          </Link>
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
      <div className="mx-auto max-w-md">
        <Note tone="info" title="Passwort zurückgesetzt!">
          <p>
            Dein Passwort wurde erfolgreich zurückgesetzt. Du wirst automatisch
            zur Anmeldeseite weitergeleitet.
          </p>
        </Note>

        <Link href="/login" className={`${PRIMARY_LINK} mt-8`}>
          Zur Anmeldung
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <p className="text-ink dark:text-night-text mb-8 text-lg leading-relaxed">
        Gib dein neues Passwort ein. Es muss mindestens 8 Zeichen lang sein.
      </p>

      {error && (
        <Note tone="error" className="mb-6">
          <p>{error}</p>
        </Note>
      )}

      <form className="space-y-6" onSubmit={handleSubmit}>
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

export default function ResetPasswordPage() {
  return (
    <PublicPage
      title="Passwort zurücksetzen"
      heroSize="compact"
      breadcrumbs={[
        { label: "Start", href: "/" },
        { label: "Passwort zurücksetzen" },
      ]}
    >
      <PageSection flush="top">
        <Suspense fallback={<FormSkeleton />}>
          <ResetPasswordContent />
        </Suspense>
      </PageSection>
    </PublicPage>
  );
}
