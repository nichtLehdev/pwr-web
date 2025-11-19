import type {
  Event,
  Post,
  Course,
  Ensemble,
  User,
  CourseRegistration,
  AuswahlChor,
  Download,
} from "@/types/strapi";

// Mock Users
export const mockUsers: User[] = [
  {
    id: 1,
    username: "mschneider",
    email: "m.schneider@posaunenwerk-rheinland.de",
    displayName: "Martin Schneider",
    roleType: "Regional Coordinator",
    district: "District 3",
    bio: "Landesposaunenwart und leidenschaftlicher Trompeter seit 25 Jahren",
    profileImage: {
      id: 101,
      name: "profile-martin.jpg",
      url: "/images/profile-placeholder.jpg",
    },
  },
  {
    id: 2,
    username: "siegelroemer",
    email: "sx.test.com",
    displayName: "Sonia Siegel-Roemer",
    roleType: "Editor",
    district: "All Districts",
    bio: "Regionalposaunenwartin für die Bezirke 2, 3, 4 und 5",
  },
  {
    id: 3,
    username: "lpw",
    email: "lpw.haesler@web.de",
    displayName: "Jörg Häusler",
    displayRole: "LPW",
    roleType: "Publisher",
    district: "All Districts",
  },
];

export const mockAuswahlchore: AuswahlChor[] = [
  {
    name: "Con Spirito",
    slug: "conspirito",
    subtitle: "Das Spitzenensemble des Posaunenwerks",
    founded: "2006",
    members: "12 Mitglieder",
    conductor: mockUsers[2],
    description:
      "Wenn das Ganze mehr ist, als die Summe seiner Teile und Musik mit Herzblut und Tiefe erklingt, dann kommt Con Spirito ins Spiel. Das zwölfköpfige Ensemble repräsentiert das Posaunenwerk und die Evangelische Kirche im Rheinland. Geführt von LPW Jörg Häusler verbindet die MusikerInnen seit 2006 ein engagierter Weg durch musikalische Zeit- und Stilepochen, hörbare Spielfreude und die Lust an lebendiger Musik.",
    color: "bg-primary",
    colorHex: "#faa619",
    image: {
      id: 102,
      name: "conspirito-ensemble.jpg",
      url: "/images/auswahlchoere/conspirito/1.jpg",
    },
  },
  {
    name: "Buccinate Deo",
    slug: "buccinate",
    subtitle: "Musik als Verkündigungsdienst",
    founded: "1986",
    members: "10 Mitglieder",
    conductor: mockUsers[2],
    description:
      "BUCCINATE DEO wurde 1986 als ein Blechbläserensemble im Posaunenwerk der Evangelischen Kirche im Rheinland gegründet. Ihm gehören derzeit zehn Bläserinnen und Bläser an, die größtenteils aus der Posaunenchorarbeit evangelischer Kirchengemeinden im Rheinland hervorgegangen sind. Der Name Buccinate Deo bedeutet -frei übersetzt- Spielet dem Herrn und bringt zum Ausdruck, dass das Ensemble im weitesten Sinne seine musikalischen Aktivitäten als Verkündigungsdienst versteht.",
    color: "bg-district-3",
    colorHex: "#8b5cf6",
    image: {
      id: 101,
      name: "buccinate-deo-ensemble.jpg",
      url: "/images/auswahlchoere/buccinate/1.jpg",
    },
  },
  {
    name: "Rheinischer Landesjugendposaunenchor",
    slug: "jupo",
    subtitle: "LaJuPo - Für junge Talente",
    founded: "2013",
    members: "ca. 35 Mitglieder",
    conductor: mockUsers[2],
    description:
      "Der Rheinische Landesjugendposaunenchor - kurz LaJuPo - ist ein festes Auswahlensemble mit ca. 35 Bläserinnen und Bläsern. Er bietet engagierten und talentierten Jugendlichen die Möglichkeit, über ihren Einsatz im Posaunenchor hinaus anspruchsvoll miteinander zu musizieren. Alle zwei Jahre setzt sich der Chor neu zusammen.",
    color: "bg-district-2",
    colorHex: "#10b981",
    showApplication: false,
    image: {
      id: 103,
      name: "jupo-ensemble.jpg",
      url: "/images/auswahlchoere/jupo/1.jpg",
    },
  },
];

// Mock Ensembles
export const mockEnsembles: Ensemble[] = [
  {
    id: 4,
    name: "Bezirksposaunenchor 3",
    districtInfo: { name: "District 3" },
    conductor: mockUsers[1],
    isActive: true,
  },
  {
    id: 5,
    name: "Jugendposaunenchor Düsseldorf",
    districtInfo: { name: "District 3" },
    description: "Für junge Bläser von 12-25 Jahren.",
    isActive: true,
  },
];

// Mock Events
export const mockEvents: Event[] = [
  {
    id: 9,
    title: "Von Königreichen",
    description: "Festliches Konzert zum Advent",
    eventDate: "2025-11-29T18:30:00.000Z",
    location: {
      venue: "Evangelische Kirche Hückelhoven",
      city: "Hückelhoven",
    },
    districtInfo: { name: "All Districts" },
    performingEnsemble: mockAuswahlchore[1],
    openToParticipants: false,
    leitung: "LPW Jörg Häusler",
    category: "Konzert",
    isFree: true,
    pendingReview: false,
    approved: true,
    publishedAt: "2025-11-01T10:00:00.000Z",
    createdAt: "2025-10-25T14:20:00.000Z",
    updatedAt: "2025-11-01T10:00:00.000Z",
  },
  {
    id: 10,
    title: "Festliches Adventskonzert",
    description: "mit Werken von Rutter und Pinkham",
    eventDate: "2025-11-30T18:30:00.000Z",
    location: {
      venue: "Lukaskirche Bonn",
      city: "Bonn",
    },
    districtInfo: { name: "All Districts" },
    performingEnsemble: mockAuswahlchore[1],
    openToParticipants: false,
    leitung: "Cleve Kersh und LPW Jörg Häusler",
    category: "Konzert",
    isFree: true,
    pendingReview: false,
    approved: true,
    publishedAt: "2025-11-01T10:00:00.000Z",
    createdAt: "2025-10-25T14:20:00.000Z",
    updatedAt: "2025-11-01T10:00:00.000Z",
  },
  {
    id: 11,
    title: "Nachweihnachtliche Musik",
    description:
      "Die Nachweihnachtliche Musik im Xantener Dom hat eine große Tradition und trifft auch bei Zuhörenden in der Region auf große Resonanz. Wir laden herzlich zur Mitwirkung ein.",
    eventDate: "2026-01-11T14:30:00.000Z",
    location: {
      venue: "Dom zu Xanten",
      city: "Xanten",
    },
    districtInfo: { name: "All Districts" },
    performingEnsemble: mockAuswahlchore[0],
    openToParticipants: true,
    participationInfo:
      "Um beim Konzert mitzuwirken, ist die Teilnahme an der Probe am 8. Januar in Duisburg erforderlich. Das Programm und die Noten werden ab dem 1. Dezember zur Verfügung stehen und können bei Jörg Häusler oder Gerald Münster angefordert werden.",
    category: "Konzert",
    isFree: true,
    pendingReview: false,
    approved: true,
    publishedAt: "2026-01-01T10:00:00.000Z",
    createdAt: "2025-12-25T14:20:00.000Z",
    updatedAt: "2026-01-01T10:00:00.000Z",
  },
  {
    id: 12,
    title: "Wie schön leuchtet der Morgenstern",
    eventDate: "2026-01-15T18:30:00.000Z",
    location: {
      venue: "Trinitatiskirche",
      city: "Köln",
    },
    districtInfo: { name: "All Districts" },
    performingEnsemble: mockAuswahlchore[0],
    openToParticipants: false,
    category: "Konzert",
    isFree: true,
    pendingReview: false,
    approved: true,
    publishedAt: "2026-01-01T10:00:00.000Z",
    createdAt: "2025-12-25T14:20:00.000Z",
    updatedAt: "2026-01-01T10:00:00.000Z",
  },
  {
    id: 13,
    title: "JuPo Konzert",
    eventDate: "2026-03-21T18:00:00.000Z",
    location: {
      venue: "Abteikirche",
      city: "Otterberg",
    },
    districtInfo: { name: "All Districts" },
    performingEnsemble: mockAuswahlchore[2],
    category: "Konzert",
    isFree: true,
    openToParticipants: false,
    pendingReview: false,
    approved: true,
    publishedAt: "2026-01-01T10:00:00.000Z",
    createdAt: "2025-12-25T14:20:00.000Z",
    updatedAt: "2026-01-01T10:00:00.000Z",
  },
  {
    id: 14,
    title: "JuPo Konzert",
    eventDate: "2026-03-22T16:00:00.000Z",
    location: {
      venue: "Evangelische Kirche Simmern",
      city: "Simmern",
    },
    districtInfo: { name: "All Districts" },
    performingEnsemble: mockAuswahlchore[2],
    openToParticipants: false,
    category: "Konzert",
    isFree: true,
    pendingReview: false,
    approved: true,
    publishedAt: "2026-01-01T10:00:00.000Z",
    createdAt: "2025-12-25T14:20:00.000Z",
    updatedAt: "2026-01-01T10:00:00.000Z",
  },
  {
    id: 15,
    title: "JuPo Konzert",
    eventDate: "2026-05-10T16:00:00.000Z",
    location: {
      city: "Dierdorf",
    },
    districtInfo: { name: "All Districts" },
    performingEnsemble: mockAuswahlchore[2],
    openToParticipants: false,
    category: "Konzert",
    isFree: true,
    pendingReview: false,
    approved: true,
    publishedAt: "2026-01-01T10:00:00.000Z",
    createdAt: "2025-12-25T14:20:00.000Z",
    updatedAt: "2026-01-01T10:00:00.000Z",
  },
  {
    id: 16,
    title: "JuPo Gottesdienstmitgestaltung",
    eventDate: "2026-05-17T13:00:00.000Z",
    location: {
      city: "Siegburg",
    },
    districtInfo: { name: "All Districts" },
    performingEnsemble: mockAuswahlchore[2],
    category: "Gottesdienst",
    openToParticipants: false,
    isFree: true,
    pendingReview: false,
    approved: true,
    publishedAt: "2026-01-01T10:00:00.000Z",
    createdAt: "2025-12-25T14:20:00.000Z",
    updatedAt: "2026-01-01T10:00:00.000Z",
  },
  {
    id: 17,
    title: "JuPo Konzert",
    eventDate: "2026-10-18T15:00:00.000Z",
    location: {
      city: "vrsl. Essen",
    },
    districtInfo: { name: "All Districts" },
    performingEnsemble: mockAuswahlchore[2],
    openToParticipants: false,
    category: "Konzert",
    isFree: true,
    pendingReview: false,
    approved: true,
    publishedAt: "2026-01-01T10:00:00.000Z",
    createdAt: "2025-12-25T14:20:00.000Z",
    updatedAt: "2026-01-01T10:00:00.000Z",
  },
  {
    id: 18,
    title: "Christmas Carol Singing",
    eventDate: "2025-11-30T13:30:00.000Z",
    location: {
      venue: "Altenberger Dom",
      city: "Odenthal",
    },
    districtInfo: { name: "All Districts" },
    performingEnsemble: "Blechbläser des Posaunenwerks",
    leitung: "LPW Jörg Häusler",
    category: "Konzert",
    isFree: true,
    openToParticipants: false,
    pendingReview: false,
    approved: true,
    publishedAt: "2025-11-01T10:00:00.000Z",
    createdAt: "2025-10-25T14:20:00.000Z",
    updatedAt: "2025-11-01T10:00:00.000Z",
  },
  {
    id: 19,
    title: "Davon ich singen und sagen will",
    description: "Vorweihnachtliches Konzert für Blechbläser und Orgel",
    eventDate: "2025-12-14T17:00:00.000Z",
    location: {
      venue: "Versöhnungskirche",
      city: "Kleve",
    },
    districtInfo: { name: "All Districts" },
    performingEnsemble: "KMD Michael Porr, Orgel",
    leitung: "LPW Jörg Häusler",
    category: "Konzert",
    isFree: true,
    openToParticipants: false,
    pendingReview: false,
    approved: true,
    publishedAt: "2025-11-01T10:00:00.000Z",
    createdAt: "2025-10-25T14:20:00.000Z",
    updatedAt: "2025-11-01T10:00:00.000Z",
  },
  {
    id: 20,
    title: "Davon ich singen und sagen will",
    description: "Vorweihnachtliches Konzert für Blechbläser und Orgel",
    eventDate: "2025-12-19T18:30:00.000Z",
    location: {
      venue: "Große Ev. Kirche",
      city: "Bonn Oberkassel",
    },
    districtInfo: { name: "All Districts" },
    performingEnsemble: "KMD Michael Porr, Orgel",
    leitung: "LPW Jörg Häusler",
    category: "Konzert",
    isFree: true,
    openToParticipants: false,
    pendingReview: false,
    approved: true,
    publishedAt: "2025-11-01T10:00:00.000Z",
    createdAt: "2025-10-25T14:20:00.000Z",
    updatedAt: "2025-11-01T10:00:00.000Z",
  },
  {
    id: 21,
    title: "Weihnachtskonzert",
    description: "Vorweihnachtliches Konzert für Blechbläser und Orgel",
    eventDate: "2025-12-21T17:00:00.000Z",
    location: {
      venue: "Evangelische Kirche",
      city: "Kettwig",
    },
    districtInfo: { name: "All Districts" },
    performingEnsemble: "Ensemble 23*12 feat. Jens Uhlenhoff",
    leitung: "LPW Jörg Häusler",
    category: "Konzert",
    isFree: true,
    openToParticipants: false,
    pendingReview: false,
    approved: true,
    publishedAt: "2025-11-01T10:00:00.000Z",
    createdAt: "2025-10-25T14:20:00.000Z",
    updatedAt: "2025-11-01T10:00:00.000Z",
  },
  {
    id: 22,
    title: "Blechbläserkonzert nach Weihnachten",
    eventDate: "2026-01-10T16:00:00.000Z",
    location: {
      venue: "Heilig-Kreuz-Kirche",
      city: "Essen",
    },
    districtInfo: { name: "District 3" },
    performingEnsemble: mockEnsembles[0],
    category: "Konzert",
    isFree: true,
    openToParticipants: false,
    pendingReview: false,
    approved: true,
    publishedAt: "2025-11-01T10:00:00.000Z",
    createdAt: "2025-10-25T14:20:00.000Z",
    updatedAt: "2025-11-01T10:00:00.000Z",
  },
  {
    id: 23,
    title: "Probe zur Nachweihnachtlichen Musik",
    description:
      "Die Nachweihnachtliche Musik im Xantener Dom hat eine große Tradition und trifft auch bei Zuhörenden in der Region auf große Resonanz. Wir laden herzlich zur Mitwirkung ein.",
    eventDate: "2026-01-08T18:30:00.000Z",
    location: {
      venue: "Evangelische Kreuzkirche ",
      street: "In den Bänden 69",
      zipCode: "47229",
      city: "Duisburg",
    },
    districtInfo: { name: "All Districts" },
    openToParticipants: true,
    participationInfo:
      "Das Programm und die Noten werden ab dem 1. Dezember zur Verfügung stehen und können bei Jörg Häusler oder Gerald Münster angefordert werden. Die Probe für das gemeinsame Konzert findet am Donnerstag, den 8. Januar 2026 um 19:30 Uhr in der Evangelischen Kreuzkirche (In den Bänden 69, 47229 Duisburg) statt. Am darauffolgenden Sonntag, den 11. Januar wird es um 13:30 Uhr eine gemeinsame Anspielprobe im Dom zu Xanten geben. Nach einer Kaffeepause folgt um 15:30 Uhr das Konzert.",
    category: "Probe",
    isFree: true,
    pendingReview: false,
    approved: true,
    publishedAt: "2026-01-01T10:00:00.000Z",
    createdAt: "2025-12-25T14:20:00.000Z",
    updatedAt: "2026-01-01T10:00:00.000Z",
  },
  {
    id: 24,
    title: "Anspielprobe zur Nachweihnachtlichen Musik",
    description:
      "Die Nachweihnachtliche Musik im Xantener Dom hat eine große Tradition und trifft auch bei Zuhörenden in der Region auf große Resonanz. Wir laden herzlich zur Mitwirkung ein.",
    eventDate: "2026-01-11T12:30:00.000Z",
    location: {
      venue: "Dom zu Xanten",
      city: "Xanten",
    },
    districtInfo: { name: "All Districts" },
    openToParticipants: true,
    participationInfo:
      "Das Programm und die Noten werden ab dem 1. Dezember zur Verfügung stehen und können bei Jörg Häusler oder Gerald Münster angefordert werden. Die Probe für das gemeinsame Konzert findet am Donnerstag, den 8. Januar 2026 um 19:30 Uhr in der Evangelischen Kreuzkirche (In den Bänden 69, 47229 Duisburg) statt. Am darauffolgenden Sonntag, den 11. Januar wird es um 13:30 Uhr eine gemeinsame Anspielprobe im Dom zu Xanten geben. Nach einer Kaffeepause folgt um 15:30 Uhr das Konzert.",
    category: "Probe",
    isFree: true,
    pendingReview: false,
    approved: true,
    publishedAt: "2026-01-01T10:00:00.000Z",
    createdAt: "2025-12-25T14:20:00.000Z",
    updatedAt: "2026-01-01T10:00:00.000Z",
  },
  {
    id: 25,
    title: "Adventsblasen im Kölner Dom",
    description:
      "Am Montag nach dem ersten Advent, also am 1. Dezember findet wieder das Adventsblasen unter bewährter Leitung von Gerhard Heywang statt. Die genaue Reihenfolge findet ihr in der entsprechenden Information auf unserer Homepage oder könnt sie direkt bei Gerhard Heywang unter pos-altenberg@web.de anfragen.",
    eventDate: "2025-12-01T18:10:00.000Z",
    location: {
      venue: "Kölner Dom",
      city: "Köln",
    },
    districtInfo: { name: "All Districts" },
    openToParticipants: true,
    participationInfo:
      "Eine vorherige Probe gibt es nicht. Gespielt werden Adventslieder aus dem Choralbuch und freie Stücke.",
    category: "Andere",
    isFree: true,
    pendingReview: false,
    approved: true,
    publishedAt: "2026-01-01T10:00:00.000Z",
    createdAt: "2025-12-25T14:20:00.000Z",
    updatedAt: "2026-01-01T10:00:00.000Z",
  },
];

// Mock Course Registrations
export const mockCourseRegistrations: CourseRegistration[] = [];

// Mock Courses
export const mockCourses: Course[] = [
  {
    id: 1,
    title: "Bläser-, Familien-, Skifreizeit",
    description:
      "<p>Lust auf einen ganz besonderen, stimmungsvollen Jahreswechsel? Darüber hinaus Spaß am Wintersport und am Blechblasen (zumindest einer in der Familie!)? Dann sind die Tage auf dem Paulinghof in Österreich nicht zu toppen.</p>",
    startDate: "2025-12-28T13:00:00.000Z",
    endDate: "2026-01-05T09:00:00.000Z",
    location: {
      venue: "Paulinghof",
      city: "Breitenbach am Inn, Österreich",
    },
    districtInfo: { name: "All Districts" },
    courseType: "Freizeit",
    targetAudience: "Alle",
    registrationOpen: true,
    registrationDeadline: "2025-10-31T23:59:59.000Z",
    maxParticipants: 60,
    allowWaitingList: true,
    priceOptions: [
      { price: 490, label: "Erwachsene" },
      { price: 330, label: "Kinder und Jugendliche" },
    ],
    isFree: false,
    prerequisites:
      "Für die Teilnahme muss ein Mitglied der Familie ein Instrument spielen können.",
    pendingReview: false,
    approved: true,
    publishedAt: "2025-01-10T10:00:00.000Z",
    createdAt: "2025-01-05T14:20:00.000Z",
    updatedAt: "2025-01-10T10:00:00.000Z",
  },
  {
    id: 2,
    title: "Komponistenportrait: Simon Langenbach",
    description:
      "<p>Simon Langenbach ist ein aufstrebender Komponist und Arrangeur, der sich auf zeitgenössische Bläsermusik spezialisiert hat. In diesem Kurs werden wir seine Werke kennenlernen, analysieren und gemeinsam musizieren.</p>",
    startDate: "2026-01-31T09:00:00.000Z",
    endDate: "2026-01-31T17:00:00.000Z",
    location: {
      venue: "Historischer Gemeindesaal",
      city: "Bad Godesberg",
    },
    districtInfo: { name: "All Districts" },
    courseType: "Komponistenportrait",
    priceOptions: [{ price: 25, label: "Standardpreis" }],
    maxParticipants: 100,
    allowWaitingList: false,
    targetAudience: "Alle",
    registrationOpen: true,
    registrationDeadline: "2026-01-16T22:59:59.000Z",
    isFree: false,
    pendingReview: false,
    approved: true,
    publishedAt: "2025-11-15T10:00:00.000Z",
    createdAt: "2025-11-10T14:20:00.000Z",
    updatedAt: "2025-11-15T10:00:00.000Z",
  },
  {
    id: 3,
    title: "Lehrgang für Posaunenchorleitung",
    description:
      "<p>Der Kurs ist ein Angebot für gestandene Chorleiterinnen und Chorleiter, die Interesse haben, ihr Wissen rund um die Chorleitung aufzufrischen und neben der Kontaktpflege neue Literatur kennen zu lernen. Darüber hinaus ist der Kurs auf Bläserinnen und Bläser zugeschnitten, die Interesse an der Chorleitung haben und in drei aufeinander aufbauenden Lehrgängen den Befähigungsnachweis anstreben.</p>",
    startDate: "2026-02-19T17:00:00.000Z",
    endDate: "2026-02-22T13:00:00.000Z",
    location: {
      venue: "Haus Marienhof",
      street: "Königswinterer Str. 414",
      city: "Königswinter",
    },
    districtInfo: { name: "All Districts" },
    courseType: "Lehrgang",
    priceOptions: [
      { price: 320, label: "Doppelzimmer" },
      { price: 360, label: "Einzelzimmer" },
    ],
    maxParticipants: 100,
    allowWaitingList: false,
    targetAudience: "Dirigenten",
    registrationOpen: true,
    registrationDeadline: "2026-01-16T22:59:59.000Z",
    isFree: false,
    pendingReview: false,
    approved: true,
    publishedAt: "2025-11-15T10:00:00.000Z",
    createdAt: "2025-11-10T14:20:00.000Z",
    updatedAt: "2025-11-15T10:00:00.000Z",
  },
  {
    id: 4,
    title: "Lehrgang für Jungbläser*innen",
    description:
      "<p>Eingeladen sind sowohl Anfänger mit Grundkenntnissen, als auch fortgeschrittene jugendliche Bläserinnen und Bläser. Mit einem bewährten Mitarbeiterteam werden wir in verschiedenen Leistungsgruppen differenzieren, um den unterschiedlichen Voraussetzungen gerecht zu werden.</p>",
    startDate: "2026-03-30T14:00:00.000Z",
    endDate: "2026-04-03T13:00:00.000Z",
    location: {
      venue: "Ebernburg",
      street: "Burgstraße 38",
      city: "Bad Münster am Stein Ebernburg",
    },
    districtInfo: { name: "All Districts" },
    courseType: "Lehrgang",
    priceOptions: [
      { price: 255, label: "Kinder / Jugendliche im Doppelzimmer" },
      { price: 325, label: "Erwachsene im Doppelzimmer" },
      { price: 380, label: "Erwachsene im Einzelzimmer" },
    ],
    maxParticipants: 300,
    allowWaitingList: false,
    targetAudience: "Anfänger",
    registrationOpen: true,
    registrationDeadline: "2026-01-31T22:59:59.000Z",
    isFree: false,
    pendingReview: false,
    approved: true,
    publishedAt: "2025-11-15T10:00:00.000Z",
    createdAt: "2025-11-10T14:20:00.000Z",
    updatedAt: "2025-11-15T10:00:00.000Z",
  },
  {
    id: 5,
    title: "Lehrgang für fortgeschrittene Bläser*innen",
    description:
      "<p>Zu diesem Lehrgang sind Bläserinnen und Bläser (ab 16 Jahre) eingeladen, die über eine mehrjährige Posaunenchorerfahrung verfügen, sicher im Choralspiel sind, das gängige Choralvorspielmaterial kennen und solide im Vom-Blatt-Spiel sind.</p>",
    startDate: "2026-04-07T14:00:00.000Z",
    endDate: "2026-04-12T13:00:00.000Z",
    location: {
      venue: "Ebernburg",
      street: "Burgstraße 38",
      city: "Bad Münster am Stein Ebernburg",
    },
    districtInfo: { name: "All Districts" },
    courseType: "Lehrgang",
    priceOptions: [
      { price: 370, label: "Doppelzimmer" },
      { price: 455, label: "Einzelzimmer" },
    ],
    maxParticipants: 60,
    allowWaitingList: false,
    targetAudience: "Fortgeschrittene",
    registrationOpen: true,
    registrationDeadline: "2026-01-31T22:59:59.000Z",
    isFree: false,
    pendingReview: false,
    approved: true,
    publishedAt: "2025-11-15T10:00:00.000Z",
    createdAt: "2025-11-10T14:20:00.000Z",
    updatedAt: "2025-11-15T10:00:00.000Z",
  },
  {
    id: 6,
    title: "Vertreterversammlung Posaunenwerk Rheinland",
    description:
      "<p>Zu diesem Lehrgang sind Bläserinnen und Bläser (ab 16 Jahre) eingeladen, die über eine mehrjährige Posaunenchorerfahrung verfügen, sicher im Choralspiel sind, das gängige Choralvorspielmaterial kennen und solide im Vom-Blatt-Spiel sind.</p>",
    startDate: "2026-02-28T09:00:00.000Z",
    endDate: "2026-02-28T17:00:00.000Z",
    location: {
      venue: "Evangelisches Gemeindehaus",
      city: "Bad Honnef",
    },
    districtInfo: { name: "All Districts" },
    courseType: "Other",
    priceOptions: [],
    priceInfo: "Anmeldung per Mail an die Geschäftsstelle.",
    maxParticipants: Infinity,
    allowWaitingList: false,
    targetAudience: "Alle",
    registrationOpen: false,
    registrationDeadline: "2026-01-31T22:59:59.000Z",
    isFree: true,
    pendingReview: false,
    approved: true,
    publishedAt: "2025-11-15T10:00:00.000Z",
    createdAt: "2025-11-10T14:20:00.000Z",
    updatedAt: "2025-11-15T10:00:00.000Z",
  },
];

// Mock Posts - ERWEITERT MIT LANGEN INHALTEN UND BILDERN
export const mockPosts: Post[] = [
  {
    id: 1,
    title: "Neues Rheinisches Blechblatt erschienen",
    content: `
      <p>Liebe Bläserinnen und Bläser,</p>
      
      <p>wir freuen uns, die neue Ausgabe des Rheinischen Blechblatts präsentieren zu können! Diese Ausgabe ist prall gefüllt mit spannenden Berichten, inspirierenden Geschichten und wichtigen Informationen aus allen Bezirken unseres Posaunenwerks.</p>

      <h2>Highlights dieser Ausgabe</h2>

      <p>In der aktuellen Ausgabe erwarten Sie unter anderem folgende Themen:</p>

      <p><strong>Titelthema: 75 Jahre Landesposaunenchor</strong> - Eine bewegende Zeitreise durch die Geschichte des Landesposaunenchors mit vielen historischen Fotos und Anekdoten von Zeitzeugen. Wir blicken zurück auf unvergessliche Konzerte, prägende Persönlichkeiten und die musikalische Entwicklung über die Jahrzehnte.</p>

      <img src="/images/news-placeholder-1.jpg" alt="Historisches Foto vom ersten Landesposaunentag" class="rounded-lg shadow-lg my-6" />

      <p>Das Titelbild zeigt den allerersten Landesposaunentag im Jahr 1950 auf dem Düsseldorfer Burgplatz. Damals versammelten sich über 500 Bläserinnen und Bläser zu einem gemeinsamen Gottesdienst und Konzert.</p>

      <h3>Bezirksberichte</h3>

      <p>Aus <strong>Bezirk 3</strong> erreicht uns ein begeisternder Bericht über das erfolgreiche Jungbläserwochenende in Erkrath. Über 45 junge Musikerinnen und Musiker im Alter von 12 bis 18 Jahren probten gemeinsam an einem abwechslungsreichen Programm und gaben am Sonntagmorgen ein eindrucksvolles Abschlusskonzert.</p>

      <blockquote>
        <p>"Es war unglaublich zu erleben, wie schnell die jungen Menschen zu einem Ensemble zusammenwuchsen. Die Energie und Begeisterung war ansteckend!" - Bezirksposaunenwart Michael Hoffmann</p>
      </blockquote>

      <img src="/images/news-placeholder-2.jpg" alt="Jungbläser beim gemeinsamen Musizieren" class="rounded-lg shadow-lg my-6" />

      <p><strong>Bezirk 7</strong> berichtet über die erfolgreiche Einführung eines neuen Mentoringprogramms. Erfahrene Chorleiterinnen und Chorleiter begleiten nun Nachwuchskräfte bei ihren ersten Schritten in der Ensembleleitung. Das Programm stößt auf großes Interesse und wird voraussichtlich auch in anderen Bezirken eingeführt.</p>

      <h3>Aus- und Weiterbildung</h3>

      <p>Unser Bildungsreferent gibt einen ausführlichen Überblick über das Kursprogramm für das kommende Halbjahr. Besonders hervorzuheben sind:</p>

      <ul>
        <li>Der <strong>D-Kurs</strong> vom 20.-23. November in der Landesmusikakademie Wuppertal mit noch freien Plätzen</li>
        <li>Ein neuer <strong>Workshop für Anfänger</strong> "Erste Töne auf der Posaune" im Dezember</li>
        <li>Der beliebte <strong>Dirigierkurs für Fortgeschrittene</strong> im Mai mit hochkarätigen Dozenten</li>
      </ul>

      <h2>Literaturempfehlungen</h2>

      <p>Unsere Notenwarte stellen in dieser Ausgabe besonders gelungene Neuerscheinungen vor, die sich hervorragend für die Gemeindearbeit eignen. Darunter moderne Arrangements traditioneller Choräle sowie zeitgenössische Kompositionen für Blechbläserensemble.</p>

      <img src="/images/news-placeholder-3.jpg" alt="Auswahl neuer Notenliteratur" class="rounded-lg shadow-lg my-6" />

      <h3>Termine und Veranstaltungen</h3>

      <p>Der umfangreiche Terminkalender bietet einen Überblick über alle Konzerte, Gottesdienste und Veranstaltungen in den kommenden Monaten. Besonders hinweisen möchten wir auf:</p>

      <ul>
        <li>Das <strong>Adventskonzert des Landesposaunenchors</strong> am 14. Dezember in der Christuskirche Köln</li>
        <li>Das <strong>Frühjahrskonzert in Bezirk 5</strong> am 12. April</li>
        <li>Den großen <strong>Landesposaunentag 2026</strong> - Save the Date!</li>
      </ul>

      <h2>Gastbeitrag: Die Zukunft der Posaunenchorarbeit</h2>

      <p>In einem ausführlichen Gastbeitrag beschreibt Landesposaunenwart Johannes Müller seine Vision für die Zukunft der Posaunenchorarbeit. Er betont dabei besonders die Bedeutung der Nachwuchsarbeit und der digitalen Vernetzung:</p>

      <blockquote>
        <p>"Die Posaunenchorarbeit hat eine lange Tradition, aber sie muss sich auch weiterentwickeln. Wir müssen junge Menschen dort abholen, wo sie sind - und das ist zunehmend auch im digitalen Raum. Gleichzeitig dürfen wir unsere Wurzeln und Werte nicht vergessen."</p>
      </blockquote>

      <p>Der Artikel zeigt konkrete Wege auf, wie Chöre moderne Kommunikationsformen nutzen können, ohne dabei den persönlichen Kontakt und das gemeinsame Musizieren zu vernachlässigen.</p>

      <h2>Personalia</h2>

      <p>Wir gratulieren herzlich zur bestandenen <strong>C-Prüfung</strong> an: Lisa Hoffmann (Bezirk 2), Thomas Werner (Bezirk 5) und Marie Schmidt (Bezirk 8). Herzlichen Glückwunsch zu dieser beachtlichen Leistung!</p>

      <p>Verabschiedet wurde nach 15 Jahren ehrenamtlicher Tätigkeit <strong>Klaus-Dieter Bergmann</strong> als Bezirksposaunenwart von Bezirk 11. Wir danken ihm herzlich für seinen unermüdlichen Einsatz und wünschen ihm für die Zukunft alles Gute.</p>

      <h2>Ausblick</h2>

      <p>Die nächste Ausgabe des Rheinischen Blechblatts erscheint im Mai 2025 und wird einen Schwerpunkt auf das Thema "Musik und Ökologie" legen. Wir freuen uns über Beiträge und Leserbriefe!</p>

      <p>Das gedruckte Heft kann wie immer über unsere Website bestellt werden und liegt in allen Gemeindehäusern der beteiligten Kirchenkreise aus. Die digitale Version steht Mitgliedern im Login-Bereich zum Download bereit.</p>

      <p><em>Viel Freude beim Lesen wünscht<br>Die Redaktion des Rheinischen Blechblatts</em></p>
    `,
    excerpt:
      "Die neue Ausgabe des Rheinischen Blechblatts ist da! Mit spannenden Berichten aus den Bezirken, Jubiläumsbeitrag zum 75-jährigen Bestehen des Landesposaunenchors und vielem mehr.",
    category: "Magazin",
    districtInfo: { name: "All Districts" },
    author: mockUsers[1],
    coverImage: {
      id: 1,
      name: "blechblatt-cover.jpg",
      url: "/images/news-placeholder-1.jpg",
      alternativeText: "Cover Rheinisches Blechblatt",
    },
    pinned: true,
    pendingReview: false,
    approved: true,
    publishedAt: "2025-02-01T10:00:00.000Z",
    createdAt: "2025-01-28T14:20:00.000Z",
    updatedAt: "2025-02-01T10:00:00.000Z",
  },
  {
    id: 2,
    title: "Anmeldung zum Landesposaunenfest gestartet",
    content: `
      <p>Liebe Posaunenchor-Familien,</p>

      <p>es ist soweit: Die Anmeldung zum großen <strong>Landesposaunenfest 2026</strong> ist ab sofort möglich! Wir laden alle Posaunenchöre aus dem Rheinland herzlich ein, Teil dieses besonderen Ereignisses zu werden.</p>

      <h2>Ein Fest für alle</h2>

      <p>Das Landesposaunenfest findet vom <strong>12. bis 14. Juni 2026</strong> in Düsseldorf statt und steht unter dem Motto <em>"Gemeinsam klingen - Vielfalt feiern"</em>. Es wird ein buntes Programm aus Gottesdiensten, Konzerten, Workshops und gemeinschaftlichen Aktionen geben.</p>

      <img src="/images/news-placeholder-2.jpg" alt="Impression vom letzten Landesposaunenfest" class="rounded-lg shadow-lg my-6" />

      <h3>Programmhighlights</h3>

      <p><strong>Freitag, 12. Juni:</strong></p>
      <ul>
        <li>Anreise und Registrierung ab 14:00 Uhr</li>
        <li>Begrüßungskonzert des Landesposaunenchors um 19:00 Uhr in der Johanneskirche</li>
        <li>Geselliges Beisammensein und Kennenlernen</li>
      </ul>

      <p><strong>Samstag, 13. Juni:</strong></p>
      <ul>
        <li>Workshops für alle Altersgruppen und Niveaus</li>
        <li>Gemeinsame Probe für den Festgottesdienst</li>
        <li>Konzert der Bezirkschöre am Abend</li>
        <li>Konzertmeile in der Düsseldorfer Altstadt mit verschiedenen Ensembles</li>
      </ul>

      <p><strong>Sonntag, 14. Juni:</strong></p>
      <ul>
        <li>Großer Festgottesdienst auf dem Burgplatz mit allen Chören (über 1000 Bläser erwartet!)</li>
        <li>Abschlusskonzert mit Gastdirigenten</li>
      </ul>

      <h2>Anmeldung und Kosten</h2>

      <p>Die Anmeldung erfolgt chorweise über unser <strong>Online-Anmeldesystem</strong>. Jeder Chor meldet sich zentral an und gibt die Anzahl der teilnehmenden Bläserinnen und Bläser sowie eventuell benötigte Übernachtungen an.</p>

      <blockquote>
        <p>Frühbucher-Bonus: Chöre, die sich bis zum 31. März 2026 anmelden, erhalten 10% Rabatt auf die Teilnahmegebühr!</p>
      </blockquote>

      <h3>Teilnahmegebühren</h3>

      <p>Die Kosten pro Person betragen:</p>
      <ul>
        <li><strong>Tagesticket Samstag:</strong> 25 € (inkl. Verpflegung und Workshop-Materialien)</li>
        <li><strong>Tagesticket Sonntag:</strong> 15 € (inkl. Gottesdienst-Heft und Notenmaterial)</li>
        <li><strong>Komplettticket (Fr-So):</strong> 45 € (inkl. aller Veranstaltungen und Verpflegung)</li>
        <li><strong>Übernachtung:</strong> Auf Anfrage - verschiedene Optionen von Jugendherberge bis Hotel</li>
      </ul>

      <p>Für Kinder und Jugendliche bis 18 Jahre gelten ermäßigte Preise (50% Rabatt).</p>

      <img src="/images/news-placeholder-3.jpg" alt="Gemeinsames Musizieren beim Posaunenfest" class="rounded-lg shadow-lg my-6" />

      <h2>Besondere Aktionen</h2>

      <h3>Jungbläser-Programm</h3>
      <p>Erstmals gibt es ein spezielles Programm für Jungbläser: Eine eigene Workshop-Reihe, ein Jungbläser-Konzert am Samstagabend und ein Meet & Greet mit bekannten Profi-Blechbläsern. Anmeldung separat erforderlich, max. 100 Teilnehmer.</p>

      <h3>Instrumenten-Ausstellung</h3>
      <p>Renommierte Instrumentenbauer und Musikhäuser präsentieren ihre neuesten Instrumente. Hier können Bläserinnen und Bläser verschiedene Modelle ausprobieren und sich fachkundig beraten lassen. Auch Reparaturservice vor Ort!</p>

      <h3>Foto-Wettbewerb</h3>
      <p>Unter allen Teilnehmenden verlosen wir professionelle Chor-Fotoshootings. Einfach während des Fests die besten Momente festhalten und mit #Posaunenfest2026 in den sozialen Medien teilen.</p>

      <h2>Notenmaterial</h2>

      <p>Das Notenmaterial für den gemeinsamen Festgottesdienst wird allen angemeldeten Chören bis Ende März 2026 digital zur Verfügung gestellt. Es umfasst eine Mischung aus traditionellen Chorälen und modernen Arrangements.</p>

      <p>Für die Workshops können Teilnehmende bei der Anmeldung ihre Wünsche und Schwerpunkte angeben. Das Angebot reicht von "Basics für Einsteiger" über "Jazztechniken für Blechbläser" bis hin zu "Liturgische Bläsermusik im Gottesdienst".</p>

      <h2>Unterkünfte und Anreise</h2>

      <p>Düsseldorf ist verkehrstechnisch sehr gut erreichbar. Wir empfehlen die Anreise mit öffentlichen Verkehrsmitteln - das ist umweltfreundlich und es gibt ein spezielles Festticket für alle ÖPNV-Verbindungen in Düsseldorf für die gesamten drei Tage.</p>

      <p>Für Gruppen, die mit dem Bus anreisen, stehen kostenlose Parkplätze zur Verfügung. Details hierzu bei der Anmeldung.</p>

      <p>Eine Liste mit empfohlenen Unterkünften (Jugendherbergen, Hotels, Privatzimmer) findet sich auf unserer Website. Einige Hotels bieten Sonderkonditionen für Festteilnehmende.</p>

      <h2>Jetzt anmelden!</h2>

      <p>Wir freuen uns auf drei unvergessliche Tage mit euch! Die Anmeldung ist ab sofort unter <strong>www.posaunenwerk-rheinland.de/landesposaunenfest</strong> möglich.</p>

      <p>Bei Fragen steht das Organisationsteam gerne zur Verfügung:<br>
      📧 landesposaunenfest@pwr.de<br>
      📞 0211 / 123456-78</p>

      <p><em>Wir sehen uns in Düsseldorf!</em><br>
      Euer Organisationsteam</p>
    `,
    excerpt:
      "Ab sofort können sich Chöre für das große Landesposaunenfest im Juni 2026 in Düsseldorf anmelden. Drei Tage voller Musik, Gemeinschaft und Inspiration erwarten alle Teilnehmenden!",
    category: "Event",
    districtInfo: { name: "All Districts" },
    author: mockUsers[0],
    coverImage: {
      id: 2,
      name: "landesposaunenfest.jpg",
      url: "/images/news-placeholder-2.jpg",
      alternativeText: "Landesposaunenfest Banner",
    },
    pinned: false,
    pendingReview: false,
    approved: true,
    publishedAt: "2025-01-28T10:00:00.000Z",
    createdAt: "2025-01-25T09:45:00.000Z",
    updatedAt: "2025-01-28T10:00:00.000Z",
  },
  {
    id: 3,
    title: "Erfolgreicher D-Kurs in Wuppertal",
    content: `
      <p>Ein intensives und bereicherndes Wochenende liegt hinter den 25 Teilnehmenden des D-Kurses, der vom 25. bis 28. Januar in der Landesmusikakademie Wuppertal stattfand. Unter der Leitung erfahrener Dozenten absolvierten sie erfolgreich die erste Stufe der kirchenmusikalischen Ausbildung für Blechbläser.</p>

      <h2>Ein Wochenende voller Musik und Lernen</h2>

      <p>Der D-Kurs ist traditionell der Einstieg in die qualifizierte Posaunenchorarbeit. Von Donnerstagabend bis Sonntagmittag arbeiteten die Teilnehmenden intensiv an ihrer musikalischen und praktischen Ausbildung.</p>

      <img src="/images/news-placeholder-1.jpg" alt="Gruppenbild der D-Kurs Teilnehmenden" class="rounded-lg shadow-lg my-6" />

      <h3>Das Programm</h3>

      <p>Die vier Tage waren prall gefüllt mit verschiedenen Modulen:</p>

      <ul>
        <li><strong>Musiktheorie:</strong> Grundlagen der Harmonielehre, Rhythmik und Notenlesen</li>
        <li><strong>Gehörbildung:</strong> Intervalle erkennen, Melodien nachsingen</li>
        <li><strong>Instrumentaltechnik:</strong> Ansatzübungen, Atemtechnik, Tonbildung</li>
        <li><strong>Ensemblespiel:</strong> Mehrstimmiges Spielen, Intonation, Balance</li>
        <li><strong>Liturgik:</strong> Musik im Gottesdienst, Choralbegleitung</li>
        <li><strong>Chor-Literatur:</strong> Kennenlernen verschiedener Stilrichtungen</li>
      </ul>

      <p>Ein besonderer Schwerpunkt lag in diesem Kurs auf der praktischen Anwendung. Bereits am zweiten Tag probten die Teilnehmenden gemeinsam mit einem lokalen Jugendposaunenchor und konnten so das Gelernte direkt umsetzen.</p>

      <blockquote>
        <p>"Es war toll zu sehen, wie unterschiedlich die Teilnehmenden waren - vom 16-jährigen Schüler bis zur 65-jährigen Wiedereinsteigerin. Aber alle haben mit großer Begeisterung mitgemacht!" - Dozent Thomas Müller</p>
      </blockquote>

      <h2>Die Prüfung</h2>

      <p>Am Sonntagvormittag stand dann die Abschlussprüfung an. Diese bestand aus mehreren Teilen:</p>

      <ul>
        <li>Praktische Prüfung am Instrument (Vortrag von drei vorbereiteten Stücken)</li>
        <li>Blattsingen und Rhythmus-Klatschen</li>
        <li>Schriftliche Prüfung zu Musiktheorie und Liturgik</li>
        <li>Ensembleprüfung (gemeinsames Spiel in einer Kleingruppe)</li>
      </ul>

      <img src="/images/news-placeholder-3.jpg" alt="Praktische Prüfung am Instrument" class="rounded-lg shadow-lg my-6" />

      <p>Alle 25 Teilnehmenden haben die Prüfung erfolgreich bestanden! Ein besonderer Glückwunsch geht an Lisa Hoffmann aus Bezirk 2, die mit der Note "sehr gut" abschloss.</p>

      <h2>Stimmen der Teilnehmenden</h2>

      <p><strong>Markus (17), Posaune:</strong> "Ich hatte zuerst etwas Bammel vor der Prüfung, aber die Atmosphäre war so unterstützend. Man hat gemerkt, dass es den Dozenten wirklich wichtig ist, dass wir vorankommen. Das Ensemblespiel hat mir am meisten Spaß gemacht!"</p>

      <p><strong>Christine (42), Trompete:</strong> "Nach 15 Jahren Pause wieder zur Trompete zu greifen und dann direkt den D-Kurs zu machen, war eine Herausforderung. Aber es hat sich so gelohnt! Ich fühle mich jetzt viel sicherer und freue mich auf die Arbeit in unserem Gemeinde-Posaunenchor."</p>

      <p><strong>Jonas (19), Tenorhorn:</strong> "Die Musiktheorie fand ich anfangs ziemlich trocken, aber je mehr wir das praktisch angewendet haben, desto mehr hat es Sinn ergeben. Besonders die Improvisation am letzten Abend war mega!"</p>

      <h2>Ein Dank an die Dozenten</h2>

      <p>Der Kurs wurde geleitet von einem erfahrenen Team:</p>

      <ul>
        <li><strong>Thomas Müller</strong> (Musiktheorie und Gehörbildung)</li>
        <li><strong>Petra Schmidt</strong> (Instrumentaltechnik)</li>
        <li><strong>Johannes Weber</strong> (Ensembleleitung und Literatur)</li>
        <li><strong>Pfarrerin Dr. Anna Klein</strong> (Liturgik)</li>
      </ul>

      <p>Ihr Engagement, ihre Geduld und ihre Begeisterung für die Sache haben entscheidend zum Erfolg des Kurses beigetragen. Herzlichen Dank dafür!</p>

      <h2>Wie geht es weiter?</h2>

      <p>Mit dem D-Kurs haben die Absolventen die Grundlage für weiterführende Kurse gelegt. Viele kündigten bereits an, in ein bis zwei Jahren den C-Kurs anzustreben. Dieser baut auf dem D-Kurs auf und vertieft die Kenntnisse noch einmal deutlich.</p>

      <p>Aber auch ohne weitere Kurse steht den frischgebackenen D-Kurslern nun die volle Bandbreite der Posaunenchorarbeit offen. Sie können:</p>

      <ul>
        <li>Als Registerführer in ihren Heimatchören tätig werden</li>
        <li>Jungbläsergruppen betreuen</li>
        <li>Bei der musikalischen Gestaltung von Gottesdiensten mitwirken</li>
        <li>An Lehrgängen und Workshops teilnehmen</li>
      </ul>

      <h2>Der nächste D-Kurs</h2>

      <p>Der nächste D-Kurs findet vom <strong>20. bis 23. November 2025</strong> ebenfalls in der Landesmusikakademie Wuppertal statt. Anmeldungen sind ab sofort möglich.</p>

      <p>Voraussetzungen:</p>
      <ul>
        <li>Mindestalter 16 Jahre (Ausnahmen nach Rücksprache möglich)</li>
        <li>Grundkenntnisse auf einem Blechblasinstrument</li>
        <li>Motivation und Bereitschaft zum intensiven Lernen</li>
      </ul>

      <p>Die Kursgebühr beträgt 120 € für Erwachsene, 80 € für Jugendliche bis 18 und 60 € für Kinder bis 12 Jahre. Darin enthalten sind Unterkunft, Vollverpflegung, alle Unterrichtsmaterialien und die Prüfungsgebühr.</p>

      <p><em>Weitere Informationen und Anmeldung unter:<br>
      📧 bildung@posaunenwerk-rheinland.de<br>
      📞 0211 / 123456-70</em></p>

      <p>Wir gratulieren allen Absolventen herzlich und wünschen viel Freude beim Musizieren!</p>
    `,
    excerpt:
      "25 Teilnehmende absolvierten erfolgreich den ersten D-Kurs des Jahres in Wuppertal. Ein intensives Wochenende voller Musik, Lernen und Gemeinschaft.",
    category: "Ausbildung",
    districtInfo: { name: "All Districts" },
    author: mockUsers[0],
    coverImage: {
      id: 3,
      name: "d-kurs-gruppe.jpg",
      url: "/images/news-placeholder-3.jpg",
      alternativeText: "Teilnehmende des D-Kurses",
    },
    pinned: true,
    pendingReview: false,
    approved: true,
    publishedAt: "2025-01-22T15:00:00.000Z",
    createdAt: "2025-01-21T16:20:00.000Z",
    updatedAt: "2025-01-22T15:00:00.000Z",
  },
  {
    id: 4,
    title: "Neue Instrumente für Jungbläser in Bezirk 7",
    content: `
      <p>Große Freude bei den Jungbläsern in Bezirk 7: Dank einer großzügigen Spende konnten 12 neue Instrumente angeschafft werden, die nun jungen Menschen den Einstieg in die Posaunenchorarbeit ermöglichen.</p>

      <h2>Eine langersehnte Anschaffung</h2>

      <p>Bezirksposaunenwart Michael Schmidt erklärt: "Seit Jahren haben wir von diesem Moment geträumt. Unsere alten Leihinstrumente waren teilweise über 30 Jahre alt und oft reparaturbedürftig. Jetzt können wir interessierten Kindern und Jugendlichen hochwertige Instrumente zur Verfügung stellen."</p>

      <p>Die Spende in Höhe von 15.000 Euro kam vom örtlichen Rotary Club, der damit die musikalische Jugendarbeit in der Region unterstützen möchte.</p>

      <h2>Instrumentenpark erweitert</h2>

      <p>Angeschafft wurden:</p>
      <ul>
        <li>4 Trompeten</li>
        <li>3 Posaunen</li>
        <li>3 Tenorhörner</li>
        <li>2 Waldhörner</li>
      </ul>

      <p>Alle Instrumente sind speziell für Einsteiger konzipiert und wurden von einem renommierten Instrumentenbauer aus der Region bezogen.</p>

      <img src="/images/news-placeholder-2.jpg" alt="Die neuen Instrumente" class="rounded-lg shadow-lg my-6" />

      <h2>Ausblick</h2>

      <p>Die Instrumente können kostenlos ausgeliehen werden. Interessierte Kinder und Jugendliche ab 10 Jahren können sich beim Bezirksposaunenwart melden.</p>
    `,
    excerpt:
      "Bezirk 7 freut sich über 12 neue Leihinstrumente für die Jungbläserarbeit - ermöglicht durch eine Spende des Rotary Clubs.",
    category: "Bezirke",
    districtInfo: { name: "District 7" },
    pinned: false,
    pendingReview: false,
    approved: true,
    publishedAt: "2025-01-15T14:00:00.000Z",
    createdAt: "2025-01-14T10:30:00.000Z",
    updatedAt: "2025-01-15T14:00:00.000Z",
  },
];

export const mockDownloads: Download[] = [
  // Blechblätter
  {
    id: 1,
    title: "Rheinisches Blechblatt 2025/01",
    description:
      "Ausgabe Januar 2025 mit Artikeln zu Neujahrsblasen und Ausbildungsterminen",
    category: "blechblatt",
    fileType: "pdf",
    fileSize: "4.2 MB",
    downloadUrl: "/downloads/blechblatt-2025-01.pdf",
    uploadDate: "2025-01-15",
    tags: ["Blechblatt", "2025", "Magazin"],
  },
  {
    id: 2,
    title: "Rheinisches Blechblatt 2024/12",
    description: "Ausgabe Dezember 2024 - Weihnachtskonzerte und Rückblick",
    category: "blechblatt",
    fileType: "pdf",
    fileSize: "3.8 MB",
    downloadUrl: "/downloads/blechblatt-2024-12.pdf",
    uploadDate: "2024-12-10",
    tags: ["Blechblatt", "2024", "Weihnachten"],
  },
  {
    id: 3,
    title: "Rheinisches Blechblatt 2024/11",
    description: "Ausgabe November 2024",
    category: "blechblatt",
    fileType: "pdf",
    fileSize: "3.5 MB",
    downloadUrl: "/downloads/blechblatt-2024-11.pdf",
    uploadDate: "2024-11-12",
    tags: ["Blechblatt", "2024"],
  },

  // Noten
  {
    id: 4,
    title: "Choralbuch - Adventslieder",
    description:
      "Sammlung traditioneller und moderner Adventslieder für Posaunenchor",
    category: "noten",
    fileType: "pdf",
    fileSize: "2.1 MB",
    downloadUrl: "/downloads/noten-adventslieder.pdf",
    uploadDate: "2024-11-01",
    tags: ["Noten", "Advent", "Weihnachten"],
  },
  {
    id: 5,
    title: "Osterchoräle",
    description: "Noten für die Osterzeit",
    category: "noten",
    fileType: "pdf",
    fileSize: "1.8 MB",
    downloadUrl: "/downloads/noten-osterchoraele.pdf",
    uploadDate: "2024-03-15",
    tags: ["Noten", "Ostern"],
  },

  // Übungen
  {
    id: 6,
    title: "Atemübungen für Blechbläser",
    description: "Praktische Übungen zur Verbesserung der Atemtechnik",
    category: "uebungen",
    fileType: "pdf",
    fileSize: "850 KB",
    downloadUrl: "/downloads/atemuebungen.pdf",
    uploadDate: "2024-09-20",
    tags: ["Übungen", "Technik", "Ausbildung"],
  },
  {
    id: 7,
    title: "Tonleiterübungen - Alle Tonarten",
    description: "Systematische Tonleiterübungen für alle Blechblasinstrumente",
    category: "uebungen",
    fileType: "pdf",
    fileSize: "1.2 MB",
    downloadUrl: "/downloads/tonleitern.pdf",
    uploadDate: "2024-08-10",
    tags: ["Übungen", "Tonleitern", "Technik"],
  },
  {
    id: 8,
    title: "Ansatzübungen für Fortgeschrittene",
    description: "Übungen zur Verbesserung des Ansatzes",
    category: "uebungen",
    fileType: "pdf",
    fileSize: "950 KB",
    downloadUrl: "/downloads/ansatzuebungen.pdf",
    uploadDate: "2024-07-15",
    tags: ["Übungen", "Ansatz", "Fortgeschritten"],
  },

  // Formulare
  {
    id: 9,
    title: "Anmeldeformular D-Kurs",
    description: "Anmeldung für den D-Kurs 2025",
    category: "formulare",
    fileType: "pdf",
    fileSize: "320 KB",
    downloadUrl: "/downloads/anmeldung-d-kurs.pdf",
    uploadDate: "2024-10-05",
    tags: ["Formular", "D-Kurs", "Ausbildung"],
  },
  {
    id: 10,
    title: "Chorgründung - Checkliste",
    description:
      "Praktische Checkliste für die Gründung eines neuen Posaunenchors",
    category: "formulare",
    fileType: "pdf",
    fileSize: "280 KB",
    downloadUrl: "/downloads/checkliste-chorgruendung.pdf",
    uploadDate: "2024-09-01",
    tags: ["Checkliste", "Chorgründung"],
  },
  {
    id: 11,
    title: "Instrumentenverleih - Vertrag",
    description: "Mustervertrag für den Verleih von Instrumenten",
    category: "formulare",
    fileType: "docx",
    fileSize: "45 KB",
    downloadUrl: "/downloads/instrumentenverleih-vertrag.docx",
    uploadDate: "2024-06-20",
    tags: ["Formular", "Vertrag", "Instrumente"],
  },

  // Sonstiges
  {
    id: 12,
    title: "Jahresprogramm 2025",
    description: "Übersicht aller Termine und Veranstaltungen 2025",
    category: "sonstiges",
    fileType: "pdf",
    fileSize: "1.5 MB",
    downloadUrl: "/downloads/jahresprogramm-2025.pdf",
    uploadDate: "2024-12-01",
    tags: ["Jahresprogramm", "2025", "Termine"],
  },
  {
    id: 13,
    title: "Leitfaden Jugendarbeit",
    description: "Praktischer Leitfaden für die Arbeit mit Jungbläsern",
    category: "sonstiges",
    fileType: "pdf",
    fileSize: "2.8 MB",
    downloadUrl: "/downloads/leitfaden-jugendarbeit.pdf",
    uploadDate: "2024-05-10",
    tags: ["Jugendarbeit", "Jungbläser", "Leitfaden"],
  },
];

// Helper functions
export function getEventById(id: number): Event | undefined {
  return mockEvents.find((e) => e.id === id);
}

export function getCourseById(id: number): Course | undefined {
  return mockCourses.find((c) => c.id === id);
}

export function getPostById(id: number): Post | undefined {
  return mockPosts.find((p) => p.id === id);
}

export function getUpcomingEvents(limit?: number): Event[] {
  const now = new Date();
  const upcoming = mockEvents
    .filter((e) => new Date(e.eventDate) > now)
    .sort(
      (a, b) =>
        new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
    );

  return limit ? upcoming.slice(0, limit) : upcoming;
}

export function getUpcomingEventsByAuswahlchor(
  name: string,
  limit?: number
): Event[] {
  const now = new Date();
  const upcoming = mockEvents
    .filter(
      (e) =>
        new Date(e.eventDate) > now &&
        typeof e.performingEnsemble !== "string" &&
        e.performingEnsemble?.name === name
    )
    .sort(
      (a, b) =>
        new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
    );

  return limit ? upcoming.slice(0, limit) : upcoming;
}

export function getOpenCourses(limit?: number): Course[] {
  const courses = mockCourses
    .filter((c) => c.registrationOpen && !isCourseFull(c.id, c.maxParticipants))
    .sort(
      (a, b) =>
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );

  return limit ? courses.slice(0, limit) : courses;
}

export function getLatestPosts(limit?: number): Post[] {
  // Separate pinned and unpinned posts
  const pinned = mockPosts.filter((post) => post.pinned);
  const unpinned = mockPosts.filter((post) => !post.pinned);

  // Sort pinned posts by date (newest first)
  const sortedPinned = pinned.sort(
    (a, b) =>
      new Date(b.publishedAt || 0).getTime() -
      new Date(a.publishedAt || 0).getTime()
  );

  // Sort unpinned posts by date (newest first)
  const sortedUnpinned = unpinned.sort(
    (a, b) =>
      new Date(b.publishedAt || 0).getTime() -
      new Date(a.publishedAt || 0).getTime()
  );

  // Combine: pinned posts first, then unpinned
  const sorted = [...sortedPinned, ...sortedUnpinned];

  return limit ? sorted.slice(0, limit) : sorted;
}

// Helper function: Berechne aktuelle Teilnehmerzahl für einen Kurs
export function getCurrentParticipants(courseId: number): number {
  return mockCourseRegistrations
    .filter(
      (reg) =>
        reg.courseId === courseId && reg.registrationStatus === "confirmed"
    )
    .reduce((sum, reg) => sum + reg.participants.length, 0);
}

// Helper function: Berechne verfügbare Plätze
export function getSpotsAvailable(
  courseId: number,
  maxParticipants?: number
): number {
  if (maxParticipants === undefined) {
    const course = getCourseById(courseId);
    if (!course || course.maxParticipants === undefined) {
      return 0; // Unbegrenzt oder Kurs nicht gefunden
    }
    maxParticipants = course.maxParticipants;
  }

  const current = getCurrentParticipants(courseId);
  return Math.max(0, maxParticipants - current);
}

// Helper function: Prüfe ob Kurs voll ist
export function isCourseFull(
  courseId: number,
  maxParticipants?: number
): boolean {
  return getSpotsAvailable(courseId, maxParticipants) === 0;
}

// Helper function: Hole alle Registrierungen für einen Kurs
export function getRegistrationsForCourse(
  courseId: number
): CourseRegistration[] {
  return mockCourseRegistrations.filter((reg) => reg.courseId === courseId);
}
