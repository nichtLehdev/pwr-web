"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn, signUp } from "@/lib/auth";

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
  const [usernameStatus, setUsernameStatus] = useState<{
    checking: boolean;
    available: boolean | null;
    message: string;
  }>({
    checking: false,
    available: null,
    message: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setFormData((prev) => {
      const updated = { ...prev, [name]: value };

      // Auto-generate username from firstName.lastName if not manually edited
      if ((name === "firstName" || name === "lastName") && !usernameEdited) {
        const firstName = name === "firstName" ? value : prev.firstName;
        const lastName = name === "lastName" ? value : prev.lastName;

        if (firstName && lastName) {
          updated.username =
            `${firstName.toLowerCase()}.${lastName.toLowerCase()}`.replace(
              /[^a-z0-9.]/g,
              "",
            );
        }
      }

      return updated;
    });

    if (name === "username") {
      setUsernameEdited(true);
      // Reset username status when typing
      setUsernameStatus({
        checking: false,
        available: null,
        message: "",
      });
    }
  };

  const checkUsernameAvailability = async () => {
    if (!formData.username || formData.username.length < 3) {
      setUsernameStatus({
        checking: false,
        available: false,
        message: "Benutzername muss mindestens 3 Zeichen lang sein",
      });
      return;
    }

    setUsernameStatus({ checking: true, available: null, message: "" });

    try {
      const response = await fetch(
        `/api/trpc/users.checkUsername?input=${encodeURIComponent(JSON.stringify({ username: formData.username }))}`,
      );
      const data = await response.json();

      const available = data.result.data.available;

      setUsernameStatus({
        checking: false,
        available,
        message: available
          ? "✓ Benutzername verfügbar"
          : "✗ Benutzername bereits vergeben",
      });
    } catch (err) {
      console.error("Error checking username:", err);
      setUsernameStatus({
        checking: false,
        available: null,
        message: "",
      });
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

    setIsLoading(true);

    try {
      await signUp.email({
        email: formData.email,
        password: formData.password,
        name: `${formData.firstName} ${formData.lastName}`.trim(),
      });

      // After successful registration, sign in
      await signIn.email({
        email: formData.email,
        password: formData.password,
      });

      router.push("/");
      router.refresh();
    } catch (err) {
      setError(
        "Registrierung fehlgeschlagen. E-Mail könnte bereits verwendet werden.",
      );
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGitHubSignUp = async () => {
    setError("");
    setIsLoading(true);

    try {
      await signIn.social({
        provider: "github",
        callbackURL: "/",
      });
    } catch (err) {
      setError("Registrierung mit GitHub fehlgeschlagen");
      console.error(err);
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-background-secondary flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-dark mb-2 text-3xl font-bold">Konto erstellen</h1>
          <p className="text-gray-600">
            Bereits ein Konto?{" "}
            <Link
              href="/login"
              className="text-primary hover:text-primary-dark font-medium"
            >
              Jetzt anmelden
            </Link>
          </p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-lg md:p-8">
          {error && (
            <div className="mb-4 rounded-md border-l-4 border-red-500 bg-red-50 p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="firstName"
                  className="text-dark mb-1 block text-sm font-medium"
                >
                  Vorname
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={handleChange}
                  className="focus:border-primary focus:ring-primary block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:ring-1 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="lastName"
                  className="text-dark mb-1 block text-sm font-medium"
                >
                  Nachname
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={handleChange}
                  className="focus:border-primary focus:ring-primary block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:ring-1 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="username"
                className="text-dark mb-1 block text-sm font-medium"
              >
                Benutzername
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                value={formData.username}
                onChange={handleChange}
                onBlur={checkUsernameAvailability}
                className={`focus:border-primary focus:ring-primary block w-full rounded-md border px-3 py-2 shadow-sm focus:ring-1 focus:outline-none ${
                  usernameStatus.available === true
                    ? "border-green-500"
                    : usernameStatus.available === false
                      ? "border-red-500"
                      : "border-gray-300"
                }`}
              />
              {usernameStatus.checking ? (
                <p className="mt-1 text-xs text-gray-500">Überprüfe...</p>
              ) : usernameStatus.message ? (
                <p
                  className={`mt-1 text-xs ${
                    usernameStatus.available ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {usernameStatus.message}
                </p>
              ) : (
                <p className="mt-1 text-xs text-gray-500">
                  Wird automatisch aus Vor- und Nachname generiert
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="email"
                className="text-dark mb-1 block text-sm font-medium"
              >
                E-Mail-Adresse
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="focus:border-primary focus:ring-primary block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:ring-1 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="text-dark mb-1 block text-sm font-medium"
              >
                Passwort
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={formData.password}
                onChange={handleChange}
                className="focus:border-primary focus:ring-primary block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:ring-1 focus:outline-none"
              />
              <p className="mt-1 text-xs text-gray-500">Mindestens 8 Zeichen</p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="bg-primary hover:bg-primary-dark w-full rounded-lg px-4 py-2.5 font-semibold text-white shadow-lg transition-colors disabled:opacity-50"
            >
              {isLoading ? "Wird erstellt..." : "Konto erstellen"}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-3 text-gray-500">Oder</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGitHubSignUp}
            disabled={isLoading}
            className="text-dark flex w-full items-center justify-center gap-2 rounded-lg border-2 border-gray-300 bg-white px-4 py-2.5 font-semibold shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z"
                clipRule="evenodd"
              />
            </svg>
            Mit GitHub registrieren
          </button>
        </div>
      </div>
    </div>
  );
}
