/**
 * Subjects for the public contact form — shared between the form UI,
 * the tRPC input validation, and the notification email.
 */
export const CONTACT_SUBJECTS = {
  allgemein: "Allgemeine Anfrage",
  chor: "Posaunenchor gründen/finden",
  ausbildung: "Ausbildung",
  termine: "Termine & Veranstaltungen",
  materialien: "Noten & Materialien",
  foerderverein: "Förderverein",
  sonstiges: "Sonstiges",
} as const;

export type ContactSubject = keyof typeof CONTACT_SUBJECTS;

export const CONTACT_SUBJECT_KEYS = Object.keys(CONTACT_SUBJECTS) as [
  ContactSubject,
  ...ContactSubject[],
];
