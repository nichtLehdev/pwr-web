"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth";
import { api } from "@/trpc/react";
import { usePermissions } from "@/lib/use-permissions";
import { PERMISSIONS } from "@/lib/permissions";
import { DashboardPage } from "@/app/_components/dashboard";
import { getErrorMessage } from "@/lib/utils";
import { useToast } from "@/app/_components/ui/toast";
import { Info } from "lucide-react";
import {
  Button,
  Input,
  Label,
  Select,
  Textarea,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/app/_components/ui";

export default function NewUserPage() {
  const router = useRouter();
  const { data: session, isPending: sessionLoading } = useSession();
  const toast = useToast();
  const hasRedirected = useRef(false);

  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, {
      enabled: !!session?.user,
    });

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [debouncedEmail, setDebouncedEmail] = useState("");
  const [username, setUsername] = useState("");
  const [debouncedUsername, setDebouncedUsername] = useState("");
  const [usernameManuallyEdited, setUsernameManuallyEdited] = useState(false);
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [street, setStreet] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [city, setCity] = useState("");
  // Zugehörigkeit samt öffentlich sichtbarem Amt. Die Zuständigkeit fürs
  // Anlegen von Inhalten hängt nicht daran und wird im Benutzer-Editor gesetzt.
  const [bezirkId, setBezirkId] = useState("");
  const [districtRoleName, setDistrictRoleName] = useState("");

  const isValidEmail = (emailToCheck: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(emailToCheck);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isValidEmail(email)) {
        setDebouncedEmail(email);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [email]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (username.length >= 3) {
        setDebouncedUsername(username);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [username]);

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
    if (username.length < 3) {
      return {
        checking: false,
        available: null as boolean | null,
        message: "",
      };
    }
    if (username !== debouncedUsername || checkUsernameQuery.isLoading) {
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
          ? "Benutzername ist verfügbar"
          : "Benutzername ist bereits vergeben",
      };
    }
    return { checking: false, available: null as boolean | null, message: "" };
  }, [
    username,
    debouncedUsername,
    checkUsernameQuery.isLoading,
    checkUsernameQuery.data,
  ]);

  const emailStatus = useMemo(() => {
    if (!isValidEmail(email)) {
      return {
        checking: false,
        available: null as boolean | null,
        message: "",
      };
    }
    if (email !== debouncedEmail || checkEmailQuery.isLoading) {
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
          ? "E-Mail ist verfügbar"
          : "E-Mail ist bereits registriert",
      };
    }
    return { checking: false, available: null as boolean | null, message: "" };
  }, [email, debouncedEmail, checkEmailQuery.isLoading, checkEmailQuery.data]);

  const generateUsername = (first: string, last: string) => {
    if (!first || !last) return "";
    return `${first.toLowerCase().replace(/\s+/g, "")}.${last.toLowerCase().replace(/\s+/g, "")}`
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9.]/g, "");
  };

  const handleFirstNameChange = (value: string) => {
    setFirstName(value);
    if (!usernameManuallyEdited) {
      setUsername(generateUsername(value, lastName));
    }
  };

  const handleLastNameChange = (value: string) => {
    setLastName(value);
    if (!usernameManuallyEdited) {
      setUsername(generateUsername(firstName, value));
    }
  };

  const handleUsernameChange = (value: string) => {
    setUsername(value);
    setUsernameManuallyEdited(true);
  };

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const utils = api.useUtils();

  const createUserMutation = api.users.create.useMutation({
    onSuccess: async (newUser) => {
      await utils.users.list.invalidate();
      toast.success("Benutzer erfolgreich erstellt");
      router.push(`/dashboard/users/${newUser.id}`);
    },
    onError: (err) => {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      toast.error("Fehler beim Erstellen: " + errorMessage);
      setIsSubmitting(false);
    },
  });

  useEffect(() => {
    if (!sessionLoading && !session?.user && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push("/login?callbackUrl=/dashboard/users/new");
    }
  }, [session, sessionLoading, router]);

  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const canManageUsers = hasPermission(PERMISSIONS.USERS_MANAGE);

  const { data: bezirke } = api.bezirke.getAll.useQuery(undefined, {
    enabled: canManageUsers,
  });

  useEffect(() => {
    if (
      !profileLoading &&
      profile &&
      !permissionsLoading &&
      !canManageUsers &&
      !hasRedirected.current
    ) {
      hasRedirected.current = true;
      router.push("/dashboard");
    }
  }, [profile, profileLoading, permissionsLoading, canManageUsers, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    if (!firstName.trim()) {
      setError("Bitte gib einen Vornamen ein.");
      setIsSubmitting(false);
      return;
    }

    if (!lastName.trim()) {
      setError("Bitte gib einen Nachnamen ein.");
      setIsSubmitting(false);
      return;
    }

    if (!email.trim()) {
      setError("Bitte gib eine E-Mail-Adresse ein.");
      setIsSubmitting(false);
      return;
    }

    if (emailStatus.available === false) {
      setError("Diese E-Mail-Adresse ist bereits registriert.");
      setIsSubmitting(false);
      return;
    }

    if (username.trim()) {
      if (username.trim().length < 3) {
        setError("Benutzername muss mindestens 3 Zeichen haben.");
        setIsSubmitting(false);
        return;
      }
      if (username.trim().length > 30) {
        setError("Benutzername darf maximal 30 Zeichen haben.");
        setIsSubmitting(false);
        return;
      }
      if (!/^[a-zA-Z0-9_.-]+$/.test(username.trim())) {
        setError(
          "Benutzername darf nur Buchstaben, Zahlen, Unterstrich, Bindestrich und Punkt enthalten.",
        );
        setIsSubmitting(false);
        return;
      }
      if (usernameStatus.available === false) {
        setError("Bitte wähle einen verfügbaren Benutzernamen.");
        setIsSubmitting(false);
        return;
      }
    }

    createUserMutation.mutate({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      username: username.trim() || undefined,
      bio: bio.trim() || undefined,
      phone: phone.trim() || undefined,
      street: street.trim() || undefined,
      zipCode: zipCode.trim() || undefined,
      city: city.trim() || undefined,
      bezirkId: bezirkId || null,
      districtRoleName: districtRoleName.trim() || undefined,
    });
  };

  if (sessionLoading || profileLoading) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !profile || !canManageUsers) {
    return null;
  }

  return (
    <DashboardPage
      title="Neuer Benutzer"
      description="Erstelle ein neues Benutzerkonto mit den gewünschten Berechtigungen"
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Benutzer", href: "/dashboard/users" },
        { label: "Neuer Benutzer" },
      ]}
      maxWidth="7xl"
    >
      {/* Info Box */}
      <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
          <div className="text-sm text-blue-700 dark:text-blue-300">
            <p className="font-medium">Hinweis zur Anmeldung</p>
            <p className="mt-1">
              Der neue Benutzer kann sich nach der Erstellung über die
              &quot;Passwort vergessen&quot;-Funktion auf der Login-Seite ein
              Passwort setzen. Alternativ kann eine Magic-Link-Anmeldung per
              E-Mail verwendet werden.
            </p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-700 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Grundinformationen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label required>Vorname</Label>
                  <Input
                    type="text"
                    value={firstName}
                    onChange={(e) => handleFirstNameChange(e.target.value)}
                    placeholder="Max"
                    maxLength={100}
                    required
                  />
                </div>
                <div>
                  <Label required>Nachname</Label>
                  <Input
                    type="text"
                    value={lastName}
                    onChange={(e) => handleLastNameChange(e.target.value)}
                    placeholder="Mustermann"
                    maxLength={100}
                    required
                  />
                </div>
              </div>

              <div>
                <Label required>E-Mail</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  error={emailStatus.available === false}
                  className={
                    emailStatus.available === true
                      ? "border-green-500 focus:border-green-500 focus:ring-green-500"
                      : ""
                  }
                  required
                />
                {emailStatus.message && (
                  <p
                    className={`mt-1 text-xs ${
                      emailStatus.available === false
                        ? "text-red-600 dark:text-red-400"
                        : emailStatus.available === true
                          ? "text-green-600 dark:text-green-400"
                          : "text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {emailStatus.checking && (
                      <span className="mr-1 inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    )}
                    {emailStatus.message}
                  </p>
                )}
              </div>

              <div>
                <Label>Benutzername</Label>
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  placeholder="vorname.nachname"
                  minLength={3}
                  maxLength={30}
                  pattern="[a-zA-Z0-9_.-]+"
                  title="Nur Buchstaben, Zahlen, Unterstrich, Bindestrich und Punkt erlaubt"
                  error={usernameStatus.available === false}
                  className={
                    usernameStatus.available === true
                      ? "border-green-500 focus:border-green-500 focus:ring-green-500"
                      : ""
                  }
                />
                {usernameStatus.message ? (
                  <p
                    className={`mt-1 text-xs ${
                      usernameStatus.available === false
                        ? "text-red-600 dark:text-red-400"
                        : usernameStatus.available === true
                          ? "text-green-600 dark:text-green-400"
                          : "text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {usernameStatus.checking && (
                      <span className="mr-1 inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    )}
                    {usernameStatus.message}
                  </p>
                ) : (
                  <p className="dark:text-dark-muted mt-1 text-xs text-gray-500">
                    Wird automatisch aus Vor- und Nachname generiert. Kann
                    manuell angepasst werden.
                  </p>
                )}
              </div>

              <div>
                <Label>Bio</Label>
                <Textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  placeholder="Kurze Beschreibung..."
                  maxLength={2000}
                />
              </div>

              <div>
                <Label>Telefonnummer</Label>
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+49 123 456789"
                  maxLength={50}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Address */}
        <Card>
          <CardHeader>
            <CardTitle>Adresse</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label>Straße und Hausnummer</Label>
                <Input
                  type="text"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="Musterstraße 1"
                  maxLength={200}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label>PLZ</Label>
                  <Input
                    type="text"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    placeholder="12345"
                    maxLength={20}
                  />
                </div>

                <div className="md:col-span-2">
                  <Label>Stadt</Label>
                  <Input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Musterstadt"
                    maxLength={100}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bezirkszugehörigkeit */}
        <Card>
          <CardHeader>
            <CardTitle>Bezirkszugehörigkeit</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
              Zu welchem Bezirk gehört diese Person, und in welchem Amt? Beides
              erscheint auf den öffentlichen Seiten. Für wen sie Inhalte anlegen
              darf, wird nach dem Anlegen im Benutzer-Editor festgelegt.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Bezirk</Label>
                <Select
                  value={bezirkId}
                  onChange={(e) => setBezirkId(e.target.value)}
                >
                  <option value="">Keinem Bezirk zugeordnet</option>
                  {bezirke?.map((bezirk) => (
                    <option key={bezirk.id} value={bezirk.id}>
                      Bezirk {bezirk.number} – {bezirk.shortName}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <Label>Amtsbezeichnung</Label>
                <Input
                  type="text"
                  value={districtRoleName}
                  onChange={(e) => setDistrictRoleName(e.target.value)}
                  placeholder="z. B. Bezirksobmann"
                  maxLength={100}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Link
            href="/dashboard/users"
            className="dark:border-dark-border dark:text-dark-text rounded-lg border border-gray-300 px-6 py-2.5 text-center font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Abbrechen
          </Link>
          <Button
            type="submit"
            disabled={isSubmitting || createUserMutation.isPending}
            isLoading={isSubmitting || createUserMutation.isPending}
          >
            Benutzer erstellen
          </Button>
        </div>
      </form>
    </DashboardPage>
  );
}
