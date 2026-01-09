"use client";

import { useSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/trpc/react";
import Link from "next/link";
import { UserRole } from "~/generated/prisma/enums";
import RichTextEditor from "@/app/_components/editor/rich-text-editor";
import { useToast } from "@/app/_components/ui/toast";

const ALLOWED_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.LPW];

export default function DashboardNewsletterComposePage() {
  const { data: session, isPending } = useSession();
  const hasRedirected = useRef(false);
  const toast = useToast();
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [daysBack, setDaysBack] = useState(30);
  const [daysAhead, setDaysAhead] = useState(30);
  const [includeNews, setIncludeNews] = useState(true);
  const [includeEvents, setIncludeEvents] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, {
      enabled: !!session?.user,
    });

  const { data: statistics } = api.newsletter.getStatistics.useQuery(
    undefined,
    {
      enabled: !!session?.user && !!profile,
    },
  );

  const generateNewsletter = api.newsletter.generateNewsletter.useQuery(
    {
      includeNews,
      includeEvents,
      daysBack,
      daysAhead,
    },
    {
      enabled: false,
    },
  );

  const sendNewsletter = api.newsletter.sendNewsletter.useMutation({
    onSuccess: (data, variables) => {
      if (variables.testEmail) {
        toast.success(
          `Test-Newsletter erfolgreich an ${variables.testEmail} gesendet!`,
        );
      } else {
        toast.success(
          `Newsletter erfolgreich gesendet! ${data.sentTo} Abonnenten erreicht.`,
        );
        setSubject("");
        setContent("");
        setTestEmail("");
      }
    },
    onError: (error) => {
      toast.error(`Fehler beim Senden: ${error.message}`);
    },
  });

  useEffect(() => {
    if (!isPending && !session && !hasRedirected.current) {
      hasRedirected.current = true;
      redirect("/login?callbackUrl=/dashboard/newsletter/compose");
    }
  }, [isPending, session]);

  useEffect(() => {
    if (!profileLoading && profile && !hasRedirected.current) {
      if (!ALLOWED_ROLES.includes(profile.role)) {
        hasRedirected.current = true;
        redirect("/dashboard");
      }
    }
  }, [profile, profileLoading]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const result = await generateNewsletter.refetch();
      if (result.data?.hasContent) {
        setContent(result.data.content);
        if (!subject) {
          setSubject("Newsletter - Posaunenwerk Rheinland");
        }
        toast.success("Newsletter erfolgreich generiert!");
      } else {
        toast.warning("Keine neuen Inhalte im ausgewählten Zeitraum gefunden.");
      }
    } catch (error) {
      console.error("Error generating newsletter:", error);
      toast.error("Fehler beim Generieren des Newsletters.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendTest = async () => {
    if (!testEmail || !subject || !content) {
      toast.warning("Bitte fülle alle Felder aus.");
      return;
    }

    sendNewsletter.mutate({
      subject,
      content,
      testEmail,
    });
  };

  const handleSend = async () => {
    if (!subject || !content) {
      toast.warning("Bitte fülle alle Felder aus.");
      return;
    }

    setShowConfirmModal(true);
  };

  const confirmSend = () => {
    setShowConfirmModal(false);
    sendNewsletter.mutate({
      subject,
      content,
    });
  };

  if (isPending || profileLoading) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !profile || !ALLOWED_ROLES.includes(profile.role)) {
    return null;
  }

  return (
    <main className="dark:bg-dark-background min-h-screen bg-gray-50">
      <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-4 text-sm">
          <ol className="flex items-center gap-2">
            <li>
              <Link
                href="/dashboard"
                className="hover:text-primary dark:text-dark-muted dark:hover:text-primary text-gray-500"
              >
                Dashboard
              </Link>
            </li>
            <li className="dark:text-dark-muted text-gray-400">/</li>
            <li>
              <Link
                href="/dashboard/newsletter"
                className="hover:text-primary dark:text-dark-muted dark:hover:text-primary text-gray-500"
              >
                Newsletter
              </Link>
            </li>
            <li className="dark:text-dark-muted text-gray-400">/</li>
            <li className="dark:text-dark-text text-gray-900">Erstellen</li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="dark:text-dark-text text-3xl font-bold text-gray-900">
            Newsletter erstellen
          </h1>
          <p className="dark:text-dark-muted mt-2 text-gray-600">
            Erstelle und sende einen Newsletter an alle Abonnenten
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Main Editor */}
          <div className="lg:col-span-2">
            <div className="dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow dark:border-gray-700">
              <div className="mb-6">
                <label className="dark:text-dark-text mb-2 block text-sm font-medium text-gray-700">
                  Betreff *
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Newsletter Betreff"
                  className="dark:bg-dark-background dark:border-dark-border dark:text-dark-text focus:border-primary focus:ring-primary/20 w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:outline-none"
                />
              </div>

              <div className="mb-6">
                <label className="dark:text-dark-text mb-2 block text-sm font-medium text-gray-700">
                  Inhalt *
                </label>
                <RichTextEditor
                  content={content}
                  onChange={setContent}
                  placeholder="Schreibe hier deinen Newsletter..."
                />
                <p className="dark:text-dark-muted mt-2 text-xs text-gray-500">
                  Nutze die Werkzeugleiste zur Formatierung. Unterstützt
                  Überschriften, Listen, Links, Bilder und mehr.
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={handleSendTest}
                  disabled={sendNewsletter.isPending || !testEmail}
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Test senden
                </button>
                <button
                  onClick={handleSend}
                  disabled={sendNewsletter.isPending}
                  className="bg-primary hover:bg-primary/90 flex-1 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {sendNewsletter.isPending
                    ? "Wird gesendet..."
                    : `An ${statistics?.active || 0} Abonnenten senden`}
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Generate Newsletter */}
            <div className="dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow dark:border-gray-700">
              <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
                Newsletter generieren
              </h2>
              <p className="dark:text-dark-muted mb-4 text-sm text-gray-600">
                Generiere automatisch einen Newsletter basierend auf neuen
                Beiträgen und kommenden Terminen.
              </p>

              <div className="mb-4 space-y-3">
                <label className="dark:text-dark-text flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={includeNews}
                    onChange={(e) => setIncludeNews(e.target.checked)}
                    className="text-primary focus:ring-primary rounded border-gray-300"
                  />
                  Neue Beiträge einbeziehen
                </label>
                <label className="dark:text-dark-text flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={includeEvents}
                    onChange={(e) => setIncludeEvents(e.target.checked)}
                    className="text-primary focus:ring-primary rounded border-gray-300"
                  />
                  Kommende Termine einbeziehen
                </label>
              </div>

              <div className="mb-4 space-y-3">
                <div>
                  <label className="dark:text-dark-text mb-1 block text-xs font-medium text-gray-700">
                    Tage zurück
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={daysBack}
                    onChange={(e) => setDaysBack(Number(e.target.value))}
                    className="dark:bg-dark-background dark:border-dark-border dark:text-dark-text focus:border-primary focus:ring-primary/20 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="dark:text-dark-text mb-1 block text-xs font-medium text-gray-700">
                    Tage voraus
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={daysAhead}
                    onChange={(e) => setDaysAhead(Number(e.target.value))}
                    className="dark:bg-dark-background dark:border-dark-border dark:text-dark-text focus:border-primary focus:ring-primary/20 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:outline-none"
                  />
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={isGenerating || generateNewsletter.isFetching}
                className="bg-primary hover:bg-primary/90 w-full rounded-lg px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isGenerating || generateNewsletter.isFetching
                  ? "Wird generiert..."
                  : "Newsletter generieren"}
              </button>
            </div>

            {/* Test Email */}
            <div className="dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow dark:border-gray-700">
              <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
                Test-E-Mail
              </h2>
              <p className="dark:text-dark-muted mb-4 text-sm text-gray-600">
                Sende eine Test-E-Mail, bevor du den Newsletter an alle
                Abonnenten sendest.
              </p>
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="test@example.com"
                className="dark:bg-dark-background dark:border-dark-border dark:text-dark-text focus:border-primary focus:ring-primary/20 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:outline-none"
              />
            </div>

            {/* Statistics */}
            {statistics && (
              <div className="dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow dark:border-gray-700">
                <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
                  Statistiken
                </h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="dark:text-dark-muted text-sm text-gray-600">
                      Aktive Abonnenten
                    </span>
                    <span className="dark:text-dark-text font-semibold text-gray-900">
                      {statistics.active}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="dark:text-dark-muted text-sm text-gray-600">
                      Gesamt
                    </span>
                    <span className="dark:text-dark-text font-semibold text-gray-900">
                      {statistics.total}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowConfirmModal(false)}
        >
          <div
            className="dark:bg-dark-surface w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="dark:text-dark-text mb-4 text-lg font-bold">
              Newsletter senden?
            </h3>
            <p className="dark:text-dark-muted mb-2 text-sm text-gray-600">
              Möchtest du diesen Newsletter wirklich an{" "}
              <strong>{statistics?.active || 0} Abonnenten</strong> senden?
            </p>
            <p className="dark:text-dark-muted mb-4 text-xs text-gray-500">
              Diese Aktion kann nicht rückgängig gemacht werden.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="dark:border-dark-border dark:text-dark-text rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Abbrechen
              </button>
              <button
                onClick={confirmSend}
                disabled={sendNewsletter.isPending}
                className="bg-primary hover:bg-primary/90 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sendNewsletter.isPending ? "Wird gesendet..." : "Senden"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
