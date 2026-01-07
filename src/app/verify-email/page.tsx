"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/app/_components/ui/toast";
import { CheckCircle, Mail } from "lucide-react";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const toast = useToast();
  const email = searchParams.get("email");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<
    "pending" | "success" | "error"
  >("pending");
  const [error, setError] = useState("");

  // Check if user came from email link
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
      // Use our custom verification endpoint
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
      <div className="bg-background-secondary dark:bg-dark-background-secondary flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="dark:bg-dark-surface dark:shadow-dark-border rounded-lg bg-white p-6 shadow-lg md:p-8">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="text-dark dark:text-dark-text mb-2 text-3xl font-bold">
                E-Mail bestätigt!
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Deine E-Mail-Adresse wurde erfolgreich bestätigt. Du kannst dich
                jetzt anmelden.
              </p>
            </div>

            <Link
              href="/login"
              className="bg-primary hover:bg-primary-dark block w-full rounded-lg px-4 py-2.5 text-center font-semibold text-white shadow-lg transition-colors"
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
        <div className="dark:bg-dark-surface dark:shadow-dark-border rounded-lg bg-white p-6 shadow-lg md:p-8">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20">
              <Mail className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-dark dark:text-dark-text mb-2 text-3xl font-bold">
              E-Mail bestätigen
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {token
                ? "Bitte warte, während wir deine E-Mail-Adresse bestätigen..."
                : email
                  ? `Wir haben eine Bestätigungs-E-Mail an ${email} gesendet.`
                  : "Bitte bestätige deine E-Mail-Adresse."}
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-md border-l-4 border-red-500 bg-red-50 p-3 dark:bg-red-900/20">
              <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
            </div>
          )}

          {isVerifying && (
            <div className="mb-4 text-center">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
            </div>
          )}

          {!token && (
            <div className="space-y-4">
              <div className="rounded-md bg-blue-50 p-4 dark:bg-blue-900/20">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  <strong>Nächste Schritte:</strong>
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-blue-700 dark:text-blue-400">
                  <li>Öffne dein E-Mail-Postfach</li>
                  <li>Klicke auf den Link in der E-Mail</li>
                  <li>Oder kopiere den Link in deinen Browser</li>
                </ul>
              </div>

              {email && (
                <button
                  onClick={handleResendEmail}
                  disabled={isVerifying}
                  className="text-primary hover:text-primary-dark w-full text-center text-sm font-medium underline disabled:opacity-50"
                >
                  E-Mail erneut senden
                </button>
              )}

              <div className="pt-4">
                <Link
                  href="/login"
                  className="text-primary hover:text-primary-dark block text-center text-sm font-medium"
                >
                  Zurück zur Anmeldung
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-background-secondary dark:bg-dark-background-secondary flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-8">
          <div className="w-full max-w-md">
            <div className="dark:bg-dark-surface dark:shadow-dark-border rounded-lg bg-white p-6 shadow-lg md:p-8">
              <div className="mb-6 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
                </div>
                <h1 className="text-dark dark:text-dark-text mb-2 text-3xl font-bold">
                  E-Mail bestätigen
                </h1>
                <p className="text-gray-600 dark:text-gray-400">Lade...</p>
              </div>
            </div>
          </div>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
