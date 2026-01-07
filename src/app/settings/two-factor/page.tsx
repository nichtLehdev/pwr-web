"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth";
import { twoFactor } from "@/lib/auth";
import { api } from "@/trpc/react";
import { useToast } from "@/app/_components/ui/toast";
import {
  Shield,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  Download,
} from "lucide-react";

export default function TwoFactorPage() {
  const router = useRouter();
  const { data: session, isPending: sessionLoading } = useSession();
  const toast = useToast();
  const utils = api.useUtils();

  const [twoFactorData, setTwoFactorData] = useState({
    password: "",
    totpCode: "",
    backupCode: "",
  });
  const [isEnabling2FA, setIsEnabling2FA] = useState(false);
  const [isDisabling2FA, setIsDisabling2FA] = useState(false);
  const [isVerifying2FA, setIsVerifying2FA] = useState(false);
  const [twoFactorError, setTwoFactorError] = useState("");
  const [twoFactorQRCode, setTwoFactorQRCode] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);

  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, {
      enabled: !!session?.user,
    });

  const twoFactorEnabled =
    (profile as { twoFactorEnabled?: boolean })?.twoFactorEnabled ?? false;

  const downloadBackupCodes = () => {
    if (backupCodes.length === 0) return;

    const content = `Posaunenwerk Rheinland - Backup-Codes für Zwei-Faktor-Authentifizierung

WICHTIG: Speichere diese Codes sicher!
Diese Codes können verwendet werden, um auf dein Konto zuzugreifen, falls du dein Authenticator-Gerät verlierst.
Jeder Code kann nur einmal verwendet werden.

Backup-Codes:
${backupCodes.map((code, index) => `${index + 1}. ${code}`).join("\n")}

Generiert am: ${new Date().toLocaleString("de-DE")}

Bewahre diese Datei sicher auf und teile sie niemals mit anderen!`;

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `posaunenwerk-2fa-backup-codes-${new Date().toISOString().split("T")[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (sessionLoading || profileLoading) {
    return (
      <div className="bg-background-secondary dark:bg-dark-background-secondary flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="text-dark dark:text-dark-text">Lädt...</div>
      </div>
    );
  }

  if (!session?.user) {
    router.push("/login");
    return null;
  }

  return (
    <div className="bg-background-secondary dark:bg-dark-background-secondary min-h-[calc(100vh-4rem)] px-4 py-8">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/settings"
            className="text-primary hover:text-primary-dark dark:text-primary-light dark:hover:text-primary mb-4 inline-flex items-center gap-2 text-sm font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            Zurück zu Einstellungen
          </Link>
          <h1 className="text-dark dark:text-dark-text text-3xl font-bold">
            Zwei-Faktor-Authentifizierung (2FA)
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Füge eine zusätzliche Sicherheitsebene zu deinem Konto hinzu
          </p>
        </div>

        {/* Main Content */}
        <div className="dark:bg-dark-surface rounded-lg bg-white p-6 shadow-lg md:p-8">
          {twoFactorEnabled ? (
            // 2FA is enabled - show disable option
            <div className="space-y-6">
              <div className="rounded-md border-l-4 border-green-500 bg-green-50 p-4 dark:border-green-400 dark:bg-green-900/20">
                <div className="flex items-start gap-3">
                  <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
                  <div>
                    <p className="text-sm font-semibold text-green-800 dark:text-green-300">
                      2FA ist aktiviert
                    </p>
                    <p className="mt-1 text-sm text-green-700 dark:text-green-400">
                      Dein Konto ist zusätzlich geschützt. Du wirst bei jeder
                      Anmeldung nach einem Code aus deiner Authenticator-App
                      gefragt.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-dark dark:text-dark-text mb-4 text-lg font-semibold">
                  2FA deaktivieren
                </h2>
                <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                  Wenn du 2FA deaktivierst, wird dein Konto weniger sicher sein.
                  Du wirst nur noch dein Passwort benötigen, um dich anzumelden.
                </p>

                <div>
                  <label
                    htmlFor="disable2FAPassword"
                    className="text-dark dark:text-dark-text mb-1 block text-sm font-medium"
                  >
                    Passwort zum Deaktivieren
                  </label>
                  <input
                    id="disable2FAPassword"
                    name="disable2FAPassword"
                    type="password"
                    value={twoFactorData.password}
                    onChange={(e) =>
                      setTwoFactorData((prev) => ({
                        ...prev,
                        password: e.target.value,
                      }))
                    }
                    className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:ring-1 focus:outline-none"
                  />
                </div>

                {twoFactorError && (
                  <div className="mt-3 rounded-md border-l-4 border-red-500 bg-red-50 p-3 dark:border-red-400 dark:bg-red-900/20">
                    <p className="text-sm text-red-800 dark:text-red-300">
                      {twoFactorError}
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={async () => {
                    setTwoFactorError("");

                    if (!twoFactorData.password) {
                      setTwoFactorError(
                        "Bitte gib dein Passwort ein, um 2FA zu deaktivieren",
                      );
                      return;
                    }

                    setIsDisabling2FA(true);

                    try {
                      const result = await twoFactor.disable({
                        password: twoFactorData.password,
                      });

                      if (result.error) {
                        setTwoFactorError(
                          result.error.message ||
                            "Fehler beim Deaktivieren von 2FA",
                        );
                      } else {
                        toast.success("2FA erfolgreich deaktiviert");
                        setTwoFactorData({
                          password: "",
                          totpCode: "",
                          backupCode: "",
                        });
                        void utils.users.getMyProfile.invalidate();
                      }
                    } catch (error) {
                      setTwoFactorError(
                        error instanceof Error
                          ? error.message
                          : "Fehler beim Deaktivieren von 2FA",
                      );
                    } finally {
                      setIsDisabling2FA(false);
                    }
                  }}
                  disabled={isDisabling2FA}
                  className="mt-4 rounded-lg bg-red-600 px-4 py-2 font-semibold text-white shadow-lg transition-colors hover:bg-red-700 disabled:opacity-50 dark:bg-red-700 dark:hover:bg-red-800"
                >
                  {isDisabling2FA ? "Wird deaktiviert..." : "2FA deaktivieren"}
                </button>
              </div>

              <div className="dark:border-dark-border border-t border-gray-200 pt-6">
                <h2 className="text-dark dark:text-dark-text mb-4 text-lg font-semibold">
                  Backup-Codes
                </h2>
                <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                  Backup-Codes können verwendet werden, um auf dein Konto
                  zuzugreifen, falls du dein Authenticator-Gerät verlierst.
                  Jeder Code kann nur einmal verwendet werden.
                </p>

                <div>
                  <label
                    htmlFor="generateBackupCodesPassword"
                    className="text-dark dark:text-dark-text mb-1 block text-sm font-medium"
                  >
                    Passwort zum Generieren neuer Backup-Codes
                  </label>
                  <input
                    id="generateBackupCodesPassword"
                    name="generateBackupCodesPassword"
                    type="password"
                    value={twoFactorData.password}
                    onChange={(e) =>
                      setTwoFactorData((prev) => ({
                        ...prev,
                        password: e.target.value,
                      }))
                    }
                    className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:ring-1 focus:outline-none"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    <strong>Warnung:</strong> Wenn du neue Backup-Codes
                    generierst, werden die alten Codes ungültig.
                  </p>
                </div>

                {twoFactorError && (
                  <div className="mt-3 rounded-md border-l-4 border-red-500 bg-red-50 p-3 dark:border-red-400 dark:bg-red-900/20">
                    <p className="text-sm text-red-800 dark:text-red-300">
                      {twoFactorError}
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={async () => {
                    setTwoFactorError("");

                    if (!twoFactorData.password) {
                      setTwoFactorError(
                        "Bitte gib dein Passwort ein, um Backup-Codes anzuzeigen",
                      );
                      return;
                    }

                    try {
                      const result = await twoFactor.generateBackupCodes({
                        password: twoFactorData.password,
                      });

                      if (result.error) {
                        setTwoFactorError(
                          result.error.message ||
                            "Fehler beim Generieren der Backup-Codes",
                        );
                      } else if (result.data?.backupCodes) {
                        setBackupCodes(result.data.backupCodes);
                        setShowBackupCodes(true);
                        toast.success("Neue Backup-Codes generiert");
                      }
                    } catch (error) {
                      setTwoFactorError(
                        error instanceof Error
                          ? error.message
                          : "Fehler beim Generieren der Backup-Codes",
                      );
                    }
                  }}
                  className="bg-primary hover:bg-primary-dark dark:bg-primary-light dark:hover:bg-primary mt-4 rounded-lg px-4 py-2 font-semibold text-white shadow-lg transition-colors disabled:opacity-50"
                >
                  Neue Backup-Codes generieren
                </button>

                {showBackupCodes && backupCodes.length > 0 && (
                  <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
                    <div className="mb-3 flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                          Wichtig: Speichere diese Backup-Codes sicher!
                        </p>
                        <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                          Diese Codes können verwendet werden, um auf dein Konto
                          zuzugreifen, falls du dein Authenticator-Gerät
                          verlierst. Jeder Code kann nur einmal verwendet
                          werden.
                        </p>
                      </div>
                    </div>
                    <div className="mb-3 flex justify-end">
                      <button
                        type="button"
                        onClick={downloadBackupCodes}
                        className="text-primary hover:text-primary-dark dark:text-primary-light dark:hover:text-primary inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium transition-colors hover:bg-amber-100 dark:border-amber-700 dark:bg-gray-800 dark:hover:bg-gray-700"
                      >
                        <Download className="h-4 w-4" />
                        Codes herunterladen
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                      {backupCodes.map((code, index) => (
                        <div
                          key={index}
                          className="rounded bg-white px-2 py-1 text-center dark:bg-gray-800"
                        >
                          {code}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            // 2FA is not enabled - show enable option
            <div className="space-y-6">
              <div className="rounded-md border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
                <div className="flex items-start gap-3">
                  <Shield className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
                  <div>
                    <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                      Was ist 2FA?
                    </p>
                    <p className="mt-1 text-sm text-blue-700 dark:text-blue-400">
                      Zwei-Faktor-Authentifizierung fügt eine zusätzliche
                      Sicherheitsebene zu deinem Konto hinzu. Du benötigst einen
                      Authenticator-App (z.B. Google Authenticator, Authy,
                      Microsoft Authenticator) auf deinem Smartphone.
                    </p>
                  </div>
                </div>
              </div>

              {!twoFactorQRCode ? (
                // Step 1: Enable 2FA
                <div>
                  <h2 className="text-dark dark:text-dark-text mb-4 text-lg font-semibold">
                    2FA aktivieren
                  </h2>
                  <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                    Gib dein aktuelles Passwort ein, um 2FA zu aktivieren. Du
                    erhältst dann einen QR-Code, den du mit deiner
                    Authenticator-App scannen kannst.
                  </p>

                  <div>
                    <label
                      htmlFor="enable2FAPassword"
                      className="text-dark dark:text-dark-text mb-1 block text-sm font-medium"
                    >
                      Passwort
                    </label>
                    <input
                      id="enable2FAPassword"
                      name="enable2FAPassword"
                      type="password"
                      value={twoFactorData.password}
                      onChange={(e) =>
                        setTwoFactorData((prev) => ({
                          ...prev,
                          password: e.target.value,
                        }))
                      }
                      className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:ring-1 focus:outline-none"
                    />
                  </div>

                  {twoFactorError && (
                    <div className="mt-3 rounded-md border-l-4 border-red-500 bg-red-50 p-3 dark:border-red-400 dark:bg-red-900/20">
                      <p className="text-sm text-red-800 dark:text-red-300">
                        {twoFactorError}
                      </p>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={async () => {
                      setTwoFactorError("");

                      if (!twoFactorData.password) {
                        setTwoFactorError("Bitte gib dein Passwort ein");
                        return;
                      }

                      setIsEnabling2FA(true);

                      try {
                        const result = await twoFactor.enable({
                          password: twoFactorData.password,
                        });

                        if (result.error) {
                          setTwoFactorError(
                            result.error.message ||
                              "Fehler beim Aktivieren von 2FA",
                          );
                        } else if (result.data?.totpURI) {
                          setTwoFactorQRCode(result.data.totpURI);
                          if (result.data.backupCodes) {
                            setBackupCodes(result.data.backupCodes);
                            setShowBackupCodes(true);
                          }
                          toast.success(
                            "2FA aktiviert. Bitte scanne den QR-Code und verifiziere den Code.",
                          );
                        }
                      } catch (error) {
                        setTwoFactorError(
                          error instanceof Error
                            ? error.message
                            : "Fehler beim Aktivieren von 2FA",
                        );
                      } finally {
                        setIsEnabling2FA(false);
                      }
                    }}
                    disabled={isEnabling2FA}
                    className="bg-primary hover:bg-primary-dark dark:bg-primary-light dark:hover:bg-primary mt-4 rounded-lg px-4 py-2 font-semibold text-white shadow-lg transition-colors disabled:opacity-50"
                  >
                    {isEnabling2FA ? "Wird aktiviert..." : "2FA aktivieren"}
                  </button>
                </div>
              ) : (
                // Step 2: Show QR code and verify
                <div className="space-y-6">
                  <div>
                    <h2 className="text-dark dark:text-dark-text mb-4 text-lg font-semibold">
                      QR-Code scannen
                    </h2>
                    <div className="rounded-md border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
                      <p className="mb-3 text-sm text-blue-800 dark:text-blue-300">
                        <strong>Schritt 1:</strong> Scanne diesen QR-Code mit
                        deiner Authenticator-App (z.B. Google Authenticator,
                        Authy, Microsoft Authenticator)
                      </p>
                      <div className="flex justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(twoFactorQRCode)}`}
                          alt="2FA QR Code"
                          className="rounded border-2 border-gray-300"
                        />
                      </div>
                      <p className="mt-3 text-xs text-blue-700 dark:text-blue-400">
                        Oder gib diesen Code manuell ein:{" "}
                        <code className="rounded bg-white px-2 py-1 font-mono text-xs dark:bg-gray-800">
                          {twoFactorQRCode.split("secret=")[1]?.split("&")[0] ||
                            ""}
                        </code>
                      </p>
                    </div>
                  </div>

                  <div>
                    <h2 className="text-dark dark:text-dark-text mb-4 text-lg font-semibold">
                      Code verifizieren
                    </h2>
                    <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                      Gib den 6-stelligen Code aus deiner Authenticator-App ein,
                      um die Einrichtung abzuschließen.
                    </p>

                    <div>
                      <label
                        htmlFor="verify2FACode"
                        className="text-dark dark:text-dark-text mb-1 block text-sm font-medium"
                      >
                        Verifizierungscode
                      </label>
                      <input
                        id="verify2FACode"
                        name="verify2FACode"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]{6}"
                        maxLength={6}
                        value={twoFactorData.totpCode}
                        onChange={(e) =>
                          setTwoFactorData((prev) => ({
                            ...prev,
                            totpCode: e.target.value
                              .replace(/\D/g, "")
                              .slice(0, 6),
                          }))
                        }
                        placeholder="123456"
                        className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-center font-mono text-lg shadow-sm focus:ring-1 focus:outline-none"
                        autoFocus
                      />
                    </div>

                    {twoFactorError && (
                      <div className="mt-3 rounded-md border-l-4 border-red-500 bg-red-50 p-3 dark:border-red-400 dark:bg-red-900/20">
                        <p className="text-sm text-red-800 dark:text-red-300">
                          {twoFactorError}
                        </p>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={async () => {
                        setTwoFactorError("");

                        if (twoFactorData.totpCode.length !== 6) {
                          setTwoFactorError(
                            "Bitte gib einen 6-stelligen Code ein",
                          );
                          return;
                        }

                        setIsVerifying2FA(true);

                        try {
                          const result = await twoFactor.verifyTotp({
                            code: twoFactorData.totpCode,
                          });

                          if (result.error) {
                            setTwoFactorError(
                              result.error.message ||
                                "Ungültiger Code. Bitte versuche es erneut.",
                            );
                          } else {
                            toast.success("2FA erfolgreich aktiviert!");
                            setTwoFactorData({
                              password: "",
                              totpCode: "",
                              backupCode: "",
                            });
                            setTwoFactorQRCode(null);
                            void utils.users.getMyProfile.invalidate();
                          }
                        } catch (error) {
                          setTwoFactorError(
                            error instanceof Error
                              ? error.message
                              : "Fehler bei der Verifizierung",
                          );
                        } finally {
                          setIsVerifying2FA(false);
                        }
                      }}
                      disabled={
                        isVerifying2FA || twoFactorData.totpCode.length !== 6
                      }
                      className="bg-primary hover:bg-primary-dark dark:bg-primary-light dark:hover:bg-primary mt-4 w-full rounded-lg px-4 py-2 font-semibold text-white shadow-lg transition-colors disabled:opacity-50"
                    >
                      {isVerifying2FA
                        ? "Wird verifiziert..."
                        : "Code verifizieren"}
                    </button>
                  </div>

                  {showBackupCodes && backupCodes.length > 0 && (
                    <div className="rounded-md border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
                      <div className="mb-3 flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                            Wichtig: Speichere diese Backup-Codes sicher!
                          </p>
                          <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                            Diese Codes können verwendet werden, um auf dein
                            Konto zuzugreifen, falls du dein Authenticator-Gerät
                            verlierst. Jeder Code kann nur einmal verwendet
                            werden.
                          </p>
                        </div>
                      </div>
                      <div className="mb-3 flex justify-end">
                        <button
                          type="button"
                          onClick={downloadBackupCodes}
                          className="text-primary hover:text-primary-dark dark:text-primary-light dark:hover:text-primary inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium transition-colors hover:bg-amber-100 dark:border-amber-700 dark:bg-gray-800 dark:hover:bg-gray-700"
                        >
                          <Download className="h-4 w-4" />
                          Codes herunterladen
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                        {backupCodes.map((code, index) => (
                          <div
                            key={index}
                            className="rounded bg-white px-2 py-1 text-center dark:bg-gray-800"
                          >
                            {code}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
