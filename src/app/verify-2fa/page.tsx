"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { resolvePostLoginTarget } from "@/lib/post-login-redirect";
import { api } from "@/trpc/react";
import Link from "next/link";
import { useToast } from "@/app/_components/ui/toast";
import { Shield, ArrowLeft } from "lucide-react";
import { twoFactor } from "@/lib/auth";

function Verify2FAContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [code, setCode] = useState("");
  const [backupCode, setBackupCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState("");
  const [useBackupCode, setUseBackupCode] = useState(false);
  const utils = api.useUtils();

  // Same routing rule as the password login and the OAuth callback: an
  // explicit redirect target wins, dashboard only as permission fallback.
  const finishLogin = async () => {
    toast.success("Erfolgreich verifiziert!");
    let hasDashboardAccess = false;
    try {
      const permissions = await utils.permissions.getMyPermissions.fetch();
      hasDashboardAccess = !!permissions && permissions.length > 0;
    } catch {
      // No permissions readable — treat as a regular user.
    }
    router.push(
      resolvePostLoginTarget(searchParams.get("redirect"), hasDashboardAccess),
    );
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (useBackupCode) {
      if (!backupCode.trim()) {
        setError("Bitte gib einen Backup-Code ein");
        return;
      }

      setIsVerifying(true);

      try {
        const result = await twoFactor.verifyBackupCode({
          code: backupCode.trim(),
          trustDevice: true,
        });

        if (result.error) {
          setError(
            result.error.message ||
              "Ungültiger Backup-Code. Bitte versuche es erneut.",
          );
        } else {
          await finishLogin();
        }
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Fehler bei der Verifizierung",
        );
      } finally {
        setIsVerifying(false);
      }
    } else {
      if (code.length !== 6) {
        setError("Bitte gib einen 6-stelligen Code ein");
        return;
      }

      setIsVerifying(true);

      try {
        const result = await twoFactor.verifyTotp({
          code,
          trustDevice: true,
        });

        if (result.error) {
          setError(
            result.error.message ||
              "Ungültiger Code. Bitte versuche es erneut.",
          );
        } else {
          await finishLogin();
        }
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Fehler bei der Verifizierung",
        );
      } finally {
        setIsVerifying(false);
      }
    }
  };

  return (
    <div className="bg-background-secondary dark:bg-dark-background-secondary flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="bg-primary/10 dark:bg-primary-light/20 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
            <Shield className="text-primary dark:text-primary-light h-8 w-8" />
          </div>
          <h1 className="text-dark dark:text-dark-text mb-2 text-3xl font-bold">
            Zwei-Faktor-Authentifizierung
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gib den Code aus deiner Authenticator-App ein, um dich anzumelden
          </p>
        </div>

        <div className="dark:bg-dark-surface rounded-lg bg-white p-6 shadow-lg md:p-8">
          {error && (
            <div className="mb-4 rounded-md border-l-4 border-red-500 bg-red-50 p-3 dark:border-red-400 dark:bg-red-900/20">
              <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleVerify}>
            {!useBackupCode ? (
              <div>
                <label
                  htmlFor="code"
                  className="text-dark dark:text-dark-text mb-1 block text-sm font-medium"
                >
                  Verifizierungscode
                </label>
                <input
                  id="code"
                  name="code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  value={code}
                  onChange={(e) =>
                    setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="123456"
                  className="focus:border-primary focus:ring-primary dark:bg-dark-background-secondary text-dark dark:text-dark-text dark:border-dark-border block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-center font-mono text-lg shadow-sm focus:ring-1 focus:outline-none"
                  autoFocus
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Öffne deine Authenticator-App und gib den 6-stelligen Code ein
                </p>
              </div>
            ) : (
              <div>
                <label
                  htmlFor="backupCode"
                  className="text-dark dark:text-dark-text mb-1 block text-sm font-medium"
                >
                  Backup-Code
                </label>
                <input
                  id="backupCode"
                  name="backupCode"
                  type="text"
                  required
                  value={backupCode}
                  onChange={(e) => setBackupCode(e.target.value)}
                  placeholder="Dein Backup-Code"
                  className="focus:border-primary focus:ring-primary dark:bg-dark-background-secondary text-dark dark:text-dark-text dark:border-dark-border block w-full rounded-md border border-gray-300 bg-white px-3 py-2 font-mono shadow-sm focus:ring-1 focus:outline-none"
                  autoFocus
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Gib einen deiner Backup-Codes ein
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={
                isVerifying ||
                (!useBackupCode && code.length !== 6) ||
                (useBackupCode && !backupCode.trim())
              }
              className="bg-primary hover:bg-primary-dark dark:bg-primary-light dark:hover:bg-primary w-full rounded-lg px-4 py-2.5 font-semibold text-white shadow-lg transition-colors disabled:opacity-50"
            >
              {isVerifying ? "Wird verifiziert..." : "Verifizieren"}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setUseBackupCode(!useBackupCode);
                  setCode("");
                  setBackupCode("");
                  setError("");
                }}
                className="text-primary hover:text-primary-dark dark:text-primary-light dark:hover:text-primary text-sm font-medium"
              >
                {useBackupCode
                  ? "Stattdessen Authenticator-Code verwenden"
                  : "Backup-Code verwenden"}
              </button>
            </div>
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

export default function Verify2FAPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
        </div>
      }
    >
      <Verify2FAContent />
    </Suspense>
  );
}
