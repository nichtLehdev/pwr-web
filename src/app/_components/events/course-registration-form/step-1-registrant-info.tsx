"use client";

import { useId, type InputHTMLAttributes } from "react";
import type { RegistrationData } from "./types";
import { fieldClass } from "./field-styles";
import { EMAIL_HINT, type FormProblem } from "./utils";
import { isPlausibleEmail } from "@/lib/email-address";
import { Checkbox } from "@/app/_components/programmheft/field";
import { Heading } from "@/app/_components/programmheft/section-head";

interface Step1RegistrantInfoProps {
  registrationData: RegistrationData;
  setRegistrationData: React.Dispatch<React.SetStateAction<RegistrationData>>;
  /** Staff often only has name and e-mail, so phone and address are optional. */
  staffMode?: boolean;
  /** Sprungziel für den Fokus beim Wechsel in diesen Schritt. */
  headingId: string;
  /** Erst nach einem Klick auf „Weiter“ übergeben, damit ein frisches Formular nicht schon rot ist. */
  problems?: readonly FormProblem[];
}

type RegistrantTextKey = Extract<
  keyof RegistrationData,
  | "registrantFirstName"
  | "registrantLastName"
  | "registrantEmail"
  | "registrantPhone"
  | "registrantStreet"
  | "registrantZipCode"
  | "registrantCity"
  | "billingCompany"
  | "billingFirstName"
  | "billingLastName"
  | "billingStreet"
  | "billingZipCode"
  | "billingCity"
  | "billingEmail"
>;

/** Beschriftung, Feld und Meldung als ein Stück, verknüpft über `htmlFor` und `id`. */
function RegistrantField({
  id,
  field,
  label,
  required = false,
  showRequiredMark = required,
  error,
  hint,
  className,
  inputClassName,
  ...inputProps
}: {
  id: string;
  /** Schlüssel, unter dem „Weiter“ das Feld bei einem Fehler anspringt. */
  field: string;
  label: string;
  required?: boolean;
  /** Das Sternchen ist nur Optik; `required` folgt der echten Regel. */
  showRequiredMark?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  inputClassName: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "className">) {
  const errorId = `${id}-fehler`;
  const hintId = `${id}-hinweis`;
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="text-ink dark:text-night-text mb-1 block text-sm font-semibold"
      >
        {label}
        {/* Das Sternchen sieht man; vorgelesen wird „Pflichtfeld“. */}
        {showRequiredMark ? <span aria-hidden> *</span> : null}
      </label>
      <input
        id={id}
        data-focus-key={field}
        required={required}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        className={inputClassName}
        {...inputProps}
      />
      {error ? (
        <p
          id={errorId}
          className="mt-1 text-sm font-medium text-red-700 dark:text-red-400"
        >
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-dark dark:text-night-muted mt-1 text-xs">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Step1RegistrantInfo({
  registrationData,
  setRegistrationData,
  staffMode = false,
  headingId,
  problems = [],
}: Step1RegistrantInfoProps) {
  const uid = useId();
  const inputClass = fieldClass();
  const invalidInputClass = fieldClass({ error: true });

  // Erst meckern, wenn etwas dasteht: ein noch leeres Pflichtfeld ist kein
  // Fehler, sondern unausgefüllt — das meldet erst „Weiter“.
  const emailInvalid =
    registrationData.registrantEmail.length > 0 &&
    !isPlausibleEmail(registrationData.registrantEmail);
  const billingEmailInvalid =
    !!registrationData.billingEmail &&
    !isPlausibleEmail(registrationData.billingEmail);

  const errorFor = (field: string) =>
    problems.find((p) => p.field === field)?.message;

  const addressRequired = !staffMode && !registrationData.useSeparateBilling;

  /** Gemeinsame Verdrahtung eines Textfelds von `registrationData`. */
  const bind = (key: RegistrantTextKey, error?: string) => ({
    id: `${uid}-${key}`,
    field: key,
    value: (registrationData[key] as string | undefined) ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setRegistrationData({
        ...registrationData,
        [key]: e.target.value,
      }),
    error,
    inputClassName: error ? invalidInputClass : inputClass,
  });

  return (
    <div className="space-y-4">
      <div>
        <Heading
          as="h3"
          size="list"
          id={headingId}
          tabIndex={-1}
          className="text-[1.375rem]"
        >
          {staffMode ? "Kontaktdaten des Anmelders" : "Ihre Kontaktdaten"}
        </Heading>
        <p className="text-dark dark:text-night-muted mt-2 mb-6 text-sm">
          {staffMode
            ? "Der Anmelder erhält Bestätigung und weitere Informationen an diese E-Mail-Adresse. Adresse und Telefon können nachgetragen werden, für Rechnungen sind sie nötig."
            : "Als Anmelder erhalten Sie die Bestätigung und alle weiteren Informationen per E-Mail."}
        </p>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <RegistrantField
            {...bind("registrantFirstName", errorFor("registrantFirstName"))}
            label="Vorname"
            required
            type="text"
            maxLength={100}
            placeholder="Max"
          />

          <RegistrantField
            {...bind("registrantLastName", errorFor("registrantLastName"))}
            label="Nachname"
            required
            type="text"
            maxLength={100}
            placeholder="Mustermann"
          />

          <RegistrantField
            {...bind(
              "registrantEmail",
              errorFor("registrantEmail") ??
                (emailInvalid ? EMAIL_HINT : undefined),
            )}
            label="E-Mail"
            required
            type="email"
            placeholder="max@example.com"
          />

          <RegistrantField
            {...bind("registrantPhone", errorFor("registrantPhone"))}
            label="Telefon"
            required={!staffMode}
            type="tel"
            maxLength={50}
            placeholder="0211 123456"
          />

          <RegistrantField
            {...bind("registrantStreet", errorFor("registrantStreet"))}
            className="md:col-span-2"
            label="Straße und Hausnummer"
            required={addressRequired}
            showRequiredMark={!staffMode}
            type="text"
            maxLength={200}
            placeholder="Musterstraße 1"
          />
          <RegistrantField
            {...bind("registrantZipCode", errorFor("registrantZipCode"))}
            label="PLZ"
            required={addressRequired}
            showRequiredMark={!staffMode}
            type="text"
            maxLength={20}
            placeholder="12345"
          />
          <RegistrantField
            {...bind("registrantCity", errorFor("registrantCity"))}
            label="Ort"
            required={addressRequired}
            showRequiredMark={!staffMode}
            type="text"
            maxLength={100}
            placeholder="Düsseldorf"
          />
        </div>

        <div className="border-rule dark:border-night-rule mt-8 border-t pt-8">
          <Heading as="h3" size="list" className="mb-4 text-[1.375rem]">
            Rechnungsadresse
          </Heading>

          <Checkbox
            id={`${uid}-useSeparateBilling`}
            checked={!!registrationData.useSeparateBilling}
            onChange={(e) =>
              setRegistrationData({
                ...registrationData,
                useSeparateBilling: e.target.checked,
              })
            }
          >
            <span className="text-ink dark:text-night-text font-semibold">
              Abweichende Rechnungsadresse
            </span>
            <span className="text-dark dark:text-night-muted mt-0.5 block text-sm">
              z.B. für Kirchengemeinde oder Institution
            </span>
          </Checkbox>

          {registrationData.useSeparateBilling && (
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <RegistrantField
                {...bind("billingCompany")}
                className="md:col-span-2"
                label="Firma / Institution / Kirchengemeinde"
                type="text"
                maxLength={200}
                placeholder="Evangelische Kirchengemeinde Düsseldorf"
              />

              <p className="text-dark dark:text-night-muted -mb-1 text-xs md:col-span-2">
                Name und E-Mail sind freiwillig. Ohne Ansprechperson trägt die
                Rechnung nur die Firma, ohne beides Ihren Namen.
              </p>

              <RegistrantField
                {...bind("billingFirstName")}
                label="Vorname"
                type="text"
                maxLength={100}
                placeholder="Max"
              />

              <RegistrantField
                {...bind("billingLastName")}
                label="Nachname"
                type="text"
                maxLength={100}
                placeholder="Mustermann"
              />

              <RegistrantField
                {...bind("billingStreet", errorFor("billingStreet"))}
                className="md:col-span-2"
                label="Straße und Hausnummer"
                required
                type="text"
                maxLength={200}
                placeholder="Musterstraße 123"
              />

              <RegistrantField
                {...bind("billingZipCode", errorFor("billingZipCode"))}
                label="PLZ"
                required
                type="text"
                maxLength={20}
                placeholder="40210"
              />

              <RegistrantField
                {...bind("billingCity", errorFor("billingCity"))}
                label="Stadt"
                required
                type="text"
                maxLength={100}
                placeholder="Düsseldorf"
              />

              <RegistrantField
                {...bind(
                  "billingEmail",
                  errorFor("billingEmail") ??
                    (billingEmailInvalid ? EMAIL_HINT : undefined),
                )}
                className="md:col-span-2"
                label="E-Mail für Rechnung"
                type="email"
                placeholder="rechnung@gemeinde.de"
                hint="Falls abweichend von Ihrer E-Mail-Adresse"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
