"use client";

import { useState, useEffect } from "react";
import { useToast } from "../_components/ui/toast";
import PublicPage from "../_components/general/public-page";
import { X } from "lucide-react";
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

function IssueCard({ issue }: { issue: Issue }) {
  const typeLabel = issue.labels?.find((l) =>
    ["bug", "feature", "other"].includes(l.name),
  )?.name;
  const typeIcon =
    typeLabel === "bug" ? "🐞" : typeLabel === "feature" ? "✨" : "💬";
  const cleanTitle = issue.title.replace(/\s*\[[^\]]*\]/g, "").trim();
  return (
    <a
      href={issue.html_url}
      target="_blank"
      rel="noopener noreferrer"
      className="dark:border-dark-border dark:bg-dark-surface flex flex-col gap-2 rounded-lg border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-center gap-2">
        <span className="text-2xl">{typeIcon}</span>
        <span className="text-dark dark:text-dark-text line-clamp-1 font-semibold">
          {cleanTitle}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {issue.labels?.map((l) => (
          <span
            key={l.id}
            className="rounded bg-gray-200 px-2 py-0.5 text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-200"
          >
            {l.name}
          </span>
        ))}
      </div>
      <span className="text-xs text-gray-500">
        #{issue.number} geöffnet von {issue.user?.login}
      </span>
    </a>
  );
}

export default function FeedbackPage() {
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
      color="primary"
      breadcrumbs={[{ label: "Start", href: "/" }, { label: "Feedback" }]}
      description={
        <p>
          Wir freuen uns über dein Feedback! Deine Nachricht wird als Issue
          anonym oder mit deiner E-Mail-Adresse in unserem Repository erstellt.
        </p>
      }
    >
      {/* Issues Section */}
      <section className="py-8 md:py-16">
        <div className="container mx-auto max-w-3xl px-4">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-dark dark:text-dark-text text-xl font-bold">
              Bekannte Bugs & Feature-Wünsche
            </h2>
            <button
              className="bg-primary hover:bg-primary-dark rounded px-4 py-2 font-semibold text-white shadow disabled:opacity-50"
              onClick={() => setShowModal(true)}
            >
              Feedback geben
            </button>
          </div>
          {issuesLoading ? (
            <div className="py-8 text-center text-gray-500">Lade Issues...</div>
          ) : issues.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              Keine offenen Feedback-Issues gefunden.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {issues.map((issue) => (
                <IssueCard key={issue.id} issue={issue} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Feedback Modal */}
      {showModal && (
        <ScrollableModal
          zIndex="z-100"
          onBackdropClick={() => setShowModal(false)}
        >
          <ScrollableModalCard
            maxW="2xl"
            className="bg-background dark:bg-dark-surface relative"
          >
            <button
              onClick={() => setShowModal(false)}
              className="text-dark dark:text-dark-text absolute top-4 right-4 rounded-full p-1 transition-colors hover:bg-gray-200 dark:hover:bg-gray-700"
              aria-label="Schließen"
            >
              <X className="h-6 w-6" />
            </button>
            <h2 className="text-dark dark:text-dark-text mb-4 text-xl font-bold">
              Feedback geben
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <label
                className="mb-1 block text-sm font-semibold"
                htmlFor="feedback-type-modal"
              >
                Art des Feedbacks
              </label>
              <select
                id="feedback-type-modal"
                value={type}
                onChange={(e) =>
                  setType(e.target.value as "bug" | "feature" | "other")
                }
                className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text text-dark block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 focus:ring-1 focus:outline-none"
                required
              >
                <option value="bug">Fehler melden</option>
                <option value="feature">Feature vorschlagen</option>
                <option value="other">Allgemeines Feedback</option>
              </select>

              <label
                className="mt-4 mb-1 block text-sm font-semibold"
                htmlFor="feedback-subject-modal"
              >
                Betreff
              </label>
              <input
                id="feedback-subject-modal"
                type="text"
                placeholder="Kurzer Betreff (z.B. Fehler beim Login)"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text text-dark block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 placeholder:text-gray-400 focus:ring-1 focus:outline-none dark:placeholder:text-gray-500"
                maxLength={100}
                required
              />

              <label
                className="mt-4 mb-1 block text-sm font-semibold"
                htmlFor="feedback-textarea-modal"
              >
                Beschreibung
              </label>
              <textarea
                id="feedback-textarea-modal"
                className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text text-dark block min-h-[120px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 placeholder:text-gray-400 focus:ring-1 focus:outline-none dark:placeholder:text-gray-500"
                placeholder="Beschreibe dein Anliegen möglichst genau..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                required
              />

              <label
                className="mt-4 mb-1 block text-sm font-semibold"
                htmlFor="feedback-url-modal"
              >
                (Optional) URL der betroffenen Seite
              </label>
              <input
                id="feedback-url-modal"
                type="url"
                placeholder="https://..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text text-dark block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 placeholder:text-gray-400 focus:ring-1 focus:outline-none dark:placeholder:text-gray-500"
              />

              <label
                className="mt-4 mb-1 block text-sm font-semibold"
                htmlFor="feedback-device-modal"
              >
                (Optional) Gerät/Betriebssystem & Browser
              </label>
              <input
                id="feedback-device-modal"
                type="text"
                placeholder="z.B. Windows 11, Chrome 120"
                value={device}
                onChange={(e) => setDevice(e.target.value)}
                className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text text-dark block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 placeholder:text-gray-400 focus:ring-1 focus:outline-none dark:placeholder:text-gray-500"
              />

              <label
                className="mt-4 mb-1 block text-sm font-semibold"
                htmlFor="feedback-email-modal"
              >
                (Optional) Deine E-Mail-Adresse
              </label>
              <input
                id="feedback-email-modal"
                type="email"
                placeholder="(Optional) Deine E-Mail-Adresse"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text text-dark block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 placeholder:text-gray-400 focus:ring-1 focus:outline-none dark:placeholder:text-gray-500"
              />

              <button
                type="submit"
                className="bg-primary hover:bg-primary-dark rounded px-4 py-2 font-semibold text-white disabled:opacity-50"
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
