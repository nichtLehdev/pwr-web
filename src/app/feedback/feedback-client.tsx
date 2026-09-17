"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useToast } from "../_components/ui/toast";
import PublicPage from "../_components/general/public-page";
import { PageSection, Split } from "../_components/programmheft/page-section";
import { Heading } from "../_components/programmheft/section-head";
import { WayList, WayRow } from "../_components/programmheft/way-list";
import {
  FieldLabel,
  fieldControlClasses,
} from "../_components/programmheft/field";
import {
  ScrollableModal,
  ScrollableModalCard,
} from "@/app/_components/ui/scrollable-modal";

interface IssueLabel {
  id: number;
  name: string;
}

interface IssueUser {
  login: string;
}

interface Issue {
  id: number;
  number: number;
  title: string;
  html_url: string;
  labels?: IssueLabel[];
  user?: IssueUser;
}

/** Registerzeile statt Karte: Titel, Etiketten und Ausgangsdaten als Meta-Zeile. */
function IssueRow({ issue }: { issue: Issue }) {
  const cleanTitle = issue.title.replace(/\s*\[[^\]]*\]/g, "").trim();
  const meta = [
    issue.labels?.map((label) => label.name).join(", "),
    `#${issue.number} geöffnet von ${issue.user?.login}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <WayRow
      href={issue.html_url}
      kind="external"
      title={cleanTitle}
      description={meta}
    />
  );
}

const PRIMARY_BUTTON =
  "bg-ink text-paper hover:bg-primary hover:text-ink dark:bg-primary dark:text-ink dark:hover:bg-paper semi-condensed inline-flex min-h-12 items-center gap-3 px-6 text-lg font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60";

export default function FeedbackClient() {
  const toast = useToast();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [issuesLoading, setIssuesLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  useEffect(() => {
    fetch("/api/feedback/issues")
      .then((res) => res.json())
      .then((data) => {
        setIssues(Array.isArray(data) ? data : []);
        setIssuesLoading(false);
      })
      .catch(() => setIssuesLoading(false));
  }, []);
  const [feedback, setFeedback] = useState("");
  const [email, setEmail] = useState("");
  const [type, setType] = useState<"bug" | "feature" | "other">("bug");
  const [subject, setSubject] = useState("");
  const [url, setUrl] = useState("");
  const [device, setDevice] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedback,
          email,
          type,
          subject,
          url,
          device,
        }),
      });
      if (res.ok) {
        setStatus("success");
        setFeedback("");
        setEmail("");
        setType("bug");
        setSubject("");
        setUrl("");
        setDevice("");
        setShowModal(false);
        toast.success("Feedback erfolgreich gesendet! Vielen Dank.");
      } else {
        setStatus("error");
        toast.error("Senden fehlgeschlagen. Bitte versuche es erneut.");
      }
    } catch {
      setStatus("error");
      toast.error("Senden fehlgeschlagen. Bitte versuche es erneut.");
    }
  };

  return (
    <PublicPage
      title="Feedback"
      breadcrumbs={[{ label: "Start", href: "/" }, { label: "Feedback" }]}
      description={
        <p>
          Wir freuen uns über dein Feedback! Deine Nachricht wird als Issue
          anonym oder mit deiner E-Mail-Adresse in unserem Repository erstellt.
        </p>
      }
    >
      <PageSection labelledBy="issues-heading">
        <Split
          head={
            <>
              <Heading id="issues-heading" className="text-balance">
                Bekannte Bugs & Feature-Wünsche
              </Heading>
              <button
                type="button"
                className={`${PRIMARY_BUTTON} mt-6`}
                onClick={() => setShowModal(true)}
              >
                Feedback geben
              </button>
            </>
          }
          bodyClassName="mt-8"
        >
          {issuesLoading ? (
            <p className="border-ink dark:border-night-text text-dark dark:text-night-muted border-t-2 py-8 text-lg">
              Lade Issues...
            </p>
          ) : issues.length === 0 ? (
            <p className="border-ink dark:border-night-text text-dark dark:text-night-muted border-t-2 py-8 text-lg">
              Keine offenen Feedback-Issues gefunden.
            </p>
          ) : (
            <WayList labelledBy="issues-heading" columns={2}>
              {issues.map((issue) => (
                <IssueRow key={issue.id} issue={issue} />
              ))}
            </WayList>
          )}
        </Split>
      </PageSection>

      {showModal && (
        <ScrollableModal
          zIndex="z-100"
          onBackdropClick={() => setShowModal(false)}
        >
          <ScrollableModalCard maxW="2xl" className="relative p-6">
            <button
              onClick={() => setShowModal(false)}
              aria-label="Schließen"
              className="border-ink text-ink hover:bg-ink hover:text-paper dark:border-night-text dark:text-night-text dark:hover:bg-night-text dark:hover:text-night absolute top-4 right-4 flex h-11 w-11 items-center justify-center border-2 transition-colors"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
            <Heading as="h2" size="list" className="pr-14">
              Feedback geben
            </Heading>
            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <div>
                <FieldLabel htmlFor="feedback-type-modal" required>
                  Art des Feedbacks
                </FieldLabel>
                <select
                  id="feedback-type-modal"
                  value={type}
                  onChange={(e) =>
                    setType(e.target.value as "bug" | "feature" | "other")
                  }
                  className={fieldControlClasses}
                  required
                >
                  <option value="bug">Fehler melden</option>
                  <option value="feature">Feature vorschlagen</option>
                  <option value="other">Allgemeines Feedback</option>
                </select>
              </div>

              <div>
                <FieldLabel htmlFor="feedback-subject-modal" required>
                  Betreff
                </FieldLabel>
                <input
                  id="feedback-subject-modal"
                  type="text"
                  placeholder="Kurzer Betreff (z.B. Fehler beim Login)"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className={fieldControlClasses}
                  maxLength={100}
                  required
                />
              </div>

              <div>
                <FieldLabel htmlFor="feedback-textarea-modal" required>
                  Beschreibung
                </FieldLabel>
                <textarea
                  id="feedback-textarea-modal"
                  className={`${fieldControlClasses} min-h-[120px] resize-y`}
                  placeholder="Beschreibe dein Anliegen möglichst genau..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  required
                />
              </div>

              <div>
                <FieldLabel htmlFor="feedback-url-modal">
                  (Optional) URL der betroffenen Seite
                </FieldLabel>
                <input
                  id="feedback-url-modal"
                  type="url"
                  placeholder="https://..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className={fieldControlClasses}
                />
              </div>

              <div>
                <FieldLabel htmlFor="feedback-device-modal">
                  (Optional) Gerät/Betriebssystem & Browser
                </FieldLabel>
                <input
                  id="feedback-device-modal"
                  type="text"
                  placeholder="z.B. Windows 11, Chrome 120"
                  value={device}
                  onChange={(e) => setDevice(e.target.value)}
                  className={fieldControlClasses}
                />
              </div>

              <div>
                <FieldLabel htmlFor="feedback-email-modal">
                  (Optional) Deine E-Mail-Adresse
                </FieldLabel>
                <input
                  id="feedback-email-modal"
                  type="email"
                  placeholder="(Optional) Deine E-Mail-Adresse"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={fieldControlClasses}
                />
              </div>

              <button
                type="submit"
                className={PRIMARY_BUTTON}
                disabled={
                  status === "loading" ||
                  !type ||
                  !subject.trim() ||
                  !feedback.trim()
                }
              >
                {status === "loading" ? "Senden..." : "Feedback absenden"}
              </button>
            </form>
          </ScrollableModalCard>
        </ScrollableModal>
      )}
    </PublicPage>
  );
}
