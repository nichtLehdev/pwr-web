import { DownloadCategory, FileType } from "~/generated/prisma/client";

export const downloadsData = [
  // Blechblatt editions
  {
    title: "Rheinisches Blechblatt - Ausgabe 4/2025",
    description:
      "Winter-Ausgabe mit Rückblick auf das Landesposaunenfest und Vorschau auf die Adventskonzerte 2025.",
    category: "BLECHBLATT" as DownloadCategory,
    fileUrl: "/downloads/blechblatt-2025-04.pdf",
    fileType: "PDF" as FileType,
    fileSize: 2500000,
    tags: ["Blechblatt", "2025", "Winter"],
    isPublic: true,
  },
  {
    title: "Rheinisches Blechblatt - Ausgabe 3/2025",
    description:
      "Herbst-Ausgabe mit Berichten von den Sommerfreizeiten und dem Jubiläum des Bezirks Köln.",
    category: "BLECHBLATT" as DownloadCategory,
    fileUrl: "/downloads/blechblatt-2025-03.pdf",
    fileType: "PDF" as FileType,
    fileSize: 2800000,
    tags: ["Blechblatt", "2025", "Herbst"],
    isPublic: true,
  },
  {
    title: "Rheinisches Blechblatt - Ausgabe 2/2025",
    description:
      "Sommer-Ausgabe mit dem Schwerpunkt 'Nachwuchsarbeit' und Vorstellung der neuen Bläserhefte.",
    category: "BLECHBLATT" as DownloadCategory,
    fileUrl: "/downloads/blechblatt-2025-02.pdf",
    fileType: "PDF" as FileType,
    fileSize: 3100000,
    tags: ["Blechblatt", "2025", "Sommer"],
    isPublic: true,
  },
  {
    title: "Rheinisches Blechblatt - Ausgabe 1/2025",
    description:
      "Frühlings-Ausgabe mit Berichten vom Neujahrskonzert und Ankündigung der Lehrgänge 2025.",
    category: "BLECHBLATT" as DownloadCategory,
    fileUrl: "/downloads/blechblatt-2025-01.pdf",
    fileType: "PDF" as FileType,
    fileSize: 2600000,
    tags: ["Blechblatt", "2025", "Frühling"],
    isPublic: true,
  },
  {
    title: "Rheinisches Blechblatt - Ausgabe 4/2024",
    description:
      "Jahresrückblick 2024 mit Highlights aus allen Bezirken und Ausblick auf das neue Jahr.",
    category: "BLECHBLATT" as DownloadCategory,
    fileUrl: "/downloads/blechblatt-2024-04.pdf",
    fileType: "PDF" as FileType,
    fileSize: 2900000,
    tags: ["Blechblatt", "2024", "Jahresrückblick"],
    isPublic: true,
  },
  // Other downloads
  {
    title: "Arbeitshilfe Jungbläser",
    description:
      "Eine umfassende Arbeitshilfe des Posaunenwerks Rheinland zur Jungbläserausbildung. Enthält Informationen zu Jungbläsergewinnung, Instrumentenvorstellung, Finanzierung, Instrumentenbeschaffung, Gruppenunterricht, Literaturempfehlungen und vieles mehr.",
    category: "UEBUNGEN" as DownloadCategory,
    fileUrl: "/downloads/arbeitshilfe-jungblaeser.pdf",
    fileType: "PDF" as FileType,
    fileSize: 27001,
    tags: ["Jungbläser", "Ausbildung", "Anleitung"],
    isPublic: true,
  },
  {
    title: "Aufnahmeantrag Chöre",
    description:
      "Offizielles Formular zur Beantragung der Mitgliedschaft im Posaunenwerk der Evangelischen Kirche im Rheinland e.V.",
    category: "FORMULARE" as DownloadCategory,
    fileUrl: "/downloads/aufnahmeantrag-choere.pdf",
    fileType: "PDF" as FileType,
    fileSize: 142000,
    tags: ["Mitgliedschaft", "Antrag", "Chor"],
    isPublic: true,
  },
  {
    title: "Ehrenordnung",
    description:
      "Ehrenordnung des Posaunenwerks Rheinland mit Regelungen zu Ehrungen und Auszeichnungen für besondere Verdienste in der Posaunenarbeit.",
    category: "SONSTIGES" as DownloadCategory,
    fileUrl: "/downloads/ehrenordnung.pdf",
    fileType: "PDF" as FileType,
    fileSize: 229000,
    tags: ["Ehrungen", "Satzung", "Auszeichnungen"],
    isPublic: true,
  },
  {
    title: "Leistungsstempel - Prüfungsanforderungen",
    description:
      "Übersicht über die Stempelprüfungen für Jungbläser: Elementarstufe (Reihe A), Anfängerstadium (Reihe B), Posaunenchor-Level (Reihe C) und Fortgeschrittenen-Level (Reihe D) mit allen Prüfungsanforderungen.",
    category: "UEBUNGEN" as DownloadCategory,
    fileUrl: "/downloads/leistungsstempel.pdf",
    fileType: "PDF" as FileType,
    fileSize: 185000,
    tags: ["Stempel", "Prüfung", "Jungbläser", "Ausbildung"],
    isPublic: true,
  },
  {
    title: "Satzung Posaunenwerk",
    description:
      "Die aktuelle Satzung des Posaunenwerks der Evangelischen Kirche im Rheinland e.V. mit allen Regelungen zu Name, Sitz, Aufgaben, Mitgliedschaft, Gliederung und Organen des Vereins.",
    category: "SONSTIGES" as DownloadCategory,
    fileUrl: "/downloads/satzung-posaunenwerk.pdf",
    fileType: "PDF" as FileType,
    fileSize: 261000,
    tags: ["Satzung", "Verein", "Organisation"],
    isPublic: true,
  },
  {
    title: "Zusatzerklärung Minderjährige",
    description:
      "Erforderliche Zusatzerklärung der Eltern zur Anmeldung von Kindern und Jugendlichen zu Lehrgängen und Freizeiten. Enthält Gesundheitsangaben, Erreichbarkeit und notwendige Einverständniserklärungen.",
    category: "FORMULARE" as DownloadCategory,
    fileUrl: "/downloads/zusatzerklaerung-minderjaehrige.pdf",
    fileType: "PDF" as FileType,
    fileSize: 153000,
    tags: ["Anmeldung", "Minderjährige", "Lehrgang", "Freizeit"],
    isPublic: true,
  },
];
