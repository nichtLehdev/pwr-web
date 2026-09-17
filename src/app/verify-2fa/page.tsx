"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { resolvePostLoginTarget } from "@/lib/post-login-redirect";
import { api } from "@/trpc/react";
import Link from "next/link";
import { useToast } from "@/app/_components/ui/toast";
import { ArrowLeft } from "lucide-react";
import { twoFactor } from "@/lib/auth";
import { Button, Input, Label } from "@/app/_components/ui";
import PublicPage from "@/app/_components/general/public-page";
import { PageSection } from "@/app/_components/programmheft/page-section";
import { Note } from "@/app/_components/programmheft/note";

/** Platzhalter, während `useSearchParams` (Redirect-Ziel) noch lädt. */
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
    <div className="mx-auto max-w-md">
      <p className="text-ink dark:text-night-text mb-8 text-lg leading-relaxed">
        Gib den Code aus deiner Authenticator-App ein, um dich anzumelden
      </p>

      {error && (
        <Note tone="error" className="mb-6">
          <p>{error}</p>
        </Note>
      )}

      <form className="space-y-6" onSubmit={handleVerify}>
        {!useBackupCode ? (
          <div>
            <Label htmlFor="code">Verifizierungscode</Label>
            <Input
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
              className="text-center font-mono text-lg tracking-[0.3em]"
              autoFocus
            />
            <p className="text-dark dark:text-night-muted mt-2 text-xs">
              Öffne deine Authenticator-App und gib den 6-stelligen Code ein
            </p>
          </div>
        ) : (
          <div>
            <Label htmlFor="backupCode">Backup-Code</Label>
            <Input
              id="backupCode"
              name="backupCode"
              type="text"
              required
              value={backupCode}
              onChange={(e) => setBackupCode(e.target.value)}
              placeholder="Dein Backup-Code"
              className="font-mono"
              autoFocus
            />
            <p className="text-dark dark:text-night-muted mt-2 text-xs">
              Gib einen deiner Backup-Codes ein
            </p>
          </div>
        )}

        <Button
          type="submit"
          isLoading={isVerifying}
          disabled={
            isVerifying ||
            (!useBackupCode && code.length !== 6) ||
            (useBackupCode && !backupCode.trim())
          }
          className="w-full"
        >
          Verifizieren
        </Button>

        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              setUseBackupCode(!useBackupCode);
              setCode("");
              setBackupCode("");
              setError("");
            }}
            className="link-ink text-sm"
          >
            {useBackupCode
              ? "Stattdessen Authenticator-Code verwenden"
              : "Backup-Code verwenden"}
          </button>
        </div>
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

export default function Verify2FAPage() {
  return (
    <PublicPage
      title="Zwei-Faktor-Authentifizierung"
      heroSize="compact"
      breadcrumbs={[
        { label: "Start", href: "/" },
        { label: "Zwei-Faktor-Authentifizierung" },
      ]}
    >
      <PageSection flush="top">
        <Suspense fallback={<FormSkeleton />}>
          <Verify2FAContent />
        </Suspense>
      </PageSection>
    </PublicPage>
  );
}
