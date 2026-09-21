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
import { useBotTrap } from "@/lib/use-bot-trap";
import { BotTrapField } from "@/app/_components/general/bot-trap-field";
import {
  USERNAME_HINT,
  USERNAME_INPUT_PATTERN,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  describeUsernameProblem,
  normalizeUsername,
  suggestUsername,
} from "@/lib/username";

/** Statuszeile unter einem Feld: neutral schiefergrau, verfügbar grün, vergeben rot. */
const STATUS_TEXT: Record<"checking" | "available" | "unavailable", string> = {
  checking: "text-dark dark:text-night-muted",
  available: "text-green-600 dark:text-green-400",
  unavailable: "text-red-600 dark:text-red-400",
};

/**
 * Fehlercodes von better-auth. Ohne diese Zuordnung bleibt eine abgelehnte
 * Registrierung unsichtbar: der Client wirft nicht, er liefert `error` zurück.
 */
const SIGN_UP_ERRORS: Record<string, string> = {
  USERNAME_TOO_SHORT: `Der Benutzername braucht mindestens ${USERNAME_MIN_LENGTH} Zeichen.`,
  USERNAME_TOO_LONG: `Der Benutzername darf höchstens ${USERNAME_MAX_LENGTH} Zeichen haben.`,
  INVALID_USERNAME: `${USERNAME_HINT}.`,
  USERNAME_IS_ALREADY_TAKEN: "Dieser Benutzername ist bereits vergeben.",
  INVALID_DISPLAY_USERNAME: `${USERNAME_HINT}.`,
  PASSWORD_TOO_SHORT: `Das Passwort braucht mindestens ${PASSWORD_MIN_LENGTH} Zeichen.`,
  PASSWORD_TOO_LONG: "Das Passwort ist zu lang.",
  INVALID_EMAIL: "Bitte gib eine gültige E-Mail-Adresse ein.",
  INVALID_PASSWORD: "Bitte gib ein Passwort ein.",
  USER_ALREADY_EXISTS: "Diese E-Mail-Adresse ist bereits registriert.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL:
    "Diese E-Mail-Adresse ist bereits registriert.",
  INVALID_ORIGIN:
    "Die Registrierung wurde aus Sicherheitsgründen abgelehnt, weil die Seite über eine unbekannte Adresse aufgerufen wurde. Bitte rufe die Seite direkt auf und versuche es erneut.",
};

type SignUpError = { code?: string; message?: string; status?: number };

/** Aus dem eigenen Formular-Schutz: die Meldung kommt fertig vom Server. */
const OWN_ERROR_CODES = new Set([
  "FORM_CHECK_FAILED",
  "EMAIL_DOMAIN_UNDELIVERABLE",
]);

function describeSignUpError(error: SignUpError): string {
  const known = error.code ? SIGN_UP_ERRORS[error.code] : undefined;
  if (known) return known;

  if (error.code && OWN_ERROR_CODES.has(error.code) && error.message) {
    return error.message;
  }

  if (error.status === 429) {
    return "Zu viele Registrierungsversuche. Bitte versuche es in einer Minute noch einmal.";
  }
  // Der Originaltext ist englisch, hilft aber bei einer Fehlermeldung an uns.
  return error.message
    ? `Registrierung fehlgeschlagen: ${error.message}`
    : "Registrierung fehlgeschlagen. Bitte versuche es später erneut.";
}

type VerificationMailResult = "sent" | "failed" | "already-verified";

async function sendVerificationMail(
  email: string,
): Promise<VerificationMailResult> {
  try {
    const response = await fetch("/api/auth/send-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (response.ok) return "sent";

    const data = (await response.json().catch(() => ({}))) as {
      code?: string;
    };
    return data.code === "ALREADY_VERIFIED" ? "already-verified" : "failed";
  } catch {
    return "failed";
  }
}

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
  const botTrap = useBotTrap();

  const [debouncedUsername, setDebouncedUsername] = useState("");
  const [debouncedEmail, setDebouncedEmail] = useState("");

  const isValidEmail = (emailToCheck: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(emailToCheck);
  };

  // Nur gültige Namen abfragen: sonst lehnt die Prüfung die Eingabe ab und das
  // Feld bleibt ohne Rückmeldung stehen.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!describeUsernameProblem(formData.username)) {
        setDebouncedUsername(normalizeUsername(formData.username));
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
      enabled: debouncedUsername.length >= USERNAME_MIN_LENGTH,
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

  const usernameProblem = describeUsernameProblem(formData.username);

  const usernameStatus = useMemo(() => {
    if (usernameProblem) {
      return {
        checking: false,
        available: null as boolean | null,
        message: formData.username.length > 0 ? usernameProblem : "",
      };
    }
    if (
      normalizeUsername(formData.username) !== debouncedUsername ||
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
    usernameProblem,
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
    !usernameProblem &&
    isValidEmail(formData.email) &&
    formData.password.length >= PASSWORD_MIN_LENGTH &&
    passwordsMatch &&
    usernameStatus.available !== false &&
    emailStatus.available !== false;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setFormData((prev) => {
      const updated = {
        ...prev,
        [name]: name === "username" ? normalizeUsername(value) : value,
      };

      if ((name === "firstName" || name === "lastName") && !usernameEdited) {
        const firstName = name === "firstName" ? value : prev.firstName;
        const lastName = name === "lastName" ? value : prev.lastName;

        if (firstName && lastName) {
          updated.username = suggestUsername(firstName, lastName);
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

    if (usernameProblem) {
      setError(usernameProblem);
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

    const email = formData.email.trim().toLowerCase();

    try {
      // better-auth wirft nicht, sondern liefert `error` zurück. Ohne diese
      // Prüfung landet eine abgelehnte Registrierung auf der Bestätigungsseite,
      // ohne dass ein Konto existiert.
      const { error: signUpError } = await signUp.email({
        email,
        password: formData.password,
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        username: normalizeUsername(formData.username),
        firstName: formData.firstName,
        lastName: formData.lastName,
        // Der Endpunkt gehört better-auth, sein Body folgt einem festen
        // Schema — die Signale des Formulars passen nur in eigene Header.
        fetchOptions: { headers: botTrap.headers() },
      });

      if (signUpError) {
        setError(describeSignUpError(signUpError));
        return;
      }

      const mailSent = await sendVerificationMail(email);

      if (mailSent === "already-verified") {
        setError(
          "Diese E-Mail-Adresse ist bereits registriert und bestätigt. Bitte melde dich an.",
        );
        return;
      }

      const params = new URLSearchParams({ email });
      // Die Bestätigungsseite darf keinen Versand behaupten, den es nicht gab.
      if (mailSent === "failed") params.set("mail", "failed");
      router.push(`/verify-email?${params.toString()}`);
    } catch (err) {
      setError(
        "Registrierung fehlgeschlagen. Bitte prüfe deine Internetverbindung und versuche es erneut.",
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
                minLength={USERNAME_MIN_LENGTH}
                maxLength={USERNAME_MAX_LENGTH}
                pattern={USERNAME_INPUT_PATTERN}
                title={USERNAME_HINT}
                onChange={handleChange}
                error={usernameStatus.available === false || !!usernameProblem}
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

            <BotTrapField value={botTrap.value} onChange={botTrap.setValue} />
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
