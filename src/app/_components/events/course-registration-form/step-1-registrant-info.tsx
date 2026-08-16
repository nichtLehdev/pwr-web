"use client";

import type { RegistrationData } from "./types";
import { fieldClass } from "./field-styles";

interface Step1RegistrantInfoProps {
  registrationData: RegistrationData;
  setRegistrationData: React.Dispatch<React.SetStateAction<RegistrationData>>;
  /**
   * Team members recording a registration on someone's behalf often only have
   * a name and an e-mail, so phone and address are optional for them.
   */
  staffMode?: boolean;
}

export function Step1RegistrantInfo({
  registrationData,
  setRegistrationData,
  staffMode = false,
}: Step1RegistrantInfoProps) {
  const contactRequiredMark = staffMode ? "" : " *";
  const inputClass = fieldClass({
    className: "dark:bg-dark-background-secondary bg-white",
  });
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-dark dark:text-dark-text mb-4 text-xl font-bold">
          {staffMode ? "Kontaktdaten des Anmelders" : "Ihre Kontaktdaten"}
        </h3>
        <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
          {staffMode
            ? "Der Anmelder erhält Bestätigung und weitere Informationen an diese E-Mail-Adresse. Adresse und Telefon können nachgetragen werden, für Rechnungen sind sie nötig."
            : "Als Anmelder erhalten Sie die Bestätigung und alle weiteren Informationen per E-Mail."}
        </p>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Vorname *
            </label>
            <input
              type="text"
              value={registrationData.registrantFirstName}
              onChange={(e) =>
                setRegistrationData({
                  ...registrationData,
                  registrantFirstName: e.target.value,
                })
              }
              maxLength={100}
              required
              className={inputClass}
              placeholder="Max"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Nachname *
            </label>
            <input
              type="text"
              value={registrationData.registrantLastName}
              onChange={(e) =>
                setRegistrationData({
                  ...registrationData,
                  registrantLastName: e.target.value,
                })
              }
              maxLength={100}
              required
              className={inputClass}
              placeholder="Mustermann"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
              E-Mail *
            </label>
            <input
              type="email"
              value={registrationData.registrantEmail}
              onChange={(e) =>
                setRegistrationData({
                  ...registrationData,
                  registrantEmail: e.target.value,
                })
              }
              required
              className={inputClass}
              placeholder="max@example.com"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Telefon{contactRequiredMark}
            </label>
            <input
              type="tel"
              value={registrationData.registrantPhone}
              onChange={(e) =>
                setRegistrationData({
                  ...registrationData,
                  registrantPhone: e.target.value,
                })
              }
              maxLength={50}
              required={!staffMode}
              className={inputClass}
              placeholder="0211 123456"
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Straße und Hausnummer{contactRequiredMark}
            </label>
            <input
              type="text"
              value={registrationData.registrantStreet}
              onChange={(e) =>
                setRegistrationData({
                  ...registrationData,
                  registrantStreet: e.target.value,
                })
              }
              maxLength={200}
              className={inputClass}
              placeholder="Musterstraße 1"
              required={!staffMode && !registrationData.useSeparateBilling}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
              PLZ{contactRequiredMark}
            </label>
            <input
              type="text"
              value={registrationData.registrantZipCode}
              onChange={(e) =>
                setRegistrationData({
                  ...registrationData,
                  registrantZipCode: e.target.value,
                })
              }
              maxLength={20}
              className={inputClass}
              placeholder="12345"
              required={!staffMode && !registrationData.useSeparateBilling}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Ort{contactRequiredMark}
            </label>
            <input
              type="text"
              value={registrationData.registrantCity}
              onChange={(e) =>
                setRegistrationData({
                  ...registrationData,
                  registrantCity: e.target.value,
                })
              }
              maxLength={100}
              className={inputClass}
              placeholder="Düsseldorf"
              required={!staffMode && !registrationData.useSeparateBilling}
            />
          </div>
        </div>

        {/* Billing Address Section */}
        <div className="dark:border-dark-border mt-8 border-t border-gray-200 pt-8">
          <h3 className="text-dark dark:text-dark-text mb-4 text-lg font-bold">
            Rechnungsadresse
          </h3>

          <div className="mb-4">
            <label className="dark:bg-dark-background-secondary dark:hover:bg-dark-background flex cursor-pointer items-center gap-3 rounded-lg bg-gray-50 p-4 transition-colors hover:bg-gray-100">
              <input
                type="checkbox"
                checked={registrationData.useSeparateBilling}
                onChange={(e) =>
                  setRegistrationData({
                    ...registrationData,
                    useSeparateBilling: e.target.checked,
                  })
                }
                className="text-primary focus:ring-primary h-5 w-5 rounded"
              />
              <div>
                <span className="text-dark dark:text-dark-text font-semibold">
                  Abweichende Rechnungsadresse
                </span>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  z.B. für Kirchengemeinde oder Institution
                </p>
              </div>
            </label>
          </div>

          {registrationData.useSeparateBilling && (
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Firma / Institution / Kirchengemeinde
                </label>
                <input
                  type="text"
                  value={registrationData.billingCompany}
                  onChange={(e) =>
                    setRegistrationData({
                      ...registrationData,
                      billingCompany: e.target.value,
                    })
                  }
                  maxLength={200}
                  className={inputClass}
                  placeholder="Evangelische Kirchengemeinde Düsseldorf"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Vorname
                </label>
                <input
                  type="text"
                  value={registrationData.billingFirstName}
                  onChange={(e) =>
                    setRegistrationData({
                      ...registrationData,
                      billingFirstName: e.target.value,
                    })
                  }
                  maxLength={100}
                  className={inputClass}
                  placeholder="Max"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Nachname
                </label>
                <input
                  type="text"
                  value={registrationData.billingLastName}
                  onChange={(e) =>
                    setRegistrationData({
                      ...registrationData,
                      billingLastName: e.target.value,
                    })
                  }
                  maxLength={100}
                  className={inputClass}
                  placeholder="Mustermann"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Straße und Hausnummer *
                </label>
                <input
                  type="text"
                  value={registrationData.billingStreet}
                  onChange={(e) =>
                    setRegistrationData({
                      ...registrationData,
                      billingStreet: e.target.value,
                    })
                  }
                  maxLength={200}
                  className={inputClass}
                  placeholder="Musterstraße 123"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  PLZ *
                </label>
                <input
                  type="text"
                  value={registrationData.billingZipCode}
                  onChange={(e) =>
                    setRegistrationData({
                      ...registrationData,
                      billingZipCode: e.target.value,
                    })
                  }
                  maxLength={20}
                  className={inputClass}
                  placeholder="40210"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Stadt *
                </label>
                <input
                  type="text"
                  value={registrationData.billingCity}
                  onChange={(e) =>
                    setRegistrationData({
                      ...registrationData,
                      billingCity: e.target.value,
                    })
                  }
                  maxLength={100}
                  className={inputClass}
                  placeholder="Düsseldorf"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  E-Mail für Rechnung
                </label>
                <input
                  type="email"
                  value={registrationData.billingEmail}
                  onChange={(e) =>
                    setRegistrationData({
                      ...registrationData,
                      billingEmail: e.target.value,
                    })
                  }
                  className={inputClass}
                  placeholder="rechnung@gemeinde.de"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Falls abweichend von Ihrer E-Mail-Adresse
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
