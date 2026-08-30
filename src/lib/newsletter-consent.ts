/**
 * Fassung des Einwilligungstextes auf der Newsletter-Anmeldeseite.
 *
 * Wird bei jeder Anmeldung mitgespeichert, weil Art. 7 Abs. 1 DSGVO den
 * Nachweis verlangt, dass eingewilligt wurde — und wozu. Ohne Versionsangabe
 * lässt sich im Streitfall nicht mehr belegen, welcher Text zum Zeitpunkt der
 * Anmeldung tatsächlich auf der Seite stand.
 *
 * Beim Ändern des Textes in `src/app/newsletter/page.tsx` auf das Datum der
 * Änderung hochsetzen. Der Startwert ist der Tag, an dem die Aufzeichnung
 * eingeführt wurde — ältere Anmeldungen tragen deshalb keine Version.
 */
export const NEWSLETTER_CONSENT_VERSION = "2026-08-30";
