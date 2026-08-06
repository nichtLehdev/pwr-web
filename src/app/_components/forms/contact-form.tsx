"use client";

import { useState } from "react";
import Link from "next/link";
import { Send, Check } from "lucide-react";
import { api } from "@/trpc/react";
import { Select } from "@/app/_components/ui";
import { CONTACT_SUBJECTS, type ContactSubject } from "@/lib/contact-subjects";

const inputClasses =
  "focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text w-full rounded-lg border border-gray-300 px-4 py-2 transition-all outline-none focus:border-transparent focus:ring-2";

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  subject: "" as "" | ContactSubject,
  message: "",
  privacyAccepted: false,
};

export function ContactForm() {
  const [form, setForm] = useState(emptyForm);
  const [sent, setSent] = useState(false);

  const sendMessage = api.contact.send.useMutation({
    onSuccess: () => setSent(true),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject || !form.privacyAccepted || sendMessage.isPending) {
      return;
    }
    sendMessage.mutate({
      name: form.name,
      email: form.email,
      phone: form.phone || undefined,
      subject: form.subject,
      message: form.message,
      privacyAccepted: true,
    });
  };

  if (sent) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center dark:border-green-800 dark:bg-green-900/20">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40">
          <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
        </div>
        <h4 className="text-dark dark:text-dark-text mb-2 text-lg font-bold">
          Nachricht gesendet
        </h4>
        <p className="mb-4 text-gray-600 dark:text-gray-400">
          Vielen Dank für deine Nachricht! Wir melden uns zeitnah bei dir unter{" "}
          <strong>{form.email}</strong>.
        </p>
        <button
          type="button"
          onClick={() => {
            setForm(emptyForm);
            sendMessage.reset();
            setSent(false);
          }}
          className="text-primary hover:text-primary-dark font-medium"
        >
          Weitere Nachricht senden
        </button>
      </div>
    );
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {sendMessage.isError && (
        <div className="rounded-md border-l-4 border-red-500 bg-red-50 p-3 dark:border-red-400 dark:bg-red-900/20">
          <p className="text-sm text-red-800 dark:text-red-300">
            {sendMessage.error.message}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <label
            htmlFor="name"
            className="text-dark dark:text-dark-text mb-2 block text-sm font-semibold"
          >
            Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            maxLength={100}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={inputClasses}
            placeholder="Max Mustermann"
          />
        </div>

        <div>
          <label
            htmlFor="email"
            className="text-dark dark:text-dark-text mb-2 block text-sm font-semibold"
          >
            E-Mail *
          </label>
          <input
            type="email"
            id="email"
            name="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className={inputClasses}
            placeholder="max@example.com"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <label
            htmlFor="phone"
            className="text-dark dark:text-dark-text mb-2 block text-sm font-semibold"
          >
            Telefon (optional)
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            maxLength={50}
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className={inputClasses}
            placeholder="+49 123 456789"
          />
        </div>

        <div>
          <label
            htmlFor="subject"
            className="text-dark dark:text-dark-text mb-2 block text-sm font-semibold"
          >
            Betreff *
          </label>
          <Select
            id="subject"
            name="subject"
            required
            value={form.subject}
            onChange={(e) =>
              setForm({
                ...form,
                subject: e.target.value as "" | ContactSubject,
              })
            }
            className={inputClasses}
          >
            <option value="">Bitte wählen...</option>
            {Object.entries(CONTACT_SUBJECTS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div>
        <label
          htmlFor="message"
          className="text-dark dark:text-dark-text mb-2 block text-sm font-semibold"
        >
          Ihre Nachricht *
        </label>
        <textarea
          id="message"
          name="message"
          required
          minLength={10}
          maxLength={5000}
          rows={6}
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          className={`${inputClasses} resize-y`}
          placeholder="Beschreiben Sie Ihr Anliegen..."
        />
      </div>

      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          id="privacy"
          name="privacy"
          required
          checked={form.privacyAccepted}
          onChange={(e) =>
            setForm({ ...form, privacyAccepted: e.target.checked })
          }
          className="text-primary focus:ring-primary dark:border-dark-border mt-1 h-4 w-4 rounded border-gray-300"
        />
        <label
          htmlFor="privacy"
          className="text-sm text-gray-600 dark:text-gray-400"
        >
          Ich habe die{" "}
          <Link href="/datenschutz" className="text-primary hover:underline">
            Datenschutzerklärung
          </Link>{" "}
          zur Kenntnis genommen. Ich stimme zu, dass meine Angaben zur
          Kontaktaufnahme und für Rückfragen gespeichert werden. *
        </label>
      </div>

      <div>
        <button
          type="submit"
          disabled={sendMessage.isPending}
          className="bg-primary hover:bg-primary-dark inline-flex items-center rounded-lg px-8 py-3 font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60"
        >
          {sendMessage.isPending ? "Wird gesendet..." : "Nachricht senden"}
          <Send className="ml-2 h-5 w-5" />
        </button>
        <p className="mt-3 text-xs text-gray-500">* Pflichtfelder</p>
      </div>
    </form>
  );
}
