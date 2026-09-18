"use client";

import { useSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/trpc/react";
import { usePermissions } from "@/lib/use-permissions";
import { PERMISSIONS } from "@/lib/permissions";
import RichTextEditor from "@/app/_components/editor/rich-text-editor-lazy";
import type { Editor } from "@tiptap/react";
import { useToast } from "@/app/_components/ui/toast";
import { useAutosave } from "@/lib/useAutosave";
import { useBeforeUnload } from "@/lib/useBeforeUnload";
import { DashboardPage, DraftRestorePrompt } from "@/app/_components/dashboard";
import {
  ScrollableModal,
  ScrollableModalCard,
  ScrollableModalBody,
  ScrollableModalFooter,
} from "@/app/_components/ui/scrollable-modal";
import {
  FieldLabel,
  Checkbox,
  fieldControlClasses,
} from "@/app/_components/programmheft/field";

/** Gefüllte / umrandete Werkbank-Schaltflächen, wie auf den Formularseiten des Hefts. */
const BTN_PRIMARY =
  "bg-ink text-paper hover:bg-primary hover:text-ink dark:bg-primary dark:text-ink dark:hover:bg-paper semi-condensed inline-flex min-h-11 items-center justify-center gap-2 px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";
const BTN_OUTLINE =
  "border-ink text-ink hover:bg-ink hover:text-paper dark:border-night-text dark:text-night-text dark:hover:bg-night-text dark:hover:text-night semi-condensed inline-flex min-h-11 items-center justify-center gap-2 border-2 px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";

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
  const [showGenerateConfirm, setShowGenerateConfirm] = useState(false);
  // Test and real send share one mutation; track which one is in flight for the spinner.
  const [sendMode, setSendMode] = useState<"test" | "all" | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);

  // Must be referentially stable, otherwise the autosave is rescheduled on every render.
  const autosaveData = useMemo(
    () => ({ subject, content }),
    [subject, content],
  );
  const hasUnsavedChanges = Boolean(subject.trim() || content.trim());

  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, {
      enabled: !!session?.user,
    });

  const { pendingDraft, restoreDraft, discardDraft, clear, storageFailed } =
    useAutosave({
      name: "newsletter-compose",
      data: autosaveData,
      userId: session?.user?.id,
      ready: !isPending && !profileLoading,
    });

  const handleRestoreDraft = () => {
    const saved = restoreDraft();
    if (!saved) return;
    setSubject(saved.subject || "");
    setContent(saved.content || "");
  };

  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const canManageNewsletter = hasPermission(PERMISSIONS.NEWSLETTER_MANAGE);
  const canSendNewsletter = hasPermission(PERMISSIONS.NEWSLETTER_SEND);

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
        clear();
        setSubject("");
        // Der Editor übernimmt `content` nur beim ersten Befüllen, daher explizit leeren.
        editor?.commands.clearContent();
        setContent("");
        setTestEmail("");
      }
    },
    onError: (error) => {
      toast.error(`Fehler beim Senden: ${error.message}`);
    },
    onSettled: () => {
      setSendMode(null);
    },
  });

  useBeforeUnload(hasUnsavedChanges && !sendNewsletter.isPending);

  useEffect(() => {
    if (!isPending && !session && !hasRedirected.current) {
      hasRedirected.current = true;
      redirect("/login?callbackUrl=/dashboard/newsletter/compose");
    }
  }, [isPending, session]);

  useEffect(() => {
    if (
      !profileLoading &&
      profile &&
      !permissionsLoading &&
      !canManageNewsletter &&
      !hasRedirected.current
    ) {
      hasRedirected.current = true;
      redirect("/dashboard");
    }
  }, [profile, profileLoading, permissionsLoading, canManageNewsletter]);

  const handleGenerate = async () => {
    // Don't silently overwrite an existing draft with generated content.
    if (content.trim()) {
      setShowGenerateConfirm(true);
      return;
    }
    await doGenerate();
  };

  const doGenerate = async () => {
    setShowGenerateConfirm(false);
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

    setSendMode("test");
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
    setSendMode("all");
    sendNewsletter.mutate({
      subject,
      content,
    });
  };

  if (isPending || profileLoading) {
    return (
      <div className="bg-paper dark:bg-night flex min-h-screen items-center justify-center">
        <div className="border-ink dark:border-night-text h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !profile || !canManageNewsletter) {
    return null;
  }

  return (
    <DashboardPage
      title="Newsletter erstellen"
      description="Erstelle und sende einen Newsletter an alle Abonnenten"
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Newsletter", href: "/dashboard/newsletter" },
        { label: "Erstellen" },
      ]}
    >
      <DraftRestorePrompt
        draft={pendingDraft}
        onRestore={handleRestoreDraft}
        onDiscard={discardDraft}
        storageFailed={storageFailed}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="border-rule dark:border-night-rule border p-6">
            <div className="mb-6">
              <FieldLabel htmlFor="newsletter-subject" required>
                Betreff
              </FieldLabel>
              <input
                id="newsletter-subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Newsletter Betreff"
                className={fieldControlClasses}
              />
            </div>

            <div className="mb-6">
              <p className="semi-condensed text-ink dark:text-night-text mb-2 block text-base font-semibold">
                Inhalt
                <span
                  aria-hidden
                  className="text-primary-ink dark:text-primary"
                >
                  {" "}
                  *
                </span>
              </p>
              <RichTextEditor
                content={content}
                onChange={setContent}
                onEditorReady={setEditor}
                placeholder="Schreibe hier deinen Newsletter..."
              />
              <p className="text-dark dark:text-night-muted mt-2 text-xs">
                Nutze die Werkzeugleiste zur Formatierung. Unterstützt
                Überschriften, Listen, Links, Bilder und mehr.
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleSendTest}
                disabled={
                  sendNewsletter.isPending || !testEmail || !canSendNewsletter
                }
                className={`${BTN_OUTLINE} flex-1`}
              >
                {sendNewsletter.isPending && sendMode === "test"
                  ? "Test wird gesendet..."
                  : "Test senden"}
              </button>
              <button
                onClick={handleSend}
                disabled={sendNewsletter.isPending || !canSendNewsletter}
                className={`${BTN_PRIMARY} flex-1`}
              >
                {sendNewsletter.isPending && sendMode === "all"
                  ? "Wird gesendet..."
                  : `An ${statistics?.active || 0} Abonnenten senden`}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="border-rule dark:border-night-rule border p-6">
            <h2 className="condensed text-ink dark:text-night-text mb-4 text-lg font-bold">
              Newsletter generieren
            </h2>
            <p className="text-dark dark:text-night-muted mb-4 text-sm">
              Generiere automatisch einen Newsletter basierend auf neuen
              Beiträgen und kommenden Terminen.
            </p>

            <div className="mb-4 space-y-1">
              <Checkbox
                id="include-news"
                checked={includeNews}
                onChange={(e) => setIncludeNews(e.target.checked)}
              >
                Neue Beiträge einbeziehen
              </Checkbox>
              <Checkbox
                id="include-events"
                checked={includeEvents}
                onChange={(e) => setIncludeEvents(e.target.checked)}
              >
                Kommende Termine einbeziehen
              </Checkbox>
            </div>

            <div className="mb-4 space-y-3">
              <div>
                <FieldLabel htmlFor="days-back">Tage zurück</FieldLabel>
                <input
                  id="days-back"
                  type="number"
                  min="1"
                  max="90"
                  value={daysBack}
                  onChange={(e) => setDaysBack(Number(e.target.value))}
                  className={fieldControlClasses}
                />
              </div>
              <div>
                <FieldLabel htmlFor="days-ahead">Tage voraus</FieldLabel>
                <input
                  id="days-ahead"
                  type="number"
                  min="1"
                  max="90"
                  value={daysAhead}
                  onChange={(e) => setDaysAhead(Number(e.target.value))}
                  className={fieldControlClasses}
                />
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating || generateNewsletter.isFetching}
              className={`${BTN_PRIMARY} w-full`}
            >
              {isGenerating || generateNewsletter.isFetching
                ? "Wird generiert..."
                : "Newsletter generieren"}
            </button>
          </div>

          <div className="border-rule dark:border-night-rule border p-6">
            <h2
              id="test-email-heading"
              className="condensed text-ink dark:text-night-text mb-4 text-lg font-bold"
            >
              Test-E-Mail
            </h2>
            <p className="text-dark dark:text-night-muted mb-4 text-sm">
              Sende eine Test-E-Mail, bevor du den Newsletter an alle Abonnenten
              sendest.
            </p>
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="test@example.com"
              aria-labelledby="test-email-heading"
              className={fieldControlClasses}
            />
          </div>

          {statistics && (
            <div className="border-rule dark:border-night-rule border p-6">
              <h2 className="condensed text-ink dark:text-night-text mb-4 text-lg font-bold">
                Statistiken
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-dark dark:text-night-muted text-sm">
                    Aktive Abonnenten
                  </span>
                  <span className="text-ink dark:text-night-text font-semibold">
                    {statistics.active}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark dark:text-night-muted text-sm">
                    Gesamt
                  </span>
                  <span className="text-ink dark:text-night-text font-semibold">
                    {statistics.total}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showGenerateConfirm && (
        <ScrollableModal onBackdropClick={() => setShowGenerateConfirm(false)}>
          <ScrollableModalCard maxW="md">
            <ScrollableModalBody>
              <h3 className="condensed text-ink dark:text-night-text mb-4 text-lg font-bold">
                Inhalt überschreiben?
              </h3>
              <p className="text-dark dark:text-night-muted mb-4 text-sm">
                Der Editor enthält bereits Text. Beim Generieren wird der
                aktuelle Inhalt ersetzt.
              </p>
            </ScrollableModalBody>
            <ScrollableModalFooter>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowGenerateConfirm(false)}
                  className={BTN_OUTLINE}
                >
                  Abbrechen
                </button>
                <button
                  onClick={() => void doGenerate()}
                  className={BTN_PRIMARY}
                >
                  Überschreiben und generieren
                </button>
              </div>
            </ScrollableModalFooter>
          </ScrollableModalCard>
        </ScrollableModal>
      )}

      {showConfirmModal && (
        <ScrollableModal onBackdropClick={() => setShowConfirmModal(false)}>
          <ScrollableModalCard maxW="md">
            <ScrollableModalBody>
              <h3 className="condensed text-ink dark:text-night-text mb-4 text-lg font-bold">
                Newsletter senden?
              </h3>
              <p className="text-dark dark:text-night-muted mb-2 text-sm">
                Möchtest du diesen Newsletter wirklich an{" "}
                <strong className="text-ink dark:text-night-text">
                  {statistics?.active || 0} Abonnenten
                </strong>{" "}
                senden?
              </p>
              <p className="text-dark dark:text-night-muted mb-4 text-xs">
                Diese Aktion kann nicht rückgängig gemacht werden.
              </p>
            </ScrollableModalBody>
            <ScrollableModalFooter>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className={BTN_OUTLINE}
                >
                  Abbrechen
                </button>
                <button
                  onClick={confirmSend}
                  disabled={sendNewsletter.isPending}
                  className={BTN_PRIMARY}
                >
                  {sendNewsletter.isPending ? "Wird gesendet..." : "Senden"}
                </button>
              </div>
            </ScrollableModalFooter>
          </ScrollableModalCard>
        </ScrollableModal>
      )}
    </DashboardPage>
  );
}
