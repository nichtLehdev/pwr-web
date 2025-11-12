import type { Event, Post, Course, Ensemble } from "@/types/strapi";

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
    currentParticipants: 18,
    spotsAvailable: 12,
    isFull: false,
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
    currentParticipants: 7,
    spotsAvailable: 5,
    isFull: false,
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
    currentParticipants: 8,
    spotsAvailable: 7,
    isFull: false,
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
    currentParticipants: 12,
    spotsAvailable: 13,
    isFull: false,
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
    currentParticipants: 28,
    spotsAvailable: 12,
    isFull: false,
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
    currentParticipants: 15,
    spotsAvailable: 5,
    isFull: false,
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
    startDate: "2025-11-22T09:00:00.000Z",
    endDate: "2025-11-26T18:00:00.000Z",
    location: {
      venue: "Musikakademie",
      city: "Wuppertal",
    },
    districtInfo: { name: "All Districts" },
    courseType: "Training",
    targetAudience: "Conductors",
    registrationOpen: true,
    registrationDeadline: "2025-11-01T23:59:59.000Z",
    maxParticipants: 12,
    currentParticipants: 9,
    spotsAvailable: 3,
    isFull: false,
    allowWaitingList: true,
    priceOptions: [{ price: 280, label: "Vollpension und Unterkunft" }],
    isFree: false,
    customFields: [],
    pendingReview: false,
    approved: true,
    publishedAt: "2025-02-08T10:00:00.000Z",
    createdAt: "2025-02-05T11:30:00.000Z",
    updatedAt: "2025-02-08T10:00:00.000Z",
  },
];

// Mock Posts
export const mockPosts: Post[] = [
  {
    id: 1,
    title: "Neues Rheinisches Blechblatt erschienen",
    content: "<p>Die neue Ausgabe des Rheinischen Blechblatts ist da!</p>",
    excerpt:
      "Die neue Ausgabe des Rheinischen Blechblatts ist da! Mit spannenden Berichten aus den Bezirken.",
    category: "Magazine",
    districtInfo: { name: "All Districts" },
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
    content: "<p>Ab sofort können sich Chöre anmelden!</p>",
    excerpt:
      "Ab sofort können sich Chöre für das große Landesposaunenfest im Juni anmelden.",
    category: "Event",
    districtInfo: { name: "All Districts" },
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
    content: "<p>25 Teilnehmende absolvierten erfolgreich den D-Kurs.</p>",
    excerpt:
      "25 Teilnehmende absolvierten erfolgreich den ersten D-Kurs des Jahres.",
    category: "Education",
    districtInfo: { name: "All Districts" },
    pinned: false,
    pendingReview: false,
    approved: true,
    publishedAt: "2025-01-22T15:00:00.000Z",
    createdAt: "2025-01-21T16:20:00.000Z",
    updatedAt: "2025-01-22T15:00:00.000Z",
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
  const courses = mockCourses.filter((c) => c.registrationOpen && !c.isFull);

  return limit ? courses.slice(0, limit) : courses;
}

export function getLatestPosts(limit?: number): Post[] {
  const sorted = [...mockPosts].sort(
    (a, b) =>
      new Date(b.publishedAt || 0).getTime() -
      new Date(a.publishedAt || 0).getTime()
  );

  return limit ? sorted.slice(0, limit) : sorted;
}
