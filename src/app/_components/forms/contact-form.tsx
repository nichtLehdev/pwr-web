"use client";

import { useState } from "react";
import Link from "next/link";
import { Send } from "lucide-react";
import { api } from "@/trpc/react";
import {
  Checkbox,
  FieldLabel,
  fieldControlClasses,
} from "@/app/_components/programmheft/field";
import { CONTACT_SUBJECTS, type ContactSubject } from "@/lib/contact-subjects";
import { useBotTrap } from "@/lib/use-bot-trap";
import { BotTrapField } from "@/app/_components/general/bot-trap-field";

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
  const botTrap = useBotTrap();

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
      ...botTrap.fields(),
    });
  };

  if (sent) {
    return (
      <div className="border-ink dark:border-night-text border-2 p-6 md:p-8">
        <p className="condensed text-ink dark:text-night-text text-[1.375rem] leading-tight font-bold">
          Nachricht gesendet
        </p>
        <p className="text-ink dark:text-night-text mt-3 max-w-[60ch] text-lg leading-relaxed">
          Vielen Dank für deine Nachricht! Wir melden uns zeitnah bei dir unter{" "}
          <strong className="font-semibold">{form.email}</strong>.
        </p>
        <button
          type="button"
          onClick={() => {
            setForm(emptyForm);
            botTrap.setValue("");
            sendMessage.reset();
            setSent(false);
          }}
          className="link-ink mt-6 inline-flex min-h-11 items-center"
        >
          Weitere Nachricht senden
        </button>
      </div>
    );
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {sendMessage.isError && (
        <div
          role="alert"
          className="border-2 border-red-700 p-4 dark:border-red-400"
        >
          <p className="text-sm font-semibold text-red-700 dark:text-red-400">
            {sendMessage.error.message}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <FieldLabel htmlFor="name" required>
            Name
          </FieldLabel>
          <input
            type="text"
            id="name"
            name="name"
            required
            maxLength={100}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={fieldControlClasses}
            placeholder="Max Mustermann"
          />
        </div>

        <div>
          <FieldLabel htmlFor="email" required>
            E-Mail
          </FieldLabel>
          <input
            type="email"
            id="email"
            name="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className={fieldControlClasses}
            placeholder="max@example.com"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <FieldLabel htmlFor="phone">Telefon (optional)</FieldLabel>
          <input
            type="tel"
            id="phone"
            name="phone"
            maxLength={50}
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className={fieldControlClasses}
            placeholder="+49 123 456789"
          />
        </div>

        <div>
          <FieldLabel htmlFor="subject" required>
            Betreff
          </FieldLabel>
          <select
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
            className={fieldControlClasses}
          >
            <option value="">Bitte wählen...</option>
            {Object.entries(CONTACT_SUBJECTS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <FieldLabel htmlFor="message" required>
          Ihre Nachricht
        </FieldLabel>
        <textarea
          id="message"
          name="message"
          required
          minLength={10}
          maxLength={5000}
          rows={6}
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          className={`${fieldControlClasses} resize-y`}
          placeholder="Beschreiben Sie Ihr Anliegen..."
        />
      </div>

      <Checkbox
        id="privacy"
        checked={form.privacyAccepted}
        onChange={(e) =>
          setForm({ ...form, privacyAccepted: e.target.checked })
        }
        required
      >
        Ich habe die{" "}
        <Link href="/datenschutz" className="link-ink">
          Datenschutzerklärung
        </Link>{" "}
        zur Kenntnis genommen. Ich stimme zu, dass meine Angaben zur
        Kontaktaufnahme und für Rückfragen gespeichert werden. *
      </Checkbox>

      <div>
        <button
          type="submit"
          disabled={sendMessage.isPending}
          className="bg-ink text-paper hover:bg-primary hover:text-ink dark:bg-primary dark:text-ink dark:hover:bg-paper semi-condensed inline-flex min-h-12 items-center gap-3 px-6 text-lg font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60"
        >
          {sendMessage.isPending ? "Wird gesendet..." : "Nachricht senden"}
          <Send className="h-5 w-5 shrink-0" aria-hidden />
        </button>
        <p className="text-dark dark:text-night-muted mt-3 text-sm">
          * Pflichtfelder
        </p>
      </div>

      <BotTrapField value={botTrap.value} onChange={botTrap.setValue} />
    </form>
  );
}
