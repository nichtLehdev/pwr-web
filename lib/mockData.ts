import type {
  Event,
  Post,
  Course,
  Ensemble,
  User,
  CourseRegistration,
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
    username: "sweber",
    email: "s.weber@posaunenwerk-rheinland.de",
    displayName: "Sarah Weber",
    roleType: "Editor",
    district: "All Districts",
    bio: "Redakteurin für das Rheinische Blechblatt",
  },
];

// Mock Ensembles
export const mockEnsembles: Ensemble[] = [
  {
    id: 1,
    name: "Landesposaunenchor Rheinland",
    districtInfo: { name: "All Districts" },
    description:
      "Der Landesposaunenchor vereint die besten Bläserinnen und Bläser aus allen Bezirken.",
    isActive: true,
  },
  {
    id: 2,
    name: "Bezirksposaunenchor 2",
    districtInfo: { name: "District 2" },
    description: "Unser Bezirkschor probt jeden Montag um 19:30 Uhr.",
    isActive: true,
  },
  {
    id: 3,
    name: "Jugendposaunenchor Düsseldorf",
    districtInfo: { name: "District 3" },
    description: "Für junge Bläser von 12-25 Jahren.",
    isActive: true,
  },
];

// Mock Events
export const mockEvents: Event[] = [
  {
    id: 1,
    title: "Sommerkonzert 2025",
    description: "Ein buntes Programm aus klassischen und modernen Stücken.",
    motto: "Klangfarben des Sommers",
    eventDate: "2025-11-25T18:00:00.000Z",
    location: {
      venue: "Erlöserkirche",
      street: "Hauptstraße 123",
      zipCode: "40210",
      city: "Düsseldorf",
    },
    districtInfo: { name: "All Districts" },
    category: "Concert",
    performingEnsemble: mockEnsembles[0],
    isFree: false,
    priceOptions: [
      { price: 12, label: "Erwachsene" },
      { price: 8, label: "Ermäßigt" },
      { price: 0, label: "Kinder bis 12 Jahre" },
    ],
    pendingReview: false,
    approved: true,
    publishedAt: "2025-01-15T10:00:00.000Z",
    createdAt: "2025-01-10T14:20:00.000Z",
    updatedAt: "2025-01-15T10:00:00.000Z",
  },
  {
    id: 2,
    title: "Frühjahrskonzert Bezirk 5",
    description: "Traditionelles Frühjahrskonzert.",
    eventDate: "2025-04-12T19:00:00.000Z",
    location: {
      venue: "Gemeindehaus Bonn-Beuel",
      city: "Bonn",
    },
    districtInfo: { name: "District 5" },
    category: "Concert",
    performingEnsemble: mockEnsembles[1],
    isFree: true,
    pendingReview: false,
    approved: true,
    publishedAt: "2025-01-20T10:00:00.000Z",
    createdAt: "2025-01-18T09:15:00.000Z",
    updatedAt: "2025-01-20T10:00:00.000Z",
  },
  {
    id: 3,
    title: "Gottesdienst zur Passion",
    eventDate: "2025-04-06T10:00:00.000Z",
    location: { venue: "Johanneskirche", city: "Düsseldorf" },
    districtInfo: { name: "District 2" },
    category: "Service",
    isFree: true,
    pendingReview: false,
    approved: true,
    publishedAt: "2025-01-25T10:00:00.000Z",
    createdAt: "2025-01-22T16:30:00.000Z",
    updatedAt: "2025-01-25T10:00:00.000Z",
  },
  {
    id: 4,
    title: "Adventskonzert",
    eventDate: "2025-12-14T17:00:00.000Z",
    location: { venue: "Christuskirche", city: "Köln" },
    districtInfo: { name: "District 1" },
    category: "Concert",
    isFree: false,
    priceOptions: [{ price: 10, label: "Einheitspreis" }],
    pendingReview: false,
    approved: true,
    publishedAt: "2025-01-15T10:00:00.000Z",
    createdAt: "2025-01-10T14:20:00.000Z",
    updatedAt: "2025-01-15T10:00:00.000Z",
  },
  {
    id: 5,
    title: "Offene Probe Jugendchor",
    eventDate: "2025-11-18T19:30:00.000Z",
    location: { venue: "Gemeindezentrum", city: "Düsseldorf" },
    districtInfo: { name: "District 3" },
    category: "Rehearsal",
    isFree: true,
    pendingReview: false,
    approved: true,
    publishedAt: "2025-02-01T10:00:00.000Z",
    createdAt: "2025-01-28T14:20:00.000Z",
    updatedAt: "2025-02-01T10:00:00.000Z",
  },
  {
    id: 6,
    title: "Himmelfahrtsgottesdienst",
    eventDate: "2025-05-29T10:00:00.000Z",
    location: { venue: "Marktplatz", city: "Wuppertal" },
    districtInfo: { name: "District 6" },
    category: "Service",
    isFree: true,
    pendingReview: false,
    approved: true,
    publishedAt: "2025-02-05T10:00:00.000Z",
    createdAt: "2025-02-01T14:20:00.000Z",
    updatedAt: "2025-02-05T10:00:00.000Z",
  },
  {
    id: 7,
    title: "Weihnachtskonzert",
    eventDate: "2025-12-20T18:00:00.000Z",
    location: { venue: "Stadtkirche", city: "Solingen" },
    districtInfo: { name: "District 7" },
    category: "Concert",
    isFree: false,
    priceOptions: [
      { price: 15, label: "Erwachsene" },
      { price: 8, label: "Ermäßigt" },
    ],
    pendingReview: false,
    approved: true,
    publishedAt: "2025-02-01T10:00:00.000Z",
    createdAt: "2025-01-28T14:20:00.000Z",
    updatedAt: "2025-02-01T10:00:00.000Z",
  },
  {
    id: 8,
    title: "Osterkonzert",
    eventDate: "2025-04-20T17:00:00.000Z",
    location: { venue: "Friedenskirche", city: "Mönchengladbach" },
    districtInfo: { name: "District 8" },
    category: "Concert",
    isFree: true,
    pendingReview: false,
    approved: true,
    publishedAt: "2025-02-05T10:00:00.000Z",
    createdAt: "2025-02-01T14:20:00.000Z",
    updatedAt: "2025-02-05T10:00:00.000Z",
  },
];

// Mock Course Registrations
export const mockCourseRegistrations: CourseRegistration[] = [
  // Registrations für D-Kurs (courseId: 1)
  {
    id: 1,
    courseId: 1,
    registeredBy: {
      firstName: "Michael",
      lastName: "Schmidt",
      email: "m.schmidt@example.com",
      phone: "0211 123456",
      choir: "Posaunenchor Düsseldorf",
      district: "District 3",
    },
    participants: [
      {
        firstName: "Lisa",
        lastName: "Müller",
        birthDate: "2005-03-15",
        city: "Düsseldorf",
        instrument: "Trompete",
        priceOption: "Jugendliche (bis 18)",
        customFields: {
          tshirtSize: "M",
        },
      },
      {
        firstName: "Tom",
        lastName: "Weber",
        birthDate: "2006-07-22",
        city: "Düsseldorf",
        instrument: "Posaune",
        priceOption: "Jugendliche (bis 18)",
        customFields: {
          tshirtSize: "L",
        },
      },
      {
        firstName: "Anna",
        lastName: "Klein",
        birthDate: "2004-11-30",
        city: "Düsseldorf",
        instrument: "Tenorhorn",
        priceOption: "Jugendliche (bis 18)",
        customFields: {
          tshirtSize: "S",
        },
      },
    ],
    totalPrice: 240, // 3 x 80€
    paymentStatus: "pending",
    registrationStatus: "confirmed",
    createdAt: "2025-10-15T14:30:00.000Z",
    updatedAt: "2025-10-15T14:30:00.000Z",
    invoiceGenerated: false,
  },
  {
    id: 2,
    courseId: 1,
    registeredBy: {
      firstName: "Sarah",
      lastName: "Wagner",
      email: "sarah.wagner@example.com",
      phone: "0202 987654",
      choir: "Jugendposaunenchor Wuppertal",
      district: "District 4",
    },
    participants: [
      {
        firstName: "Max",
        lastName: "Hoffmann",
        birthDate: "1998-05-10",
        city: "Wuppertal",
        instrument: "Trompete",
        priceOption: "Erwachsene",
        customFields: {
          tshirtSize: "XL",
        },
      },
      {
        firstName: "Julia",
        lastName: "Bergmann",
        birthDate: "1995-09-18",
        city: "Wuppertal",
        instrument: "Horn",
        priceOption: "Erwachsene",
        customFields: {
          tshirtSize: "M",
        },
      },
    ],
    totalPrice: 240, // 2 x 120€
    paymentStatus: "paid",
    registrationStatus: "confirmed",
    createdAt: "2025-10-10T09:15:00.000Z",
    updatedAt: "2025-10-12T16:45:00.000Z",
    notes: "Überweisung bereits eingegangen",
    invoiceGenerated: true,
    invoiceId: 1001,
    invoiceDate: "2025-10-12T16:45:00.000Z",
  },
  {
    id: 3,
    courseId: 1,
    registeredBy: {
      firstName: "Thomas",
      lastName: "Becker",
      email: "t.becker@example.com",
      phone: "0221 456789",
      choir: "Bezirksposaunenchor Köln",
      district: "District 1",
    },
    participants: [
      {
        firstName: "Emma",
        lastName: "Fischer",
        birthDate: "2008-02-14",
        city: "Köln",
        instrument: "Posaune",
        priceOption: "Kinder (bis 12)",
        customFields: {
          tshirtSize: "S",
        },
      },
    ],
    totalPrice: 60,
    paymentStatus: "pending",
    registrationStatus: "confirmed",
    createdAt: "2025-10-20T11:20:00.000Z",
    updatedAt: "2025-10-20T11:20:00.000Z",
    invoiceGenerated: false,
  },

  // Registrations für Einsteiger-Workshop (courseId: 2)
  {
    id: 4,
    courseId: 2,
    registeredBy: {
      firstName: "Peter",
      lastName: "Meyer",
      email: "p.meyer@example.com",
      phone: "0211 789456",
      choir: "Posaunenchor Erkrath",
      district: "District 3",
    },
    participants: [
      {
        firstName: "Sophie",
        lastName: "Schneider",
        birthDate: "2010-06-25",
        city: "Erkrath",
        instrument: "Posaune (Anfänger)",
        priceOption: "Kinder und Jugendliche",
      },
      {
        firstName: "Lukas",
        lastName: "Richter",
        birthDate: "2011-08-12",
        city: "Erkrath",
        instrument: "Posaune (Anfänger)",
        priceOption: "Kinder und Jugendliche",
      },
    ],
    totalPrice: 30, // 2 x 15€
    paymentStatus: "pending",
    registrationStatus: "confirmed",
    createdAt: "2025-11-01T10:00:00.000Z",
    updatedAt: "2025-11-01T10:00:00.000Z",
    invoiceGenerated: false,
  },
];

// Mock Courses
export const mockCourses: Course[] = [
  {
    id: 1,
    title: "D-Kurs Blechblasinstrumente",
    description:
      "<p>Der D-Kurs ist die erste Stufe der kirchenmusikalischen Ausbildung für Blechbläser.</p>",
    motto: "Dein Einstieg in die Posaunenchorarbeit",
    startDate: "2025-11-20T14:00:00.000Z",
    endDate: "2025-11-23T12:00:00.000Z",
    location: {
      venue: "Landesmusikakademie",
      city: "Wuppertal",
    },
    districtInfo: { name: "All Districts" },
    courseType: "D-Course",
    targetAudience: "Beginners",
    registrationOpen: true,
    registrationDeadline: "2025-11-01T23:59:59.000Z",
    maxParticipants: 30,
    allowWaitingList: true,
    priceOptions: [
      { price: 120, label: "Erwachsene" },
      { price: 80, label: "Jugendliche (bis 18)" },
      { price: 60, label: "Kinder (bis 12)" },
    ],
    isFree: false,
    customFields: [
      {
        fieldName: "T-Shirt Größe",
        fieldType: "Select",
        options: "XS,S,M,L,XL,XXL",
        isRequired: true,
        helpText: "Bitte Größe für Kurs-T-Shirt angeben",
      },
    ],
    prerequisites: "Grundkenntnisse auf dem Instrument erforderlich.",
    whatToBring: "Eigenes Instrument, Notenständer, Schreibzeug",
    pendingReview: false,
    approved: true,
    publishedAt: "2025-01-10T10:00:00.000Z",
    createdAt: "2025-01-05T14:20:00.000Z",
    updatedAt: "2025-01-10T10:00:00.000Z",
  },
  {
    id: 2,
    title: "Einsteiger-Workshop: Erste Töne auf der Posaune",
    description: "<p>Du wolltest schon immer mal Posaune ausprobieren?</p>",
    startDate: "2025-11-22T10:00:00.000Z",
    endDate: "2025-11-22T16:00:00.000Z",
    location: {
      venue: "Gemeindehaus Erkrath",
      city: "Erkrath",
    },
    districtInfo: { name: "District 3" },
    courseType: "Workshop",
    targetAudience: "Beginners",
    registrationOpen: true,
    registrationDeadline: "2025-11-15T23:59:59.000Z",
    maxParticipants: 12,
    allowWaitingList: false,
    priceOptions: [
      { price: 25, label: "Erwachsene" },
      { price: 15, label: "Kinder und Jugendliche" },
    ],
    isFree: false,
    customFields: [],
    pendingReview: false,
    approved: true,
    publishedAt: "2025-01-12T10:00:00.000Z",
    createdAt: "2025-01-08T11:30:00.000Z",
    updatedAt: "2025-01-12T10:00:00.000Z",
  },
  {
    id: 3,
    title: "Dirigierkurs für Fortgeschrittene",
    description: "<p>Vertiefung der Schlagtechnik und Ensembleleitung.</p>",
    startDate: "2025-05-16T14:00:00.000Z",
    endDate: "2025-05-18T12:00:00.000Z",
    location: {
      venue: "Musikakademie",
      city: "Solingen",
    },
    districtInfo: { name: "District 4" },
    courseType: "Training",
    targetAudience: "Advanced",
    registrationOpen: true,
    registrationDeadline: "2025-05-01T23:59:59.000Z",
    maxParticipants: 15,
    allowWaitingList: true,
    priceOptions: [{ price: 90, label: "Teilnahmegebühr" }],
    isFree: false,
    customFields: [],
    pendingReview: false,
    approved: true,
    publishedAt: "2025-01-20T10:00:00.000Z",
    createdAt: "2025-01-15T11:30:00.000Z",
    updatedAt: "2025-01-20T10:00:00.000Z",
  },
  {
    id: 4,
    title: "C-Kurs Kirchenmusik",
    description: "<p>Aufbaukurs für erfahrene Bläser.</p>",
    startDate: "2025-06-12T14:00:00.000Z",
    endDate: "2025-06-15T12:00:00.000Z",
    location: {
      venue: "Landesmusikakademie",
      city: "Wuppertal",
    },
    districtInfo: { name: "All Districts" },
    courseType: "C-Course",
    targetAudience: "Advanced",
    registrationOpen: true,
    registrationDeadline: "2025-05-30T23:59:59.000Z",
    maxParticipants: 25,
    allowWaitingList: true,
    priceOptions: [
      { price: 150, label: "Erwachsene" },
      { price: 100, label: "Jugendliche" },
    ],
    isFree: false,
    customFields: [],
    pendingReview: false,
    approved: true,
    publishedAt: "2025-02-01T10:00:00.000Z",
    createdAt: "2025-01-25T11:30:00.000Z",
    updatedAt: "2025-02-01T10:00:00.000Z",
  },
  {
    id: 5,
    title: "Bläserwochenende Bezirk 3",
    description: "<p>Intensives Probenwochenende.</p>",
    startDate: "2025-11-21T18:00:00.000Z",
    endDate: "2025-11-23T14:00:00.000Z",
    location: {
      venue: "Jugendherberge",
      city: "Erkrath",
    },
    districtInfo: { name: "District 3" },
    courseType: "Workshop",
    targetAudience: "All",
    registrationOpen: true,
    registrationDeadline: "2025-11-10T23:59:59.000Z",
    maxParticipants: 40,
    allowWaitingList: true,
    priceOptions: [
      { price: 45, label: "Teilnahme mit Übernachtung" },
      { price: 25, label: "Ohne Übernachtung" },
    ],
    isFree: false,
    customFields: [],
    pendingReview: false,
    approved: true,
    publishedAt: "2025-02-05T10:00:00.000Z",
    createdAt: "2025-02-01T11:30:00.000Z",
    updatedAt: "2025-02-05T10:00:00.000Z",
  },
  {
    id: 6,
    title: "Jungbläserschulung",
    description: "<p>Spezialkurs für junge Bläser.</p>",
    startDate: "2025-11-20T14:00:00.000Z",
    endDate: "2025-11-22T16:00:00.000Z",
    location: {
      venue: "Gemeindezentrum",
      city: "Düsseldorf",
    },
    districtInfo: { name: "District 2" },
    courseType: "Training",
    targetAudience: "Youth",
    registrationOpen: true,
    registrationDeadline: "2025-11-10T23:59:59.000Z",
    maxParticipants: 20,
    allowWaitingList: false,
    priceOptions: [{ price: 35, label: "Jugendliche" }],
    isFree: false,
    customFields: [],
    pendingReview: false,
    approved: true,
    publishedAt: "2025-02-06T10:00:00.000Z",
    createdAt: "2025-02-03T11:30:00.000Z",
    updatedAt: "2025-02-06T10:00:00.000Z",
  },
  {
    id: 7,
    title: "Intensivwoche Dirigieren",
    description: "<p>5-tägiger Intensivkurs für Chorleiter.</p>",
    startDate: "2025-12-22T09:00:00.000Z",
    endDate: "2025-12-26T18:00:00.000Z",
    location: {
      venue: "Musikakademie",
      city: "Wuppertal",
    },
    districtInfo: { name: "All Districts" },
    courseType: "Training",
    targetAudience: "Conductors",
    registrationOpen: true,
    registrationDeadline: "2025-12-01T23:59:59.000Z",
    maxParticipants: 12,
    allowWaitingList: true,
    priceOptions: [{ price: 280, label: "Vollpension und Unterkunft" }],
    isFree: false,
    customFields: [
      {
        fieldName: "Stempel",
        fieldType: "Number",
        isRequired: false,
        helpText: "Wie viele Stempel hat der Teilnehmer bereits?",
      },
    ],
    pendingReview: false,
    approved: true,
    publishedAt: "2025-02-08T10:00:00.000Z",
    createdAt: "2025-02-05T11:30:00.000Z",
    updatedAt: "2025-02-08T10:00:00.000Z",
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
    category: "Magazine",
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
    category: "Education",
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
    category: "Districts",
    districtInfo: { name: "District 7" },
    pinned: false,
    pendingReview: false,
    approved: true,
    publishedAt: "2025-01-15T14:00:00.000Z",
    createdAt: "2025-01-14T10:30:00.000Z",
    updatedAt: "2025-01-15T14:00:00.000Z",
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
