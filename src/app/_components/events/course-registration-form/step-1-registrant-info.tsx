"use client";

import type { RegistrationData } from "./types";

interface Step1RegistrantInfoProps {
  registrationData: RegistrationData;
  setRegistrationData: React.Dispatch<React.SetStateAction<RegistrationData>>;
}

export function Step1RegistrantInfo({
  registrationData,
  setRegistrationData,
}: Step1RegistrantInfoProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-dark dark:text-dark-text mb-4 text-xl font-bold">
          Ihre Kontaktdaten
        </h3>
        <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
          Als Anmelder erhalten Sie die Bestätigung und alle weiteren
          Informationen per E-Mail.
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
              className="focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white px-4 py-2 focus:border-transparent focus:ring-2"
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
              className="focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white px-4 py-2 focus:border-transparent focus:ring-2"
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
              className="focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white px-4 py-2 focus:border-transparent focus:ring-2"
              placeholder="max@example.com"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Telefon *
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
              required
              className="focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white px-4 py-2 focus:border-transparent focus:ring-2"
              placeholder="0211 123456"
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Straße und Hausnummer *
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
              className="focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white px-4 py-2 focus:border-transparent focus:ring-2"
              placeholder="Musterstraße 1"
              required={!registrationData.useSeparateBilling}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
              PLZ *
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
              className="focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white px-4 py-2 focus:border-transparent focus:ring-2"
              placeholder="12345"
              required={!registrationData.useSeparateBilling}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Ort *
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
              className="focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white px-4 py-2 focus:border-transparent focus:ring-2"
              placeholder="Düsseldorf"
              required={!registrationData.useSeparateBilling}
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
                  className="focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white px-4 py-2 focus:border-transparent focus:ring-2"
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
                  className="focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white px-4 py-2 focus:border-transparent focus:ring-2"
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
                  className="focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white px-4 py-2 focus:border-transparent focus:ring-2"
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
                  className="focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white px-4 py-2 focus:border-transparent focus:ring-2"
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
                  className="focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white px-4 py-2 focus:border-transparent focus:ring-2"
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
                  className="focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white px-4 py-2 focus:border-transparent focus:ring-2"
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
                  className="focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white px-4 py-2 focus:border-transparent focus:ring-2"
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
