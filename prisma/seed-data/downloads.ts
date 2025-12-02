import { DownloadCategory, FileType } from "~/generated/prisma/client";

export const downloadsData = [
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
