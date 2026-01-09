"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/trpc/react";
import { signIn } from "@/lib/auth";
import { UserRole } from "~/generated/prisma/enums";

const DASHBOARD_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.LPW,
  UserRole.RPW,
  UserRole.OBLEUTE,
];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const redirectTo =
    searchParams.get("redirect") ?? searchParams.get("callbackUrl") ?? "/";

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
      let loginEmail = emailOrUsername;

      if (!isEmail) {
        try {
          const result = await utils.users.getEmailByUsername.fetch({
            username: emailOrUsername,
          });

          if (!result.email) {
            setError("Benutzername nicht gefunden");
            setIsLoading(false);
            return;
          }

          loginEmail = result.email;
        } catch {
          setError("Benutzername nicht gefunden");
          setIsLoading(false);
          return;
        }
      }

      const signInResult = await signIn.email({
        email: loginEmail,
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
          setLoginEmail(loginEmail);
          setError(
            "Deine E-Mail-Adresse wurde noch nicht verifiziert. Bitte überprüfe dein E-Mail-Postfach und klicke auf den Verifizierungslink.",
          );
        } else {
          setError("Ungültige Anmeldedaten");
        }
        setIsLoading(false);
        return;
      }

      const profile = await utils.users.getMyProfile.fetch();

      if (profile?.role && DASHBOARD_ROLES.includes(profile.role as UserRole)) {
        router.push("/dashboard");
      } else {
        router.push(redirectTo);
      }
    } catch {
      setError("Ungültige Anmeldedaten");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-background-secondary dark:bg-dark-background-secondary flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-dark dark:text-dark-text mb-2 text-3xl font-bold">
            Anmelden
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Noch kein Konto?{" "}
            <Link
              href="/register"
              className="text-primary hover:text-primary-dark font-medium"
            >
              Jetzt registrieren
            </Link>
          </p>
        </div>

        <div className="dark:bg-dark-surface rounded-lg bg-white p-6 shadow-lg md:p-8">
          {error && (
            <div className="mb-4 rounded-md border-l-4 border-red-500 bg-red-50 p-3 dark:border-red-400 dark:bg-red-900/20">
              <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
              {error.includes("verifiziert") && loginEmail && (
                <Link
                  href={`/verify-email?email=${encodeURIComponent(loginEmail)}`}
                  className="mt-2 block text-sm font-medium text-red-700 underline dark:text-red-300"
                >
                  Verifizierungs-E-Mail erneut senden
                </Link>
              )}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleEmailLogin}>
            <div>
              <label
                htmlFor="emailOrUsername"
                className="text-dark dark:text-dark-text mb-1 block text-sm font-medium"
              >
                E-Mail oder Benutzername
              </label>
              <input
                id="emailOrUsername"
                name="emailOrUsername"
                type="text"
                autoComplete="username"
                required
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                className="focus:border-primary focus:ring-primary dark:bg-dark-background-secondary text-dark dark:text-dark-text dark:border-dark-border block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:ring-1 focus:outline-none"
              />
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="text-dark dark:text-dark-text block text-sm font-medium"
                >
                  Passwort
                </label>
                <Link
                  href="/forgot-password"
                  className="text-primary hover:text-primary-dark dark:text-primary-light dark:hover:text-primary text-sm font-medium"
                >
                  Passwort vergessen?
                </Link>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="focus:border-primary focus:ring-primary dark:bg-dark-background-secondary text-dark dark:text-dark-text dark:border-dark-border block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:ring-1 focus:outline-none"
              />
            </div>

            <div className="flex items-center">
              <input
                id="rememberMe"
                name="rememberMe"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="focus:ring-primary text-primary h-4 w-4 rounded border-gray-300 focus:ring-2"
              />
              <label
                htmlFor="rememberMe"
                className="text-dark dark:text-dark-text ml-2 block text-sm"
              >
                Angemeldet bleiben
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="bg-primary hover:bg-primary-dark dark:bg-primary-light dark:hover:bg-primary w-full rounded-lg px-4 py-2.5 font-semibold text-white shadow-lg transition-colors disabled:opacity-50"
            >
              {isLoading ? "Wird angemeldet..." : "Anmelden"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
