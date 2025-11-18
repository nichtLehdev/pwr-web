import { HistoryEvent, PosaunenratMember } from "@/types/general";

export const bezirke = [
  {
    id: 1,
    name: "Bezirk 01 - Unterer Niederrhein",
    shortName: "Unterer Niederrhein",
    obleute: [
      {
        name: "Doris Hätzel",
        title: "Bezirksobfrau",
        address: "Bruchstr. 29, 47447 Moers",
        phone: "02841 65 474",
        mobile: "",
        email: "doris.haetzel@posaunenwerk-rheinland.de",
        image: "/images/bezirke/haetzel.jpg",
      },
    ],
    color: "bg-district-1",
  },
  {
    id: 2,
    name: "Bezirk 02 - Rhein-Lippe",
    shortName: "Rhein-Lippe",
    obleute: [
      {
        name: "Tim Neuhaus",
        title: "Bezirksobmann",
        address: "Ursulastraße 22, 46537 Dinslaken",
        phone: "",
        mobile: "0176 72213949",
        email: "tim.neuhaus@ekir.de",
        image: "/images/bezirke/neuhaus.png",
      },
    ],
    color: "bg-district-2",
  },
  {
    id: 3,
    name: "Bezirk 03 - Essen-Mülheim",
    shortName: "Essen-Mülheim",
    obleute: [
      {
        name: "Dietmar Schruck",
        title: "Bezirksobmann",
        address: "Brausewindhang 90, 45359 Essen",
        phone: "0201-687744",
        mobile: "",
        email: "dietmar.schruck@posaunenwerk-rheinland.de",
        image: "/images/bezirke/schruck.jpeg",
      },
    ],
    color: "bg-district-3",
  },
  {
    id: 4,
    name: "Bezirk 04 - Düsseldorf-Krefeld-Niederberg",
    shortName: "Düsseldorf-Krefeld-Niederberg",
    obleute: [
      {
        name: "Jörg Schröder",
        title: "Bezirksobmann",
        address: "Am Rethert 23, 40599 Düsseldorf",
        phone: "0211 74 7097",
        mobile: "0171 62 02 911",
        email: "joerg.schroeder@posaunenwerk-rheinland.de",
        image: "/images/bezirke/schroeder.jpg",
      },
    ],
    color: "bg-district-4",
  },
  {
    id: 5,
    name: "Bezirk 05 - Bergisches Land",
    shortName: "Bergisches Land",
    obleute: [
      {
        name: "Dr. Martin Weidner",
        title: "Bezirksobmann",
        address: "Im Weidfeld 2, 42929 Wermelskirchen",
        phone: "02196 97 29 66",
        mobile: "0177 74 55 338",
        email: "martin.weidner@posaunenwerk-rheinland.de",
        image: "/images/bezirke/weidner.jpg",
      },
    ],
    color: "bg-district-5",
  },
  {
    id: 6,
    name: "Bezirk 06 - Köln",
    shortName: "Köln",
    obleute: [
      {
        name: "Dr. Gerhard Heywang",
        title: "Bezirksobmann",
        address: "Nittumer Weg 4, 51467 Bergisch-Gladbach",
        phone: "02202 82 459",
        mobile: "",
        email: "gerhard.heywang@posaunenwerk-rheinland.de",
        image: "/images/bezirke/heywang.jpg",
      },
    ],
    color: "bg-district-6",
  },
  {
    id: 7,
    name: "Bezirk 07 - Aachen-Jülich",
    shortName: "Aachen-Jülich",
    obleute: [
      {
        name: "Birgit Engelmann",
        title: "Bezirksobfrau",
        address: "Ottmannskamp 5, 41836 Hückelhoven",
        phone: "02433 938049",
        mobile: "",
        email: "birgit.engel@posaunenwerk-rheinland.de",
        image: "/images/bezirke/engelmann.jpg",
      },
    ],
    color: "bg-district-7",
  },
  {
    id: 8,
    name: "Bezirk 08 - Bonn",
    shortName: "Bonn",
    obleute: [
      {
        name: "Dr. Michael Geffert",
        title: "Bezirksobmann",
        address: "Siefenfeldchen 104, 53332 Bornheim",
        phone: "02222 41 20",
        mobile: "",
        email: "michael.geffert@posaunenwerk-rheinland.de",
        image: "/images/bezirke/geffert.jpg",
      },
    ],
    color: "bg-district-8",
  },
  {
    id: 9,
    name: "Bezirk 09 - Oberbergisches Land",
    shortName: "Oberbergisches Land",
    obleute: [
      {
        name: "Beate Ising",
        title: "Bezirksobfrau",
        address: "Rehwinkel 11, 51580 Reichshof-Odenspiel",
        phone: "02297 72 21",
        mobile: "",
        email: "Beate.ising@posaunenwerk-rheinland.de",
        image: "/images/bezirke/ising.jpg",
      },
    ],
    color: "bg-district-9",
  },
  {
    id: 10,
    name: "Bezirk 10 - Wied",
    shortName: "Wied",
    obleute: [
      {
        name: "Klaus Groth",
        title: "Bezirksobmann",
        address: "Dorfstr. 31, 57614 Steimel",
        phone: "02689 97 20 10",
        mobile: "0171 61 80 855",
        email: "Klaus.Groth@ekir.de",
        image: "/images/bezirke/groth.jpg",
      },
    ],
    color: "bg-district-10",
  },
  {
    id: 11,
    name: "Bezirk 11 - An Nahe und Glan",
    shortName: "An Nahe und Glan",
    obleute: [
      {
        name: "Jochen Conrad",
        title: "Bezirksobmann",
        address: "Kleinweidelbach 4, 55494 Rheinböllen",
        phone: "06764 30 17 24",
        mobile: "",
        email: "jochen.conrad@posaunenwerk-rheinland.de",
        image: "/images/bezirke/conrad.jpg",
      },
    ],
    color: "bg-district-11",
  },
  {
    id: 12,
    name: "Bezirk 12 - Saarland",
    shortName: "Saarland",
    obleute: [
      {
        name: "Andrea Lehmann",
        title: "Bezirksobfrau",
        address: "Ortsstraße 41a, 66424 Homburg",
        phone: "06841 63 09 22",
        mobile: "",
        email: "andrea.lehmann@posaunenwerk-rheinland.de",
        image: "/images/bezirke/lehmann.jpg",
      },
    ],
    color: "bg-district-12",
  },
  {
    id: 13,
    name: "Bezirk 13 - An Sieg und Rhein",
    shortName: "An Sieg und Rhein",
    obleute: [
      {
        name: "Dr. Ursula Doering",
        title: "Bezirksobfrau",
        address: "Ernst-Moritz-Arndt-Str. 12, 53757 Sankt Augustin",
        phone: "02241 - 21629",
        mobile: "",
        email: "ursula.doering@posaunenwerk-rheinland.de",
        image: "/images/bezirke/doering.jpg",
      },
      {
        name: "Klaudia van Allen",
        title: "Bezirksobfrau",
        email: "klaudia.van.allen@posaunenwerk-rheinland.de",
        mobile: "",
        phone: "",
        image: "/images/bezirke/van-allen.jpg",
      },
      {
        name: "Christine Häusler",
        title: "Bezirksobfrau",
        email: "christine.haeusler@ekir.de",
        mobile: "",
        phone: "",
        image: "/images/bezirke/haeusler.jpg",
      },
    ],
    color: "bg-district-13",
  },
];

export const vorstandMembers = [
  {
    name: "Friedemann Schmidt-Eggert",
    position: "Landesobmann",
    description:
      "Der Landesobmann vertritt das Posaunenwerk nach außen und innen und leitet den Vorstand. Er koordiniert die Arbeit und ist Ansprechpartner für überregionale Themen.",
    email: "landesobmann@posaunenwerk-rheinland.de",
    phone: "02644-9990785",
    image: "/images/vorstand/schmidt-eggert.jpg",
    color: "bg-primary",
  },
  {
    name: "Beate Ising",
    position: "Stellvertretende Landesobfrau",
    description:
      "Unterstützt den Landesobmann in allen Belangen und vertritt ihn bei Bedarf. Koordiniert spezielle Projekte und Arbeitskreise.",
    email: "stellv.landesobfrau@posaunenwerk-rheinland.de",
    phone: "02297-7221",
    image: "/images/vorstand/ising.jpg",
    color: "bg-district-1",
  },
  {
    name: "Dietmar Persian",
    position: "Stellvertretender Landesobmann",
    description:
      "Unterstützt den Landesobmann in allen Belangen und vertritt ihn bei Bedarf. Koordiniert spezielle Projekte und Arbeitskreise.",
    email: "stellv.landesobmann@posaunenwerk-rheinland.de",
    phone: "02192-7491",
    image: "/images/vorstand/persian.jpg",
    color: "bg-district-2",
  },
  {
    name: "Frank Beekmann",
    position: "Schatzmeister",
    description:
      "Verwaltet die Finanzen des Posaunenwerks, erstellt den Haushaltsplan und sorgt für die ordnungsgemäße Buchführung.",
    email: "schatzmeister@posaunenwerk-rheinland.de",
    phone: "0228-85098516",
    image: "/images/vorstand/beekmann.jpg",
    color: "bg-district-3",
  },
  {
    name: "Tim Neuhaus",
    position: "Geschäftsführer",
    description:
      "Verantwortlich für die operative Geschäftsführung und Koordination der täglichen Abläufe im Posaunenwerk.",
    email: "geschaeftsfuehrer@posaunenwerk-rheinland.de",
    phone: "0176-72213949",
    image: "/images/vorstand/neuhaus.png",
    color: "bg-district-5",
  },
];

export const posaunenratMembers: PosaunenratMember[] = [
  // Landeskirchenmusikdirektor
  {
    name: "Ulrich Cyganek",
    role: "Landeskirchenmusikdirektor",
    image: "/images/posaunenrat/cyganek.jpg",
  },

  // Sachverständige (alphabetisch sortiert)
  {
    name: "Marie Christine Beekmann",
    role: "Sachverständige",
  },
  {
    name: "Christian Frommelt",
    role: "Sachverständiger",
  },
  {
    name: "Guido Gorny",
    role: "Sachverständiger",
  },
  {
    name: "Sabine Gradtke",
    role: "Sachverständige",
  },
  {
    name: "Christoph Land",
    role: "Sachverständiger",
  },
  {
    name: "Christoph Melchior",
    role: "Sachverständiger",
  },
  {
    name: "Danny Neumann",
    role: "Sachverständiger",
  },
  {
    name: "Astrid Neuhaus",
    role: "Sachverständige",
  },
  {
    name: "Eberhard Petersen",
    role: "Sachverständiger",
  },
  {
    name: "Michael Porr",
    role: "Sachverständiger",
  },
  {
    name: "Martin Scheibner",
    role: "Sachverständiger",
  },
  {
    name: "Günter Tissen",
    role: "Sachverständiger",
  },
  {
    name: "Felix Waidelich",
    role: "Sachverständiger",
  },
];

export const historyTimeline: HistoryEvent[] = [
  {
    year: 1884,
    title: "Gründung des ersten Posaunenchors",
    description:
      "In Elberfeld (heute Wuppertal) wird der erste Posaunenchor im Rheinland gegründet. Dies markiert den Beginn der organisierten Posaunenchorarbeit in der Region.",
    category: "founding",
    image: "/images/geschichte/1884.jpg",
  },
  {
    year: 1925,
    title: "Gründung des Rheinischen Posaunenwerks",
    description:
      "Nach dem Ersten Weltkrieg wird das Rheinische Posaunenwerk als Dachorganisation gegründet, um die wachsende Zahl von Posaunenchören zu koordinieren und zu unterstützen.",
    category: "founding",
    image: "/images/geschichte/1925.jpg",
  },
  {
    year: 1950,
    title: "Wiederaufbau nach dem Zweiten Weltkrieg",
    description:
      "Nach den Zerstörungen des Krieges beginnt der systematische Wiederaufbau der Posaunenchorarbeit. Viele Chöre werden neu gegründet oder reaktiviert.",
    category: "milestone",
    image: "/images/geschichte/1950.jpg",
  },
  {
    year: 1975,
    title: "Strukturreform und Bezirksgliederung",
    description:
      "Das Posaunenwerk wird in 13 Bezirke gegliedert, um die Arbeit vor Ort besser koordinieren zu können. Diese Struktur besteht bis heute.",
    category: "expansion",
    image: "/images/geschichte/1975.jpg",
  },
  {
    year: 1986,
    title: "Gründung von Buccinate Deo",
    description:
      "Das Auswahlensemble Buccinate Deo wird gegründet und repräsentiert fortan die hohe musikalische Qualität der rheinischen Posaunenchorarbeit.",
    category: "milestone",
    image: "/images/geschichte/1986.jpg",
  },
  {
    year: 1995,
    title: "Beginn der Namibia-Partnerschaft",
    description:
      "Eine lebendige Partnerschaft mit Posaunenchören in Namibia beginnt, die bis heute durch regelmäßige Begegnungen und Austausche gepflegt wird.",
    category: "partnership",
    image: "/images/geschichte/1995.jpg",
  },
  {
    year: 2006,
    title: "Gründung von Con Spirito",
    description:
      "Das Spitzenensemble Con Spirito wird ins Leben gerufen und setzt neue Maßstäbe in der Blechbläsermusik auf höchstem Niveau.",
    category: "milestone",
    image: "/images/geschichte/2006.jpg",
  },
  {
    year: 2013,
    title: "Start des Landesjugendposaunenchors",
    description:
      "Der Rheinische Landesjugendposaunenchor (LaJuPo) nimmt seine Arbeit auf und bietet jungen Talenten eine Plattform für anspruchsvolles Musizieren.",
    category: "milestone",
    image: "/images/geschichte/2013.jpg",
  },
  {
    year: 2020,
    title: "Digitalisierung der Posaunenchorarbeit",
    description:
      "Die Corona-Pandemie beschleunigt die Digitalisierung. Online-Proben, digitale Notenverwaltung und virtuelle Konzerte werden Teil der Arbeit.",
    category: "modernization",
    image: "/images/geschichte/2020.jpg",
  },
  {
    year: 2025,
    title: "100 Jahre Posaunenwerk Rheinland",
    description:
      "Das Posaunenwerk feiert sein 100-jähriges Bestehen mit zahlreichen Jubiläumskonzerten und Veranstaltungen im gesamten Rheinland.",
    category: "milestone",
    image: "/images/geschichte/2025.jpg",
  },
];
