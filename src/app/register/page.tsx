"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signUp } from "@/lib/auth";
import { api } from "@/trpc/react";
import {
  Button,
  Input,
  Label,
  Alert,
  AlertDescription,
} from "@/app/_components/ui";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    username: "",
  });
  const [usernameEdited, setUsernameEdited] = useState(false);
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
              .replace(/[\u0300-\u036f]/g, "")
              .replace(/[^a-z0-9.]/g, "");
        }
      }

      return updated;
    });

    if (name === "username") {
      setUsernameEdited(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.password.length < 8) {
      setError("Passwort muss mindestens 8 Zeichen lang sein");
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
    <div className="bg-background-secondary dark:bg-dark-background-secondary flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-dark dark:text-dark-text mb-2 text-3xl font-bold">
            Konto erstellen
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Bereits ein Konto?{" "}
            <Link
              href="/login"
              className="text-primary hover:text-primary-dark font-medium"
            >
              Jetzt anmelden
            </Link>
          </p>
        </div>

        <div className="dark:bg-dark-surface dark:shadow-dark-border rounded-lg bg-white p-6 shadow-lg md:p-8">
          {error && (
            <Alert variant="error" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-3">
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
                    ? "border-green-500 focus:border-green-500 focus:ring-green-500"
                    : ""
                }
              />
              {usernameStatus.message ? (
                <p
                  className={`mt-1 flex items-center gap-1 text-xs ${
                    usernameStatus.checking
                      ? "text-gray-500 dark:text-gray-400"
                      : usernameStatus.available
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {usernameStatus.checking && (
                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  )}
                  {usernameStatus.message}
                </p>
              ) : (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
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
                    ? "border-green-500 focus:border-green-500 focus:ring-green-500"
                    : ""
                }
              />
              {emailStatus.message && (
                <p
                  className={`mt-1 flex items-center gap-1 text-xs ${
                    emailStatus.checking
                      ? "text-gray-500 dark:text-gray-400"
                      : emailStatus.available
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
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
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={formData.password}
                onChange={handleChange}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Mindestens 8 Zeichen
              </p>
            </div>

            <Button type="submit" isLoading={isLoading} className="w-full">
              Konto erstellen
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
