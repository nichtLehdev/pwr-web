"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth";
import { api } from "@/trpc/react";
import { useToast } from "@/app/_components/ui/toast";
import { useAutosave } from "@/lib/useAutosave";
import { useBeforeUnload } from "@/lib/useBeforeUnload";
import {
  CourseInvoicesButton,
  DraftRestorePrompt,
} from "@/app/_components/dashboard";
import RichTextEditor from "@/app/_components/editor/rich-text-editor-lazy";
import {
  ScrollableModal,
  ScrollableModalCard,
  ScrollableModalHeader,
  ScrollableModalBody,
  ScrollableModalFooter,
} from "@/app/_components/ui/scrollable-modal";
import { RegistrationStatus } from "~/generated/prisma/enums";
import type { Editor } from "@tiptap/react";
import {
  COURSE_MAIL_PLACEHOLDER_GROUPS,
  findUnknownPlaceholders,
} from "@/lib/course-mail-placeholders";
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  BracesIcon,
  ClipboardCopyIcon,
  EyeIcon,
  PaperclipIcon,
  Trash2Icon,
  UsersIcon,
} from "lucide-react";

const statusLabels: Record<RegistrationStatus, string> = {
  CONFIRMED: "Bestätigt",
  WAITLIST: "Warteliste",
  CANCELLED: "Storniert",
};

/** Mirrors the per-file cap of the course-mail upload folder. */
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
/** Mirrors MAX_TOTAL_ATTACHMENT_BYTES in the courseMail router. */
const MAX_TOTAL_ATTACHMENT_BYTES = 10 * 1024 * 1024;

const ACCEPTED_ATTACHMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
].join(",");

type Attachment = { filename: string; url: string; size: number };

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function CourseMailPageContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const courseId = params.id as string;
  const { data: session, isPending: sessionLoading } = useSession();
  const toast = useToast();
  const hasRedirected = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const subjectInputRef = useRef<HTMLInputElement>(null);

  // A hand-picked selection handed over from the participants list. Empty
  // means "everyone matching the status filter".
  const selectedRegistrationIds = useMemo(() => {
    const raw = searchParams.get("registrationIds");
    if (!raw) return [];
    return raw.split(",").filter(Boolean);
  }, [searchParams]);

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [replyToEmail, setReplyToEmail] = useState("");
  /** Where "Test senden" delivers to — the sender's own address by default. */
  const [testEmail, setTestEmail] = useState("");
  const [statuses, setStatuses] = useState<RegistrationStatus[]>([
    RegistrationStatus.CONFIRMED,
  ]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showRecipients, setShowRecipients] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  /** Whose data the preview is filled with; empty means "the first recipient". */
  const [previewRecipientId, setPreviewRecipientId] = useState("");
  const [sendCopyToSender, setSendCopyToSender] = useState(true);
  const [attachInvoices, setAttachInvoices] = useState(false);
  const [includeGreeting, setIncludeGreeting] = useState(true);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [lastFocused, setLastFocused] = useState<"subject" | "body">("body");
  // Test send and real send share one mutation — track which is in flight so
  // only the button that was pressed shows a spinner.
  const [sendMode, setSendMode] = useState<"test" | "all" | null>(null);

  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, { enabled: !!session?.user });

  const { data: course, isLoading: courseLoading } =
    api.courses.getById.useQuery(
      { id: courseId },
      { enabled: !!courseId && !!session?.user },
    );

  const { data: canSend, isLoading: canSendLoading } =
    api.courseMail.canSend.useQuery(
      { courseId },
      { enabled: !!courseId && !!session?.user },
    );

  const recipientQuery = api.courseMail.getRecipients.useQuery(
    {
      courseId,
      statuses,
      ...(selectedRegistrationIds.length
        ? { registrationIds: selectedRegistrationIds }
        : {}),
    },
    { enabled: !!courseId && !!session?.user && canSend === true },
  );

  const { data: invoiceAccess } = api.invoices.canManageCourseInvoices.useQuery(
    { courseId },
    { enabled: !!courseId && !!session?.user },
  );

  const sentMails = api.courseMail.listSent.useQuery(
    { courseId },
    { enabled: !!courseId && !!session?.user && canSend === true },
  );

  const utils = api.useUtils();

  const autosaveData = useMemo(
    () => ({ subject, body, attachments }),
    [subject, body, attachments],
  );
  const { pendingDraft, restoreDraft, discardDraft, clear, storageFailed } =
    useAutosave({
      name: `course-mail-${courseId}`,
      data: autosaveData,
      userId: session?.user?.id,
      ready: !sessionLoading && !profileLoading,
    });

  const handleRestoreDraft = () => {
    const saved = restoreDraft();
    if (!saved) return;
    setSubject(saved.subject || "");
    setBody(saved.body || "");
    setAttachments(saved.attachments || []);
  };

  const sendMail = api.courseMail.send.useMutation({
    onSuccess: (data, variables) => {
      // Eine übersprungene Rechnung ist kein Versandfehler: die Nachricht ist
      // raus, nur ohne das Dokument. Ohne Hinweis hier hielte man sie für
      // zugestellt — der Server hat es sonst nur ins Log geschrieben.
      if (data.skippedInvoices.length > 0) {
        toast.warning(
          `Nicht angehängt: ${data.skippedInvoices.join(", ")} — die E-Mail wurde ohne diese Rechnung(en) versendet.`,
          10000,
        );
      }
      if (data.test) {
        toast.success(`Test-E-Mail wurde an ${variables.testEmail} gesendet.`);
        return;
      }
      if (data.failedCount > 0) {
        toast.error(
          `${data.sentCount} von ${data.recipientCount} E-Mails versendet, ${data.failedCount} fehlgeschlagen.`,
        );
      } else {
        toast.success(
          `E-Mail an ${data.sentCount} ${data.sentCount === 1 ? "Empfänger" : "Empfänger"} versendet.`,
        );
      }
      clear();
      setSubject("");
      // Der Editor übernimmt `content` nur beim ersten Befüllen — ohne das
      // hier bliebe die versendete Nachricht sichtbar stehen, und die
      // nächste Eingabe darin hätte sie als „ungespeicherte Änderung“
      // zurückgeholt.
      editor?.commands.clearContent();
      setBody("");
      setAttachments([]);
      void sentMails.refetch();
      void utils.courseMail.listSent.invalidate({ courseId });
    },
    onError: (error) => {
      toast.error(`Fehler beim Senden: ${error.message}`);
    },
    onSettled: () => {
      setSendMode(null);
      setShowConfirm(false);
    },
  });

  const previewMail = api.courseMail.preview.useMutation({
    onError: (error) => {
      toast.error(`Vorschau nicht möglich: ${error.message}`);
      setShowPreview(false);
    },
  });

  const hasUnsavedChanges = Boolean(subject.trim() || body.trim());
  useBeforeUnload(hasUnsavedChanges && !sendMail.isPending);

  // Default the reply and test addresses to the sender's own once the profile
  // arrives.
  useEffect(() => {
    if (profile?.email && !replyToEmail) {
      setReplyToEmail(profile.email);
    }
    if (profile?.email && !testEmail) {
      setTestEmail(profile.email);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.email]);

  useEffect(() => {
    if (!sessionLoading && !session && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push(`/login?callbackUrl=/dashboard/courses/${courseId}/mail`);
    }
  }, [session, sessionLoading, router, courseId]);

  const toggleStatus = (status: RegistrationStatus) => {
    setStatuses((current) =>
      current.includes(status)
        ? current.filter((entry) => entry !== status)
        : [...current, status],
    );
  };

  const totalAttachmentBytes = attachments.reduce(
    (sum, attachment) => sum + attachment.size,
    0,
  );

  const unknownPlaceholders = useMemo(
    () => [
      ...new Set([
        ...findUnknownPlaceholders(subject),
        ...findUnknownPlaceholders(body),
      ]),
    ],
    [subject, body],
  );

  /**
   * Chips insert into whichever field the organizer last touched — the
   * subject is a plain input, the message is the TipTap editor.
   */
  const insertPlaceholder = (token: string) => {
    const placeholder = `{{${token}}}`;
    if (lastFocused === "subject") {
      const input = subjectInputRef.current;
      const start = input?.selectionStart ?? subject.length;
      const end = input?.selectionEnd ?? subject.length;
      setSubject(subject.slice(0, start) + placeholder + subject.slice(end));
      requestAnimationFrame(() => {
        input?.focus();
        input?.setSelectionRange(
          start + placeholder.length,
          start + placeholder.length,
        );
      });
      return;
    }
    if (!editor) {
      toast.error("Der Editor ist noch nicht bereit.");
      return;
    }
    editor.chain().focus().insertContent(placeholder).run();
  };

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files?.length) return;
    setIsUploading(true);
    let running = totalAttachmentBytes;

    for (const file of Array.from(files)) {
      if (file.size > MAX_ATTACHMENT_BYTES) {
        toast.error(
          `"${file.name}" ist größer als ${formatBytes(MAX_ATTACHMENT_BYTES)}.`,
        );
        continue;
      }
      if (running + file.size > MAX_TOTAL_ATTACHMENT_BYTES) {
        toast.error(
          `Die Anhänge dürfen zusammen höchstens ${formatBytes(MAX_TOTAL_ATTACHMENT_BYTES)} groß sein.`,
        );
        break;
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "course-mail");

      try {
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const result = (await response.json()) as {
          url?: string;
          size?: number;
          error?: string;
        };
        if (!response.ok || !result.url) {
          toast.error(
            result.error ?? `"${file.name}" konnte nicht hochgeladen werden.`,
          );
          continue;
        }
        running += result.size ?? file.size;
        setAttachments((current) => [
          ...current,
          {
            // The stored name is sanitized and timestamped — keep the name the
            // organizer picked for what recipients actually see.
            filename: file.name,
            url: result.url!,
            size: result.size ?? file.size,
          },
        ]);
      } catch {
        toast.error(`"${file.name}" konnte nicht hochgeladen werden.`);
      }
    }

    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const copyAddresses = async () => {
    const addresses = recipientQuery.data?.recipients
      .map((recipient) => recipient.email)
      .join("; ");
    if (!addresses) {
      toast.error("Keine Empfänger zum Kopieren.");
      return;
    }
    try {
      await navigator.clipboard.writeText(addresses);
      toast.success(
        `${recipientQuery.data?.count} Adressen in die Zwischenablage kopiert.`,
      );
    } catch {
      toast.error("Kopieren nicht möglich.");
    }
  };

  const validateContent = (): string | null => {
    if (!subject.trim()) return "Bitte gib einen Betreff ein.";
    if (!body.trim()) return "Bitte schreibe eine Nachricht.";
    if (!replyToEmail.trim()) return "Bitte gib eine Antwort-Adresse an.";
    return null;
  };

  const validate = (): string | null => {
    const contentError = validateContent();
    if (contentError) return contentError;
    if (unknownPlaceholders.length > 0) {
      return `Unbekannte Platzhalter: ${unknownPlaceholders
        .map((token) => `{{${token}}}`)
        .join(", ")}`;
    }
    return null;
  };

  const sendPayload = () => ({
    courseId,
    subject: subject.trim(),
    body,
    replyToEmail: replyToEmail.trim(),
    attachments,
    statuses,
    sendCopyToSender,
    includeGreeting,
    attachInvoices,
    ...(selectedRegistrationIds.length
      ? { registrationIds: selectedRegistrationIds }
      : {}),
  });

  const runPreview = (registrationId: string) => {
    previewMail.mutate({
      courseId,
      subject: subject.trim(),
      body,
      replyToEmail: replyToEmail.trim(),
      includeGreeting,
      attachInvoices,
      statuses,
      ...(registrationId ? { registrationId } : {}),
      ...(selectedRegistrationIds.length
        ? { registrationIds: selectedRegistrationIds }
        : {}),
    });
  };

  const handlePreview = () => {
    // Deliberately not validate(): an unknown placeholder is exactly what the
    // preview should show you, rather than refuse over.
    const error = validateContent();
    if (error) {
      toast.error(error);
      return;
    }
    const first = recipientQuery.data?.recipients[0]?.id ?? "";
    setPreviewRecipientId(first);
    setShowPreview(true);
    runPreview(first);
  };

  const handlePreviewRecipientChange = (registrationId: string) => {
    setPreviewRecipientId(registrationId);
    runPreview(registrationId);
  };

  const handleTestSend = () => {
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }
    const address = testEmail.trim();
    if (!address) {
      toast.error("Bitte gib eine Adresse für den Test an.");
      return;
    }
    setSendMode("test");
    sendMail.mutate({ ...sendPayload(), testEmail: address });
  };

  const handleSend = () => {
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }
    if (!recipientQuery.data?.count) {
      toast.error("Für diese Auswahl gibt es keine Empfänger.");
      return;
    }
    setShowConfirm(true);
  };

  const confirmSend = () => {
    setSendMode("all");
    sendMail.mutate(sendPayload());
  };

  if (sessionLoading || profileLoading || courseLoading || canSendLoading) {
    return (
      <div className="dark:bg-night bg-paper flex min-h-screen items-center justify-center">
        <div className="border-ink dark:border-night-text h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !profile) return null;

  if (!course || canSend === false) {
    return (
      <div className="dark:bg-night bg-paper flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="dark:text-night-text text-ink text-xl font-semibold">
            Keine Berechtigung
          </h1>
          <p className="dark:text-night-muted text-dark mt-2">
            Du kannst die Anmelder:innen dieses Kurses nicht anschreiben.
          </p>
          <Link
            href="/dashboard/courses"
            className="link-ink mt-4 inline-block"
          >
            Zurück zur Übersicht
          </Link>
        </div>
      </div>
    );
  }

  const recipientCount = recipientQuery.data?.count ?? 0;
  const isSending = sendMail.isPending;

  return (
    <main className="programm font-programm dark:bg-night dark:text-night-text bg-paper text-ink min-h-screen">
      <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="dark:text-night-text text-ink text-2xl font-bold sm:text-3xl">
              Anmelder:innen anschreiben
            </h1>
            <p className="dark:text-night-muted text-dark mt-1 truncate">
              {course.title}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CourseInvoicesButton courseId={courseId} short />
            <Link
              href={`/dashboard/courses/${courseId}/participants`}
              className="border-rule dark:border-night-rule text-ink dark:text-night-text hover:bg-rule/25 dark:hover:bg-night-raised inline-flex min-h-11 items-center gap-2 border px-4 py-2 text-sm font-medium transition-colors"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              Zurück zu den Teilnehmern
            </Link>
          </div>
        </div>

        {selectedRegistrationIds.length > 0 && (
          <div className="mb-6 border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
            Diese Nachricht geht nur an die{" "}
            <strong>{selectedRegistrationIds.length} ausgewählten</strong>{" "}
            Anmeldungen aus der Teilnehmerliste.{" "}
            <Link
              href={`/dashboard/courses/${courseId}/mail`}
              className="underline"
            >
              Auswahl aufheben
            </Link>
          </div>
        )}

        <DraftRestorePrompt
          draft={pendingDraft}
          onRestore={handleRestoreDraft}
          onDiscard={discardDraft}
          storageFailed={storageFailed}
        />

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Composer */}
          <div className="lg:col-span-2">
            <div className="dark:border-night-rule border-rule border p-6">
              <div className="mb-6">
                <label className="dark:text-night-text text-ink mb-2 block text-sm font-medium">
                  Betreff *
                </label>
                <input
                  ref={subjectInputRef}
                  type="text"
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  onFocus={() => setLastFocused("subject")}
                  placeholder={`Informationen zu ${course.title}`}
                  className="border-ink dark:border-night-text dark:bg-night dark:text-night-text bg-paper w-full border px-4 py-2"
                />
              </div>

              <div className="mb-6">
                <label className="dark:text-night-text text-ink mb-2 block text-sm font-medium">
                  Nachricht *
                </label>
                <div onFocus={() => setLastFocused("body")}>
                  <RichTextEditor
                    content={body}
                    onChange={setBody}
                    onEditorReady={setEditor}
                    placeholder="Schreibe hier deine Nachricht an die Anmelder:innen..."
                  />
                </div>
                <label className="dark:text-night-text text-ink mt-3 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={includeGreeting}
                    onChange={(event) =>
                      setIncludeGreeting(event.target.checked)
                    }
                    className="text-primary border-rule dark:border-night-text"
                  />
                  Automatische Anrede („Hallo Vorname,“) voranstellen
                </label>
                <p className="dark:text-night-muted text-dark mt-1 text-xs">
                  Schalte das aus, wenn du deine Anrede mit Platzhaltern selbst
                  schreibst. Der Kurs-Kopf wird immer ergänzt.
                </p>
              </div>

              {unknownPlaceholders.length > 0 && (
                <div className="mb-6 border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                  Unbekannte Platzhalter:{" "}
                  {unknownPlaceholders
                    .map((token) => `{{${token}}}`)
                    .join(", ")}
                  . Sie würden unverändert in der E-Mail landen.
                </div>
              )}

              {/* Invoices */}
              {(invoiceAccess?.canManage ?? false) && (
                <div className="dark:border-night-rule border-rule mb-6 border p-4">
                  <label className="dark:text-night-text text-ink flex cursor-pointer items-start gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={attachInvoices}
                      onChange={(event) =>
                        setAttachInvoices(event.target.checked)
                      }
                      className="text-primary border-rule dark:border-night-text mt-0.5"
                    />
                    <span>
                      <span className="block font-medium">
                        Rechnung anhängen
                      </span>
                      <span className="dark:text-night-muted text-dark block text-xs">
                        Jede:r Empfänger:in bekommt die eigene ausgestellte
                        Rechnung als PDF. Wer keine hat, erhält die Nachricht
                        ohne Anhang. Dazu passen die Platzhalter der Gruppe
                        „Rechnung“.
                      </span>
                    </span>
                  </label>
                </div>
              )}

              {/* Attachments */}
              <div className="mb-6">
                <label className="dark:text-night-text text-ink mb-2 block text-sm font-medium">
                  Anhänge
                </label>
                {attachments.length > 0 && (
                  <ul className="mb-3 space-y-2">
                    {attachments.map((attachment) => (
                      <li
                        key={attachment.url}
                        className="dark:border-night-rule dark:bg-night-raised border-rule bg-rule/25 flex items-center justify-between gap-3 border px-3 py-2 text-sm"
                      >
                        <span className="dark:text-night-text text-ink flex min-w-0 items-center gap-2">
                          <PaperclipIcon className="h-4 w-4 shrink-0" />
                          <span className="truncate">
                            {attachment.filename}
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-3">
                          <span className="dark:text-night-muted text-dark text-xs">
                            {formatBytes(attachment.size)}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setAttachments((current) =>
                                current.filter(
                                  (entry) => entry.url !== attachment.url,
                                ),
                              )
                            }
                            className="text-dark dark:text-night-muted transition-colors hover:text-red-600"
                            aria-label={`${attachment.filename} entfernen`}
                          >
                            <Trash2Icon className="h-4 w-4" />
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={ACCEPTED_ATTACHMENT_TYPES}
                  onChange={(event) =>
                    void handleFilesSelected(event.target.files)
                  }
                  className="dark:text-night-muted file:bg-primary file:text-ink hover:file:bg-primary/90 text-dark file:border-ink dark:file:border-night-text block w-full text-sm file:mr-4 file:border file:px-4 file:py-2 file:text-sm file:font-medium"
                />
                <p className="dark:text-night-muted text-dark mt-2 text-xs">
                  PDF, Word, Excel oder Bilder – zusammen höchstens{" "}
                  {formatBytes(MAX_TOTAL_ATTACHMENT_BYTES)}
                  {totalAttachmentBytes > 0 &&
                    ` (aktuell ${formatBytes(totalAttachmentBytes)})`}
                  .
                </p>
              </div>

              <div className="mb-4">
                <label className="dark:text-night-text text-ink mb-2 block text-sm font-medium">
                  Test-E-Mail an
                </label>
                <input
                  type="email"
                  value={testEmail}
                  onChange={(event) => setTestEmail(event.target.value)}
                  placeholder="test@example.com"
                  className="border-ink dark:border-night-text dark:bg-night dark:text-night-text bg-paper w-full border px-4 py-2 text-sm"
                />
                <p className="dark:text-night-muted text-dark mt-2 text-xs">
                  Der Testversand geht nur an diese Adresse — vorbelegt mit
                  deiner eigenen.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handlePreview}
                  disabled={isSending || isUploading}
                  title="Zeigt die fertige E-Mail so, wie eine ausgewählte Person sie bekommt — ohne etwas zu versenden."
                  className="border-rule dark:border-night-rule text-ink dark:text-night-text hover:bg-rule/25 dark:hover:bg-night-raised inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 border px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <EyeIcon className="h-4 w-4" />
                  Vorschau
                </button>
                <button
                  onClick={handleTestSend}
                  disabled={isSending || isUploading || !testEmail.trim()}
                  title="Sendet die Nachricht nur an die Test-Adresse — mit den echten Daten des ersten Empfängers, damit du die Platzhalter siehst."
                  className="border-rule dark:border-night-rule text-ink dark:text-night-text hover:bg-rule/25 dark:hover:bg-night-raised min-h-11 flex-1 border px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSending && sendMode === "test"
                    ? "Test wird gesendet..."
                    : "Test senden"}
                </button>
                <button
                  onClick={handleSend}
                  disabled={isSending || isUploading || recipientCount === 0}
                  className="bg-ink text-paper hover:bg-primary hover:text-ink dark:bg-night-text dark:text-night dark:hover:bg-primary dark:hover:text-ink min-h-11 flex-1 px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSending && sendMode === "all"
                    ? "Wird gesendet..."
                    : `An ${recipientCount} ${recipientCount === 1 ? "Empfänger" : "Empfänger"} senden`}
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="dark:border-night-rule border-rule border p-6">
              <h2 className="dark:text-night-text text-ink mb-2 flex items-center gap-2 text-lg font-semibold">
                <BracesIcon className="h-5 w-5" />
                Platzhalter
              </h2>
              <p className="dark:text-night-muted text-dark mb-4 text-xs">
                Klicken, um an der Cursor-Position einzufügen — sie werden für
                jede Empfängerin und jeden Empfänger einzeln ersetzt. Wirkt auch
                im Betreff.
              </p>
              <div className="space-y-4">
                {COURSE_MAIL_PLACEHOLDER_GROUPS.map((group) => (
                  <div key={group.id}>
                    <h3 className="dark:text-night-text text-ink text-xs font-semibold">
                      {group.label}
                    </h3>
                    <p className="dark:text-night-muted text-dark text-[11px]">
                      {group.description}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {group.placeholders.map((placeholder) => (
                        <button
                          key={placeholder.token}
                          type="button"
                          onClick={() => insertPlaceholder(placeholder.token)}
                          title={`Beispiel: ${placeholder.example}`}
                          className="border-rule dark:border-night-rule dark:bg-night-raised dark:text-night-text bg-rule/25 text-ink hover:bg-rule/50 flex flex-col items-start border px-2 py-1 text-left transition-colors"
                        >
                          <span className="text-xs font-medium">
                            {placeholder.label}
                          </span>
                          <span className="dark:text-night-muted text-dark font-mono text-[10px]">
                            {`{{${placeholder.token}}}`}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <p className="dark:text-night-muted text-dark mt-4 text-xs">
                Hat jemand mehrere Anmeldungen, fasst{" "}
                <span className="font-mono">{"{{teilnehmer.namen}}"}</span> alle
                angemeldeten Personen zusammen.
              </p>
            </div>

            <div className="dark:border-night-rule border-rule border p-6">
              <h2 className="dark:text-night-text text-ink mb-4 flex items-center gap-2 text-lg font-semibold">
                <UsersIcon className="h-5 w-5" />
                Empfänger
              </h2>

              {selectedRegistrationIds.length === 0 && (
                <div className="mb-4 space-y-2">
                  {(
                    [
                      RegistrationStatus.CONFIRMED,
                      RegistrationStatus.WAITLIST,
                      RegistrationStatus.CANCELLED,
                    ] as RegistrationStatus[]
                  ).map((status) => (
                    <label
                      key={status}
                      className="dark:text-night-text text-ink flex items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={statuses.includes(status)}
                        onChange={() => toggleStatus(status)}
                        className="text-primary border-rule dark:border-night-text"
                      />
                      {statusLabels[status]}
                    </label>
                  ))}
                </div>
              )}

              <p className="dark:text-night-muted text-dark text-sm">
                {recipientQuery.isLoading
                  ? "Empfänger werden geladen..."
                  : `${recipientCount} ${recipientCount === 1 ? "Adresse" : "Adressen"} (Mehrfach-Anmeldungen zusammengefasst)`}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShowRecipients((current) => !current)}
                  disabled={recipientCount === 0}
                  className="border-rule dark:border-night-rule text-ink dark:text-night-text hover:bg-rule/25 dark:hover:bg-night-raised min-h-9 border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {showRecipients ? "Liste ausblenden" : "Liste anzeigen"}
                </button>
                <button
                  type="button"
                  onClick={() => void copyAddresses()}
                  disabled={recipientCount === 0}
                  className="border-rule dark:border-night-rule text-ink dark:text-night-text hover:bg-rule/25 dark:hover:bg-night-raised inline-flex min-h-9 items-center gap-1.5 border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                  title="Adressen kopieren, um die Mail im eigenen Programm zu schreiben"
                >
                  <ClipboardCopyIcon className="h-3.5 w-3.5" />
                  Adressen kopieren
                </button>
              </div>

              {showRecipients && (
                <ul className="dark:border-night-rule border-rule mt-3 max-h-56 space-y-1 overflow-y-auto border p-2 text-xs">
                  {recipientQuery.data?.recipients.map((recipient) => (
                    <li
                      key={recipient.email}
                      className="dark:text-night-muted text-dark"
                    >
                      {recipient.name} &lt;{recipient.email}&gt;
                      {recipient.registrationCount > 1 && (
                        <span className="text-dark dark:text-night-muted">
                          {" "}
                          ({recipient.registrationCount} Anmeldungen)
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="dark:border-night-rule border-rule border p-6">
              <h2 className="dark:text-night-text text-ink mb-4 text-lg font-semibold">
                Absender
              </h2>
              <p className="dark:text-night-muted text-dark mb-4 text-xs">
                Versendet wird über die Adresse des Posaunenwerks. Antworten
                gehen an die Adresse, die du hier einträgst.
              </p>
              <label className="dark:text-night-text text-ink mb-2 block text-sm font-medium">
                Antwort-Adresse *
              </label>
              <input
                type="email"
                value={replyToEmail}
                onChange={(event) => setReplyToEmail(event.target.value)}
                className="border-ink dark:border-night-text dark:bg-night dark:text-night-text bg-paper w-full border px-4 py-2 text-sm"
              />
              <label className="dark:text-night-text text-ink mt-4 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={sendCopyToSender}
                  onChange={(event) =>
                    setSendCopyToSender(event.target.checked)
                  }
                  className="text-primary border-rule dark:border-night-text"
                />
                Kopie an mich senden
              </label>
            </div>

            {(sentMails.data?.length ?? 0) > 0 && (
              <div className="dark:border-night-rule border-rule border p-6">
                <h2 className="dark:text-night-text text-ink mb-4 text-lg font-semibold">
                  Bereits versendet
                </h2>
                <ul className="space-y-3">
                  {sentMails.data?.map((mail) => (
                    <li
                      key={mail.id}
                      className="dark:border-night-rule border-rule border-b pb-3 last:border-0 last:pb-0"
                    >
                      <p className="dark:text-night-text text-ink text-sm font-medium">
                        {mail.subject}
                      </p>
                      <p className="dark:text-night-muted text-dark text-xs">
                        {new Intl.DateTimeFormat("de-DE", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(mail.createdAt))}{" "}
                        · {mail.senderName} · {mail.sentCount}/
                        {mail.recipientCount} zugestellt
                        {mail.failedCount > 0 &&
                          ` · ${mail.failedCount} fehlgeschlagen`}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {showPreview && (
        <ScrollableModal onBackdropClick={() => setShowPreview(false)}>
          <ScrollableModalCard maxW="4xl">
            <ScrollableModalHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="dark:text-night-text text-lg font-bold">
                    Vorschau
                  </h3>
                  <p className="dark:text-night-muted text-dark text-sm">
                    So kommt die E-Mail an — es wird nichts versendet.
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <label className="dark:text-night-text text-ink mb-2 block text-sm font-medium">
                  Anzeigen für
                </label>
                <select
                  value={previewRecipientId}
                  onChange={(event) =>
                    handlePreviewRecipientChange(event.target.value)
                  }
                  disabled={recipientCount === 0 || previewMail.isPending}
                  className="border-ink dark:border-night-text dark:bg-night dark:text-night-text bg-paper w-full border px-4 py-2 text-sm disabled:opacity-50"
                >
                  {recipientCount === 0 && (
                    <option value="">Keine Empfänger — Beispieldaten</option>
                  )}
                  {recipientQuery.data?.recipients.map((recipient) => (
                    <option key={recipient.id} value={recipient.id}>
                      {recipient.name} ({recipient.email})
                      {recipient.registrationCount > 1
                        ? ` · ${recipient.registrationCount} Anmeldungen`
                        : ""}
                    </option>
                  ))}
                </select>
              </div>
            </ScrollableModalHeader>

            <ScrollableModalBody>
              {previewMail.isPending && (
                <p className="dark:text-night-muted text-dark py-8 text-center text-sm">
                  Vorschau wird erstellt...
                </p>
              )}

              {!previewMail.isPending && previewMail.data && (
                <div className="space-y-4">
                  {previewMail.data.unknownPlaceholders.length > 0 && (
                    // Hinweis statt Alarm: Tinte auf Papier an einer
                    // Haarlinie statt bernsteinfarbenem Kasten.
                    <div className="border-ink dark:border-night-text flex items-start gap-3 border-l-2 py-2 pl-4">
                      <AlertTriangleIcon className="dark:text-night-text text-ink mt-0.5 h-4 w-4 shrink-0" />
                      <p className="text-dark dark:text-night-muted text-sm">
                        Unbekannte Platzhalter:{" "}
                        {previewMail.data.unknownPlaceholders
                          .map((token) => `{{${token}}}`)
                          .join(", ")}
                        . Sie bleiben so stehen, wie sie hier zu sehen sind —
                        senden ist erst möglich, wenn sie korrigiert sind.
                      </p>
                    </div>
                  )}

                  {previewMail.data.usesExampleData && (
                    <div className="border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                      Für diese Auswahl gibt es keine Anmeldungen — die
                      Platzhalter sind mit Beispieldaten gefüllt.
                    </div>
                  )}

                  <dl className="dark:border-night-rule dark:bg-night-raised border-rule bg-rule/25 space-y-1 border p-3 text-sm">
                    <div className="flex gap-2">
                      <dt className="dark:text-night-muted text-dark shrink-0">
                        An:
                      </dt>
                      <dd className="dark:text-night-text text-ink">
                        {previewMail.data.recipient
                          ? `${previewMail.data.recipient.name} <${previewMail.data.recipient.email}>`
                          : "Beispielempfänger"}
                      </dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="dark:text-night-muted text-dark shrink-0">
                        Antwort an:
                      </dt>
                      <dd className="dark:text-night-text text-ink">
                        {replyToEmail}
                      </dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="dark:text-night-muted text-dark shrink-0">
                        Betreff:
                      </dt>
                      <dd className="dark:text-night-text text-ink font-medium">
                        {previewMail.data.subject}
                      </dd>
                    </div>
                    {(attachments.length > 0 ||
                      previewMail.data.invoiceAttachments.length > 0) && (
                      <div className="flex gap-2">
                        <dt className="dark:text-night-muted text-dark shrink-0">
                          Anhänge:
                        </dt>
                        <dd className="dark:text-night-text text-ink">
                          {[
                            ...attachments.map(
                              (attachment) => attachment.filename,
                            ),
                            // Per recipient — this person's own invoice(s).
                            ...previewMail.data.invoiceAttachments,
                          ].join(", ")}
                        </dd>
                      </div>
                    )}
                    {attachInvoices &&
                      previewMail.data.recipient &&
                      previewMail.data.invoiceAttachments.length === 0 && (
                        <div className="flex gap-2">
                          <dt className="dark:text-night-muted text-dark shrink-0">
                            Rechnung:
                          </dt>
                          <dd className="dark:text-night-text text-ink">
                            Für diese Person gibt es keine veröffentlichte
                            Rechnung — sie bekommt die Mail ohne Anhang.
                          </dd>
                        </div>
                      )}
                  </dl>

                  {/* Sandboxed: the mail carries its own styles, and the body is
                      author-provided HTML that has no business running scripts
                      or reaching the dashboard around it. */}
                  <iframe
                    title="E-Mail-Vorschau"
                    srcDoc={previewMail.data.html}
                    sandbox=""
                    className="dark:border-night-rule border-rule bg-paper h-[60vh] w-full border"
                  />
                </div>
              )}
            </ScrollableModalBody>

            <ScrollableModalFooter>
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="border-rule dark:border-night-rule text-ink dark:text-night-text hover:bg-rule/25 dark:hover:bg-night-raised min-h-11 w-full border px-4 py-2 text-sm font-medium transition-colors"
              >
                Schließen
              </button>
            </ScrollableModalFooter>
          </ScrollableModalCard>
        </ScrollableModal>
      )}

      {showConfirm && (
        <ScrollableModal onBackdropClick={() => setShowConfirm(false)}>
          <ScrollableModalCard maxW="md">
            <ScrollableModalBody>
              <h3 className="dark:text-night-text mb-4 text-lg font-bold">
                E-Mail senden?
              </h3>
              <p className="dark:text-night-muted text-dark mb-2 text-sm">
                Die Nachricht geht an <strong>{recipientCount}</strong>{" "}
                {recipientCount === 1 ? "Adresse" : "Adressen"} des Kurses „
                {course.title}“.
              </p>
              <p className="dark:text-night-muted text-dark mb-4 text-xs">
                Diese Aktion kann nicht rückgängig gemacht werden.
              </p>
            </ScrollableModalBody>
            <ScrollableModalFooter>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="border-rule dark:border-night-rule text-ink dark:text-night-text hover:bg-rule/25 dark:hover:bg-night-raised min-h-11 border px-4 py-2 text-sm font-medium transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  onClick={confirmSend}
                  disabled={isSending}
                  className="bg-ink text-paper hover:bg-primary hover:text-ink dark:bg-night-text dark:text-night dark:hover:bg-primary dark:hover:text-ink min-h-11 px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSending ? "Wird gesendet..." : "Senden"}
                </button>
              </div>
            </ScrollableModalFooter>
          </ScrollableModalCard>
        </ScrollableModal>
      )}
    </main>
  );
}

export default function CourseMailPage() {
  return (
    <Suspense
      fallback={
        <div className="dark:bg-night bg-paper flex min-h-screen items-center justify-center">
          <div className="border-ink dark:border-night-text h-8 w-8 animate-spin rounded-full border-b-2" />
        </div>
      }
    >
      <CourseMailPageContent />
    </Suspense>
  );
}
