"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { signUp } from "@/lib/auth";
import { api } from "@/trpc/react";
import {
  Button,
  Input,
  Label,
  PasswordStrengthMeter,
} from "@/app/_components/ui";
import PublicPage from "@/app/_components/general/public-page";
import { PageSection } from "@/app/_components/programmheft/page-section";
import { Note } from "@/app/_components/programmheft/note";
import { PASSWORD_MIN_LENGTH } from "@/lib/password-strength";

/** Statuszeile unter einem Feld: neutral schiefergrau, verfügbar grün, vergeben rot. */
const STATUS_TEXT: Record<"checking" | "available" | "unavailable", string> = {
  checking: "text-dark dark:text-night-muted",
  available: "text-green-600 dark:text-green-400",
  unavailable: "text-red-600 dark:text-red-400",
};

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    username: "",
  });
  const [usernameEdited, setUsernameEdited] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [debouncedUsername, setDebouncedUsername] = useState("");
  const [debouncedEmail, setDebouncedEmail] = useState("");

  const isValidEmail = (emailToCheck: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(emailToCheck);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.username.length >= 3) {
        setDebouncedUsername(formData.username);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.username]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isValidEmail(formData.email)) {
        setDebouncedEmail(formData.email);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.email]);

  const checkUsernameQuery = api.users.checkUsername.useQuery(
    { username: debouncedUsername },
    {
      enabled: debouncedUsername.length >= 3,
      refetchOnWindowFocus: false,
    },
  );

  const checkEmailQuery = api.users.checkEmail.useQuery(
    { email: debouncedEmail },
    {
      enabled: isValidEmail(debouncedEmail),
      refetchOnWindowFocus: false,
    },
  );

  const usernameStatus = useMemo(() => {
    if (formData.username.length < 3) {
      return {
        checking: false,
        available: null as boolean | null,
        message: formData.username.length > 0 ? "Mindestens 3 Zeichen" : "",
      };
    }
    if (
      formData.username !== debouncedUsername ||
      checkUsernameQuery.isLoading
    ) {
      return {
        checking: true,
        available: null as boolean | null,
        message: "Wird geprüft...",
      };
    }
    if (checkUsernameQuery.data) {
      return {
        checking: false,
        available: checkUsernameQuery.data.available,
        message: checkUsernameQuery.data.available
          ? "✓ Benutzername verfügbar"
          : "✗ Benutzername bereits vergeben",
      };
    }
    return { checking: false, available: null as boolean | null, message: "" };
  }, [
    formData.username,
    debouncedUsername,
    checkUsernameQuery.isLoading,
    checkUsernameQuery.data,
  ]);

  const emailStatus = useMemo(() => {
    if (!formData.email || !isValidEmail(formData.email)) {
      return {
        checking: false,
        available: null as boolean | null,
        message: "",
      };
    }
    if (formData.email !== debouncedEmail || checkEmailQuery.isLoading) {
      return {
        checking: true,
        available: null as boolean | null,
        message: "Wird geprüft...",
      };
    }
    if (checkEmailQuery.data) {
      return {
        checking: false,
        available: checkEmailQuery.data.available,
        message: checkEmailQuery.data.available
          ? "✓ E-Mail verfügbar"
          : "✗ E-Mail bereits registriert",
      };
    }
    return { checking: false, available: null as boolean | null, message: "" };
  }, [
    formData.email,
    debouncedEmail,
    checkEmailQuery.isLoading,
    checkEmailQuery.data,
  ]);

  // Erst warnen, wenn das Bestätigungsfeld angefasst wurde.
  const passwordsMatch = formData.password === formData.confirmPassword;
  const showMismatch =
    confirmTouched && formData.confirmPassword.length > 0 && !passwordsMatch;

  // Gesperrt nur, wenn das Formular garantiert scheitern würde: Laufende
  // Verfügbarkeitsprüfungen sperren nicht, nur ein bekanntes "vergeben".
  const canSubmit =
    formData.firstName.trim().length > 0 &&
    formData.lastName.trim().length > 0 &&
    formData.username.trim().length >= 3 &&
    isValidEmail(formData.email) &&
    formData.password.length >= PASSWORD_MIN_LENGTH &&
    passwordsMatch &&
    usernameStatus.available !== false &&
    emailStatus.available !== false;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setFormData((prev) => {
      const updated = { ...prev, [name]: value };

      if ((name === "firstName" || name === "lastName") && !usernameEdited) {
        const firstName = name === "firstName" ? value : prev.firstName;
        const lastName = name === "lastName" ? value : prev.lastName;

        if (firstName && lastName) {
          updated.username =
            `${firstName.toLowerCase()}.${lastName.toLowerCase()}`
              .normalize("NFD")
              .replace(/[̀-ͯ]/g, "")
              .replace(/[^a-z0-9.]/g, "");
        }
      }

      return updated;
    });

    if (name === "username") {
      setUsernameEdited(true);
    }

    if (name === "confirmPassword") {
      setConfirmTouched(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.password.length < PASSWORD_MIN_LENGTH) {
      setError(
        `Passwort muss mindestens ${PASSWORD_MIN_LENGTH} Zeichen lang sein`,
      );
      return;
    }

    if (!passwordsMatch) {
      setError("Die Passwörter stimmen nicht überein");
      return;
    }

    if (usernameStatus.available === false) {
      setError("Bitte wähle einen verfügbaren Benutzernamen");
      return;
    }

    if (emailStatus.available === false) {
      setError("Diese E-Mail-Adresse ist bereits registriert");
      return;
    }

    setIsLoading(true);

    try {
      await signUp.email({
        email: formData.email,
        password: formData.password,
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        username:
          formData.username || `${formData.firstName}.${formData.lastName}`,
        firstName: formData.firstName,
        lastName: formData.lastName,
      });

      console.log("Registration successful, sending verification email...");

      try {
        const response = await fetch("/api/auth/send-verification", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: formData.email }),
        });

        if (!response.ok) {
          console.error(
            "Failed to send verification email:",
            await response.text(),
          );
        } else {
          console.log("Verification email sent successfully");
        }
      } catch (emailError) {
        console.error("Error triggering verification email:", emailError);
      }

      router.push(`/verify-email?email=${encodeURIComponent(formData.email)}`);
    } catch (err) {
      setError(
        "Registrierung fehlgeschlagen. E-Mail könnte bereits verwendet werden.",
      );
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PublicPage
      title="Konto erstellen"
      heroSize="compact"
      breadcrumbs={[
        { label: "Start", href: "/" },
        { label: "Konto erstellen" },
      ]}
    >
      <PageSection flush="top">
        <div className="mx-auto max-w-md">
          {error && (
            <Note tone="error" className="mb-6">
              <p>{error}</p>
            </Note>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName" required>
                  Vorname
                </Label>
                <Input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  maxLength={100}
                  value={formData.firstName}
                  onChange={handleChange}
                />
              </div>

              <div>
                <Label htmlFor="lastName" required>
                  Nachname
                </Label>
                <Input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  maxLength={100}
                  value={formData.lastName}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="username" required>
                Benutzername
              </Label>
              <Input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                value={formData.username}
                minLength={3}
                maxLength={30}
                pattern="[a-zA-Z0-9_.-]+"
                title="Nur Buchstaben, Zahlen, Unterstrich, Bindestrich und Punkt erlaubt"
                onChange={handleChange}
                error={usernameStatus.available === false}
                className={
                  usernameStatus.available === true
                    ? "border-green-600 dark:border-green-400"
                    : ""
                }
              />
              {usernameStatus.message ? (
                <p
                  className={`mt-1 flex items-center gap-1 text-xs ${
                    usernameStatus.checking
                      ? STATUS_TEXT.checking
                      : usernameStatus.available
                        ? STATUS_TEXT.available
                        : STATUS_TEXT.unavailable
                  }`}
                >
                  {usernameStatus.checking && (
                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  )}
                  {usernameStatus.message}
                </p>
              ) : (
                <p className="text-dark dark:text-night-muted mt-1 text-xs">
                  Wird automatisch aus Vor- und Nachname generiert
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="email" required>
                E-Mail-Adresse
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                error={emailStatus.available === false}
                className={
                  emailStatus.available === true
                    ? "border-green-600 dark:border-green-400"
                    : ""
                }
              />
              {emailStatus.message && (
                <p
                  className={`mt-1 flex items-center gap-1 text-xs ${
                    emailStatus.checking
                      ? STATUS_TEXT.checking
                      : emailStatus.available
                        ? STATUS_TEXT.available
                        : STATUS_TEXT.unavailable
                  }`}
                >
                  {emailStatus.checking && (
                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  )}
                  {emailStatus.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="password" required>
                Passwort
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={
                    showPassword ? "Passwort verbergen" : "Passwort anzeigen"
                  }
                  className="text-dark hover:text-ink dark:text-night-muted dark:hover:text-night-text absolute top-1/2 right-3 -translate-y-1/2"
                >
                  {showPassword ? (
                    <EyeOffIcon className="h-4 w-4" />
                  ) : (
                    <EyeIcon className="h-4 w-4" />
                  )}
                </button>
              </div>
              <PasswordStrengthMeter password={formData.password} />
              {!formData.password && (
                <p className="text-dark dark:text-night-muted mt-1 text-xs">
                  Mindestens {PASSWORD_MIN_LENGTH} Zeichen
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="confirmPassword" required>
                Passwort bestätigen
              </Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                onBlur={() => setConfirmTouched(true)}
                error={showMismatch}
                className={
                  formData.confirmPassword.length > 0 && passwordsMatch
                    ? "border-green-600 dark:border-green-400"
                    : ""
                }
              />
              {showMismatch ? (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  ✗ Die Passwörter stimmen nicht überein
                </p>
              ) : (
                formData.confirmPassword.length > 0 && (
                  <p className="mt-1 text-xs text-green-600 dark:text-green-400">
                    ✓ Passwörter stimmen überein
                  </p>
                )
              )}
            </div>

            <Button
              type="submit"
              isLoading={isLoading}
              disabled={!canSubmit}
              className="w-full"
            >
              Konto erstellen
            </Button>

            <p className="text-dark dark:text-night-muted text-center text-xs">
              Mit der Registrierung nimmst du unsere{" "}
              <Link href="/datenschutz" className="link-ink">
                Datenschutzerklärung
              </Link>{" "}
              zur Kenntnis.
            </p>
          </form>

          <p className="border-rule dark:border-night-rule text-dark dark:text-night-muted mt-8 border-t pt-6 text-center text-sm">
            Bereits ein Konto?{" "}
            <Link href="/login" className="link-ink">
              Jetzt anmelden
            </Link>
          </p>
        </div>
      </PageSection>
    </PublicPage>
  );
}
