import { PosaunenwartRoleType } from "~/generated/prisma/client";

// ============================================================================
// SEED DATA - ONLY POSAUNENWARTE
// ============================================================================

export const posaunenwarteResponsibilitiesData = [
  // Jörg Häusler (LPW) - Responsible for ALL Bezirke
  {
    username: "joerg.haeusler",
    roleType: "LPW" as PosaunenwartRoleType,
    bezirke: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], // All Bezirke
    notes: "Landesposaunenwart - Verantwortlich für alle Bezirke",
    priority: 1,
  },

  // Sonia Singel-Roemer (RPW) - Responsible for Bezirke 2, 3, 4, 5
  {
    username: "sonia.singel",
    roleType: "RPW" as PosaunenwartRoleType,
    bezirke: [2, 3, 4, 5],
    notes: "Regionalposaunenwartin für die Bezirke 2, 3, 4 und 5",
    priority: 2,
  },
  // Matthias Schirg (RPW) - Responsible for Bezirk 12
  {
    username: "matthias.schirg",
    roleType: "RPW" as PosaunenwartRoleType,
    bezirke: [12],
    notes: "Regionalposaunenwart für den Bezirk 12",
    priority: 2,
  },
  // Marion Kutscher (RPW) - Responsible for Bezirke 10, 11
  {
    username: "marion.kutscher",
    roleType: "RPW" as PosaunenwartRoleType,
    bezirke: [10, 11],
    notes: "Regionalposaunenwartin für die Bezirke 10 und 11",
    priority: 2,
  },
  // Gerald Münster (RPW) - Responsible for Bezirke 1, 7
  {
    username: "gerald.muenster",
    roleType: "RPW" as PosaunenwartRoleType,
    bezirke: [1, 7],
    notes: "Regionalposaunenwart für die Bezirke 1 und 7",
    priority: 2,
  },
  // Eike Klein (RPW) - Responsible for Bezirke 6, 8, 9, 13
  {
    username: "eike.klein",
    roleType: "RPW" as PosaunenwartRoleType,
    bezirke: [6, 8, 9, 13],
    notes: "Regionalposaunenwart für die Bezirke 6, 8, 9 und 13",
    priority: 2,
  },

  // Add more RPWs here if you have them in the future
  // Example:
  // {
  //   username: "another.rpw",
  //   roleType: "RPW" as PosaunenwartRoleType,
  //   bezirke: [6, 7, 8],
  //   notes: "Regionalposaunenwart für die Bezirke 6, 7 und 8",
  //   priority: 2,
  // },
];
