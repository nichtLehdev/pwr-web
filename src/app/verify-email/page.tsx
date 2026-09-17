"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/app/_components/ui/toast";
import PublicPage from "@/app/_components/general/public-page";
import { PageSection } from "@/app/_components/programmheft/page-section";
import { Note } from "@/app/_components/programmheft/note";

/** Primäraktion als Link statt Knopf (Weiterleitung, kein Submit). */
const PRIMARY_LINK =
  "semi-condensed bg-ink text-paper hover:bg-dark dark:bg-night-text dark:text-night dark:hover:bg-night-muted inline-flex min-h-12 w-full items-center justify-center px-6 text-lg font-semibold transition-colors";

/** Platzhalter, während `useSearchParams` (E-Mail/Token aus der URL) lädt. */
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

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const toast = useToast();
  const email = searchParams.get("email");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<
    "pending" | "success" | "error"
  >("pending");
  const [error, setError] = useState("");

  const token = searchParams.get("token");

  useEffect(() => {
    if (token) {
      verifyEmail(token);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const verifyEmail = async (verificationToken: string) => {
    setIsVerifying(true);
    setError("");

    try {
      const verificationUrl = new URL(
        "/api/auth/verify-email-custom",
        window.location.origin,
      );
      verificationUrl.searchParams.set("token", verificationToken);
      if (email) {
        verificationUrl.searchParams.set("email", email);
      }

      const response = await fetch(verificationUrl.toString(), {
        method: "GET",
      });

      if (response.ok) {
        const data = await response.json();
        if (data.error) {
          setError(
            data.error ||
              "Der Verifizierungslink ist ungültig oder abgelaufen.",
          );
          setVerificationStatus("error");
        } else {
          setVerificationStatus("success");
        }
      } else {
        const data = await response.json().catch(() => ({}));
        setError(
          data.error || "Der Verifizierungslink ist ungültig oder abgelaufen.",
        );
        setVerificationStatus("error");
      }
    } catch {
      setError("Ein Fehler ist aufgetreten. Bitte versuche es erneut.");
      setVerificationStatus("error");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendEmail = async () => {
    if (!email) {
      setError("E-Mail-Adresse nicht gefunden.");
      return;
    }

    setIsVerifying(true);
    setError("");

    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setError("");
        toast.success(
          "Eine neue Verifizierungs-E-Mail wurde an deine E-Mail-Adresse gesendet.",
        );
      } else {
        const data = await response.json().catch(() => ({}));
        setError(
          data.message ||
            "Fehler beim Senden der E-Mail. Bitte versuche es später erneut.",
        );
      }
    } catch {
      setError("Ein Fehler ist aufgetreten. Bitte versuche es erneut.");
    } finally {
      setIsVerifying(false);
    }
  };

  if (verificationStatus === "success") {
    return (
      <div className="mx-auto max-w-md">
        <Note tone="info" title="E-Mail bestätigt!">
          <p>
            Deine E-Mail-Adresse wurde erfolgreich bestätigt. Du kannst dich
            jetzt anmelden.
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
      <p className="text-ink dark:text-night-text text-lg leading-relaxed">
        {token
          ? "Bitte warte, während wir deine E-Mail-Adresse bestätigen..."
          : email
            ? `Wir haben eine Bestätigungs-E-Mail an ${email} gesendet.`
            : "Bitte bestätige deine E-Mail-Adresse."}
      </p>

      {error && (
        <Note tone="error" className="mt-6">
          <p>{error}</p>
        </Note>
      )}

      {isVerifying && (
        <div className="mt-6 flex justify-center">
          <div
            className="border-ink dark:border-night-text h-6 w-6 animate-spin rounded-full border-2 border-t-transparent"
            aria-hidden
          />
          <span className="sr-only">Wird überprüft…</span>
        </div>
      )}

      {!token && (
        <div className="mt-8 space-y-6">
          <Note tone="info" title="Nächste Schritte">
            <ul className="list-inside list-disc space-y-1">
              <li>Öffne dein E-Mail-Postfach</li>
              <li>Klicke auf den Link in der E-Mail</li>
              <li>Oder kopiere den Link in deinen Browser</li>
            </ul>
          </Note>

          {email && (
            <button
              onClick={handleResendEmail}
              disabled={isVerifying}
              className="link-ink block w-full text-center text-sm disabled:opacity-50"
            >
              E-Mail erneut senden
            </button>
          )}

          <div className="border-rule dark:border-night-rule border-t pt-6 text-center">
            <Link href="/login" className="link-ink text-sm">
              Zurück zur Anmeldung
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <PublicPage
      title="E-Mail bestätigen"
      heroSize="compact"
      breadcrumbs={[
        { label: "Start", href: "/" },
        { label: "E-Mail bestätigen" },
      ]}
    >
      <PageSection flush="top">
        <Suspense fallback={<FormSkeleton />}>
          <VerifyEmailContent />
        </Suspense>
      </PageSection>
    </PublicPage>
  );
}
