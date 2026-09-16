"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/trpc/react";
import { signIn } from "@/lib/auth";
import { resolvePostLoginTarget } from "@/lib/post-login-redirect";
import { Button, Input, Label, Checkbox } from "@/app/_components/ui";
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

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const requestedRedirect =
    searchParams.get("redirect") ?? searchParams.get("callbackUrl");

  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState<string>("");

  const utils = api.useUtils();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const isEmail = emailOrUsername.includes("@");

      // Username sign-in goes through better-auth's username plugin directly —
      // the client must never be able to resolve username → e-mail address.
      const signInResult = isEmail
        ? await signIn.email({
            email: emailOrUsername,
            password,
            rememberMe,
          })
        : await signIn.username({
            username: emailOrUsername,
            password,
            rememberMe,
          });

      if (signInResult.error) {
        const errorMessage = (
          signInResult.error.message || signInResult.error.toString()
        ).toLowerCase();
        if (
          errorMessage.includes("verif") ||
          errorMessage.includes("not verified") ||
          errorMessage.includes("email verification") ||
          errorMessage.includes("verify your email")
        ) {
          if (isEmail) {
            setLoginEmail(emailOrUsername);
          }
          setError(
            isEmail
              ? "Deine E-Mail-Adresse wurde noch nicht verifiziert. Bitte überprüfe dein E-Mail-Postfach und klicke auf den Verifizierungslink."
              : "Deine E-Mail-Adresse wurde noch nicht verifiziert. Bitte melde dich mit deiner E-Mail-Adresse an, um die Verifizierungs-E-Mail erneut zu senden.",
          );
        } else {
          setError("Ungültige Anmeldedaten");
        }
        setIsLoading(false);
        return;
      }

      // Warm both caches so the dashboard guard doesn't re-fetch, and so
      // the redirect decision knows about dashboard access.
      const profile = await utils.users.getMyProfile.fetch();
      let hasDashboardAccess = false;
      if (profile?.id) {
        const permissions = await utils.permissions.getMyPermissions.fetch();
        hasDashboardAccess = !!permissions && permissions.length > 0;
      }

      router.push(
        resolvePostLoginTarget(requestedRedirect, hasDashboardAccess),
      );
    } catch {
      setError("Ungültige Anmeldedaten");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      {error && (
        <Note tone="error" className="mb-6">
          <p>{error}</p>
          {error.includes("verifiziert") && loginEmail && (
            <Link
              href={`/verify-email?email=${encodeURIComponent(loginEmail)}`}
              className="link-ink mt-2 inline-block text-sm"
            >
              Verifizierungs-E-Mail erneut senden
            </Link>
          )}
        </Note>
      )}

      <form className="space-y-6" onSubmit={handleEmailLogin}>
        <div>
          <Label htmlFor="emailOrUsername">E-Mail oder Benutzername</Label>
          <Input
            id="emailOrUsername"
            name="emailOrUsername"
            type="text"
            autoComplete="username"
            required
            value={emailOrUsername}
            onChange={(e) => setEmailOrUsername(e.target.value)}
          />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <Label htmlFor="password" className="mb-0">
              Passwort
            </Label>
            <Link href="/forgot-password" className="link-ink text-sm">
              Passwort vergessen?
            </Link>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="rememberMe"
            name="rememberMe"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
          />
          <Label htmlFor="rememberMe" className="mb-0">
            Angemeldet bleiben
          </Label>
        </div>

        <Button type="submit" isLoading={isLoading} className="w-full">
          Anmelden
        </Button>
      </form>

      <div className="border-rule dark:border-night-rule mt-8 space-y-3 border-t pt-6 text-center text-sm">
        <p className="text-dark dark:text-night-muted">
          Noch kein Konto?{" "}
          <Link href="/register" className="link-ink">
            Jetzt registrieren
          </Link>
        </p>
        <p className="text-dark dark:text-night-muted">
          Ohne Konto zu einem Kurs angemeldet?{" "}
          <Link href="/anmeldung-verwalten" className="link-ink">
            Anmeldung verwalten
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <PublicPage
      title="Anmelden"
      heroSize="compact"
      breadcrumbs={[{ label: "Start", href: "/" }, { label: "Anmelden" }]}
    >
      <PageSection flush="top">
        <Suspense fallback={<FormSkeleton />}>
          <LoginForm />
        </Suspense>
      </PageSection>
    </PublicPage>
  );
}
