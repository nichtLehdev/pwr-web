"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";
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
  Copy,
} from "lucide-react";
import PublicPage from "@/app/_components/general/public-page";
import { PageSection } from "@/app/_components/programmheft/page-section";
import { Heading } from "@/app/_components/programmheft/section-head";
import { Note } from "@/app/_components/programmheft/note";
import {
  FieldLabel,
  Checkbox,
  fieldControlClasses,
} from "@/app/_components/programmheft/field";
import { cn } from "@/lib/utils";
import { berlinDayKey, formatBerlin } from "@/lib/berlin-time";

/**
 * Schaltflächen-Stimmen des Programmhefts, lokal wiederholt wie auf den
 * übrigen öffentlichen Formularseiten (z. B. /settings).
 */
const BTN_PRIMARY =
  "bg-ink text-paper hover:bg-primary hover:text-ink dark:bg-primary dark:text-ink dark:hover:bg-paper semi-condensed inline-flex min-h-12 items-center justify-center gap-2 px-6 text-base font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60";
const BTN_OUTLINE =
  "border-ink text-ink hover:bg-ink hover:text-paper dark:border-night-text dark:text-night-text dark:hover:bg-night-text dark:hover:text-night semi-condensed inline-flex min-h-12 items-center justify-center gap-2 border-2 px-6 text-base font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60";
/** Kleinere Outline-Schaltfläche für Nebenhandlungen, 40px hoch wie `headMeta.action`. */
const BTN_OUTLINE_SM =
  "border-ink text-ink hover:bg-ink hover:text-paper dark:border-night-text dark:text-night-text dark:hover:bg-night-text dark:hover:text-night semi-condensed inline-flex min-h-10 items-center gap-2 border-2 px-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60";

export default function TwoFactorPage() {
  const router = useRouter();
  const { data: session, isPending: sessionLoading } = useSession();
  const toast = useToast();
  const utils = api.useUtils();

  // Aktivieren
  const [enablePassword, setEnablePassword] = useState("");
  const [enableError, setEnableError] = useState("");
  const [isEnabling2FA, setIsEnabling2FA] = useState(false);

  // Deaktivieren
  const [disablePassword, setDisablePassword] = useState("");
  const [disableError, setDisableError] = useState("");
  const [isDisabling2FA, setIsDisabling2FA] = useState(false);

  // Neue Backup-Codes generieren
  const [backupPassword, setBackupPassword] = useState("");
  const [backupError, setBackupError] = useState("");
  const [isGeneratingCodes, setIsGeneratingCodes] = useState(false);

  // Verifizieren
  const [totpCode, setTotpCode] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [isVerifying2FA, setIsVerifying2FA] = useState(false);

  const [twoFactorQRCode, setTwoFactorQRCode] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrError, setQrError] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [backupCodesAcknowledged, setBackupCodesAcknowledged] = useState(false);

  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, {
      enabled: !!session?.user,
    });

  const twoFactorEnabled =
    (profile as { twoFactorEnabled?: boolean })?.twoFactorEnabled ?? false;

  const totpSecret = twoFactorQRCode
    ? twoFactorQRCode.split("secret=")[1]?.split("&")[0] || ""
    : "";

  // QR-Code lokal generieren, statt einen externen Dienst zu verwenden
  useEffect(() => {
    if (!twoFactorQRCode) {
      setQrDataUrl(null);
      setQrError(false);
      return;
    }

    let cancelled = false;
    QRCode.toDataURL(twoFactorQRCode, { width: 200, margin: 2 })
      .then((url) => {
        if (!cancelled) {
          setQrDataUrl(url);
          setQrError(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setQrDataUrl(null);
          setQrError(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [twoFactorQRCode]);

  const copySecretToClipboard = async () => {
    if (!totpSecret) return;
    try {
      await navigator.clipboard.writeText(totpSecret);
      toast.success("Code in die Zwischenablage kopiert");
    } catch {
      toast.error("Kopieren fehlgeschlagen. Bitte kopiere den Code manuell.");
    }
  };

  const downloadBackupCodes = () => {
    if (backupCodes.length === 0) return;

    const content = `Posaunenwerk Rheinland - Backup-Codes für Zwei-Faktor-Authentifizierung

WICHTIG: Speichere diese Codes sicher!
Diese Codes können verwendet werden, um auf dein Konto zuzugreifen, falls du dein Authenticator-Gerät verlierst.
Jeder Code kann nur einmal verwendet werden.

Backup-Codes:
${backupCodes.map((code, index) => `${index + 1}. ${code}`).join("\n")}

Generiert am: ${formatBerlin(new Date(), {
      day: "numeric",
      month: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })}

Bewahre diese Datei sicher auf und teile sie niemals mit anderen!`;

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `posaunenwerk-2fa-backup-codes-${berlinDayKey(new Date())}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (sessionLoading || profileLoading) {
    return (
      <div className="bg-paper dark:bg-night text-ink dark:text-night-text flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <p className="semi-condensed text-lg font-semibold">Lädt...</p>
      </div>
    );
  }

  if (!session?.user) {
    router.push("/login?redirect=%2Fsettings%2Ftwo-factor");
    return null;
  }

  return (
    <PublicPage
      title="Zwei-Faktor-Authentifizierung (2FA)"
      breadcrumbs={[
        { label: "Start", href: "/" },
        { label: "Einstellungen", href: "/settings" },
        { label: "2FA" },
      ]}
      heroSize="compact"
      description={
        <p>Füge eine zusätzliche Sicherheitsebene zu deinem Konto hinzu</p>
      }
    >
      <PageSection flush="top">
        <Link
          href="/settings"
          className="semi-condensed text-primary-ink dark:text-primary inline-flex min-h-11 items-center gap-2 text-sm font-semibold underline-offset-4 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Zurück zu Einstellungen
        </Link>

        <div className="mt-8 max-w-2xl">
          {twoFactorEnabled ? (
            <div className="space-y-10">
              <Note tone="info">
                <p className="flex items-start gap-3">
                  <CheckCircle
                    className="mt-0.5 h-5 w-5 shrink-0"
                    aria-hidden
                  />
                  <span>
                    <span className="block font-semibold">
                      2FA ist aktiviert
                    </span>
                    <span className="mt-1 block text-sm">
                      Dein Konto ist zusätzlich geschützt. Du wirst bei jeder
                      Anmeldung nach einem Code aus deiner Authenticator-App
                      gefragt.
                    </span>
                  </span>
                </p>
              </Note>

              <div>
                <Heading as="h2" size="list" rule>
                  2FA deaktivieren
                </Heading>
                <p className="text-dark dark:text-night-muted mt-4 text-sm">
                  Wenn du 2FA deaktivierst, wird dein Konto weniger sicher sein.
                  Du wirst nur noch dein Passwort benötigen, um dich anzumelden.
                </p>

                <div className="mt-4">
                  <FieldLabel htmlFor="disable2FAPassword">
                    Passwort zum Deaktivieren
                  </FieldLabel>
                  <input
                    id="disable2FAPassword"
                    name="disable2FAPassword"
                    type="password"
                    value={disablePassword}
                    onChange={(e) => setDisablePassword(e.target.value)}
                    className={fieldControlClasses}
                  />
                </div>

                {disableError && (
                  <Note tone="error" className="mt-3">
                    <p>{disableError}</p>
                  </Note>
                )}

                <button
                  type="button"
                  onClick={async () => {
                    setDisableError("");

                    if (!disablePassword) {
                      setDisableError(
                        "Bitte gib dein Passwort ein, um 2FA zu deaktivieren",
                      );
                      return;
                    }

                    setIsDisabling2FA(true);

                    try {
                      const result = await twoFactor.disable({
                        password: disablePassword,
                      });

                      if (result.error) {
                        setDisableError(
                          result.error.message ||
                            "Fehler beim Deaktivieren von 2FA",
                        );
                      } else {
                        toast.success("2FA erfolgreich deaktiviert");
                        setDisablePassword("");
                        void utils.users.getMyProfile.invalidate();
                      }
                    } catch (error) {
                      setDisableError(
                        error instanceof Error
                          ? error.message
                          : "Fehler beim Deaktivieren von 2FA",
                      );
                    } finally {
                      setIsDisabling2FA(false);
                    }
                  }}
                  disabled={isDisabling2FA}
                  className={cn(BTN_OUTLINE, "mt-4")}
                >
                  {isDisabling2FA ? "Wird deaktiviert..." : "2FA deaktivieren"}
                </button>
              </div>

              <div className="border-rule dark:border-night-rule border-t pt-8">
                <Heading as="h2" size="list" rule>
                  Backup-Codes
                </Heading>
                <p className="text-dark dark:text-night-muted mt-4 text-sm">
                  Backup-Codes können verwendet werden, um auf dein Konto
                  zuzugreifen, falls du dein Authenticator-Gerät verlierst.
                  Jeder Code kann nur einmal verwendet werden.
                </p>

                <div className="mt-4">
                  <FieldLabel htmlFor="generateBackupCodesPassword">
                    Passwort zum Generieren neuer Backup-Codes
                  </FieldLabel>
                  <input
                    id="generateBackupCodesPassword"
                    name="generateBackupCodesPassword"
                    type="password"
                    value={backupPassword}
                    onChange={(e) => setBackupPassword(e.target.value)}
                    className={fieldControlClasses}
                  />
                  <p className="text-dark dark:text-night-muted mt-2 text-xs">
                    <strong className="font-semibold">Warnung:</strong> Wenn du
                    neue Backup-Codes generierst, werden die alten Codes
                    ungültig.
                  </p>
                </div>

                {backupError && (
                  <Note tone="error" className="mt-3">
                    <p>{backupError}</p>
                  </Note>
                )}

                <button
                  type="button"
                  onClick={async () => {
                    setBackupError("");

                    if (!backupPassword) {
                      setBackupError(
                        "Bitte gib dein Passwort ein, um Backup-Codes anzuzeigen",
                      );
                      return;
                    }

                    setIsGeneratingCodes(true);

                    try {
                      const result = await twoFactor.generateBackupCodes({
                        password: backupPassword,
                      });

                      if (result.error) {
                        setBackupError(
                          result.error.message ||
                            "Fehler beim Generieren der Backup-Codes",
                        );
                      } else if (result.data?.backupCodes) {
                        setBackupCodes(result.data.backupCodes);
                        setShowBackupCodes(true);
                        setBackupPassword("");
                        toast.success("Neue Backup-Codes generiert");
                      }
                    } catch (error) {
                      setBackupError(
                        error instanceof Error
                          ? error.message
                          : "Fehler beim Generieren der Backup-Codes",
                      );
                    } finally {
                      setIsGeneratingCodes(false);
                    }
                  }}
                  disabled={isGeneratingCodes}
                  className={cn(BTN_PRIMARY, "mt-4")}
                >
                  {isGeneratingCodes
                    ? "Wird generiert..."
                    : "Neue Backup-Codes generieren"}
                </button>

                {showBackupCodes && backupCodes.length > 0 && (
                  <Note
                    tone="info"
                    title={
                      <span className="flex items-center gap-2">
                        <AlertTriangle
                          className="h-5 w-5 shrink-0"
                          aria-hidden
                        />
                        Wichtig: Speichere diese Backup-Codes sicher!
                      </span>
                    }
                    titleAs="p"
                    className="mt-6"
                  >
                    <p>
                      Diese Codes können verwendet werden, um auf dein Konto
                      zuzugreifen, falls du dein Authenticator-Gerät verlierst.
                      Jeder Code kann nur einmal verwendet werden.
                    </p>
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={downloadBackupCodes}
                        className={BTN_OUTLINE_SM}
                      >
                        <Download className="h-4 w-4" aria-hidden />
                        Codes herunterladen
                      </button>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-sm">
                      {backupCodes.map((code, index) => (
                        <div
                          key={index}
                          className="border-ink dark:border-night-text border px-2 py-1 text-center"
                        >
                          {code}
                        </div>
                      ))}
                    </div>
                  </Note>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-10">
              <Note tone="info">
                <p className="flex items-start gap-3">
                  <Shield className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
                  <span>
                    <span className="block font-semibold">Was ist 2FA?</span>
                    <span className="mt-1 block text-sm">
                      Zwei-Faktor-Authentifizierung fügt eine zusätzliche
                      Sicherheitsebene zu deinem Konto hinzu. Du benötigst einen
                      Authenticator-App (z.B. Google Authenticator, Authy,
                      Microsoft Authenticator) auf deinem Smartphone.
                    </span>
                  </span>
                </p>
              </Note>

              {!twoFactorQRCode ? (
                <div>
                  <Heading as="h2" size="list" rule>
                    2FA aktivieren
                  </Heading>
                  <p className="text-dark dark:text-night-muted mt-4 text-sm">
                    Gib dein aktuelles Passwort ein, um die Einrichtung zu
                    starten. Du erhältst dann einen QR-Code, den du mit deiner
                    Authenticator-App scannen kannst. 2FA ist erst aktiv,
                    nachdem du die Einrichtung mit einem Code bestätigt hast.
                  </p>

                  <div className="mt-4">
                    <FieldLabel htmlFor="enable2FAPassword">
                      Passwort
                    </FieldLabel>
                    <input
                      id="enable2FAPassword"
                      name="enable2FAPassword"
                      type="password"
                      value={enablePassword}
                      onChange={(e) => setEnablePassword(e.target.value)}
                      className={fieldControlClasses}
                    />
                  </div>

                  {enableError && (
                    <Note tone="error" className="mt-3">
                      <p>{enableError}</p>
                    </Note>
                  )}

                  <button
                    type="button"
                    onClick={async () => {
                      setEnableError("");

                      if (!enablePassword) {
                        setEnableError("Bitte gib dein Passwort ein");
                        return;
                      }

                      setIsEnabling2FA(true);

                      try {
                        const result = await twoFactor.enable({
                          password: enablePassword,
                        });

                        if (result.error) {
                          setEnableError(
                            result.error.message ||
                              "Fehler beim Aktivieren von 2FA",
                          );
                        } else if (result.data?.method === "totp") {
                          setTwoFactorQRCode(result.data.totpURI);
                          if (result.data.backupCodes.length > 0) {
                            setBackupCodes(result.data.backupCodes);
                            setShowBackupCodes(true);
                          }
                          setBackupCodesAcknowledged(false);
                          toast.info(
                            "Scanne den QR-Code und bestätige mit einem Code, um die Einrichtung abzuschließen.",
                          );
                        } else {
                          setEnableError(
                            "Unerwartete Antwort vom Server. Bitte versuche es erneut.",
                          );
                        }
                      } catch (error) {
                        setEnableError(
                          error instanceof Error
                            ? error.message
                            : "Fehler beim Aktivieren von 2FA",
                        );
                      } finally {
                        setIsEnabling2FA(false);
                      }
                    }}
                    disabled={isEnabling2FA}
                    className={cn(BTN_PRIMARY, "mt-4")}
                  >
                    {isEnabling2FA
                      ? "Wird vorbereitet..."
                      : "Einrichtung starten"}
                  </button>
                </div>
              ) : (
                <div className="space-y-10">
                  <div>
                    <Heading as="h2" size="list" rule>
                      QR-Code scannen
                    </Heading>
                    <Note tone="info" className="mt-4">
                      <p>
                        <strong className="font-semibold">Schritt 1:</strong>{" "}
                        Scanne diesen QR-Code mit deiner Authenticator-App (z.B.
                        Google Authenticator, Authy, Microsoft Authenticator)
                      </p>
                      <div className="mt-4 flex justify-center">
                        {qrDataUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={qrDataUrl}
                            alt="2FA QR Code"
                            className="border-ink dark:border-night-text border-2"
                          />
                        ) : qrError ? (
                          <p className="text-sm">
                            Der QR-Code konnte nicht erstellt werden. Bitte gib
                            den Code unten manuell in deine Authenticator-App
                            ein.
                          </p>
                        ) : (
                          <div className="border-ink dark:border-night-text flex h-[200px] w-[200px] items-center justify-center border-2">
                            <p className="semi-condensed text-sm font-semibold">
                              Lädt...
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="mt-4">
                        <p className="text-sm">
                          Oder gib diesen Code manuell ein:
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <code className="border-ink dark:border-night-text border px-2 py-1 font-mono text-xs break-all">
                            {totpSecret}
                          </code>
                          <button
                            type="button"
                            onClick={copySecretToClipboard}
                            title="Code kopieren"
                            className={BTN_OUTLINE_SM}
                          >
                            <Copy className="h-3.5 w-3.5" aria-hidden />
                            Kopieren
                          </button>
                        </div>
                      </div>
                    </Note>
                  </div>

                  {showBackupCodes && backupCodes.length > 0 && (
                    <div>
                      <Heading as="h2" size="list" rule>
                        Backup-Codes speichern
                      </Heading>
                      <Note
                        tone="info"
                        title={
                          <span className="flex items-center gap-2">
                            <AlertTriangle
                              className="h-5 w-5 shrink-0"
                              aria-hidden
                            />
                            Schritt 2: Speichere diese Backup-Codes sicher!
                          </span>
                        }
                        titleAs="p"
                        className="mt-4"
                      >
                        <p>
                          Diese Codes können verwendet werden, um auf dein Konto
                          zuzugreifen, falls du dein Authenticator-Gerät
                          verlierst. Jeder Code kann nur einmal verwendet
                          werden. Sie werden dir nur einmal angezeigt.
                        </p>
                        <div className="mt-3 flex justify-end">
                          <button
                            type="button"
                            onClick={downloadBackupCodes}
                            className={BTN_OUTLINE_SM}
                          >
                            <Download className="h-4 w-4" aria-hidden />
                            Codes herunterladen
                          </button>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-sm">
                          {backupCodes.map((code, index) => (
                            <div
                              key={index}
                              className="border-ink dark:border-night-text border px-2 py-1 text-center"
                            >
                              {code}
                            </div>
                          ))}
                        </div>
                        <div className="border-ink dark:border-night-text mt-4 border-t pt-3">
                          <Checkbox
                            id="backupCodesAcknowledged"
                            checked={backupCodesAcknowledged}
                            onChange={(e) =>
                              setBackupCodesAcknowledged(e.target.checked)
                            }
                          >
                            Ich habe meine Backup-Codes gespeichert
                          </Checkbox>
                        </div>
                      </Note>
                    </div>
                  )}

                  <div>
                    <Heading as="h2" size="list" rule>
                      Code verifizieren
                    </Heading>
                    <p className="text-dark dark:text-night-muted mt-4 text-sm">
                      <strong className="text-ink dark:text-night-text font-semibold">
                        Schritt 3:
                      </strong>{" "}
                      Gib den 6-stelligen Code aus deiner Authenticator-App ein,
                      um die Einrichtung abzuschließen. Erst danach ist 2FA
                      aktiv.
                    </p>

                    <div className="mt-4">
                      <FieldLabel htmlFor="verify2FACode">
                        Verifizierungscode
                      </FieldLabel>
                      <input
                        id="verify2FACode"
                        name="verify2FACode"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]{6}"
                        maxLength={6}
                        value={totpCode}
                        onChange={(e) =>
                          setTotpCode(
                            e.target.value.replace(/\D/g, "").slice(0, 6),
                          )
                        }
                        placeholder="123456"
                        className={cn(
                          fieldControlClasses,
                          "text-center font-mono text-lg",
                        )}
                        autoFocus
                      />
                    </div>

                    {verifyError && (
                      <Note tone="error" className="mt-3">
                        <p>{verifyError}</p>
                      </Note>
                    )}

                    <button
                      type="button"
                      onClick={async () => {
                        setVerifyError("");

                        if (totpCode.length !== 6) {
                          setVerifyError(
                            "Bitte gib einen 6-stelligen Code ein",
                          );
                          return;
                        }

                        setIsVerifying2FA(true);

                        try {
                          const result = await twoFactor.verifyTotp({
                            code: totpCode,
                          });

                          if (result.error) {
                            setVerifyError(
                              result.error.message ||
                                "Ungültiger Code. Bitte versuche es erneut.",
                            );
                          } else {
                            toast.success("2FA erfolgreich aktiviert!");
                            setEnablePassword("");
                            setTotpCode("");
                            setTwoFactorQRCode(null);
                            setBackupCodesAcknowledged(false);
                            void utils.users.getMyProfile.invalidate();
                          }
                        } catch (error) {
                          setVerifyError(
                            error instanceof Error
                              ? error.message
                              : "Fehler bei der Verifizierung",
                          );
                        } finally {
                          setIsVerifying2FA(false);
                        }
                      }}
                      disabled={
                        isVerifying2FA ||
                        totpCode.length !== 6 ||
                        (showBackupCodes &&
                          backupCodes.length > 0 &&
                          !backupCodesAcknowledged)
                      }
                      className={cn(BTN_PRIMARY, "mt-4 w-full")}
                    >
                      {isVerifying2FA
                        ? "Wird verifiziert..."
                        : "Code verifizieren"}
                    </button>
                    {showBackupCodes &&
                      backupCodes.length > 0 &&
                      !backupCodesAcknowledged && (
                        <p className="text-dark dark:text-night-muted mt-2 text-center text-xs">
                          Bitte bestätige zuerst, dass du deine Backup-Codes
                          gespeichert hast.
                        </p>
                      )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </PageSection>
    </PublicPage>
  );
}
