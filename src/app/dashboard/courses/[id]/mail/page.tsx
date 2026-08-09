"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth";
import { api } from "@/trpc/react";
import { useToast } from "@/app/_components/ui/toast";
import { useAutosave } from "@/lib/useAutosave";
import { useBeforeUnload } from "@/lib/useBeforeUnload";
import { DraftRestorePrompt } from "@/app/_components/dashboard";
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
  COURSE_MAIL_PLACEHOLDERS,
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
    onSuccess: (data) => {
      if (data.test) {
        toast.success("Test-E-Mail wurde an dich gesendet.");
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

  // Default the reply address to the sender's own once the profile arrives.
  useEffect(() => {
    if (profile?.email && !replyToEmail) {
      setReplyToEmail(profile.email);
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
    if (!profile?.email) {
      toast.error("Für dein Konto ist keine E-Mail-Adresse hinterlegt.");
      return;
    }
    setSendMode("test");
    sendMail.mutate({ ...sendPayload(), testEmail: profile.email });
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
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !profile) return null;

  if (!course || canSend === false) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="dark:text-dark-text text-xl font-semibold text-gray-900">
            Keine Berechtigung
          </h1>
          <p className="dark:text-dark-muted mt-2 text-gray-600">
            Du kannst die Anmelder:innen dieses Kurses nicht anschreiben.
          </p>
          <Link
            href="/dashboard/courses"
            className="text-primary mt-4 inline-block hover:underline"
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
    <main className="dark:bg-dark-background min-h-screen bg-gray-50">
      <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="dark:text-dark-text text-2xl font-bold text-gray-900 sm:text-3xl">
              Anmelder:innen anschreiben
            </h1>
            <p className="dark:text-dark-muted mt-1 truncate text-gray-600">
              {course.title}
            </p>
          </div>
          <Link
            href={`/dashboard/courses/${courseId}/participants`}
            className="dark:border-dark-border dark:bg-dark-surface dark:text-dark-text inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Zurück zu den Teilnehmern
          </Link>
        </div>

        {selectedRegistrationIds.length > 0 && (
          <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
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
            <div className="dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow dark:border-gray-700">
              <div className="mb-6">
                <label className="dark:text-dark-text mb-2 block text-sm font-medium text-gray-700">
                  Betreff *
                </label>
                <input
                  ref={subjectInputRef}
                  type="text"
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  onFocus={() => setLastFocused("subject")}
                  placeholder={`Informationen zu ${course.title}`}
                  className="dark:bg-dark-background dark:border-dark-border dark:text-dark-text focus:border-primary focus:ring-primary/20 w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:outline-none"
                />
              </div>

              <div className="mb-6">
                <label className="dark:text-dark-text mb-2 block text-sm font-medium text-gray-700">
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
                <label className="dark:text-dark-text mt-3 flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={includeGreeting}
                    onChange={(event) =>
                      setIncludeGreeting(event.target.checked)
                    }
                    className="text-primary focus:ring-primary rounded border-gray-300"
                  />
                  Automatische Anrede („Hallo Vorname,“) voranstellen
                </label>
                <p className="dark:text-dark-muted mt-1 text-xs text-gray-500">
                  Schalte das aus, wenn du deine Anrede mit Platzhaltern selbst
                  schreibst. Der Kurs-Kopf wird immer ergänzt.
                </p>
              </div>

              {unknownPlaceholders.length > 0 && (
                <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                  Unbekannte Platzhalter:{" "}
                  {unknownPlaceholders
                    .map((token) => `{{${token}}}`)
                    .join(", ")}
                  . Sie würden unverändert in der E-Mail landen.
                </div>
              )}

              {/* Invoices */}
              {(invoiceAccess?.canManage ?? false) && (
                <div className="dark:border-dark-border mb-6 rounded-lg border border-gray-200 p-4">
                  <label className="dark:text-dark-text flex cursor-pointer items-start gap-3 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={attachInvoices}
                      onChange={(event) =>
                        setAttachInvoices(event.target.checked)
                      }
                      className="text-primary focus:ring-primary mt-0.5 rounded border-gray-300"
                    />
                    <span>
                      <span className="block font-medium">
                        Rechnung anhängen
                      </span>
                      <span className="dark:text-dark-muted block text-xs text-gray-500">
                        Jede:r Empfänger:in bekommt die eigene ausgestellte
                        Rechnung als PDF. Wer keine hat, erhält die Nachricht
                        ohne Anhang. Nutze dazu die Platzhalter
                        {" {{rechnungsnummer}}"}, {"{{rechnungsbetrag}}"} und
                        {" {{zahlungsziel}}"}.
                      </span>
                    </span>
                  </label>
                </div>
              )}

              {/* Attachments */}
              <div className="mb-6">
                <label className="dark:text-dark-text mb-2 block text-sm font-medium text-gray-700">
                  Anhänge
                </label>
                {attachments.length > 0 && (
                  <ul className="mb-3 space-y-2">
                    {attachments.map((attachment) => (
                      <li
                        key={attachment.url}
                        className="dark:border-dark-border dark:bg-dark-background flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
                      >
                        <span className="dark:text-dark-text flex min-w-0 items-center gap-2 text-gray-700">
                          <PaperclipIcon className="h-4 w-4 shrink-0" />
                          <span className="truncate">
                            {attachment.filename}
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-3">
                          <span className="dark:text-dark-muted text-xs text-gray-500">
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
                            className="text-gray-400 transition-colors hover:text-red-600"
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
                  className="dark:text-dark-muted file:bg-primary/10 file:text-primary hover:file:bg-primary/20 block w-full text-sm text-gray-500 file:mr-4 file:rounded-lg file:border-0 file:px-4 file:py-2 file:text-sm file:font-medium"
                />
                <p className="dark:text-dark-muted mt-2 text-xs text-gray-500">
                  PDF, Word, Excel oder Bilder – zusammen höchstens{" "}
                  {formatBytes(MAX_TOTAL_ATTACHMENT_BYTES)}
                  {totalAttachmentBytes > 0 &&
                    ` (aktuell ${formatBytes(totalAttachmentBytes)})`}
                  .
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handlePreview}
                  disabled={isSending || isUploading}
                  title="Zeigt die fertige E-Mail so, wie eine ausgewählte Person sie bekommt — ohne etwas zu versenden."
                  className="dark:border-dark-border dark:bg-dark-background dark:text-dark-text inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-gray-700"
                >
                  <EyeIcon className="h-4 w-4" />
                  Vorschau
                </button>
                <button
                  onClick={handleTestSend}
                  disabled={isSending || isUploading}
                  title="Sendet die Nachricht nur an dich — mit den echten Daten des ersten Empfängers, damit du die Platzhalter siehst."
                  className="dark:border-dark-border dark:bg-dark-background dark:text-dark-text flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-gray-700"
                >
                  {isSending && sendMode === "test"
                    ? "Test wird gesendet..."
                    : "Test an mich senden"}
                </button>
                <button
                  onClick={handleSend}
                  disabled={isSending || isUploading || recipientCount === 0}
                  className="bg-primary hover:bg-primary/90 flex-1 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
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
            <div className="dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow dark:border-gray-700">
              <h2 className="dark:text-dark-text mb-2 flex items-center gap-2 text-lg font-semibold text-gray-900">
                <BracesIcon className="h-5 w-5" />
                Platzhalter
              </h2>
              <p className="dark:text-dark-muted mb-4 text-xs text-gray-500">
                Klicken, um an der Cursor-Position einzufügen — sie werden für
                jede Empfängerin und jeden Empfänger einzeln ersetzt. Wirkt auch
                im Betreff.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {COURSE_MAIL_PLACEHOLDERS.map((placeholder) => (
                  <button
                    key={placeholder.token}
                    type="button"
                    onClick={() => insertPlaceholder(placeholder.token)}
                    title={`${placeholder.label} – z. B. „${placeholder.example}“`}
                    className="dark:border-dark-border dark:bg-dark-background dark:text-dark-text rounded-md border border-gray-200 bg-gray-50 px-2 py-1 font-mono text-xs text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    {`{{${placeholder.token}}}`}
                  </button>
                ))}
              </div>
              <p className="dark:text-dark-muted mt-3 text-xs text-gray-500">
                Hat jemand mehrere Anmeldungen, fasst{" "}
                <span className="font-mono">{"{{teilnehmer}}"}</span> alle
                angemeldeten Personen zusammen.
              </p>
            </div>

            <div className="dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow dark:border-gray-700">
              <h2 className="dark:text-dark-text mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
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
                      className="dark:text-dark-text flex items-center gap-2 text-sm text-gray-700"
                    >
                      <input
                        type="checkbox"
                        checked={statuses.includes(status)}
                        onChange={() => toggleStatus(status)}
                        className="text-primary focus:ring-primary rounded border-gray-300"
                      />
                      {statusLabels[status]}
                    </label>
                  ))}
                </div>
              )}

              <p className="dark:text-dark-muted text-sm text-gray-600">
                {recipientQuery.isLoading
                  ? "Empfänger werden geladen..."
                  : `${recipientCount} ${recipientCount === 1 ? "Adresse" : "Adressen"} (Mehrfach-Anmeldungen zusammengefasst)`}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShowRecipients((current) => !current)}
                  disabled={recipientCount === 0}
                  className="dark:border-dark-border dark:text-dark-text rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-gray-700"
                >
                  {showRecipients ? "Liste ausblenden" : "Liste anzeigen"}
                </button>
                <button
                  type="button"
                  onClick={() => void copyAddresses()}
                  disabled={recipientCount === 0}
                  className="dark:border-dark-border dark:text-dark-text inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-gray-700"
                  title="Adressen kopieren, um die Mail im eigenen Programm zu schreiben"
                >
                  <ClipboardCopyIcon className="h-3.5 w-3.5" />
                  Adressen kopieren
                </button>
              </div>

              {showRecipients && (
                <ul className="dark:border-dark-border mt-3 max-h-56 space-y-1 overflow-y-auto rounded-lg border border-gray-200 p-2 text-xs">
                  {recipientQuery.data?.recipients.map((recipient) => (
                    <li
                      key={recipient.email}
                      className="dark:text-dark-muted text-gray-600"
                    >
                      {recipient.name} &lt;{recipient.email}&gt;
                      {recipient.registrationCount > 1 && (
                        <span className="dark:text-dark-muted text-gray-400">
                          {" "}
                          ({recipient.registrationCount} Anmeldungen)
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow dark:border-gray-700">
              <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
                Absender
              </h2>
              <p className="dark:text-dark-muted mb-4 text-xs text-gray-500">
                Versendet wird über die Adresse des Posaunenwerks. Antworten
                gehen an die Adresse, die du hier einträgst.
              </p>
              <label className="dark:text-dark-text mb-2 block text-sm font-medium text-gray-700">
                Antwort-Adresse *
              </label>
              <input
                type="email"
                value={replyToEmail}
                onChange={(event) => setReplyToEmail(event.target.value)}
                className="dark:bg-dark-background dark:border-dark-border dark:text-dark-text focus:border-primary focus:ring-primary/20 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:outline-none"
              />
              <label className="dark:text-dark-text mt-4 flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={sendCopyToSender}
                  onChange={(event) =>
                    setSendCopyToSender(event.target.checked)
                  }
                  className="text-primary focus:ring-primary rounded border-gray-300"
                />
                Kopie an mich senden
              </label>
            </div>

            {(sentMails.data?.length ?? 0) > 0 && (
              <div className="dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow dark:border-gray-700">
                <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
                  Bereits versendet
                </h2>
                <ul className="space-y-3">
                  {sentMails.data?.map((mail) => (
                    <li
                      key={mail.id}
                      className="dark:border-dark-border border-b border-gray-100 pb-3 last:border-0 last:pb-0"
                    >
                      <p className="dark:text-dark-text text-sm font-medium text-gray-900">
                        {mail.subject}
                      </p>
                      <p className="dark:text-dark-muted text-xs text-gray-500">
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
                  <h3 className="dark:text-dark-text text-lg font-bold">
                    Vorschau
                  </h3>
                  <p className="dark:text-dark-muted text-sm text-gray-600">
                    So kommt die E-Mail an — es wird nichts versendet.
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <label className="dark:text-dark-text mb-2 block text-sm font-medium text-gray-700">
                  Anzeigen für
                </label>
                <select
                  value={previewRecipientId}
                  onChange={(event) =>
                    handlePreviewRecipientChange(event.target.value)
                  }
                  disabled={recipientCount === 0 || previewMail.isPending}
                  className="dark:bg-dark-background dark:border-dark-border dark:text-dark-text focus:border-primary focus:ring-primary/20 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:outline-none disabled:opacity-50"
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
                <p className="dark:text-dark-muted py-8 text-center text-sm text-gray-500">
                  Vorschau wird erstellt...
                </p>
              )}

              {!previewMail.isPending && previewMail.data && (
                <div className="space-y-4">
                  {previewMail.data.unknownPlaceholders.length > 0 && (
                    <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
                      <AlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                      <p className="text-sm text-amber-800 dark:text-amber-300">
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
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                      Für diese Auswahl gibt es keine Anmeldungen — die
                      Platzhalter sind mit Beispieldaten gefüllt.
                    </div>
                  )}

                  <dl className="dark:border-dark-border dark:bg-dark-background space-y-1 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
                    <div className="flex gap-2">
                      <dt className="dark:text-dark-muted shrink-0 text-gray-500">
                        An:
                      </dt>
                      <dd className="dark:text-dark-text text-gray-900">
                        {previewMail.data.recipient
                          ? `${previewMail.data.recipient.name} <${previewMail.data.recipient.email}>`
                          : "Beispielempfänger"}
                      </dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="dark:text-dark-muted shrink-0 text-gray-500">
                        Antwort an:
                      </dt>
                      <dd className="dark:text-dark-text text-gray-900">
                        {replyToEmail}
                      </dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="dark:text-dark-muted shrink-0 text-gray-500">
                        Betreff:
                      </dt>
                      <dd className="dark:text-dark-text font-medium text-gray-900">
                        {previewMail.data.subject}
                      </dd>
                    </div>
                    {(attachments.length > 0 ||
                      previewMail.data.invoiceAttachments.length > 0) && (
                      <div className="flex gap-2">
                        <dt className="dark:text-dark-muted shrink-0 text-gray-500">
                          Anhänge:
                        </dt>
                        <dd className="dark:text-dark-text text-gray-900">
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
                          <dt className="dark:text-dark-muted shrink-0 text-gray-500">
                            Rechnung:
                          </dt>
                          <dd className="dark:text-dark-text text-gray-900">
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
                    className="dark:border-dark-border h-[60vh] w-full rounded-lg border border-gray-200 bg-white"
                  />
                </div>
              )}
            </ScrollableModalBody>

            <ScrollableModalFooter>
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="dark:border-dark-border dark:text-dark-text w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
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
              <h3 className="dark:text-dark-text mb-4 text-lg font-bold">
                E-Mail senden?
              </h3>
              <p className="dark:text-dark-muted mb-2 text-sm text-gray-600">
                Die Nachricht geht an <strong>{recipientCount}</strong>{" "}
                {recipientCount === 1 ? "Adresse" : "Adressen"} des Kurses „
                {course.title}“.
              </p>
              <p className="dark:text-dark-muted mb-4 text-xs text-gray-500">
                Diese Aktion kann nicht rückgängig gemacht werden.
              </p>
            </ScrollableModalBody>
            <ScrollableModalFooter>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="dark:border-dark-border dark:text-dark-text rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Abbrechen
                </button>
                <button
                  onClick={confirmSend}
                  disabled={isSending}
                  className="bg-primary hover:bg-primary/90 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
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
        <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
        </div>
      }
    >
      <CourseMailPageContent />
    </Suspense>
  );
}
