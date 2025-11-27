/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Seed Script for Posaunenwerk Database
 */
import "dotenv/config";
import { type ContactType, type UserRole } from "~/generated/prisma/client";
import { db } from "@/server/db";
import { bezirkeData } from "./seed-data/bezirke";
import { usersData } from "./seed-data/users";
import { auswahlchoereData } from "./seed-data/auswahlchoere";
import { ensemblesData } from "./seed-data/ensembles";
import { teamData } from "./seed-data/team";
import { posaunenratData } from "./seed-data/posaunenrat";
import { locationsData } from "./seed-data/locations";
import { mediaData } from "./seed-data/media";
import { eventsData } from "./seed-data/events";
import { coursesData } from "./seed-data/courses";
import { registrationsData } from "./seed-data/registrations";
import { postsData } from "./seed-data/posts";
import { downloadsData } from "./seed-data/downloads";
import { foerdervereinData } from "./seed-data/foerderverein";
import { blaeserhefteSeedData } from "./seed-data/blaeserheft";

import * as fs from "fs";
import * as path from "path";
import { vorstandData } from "./seed-data/vorstand";
import { posaunenwarteResponsibilitiesData } from "./seed-data/posaunenwarte";

async function main() {
  console.log("🌱 Starting database seed...");

  // 1. Create Media first (needed for relations)
  console.log("📸 Creating media...");
  const media = await seedMedia();

  // 2. Create Bezirke
  console.log("📍 Creating Bezirke...");
  const bezirke = await seedBezirke();

  // 3. Create Users with Bezirk relations and profile images
  console.log("👥 Creating users...");
  const users = await seedUsers(bezirke, media);

  // 4. Create Team Members (linked to users)
  console.log("👔 Creating Team Members...");
  await seedTeamMembers(users);

  // 4.5 Create Vorstand Members (some linked to users)
  console.log("👔 Creating Vorstand Members...");
  await seedVorstandMembers(users, media);

  // 5. Create Posaunenrat Members (some linked to users)
  console.log("🎖️  Creating Posaunenrat Members...");
  await seedPosaunenratMembers(users, media);

  // 5.5 Create Förderverein Members (some linked to users)
  console.log("🤝 Creating Förderverein Members...");
  await seedFoerdervereinMembers(users, media);

  // 5.75 Create Posaunenwarte Responsibilities
  console.log("🎺 Creating Posaunenwarte Responsibilities...");
  await seedPosaunenwarteResponsibilities(users, bezirke);

  // 6. Create AuswahlChöre
  console.log("🎺 Creating AuswahlChöre...");
  const auswahlchoere = await seedAuswahlchoere(users, media);

  // 7. Create Locations
  console.log("📍 Creating Locations...");
  const locations = await seedLocations();

  // 8. Create Ensembles
  console.log("🎵 Creating Ensembles...");
  await seedEnsembles(bezirke, users, locations);

  // 9. Create Events
  console.log("📅 Creating Events...");
  await seedEvents(users, auswahlchoere, locations);

  // 10. Create Courses
  console.log("📚 Creating Courses...");
  const courses = await seedCourses(users, locations);

  // 11. Create Course Registrations
  console.log("📝 Creating Course Registrations...");
  await seedCourseRegistrations(courses);

  // 12. Create Posts
  console.log("📰 Creating Posts...");
  await seedPosts(users, bezirke, media);

  // 13. Create Downloads
  console.log("📥 Creating Downloads...");
  await seedDownloads();

  // 14. Create Bläserhefte
  console.log("📖 Creating Bläserhefte...");
  await seedBlaeserhefte(media);

  console.log("✅ Seed completed successfully!");
}

// ============================================================================
// SEED FUNCTIONS
// ============================================================================

async function seedMedia() {
  const createdMedia: Record<string, any> = {
    teamMembers: {},
    obleute: {},
    blaeserhefte: {},
    auswahlchoere: {},
    posaunenrat: {},
    foerderverein: {},
    vorstand: {},
    newsPlaceholders: [],
  };

  // Helper function to get file stats
  const getFileStats = (filePath: string) => {
    try {
      const fullPath = path.join(process.cwd(), "public", filePath);
      if (fs.existsSync(fullPath)) {
        const stats = fs.statSync(fullPath);
        return {
          size: stats.size,
          exists: true,
        };
      }
    } catch {
      console.warn(`  ⚠️  File not found: ${filePath}`);
    }
    return { size: 1024, exists: false }; // Default size if file doesn't exist
  };

  // Seed Team Member images
  console.log("  📸 Creating team member images...");
  for (const item of mediaData.teamMembers as Array<{
    path: string;
    filename: string;
    alt: string;
    folder: string;
  }>) {
    const stats = getFileStats(item.path);
    const created = await db.media.create({
      data: {
        name: item.filename,
        filename: item.filename,
        url: item.path,
        path: item.path,
        mimeType: item.filename.endsWith(".png") ? "image/png" : "image/jpeg",
        size: stats.size,
        extension: item.filename.split(".").pop() || "jpg",
        alt: item.alt,
        folder: item.folder,
        isPublic: true,
      },
    });
    const key = item.filename.split(".")[0];
    createdMedia.teamMembers[key!] = created;
    console.log(`    ✓ ${item.filename}`);
  }

  // Seed Förderverein images
  console.log("  📸 Creating foerderverein member images...");
  for (const item of mediaData.foerderverein as Array<{
    path: string;
    filename: string;
    alt: string;
    folder: string;
  }>) {
    const stats = getFileStats(item.path);
    const created = await db.media.create({
      data: {
        name: item.filename,
        filename: item.filename,
        url: item.path,
        path: item.path,
        mimeType: "image/jpeg",
        size: stats.size,
        extension: "jpg",
        alt: item.alt,
        folder: item.folder,
        isPublic: true,
      },
    });
    const key = item.filename.split(".")[0];
    createdMedia.foerderverein[key!] = created;
    console.log(`    ✓ ${item.filename}`);
  }

  // Seed Vorstand images
  console.log("  📸 Creating vorstand member images...");
  for (const item of mediaData.vorstand) {
    const stats = getFileStats(item.path);
    const created = await db.media.create({
      data: {
        name: item.filename,
        filename: item.filename,
        url: item.path,
        path: item.path,
        mimeType: "image/jpeg",
        size: stats.size,
        extension: "jpg",
        alt: item.alt,
        folder: item.folder,
        isPublic: true,
      },
    });
    const key = item.filename.split(".")[0];
    createdMedia.vorstand[key!] = created;
    console.log(`    ✓ ${item.filename}`);
  }

  // Posaunenrat
  console.log("  📸 Creating posaunenrat member images...");
  for (const item of mediaData.posaunenrat) {
    const stats = getFileStats(item.path);
    const created = await db.media.create({
      data: {
        name: item.filename,
        filename: item.filename,
        url: item.path,
        path: item.path,
        mimeType: "image/jpeg",
        size: stats.size,
        extension: "jpg",
        alt: item.alt,
        folder: item.folder,
        isPublic: true,
      },
    });
    const key = item.filename.split(".")[0];
    createdMedia.posaunenrat[key!] = created;
    console.log(`    ✓ ${item.filename}`);
  }

  // Seed Obleute images
  console.log("  📸 Creating obleute images...");
  for (const item of mediaData.obleute) {
    const stats = getFileStats(item.path);
    const created = await db.media.create({
      data: {
        name: item.filename,
        filename: item.filename,
        url: item.path,
        path: item.path,
        mimeType: item.filename.endsWith(".png") ? "image/png" : "image/jpeg",
        size: stats.size,
        extension: item.filename.split(".").pop() || "jpg",
        alt: item.alt,
        folder: item.folder,
        isPublic: true,
      },
    });
    const key = item.filename.split(".")[0];
    createdMedia.obleute[key!] = created;
    console.log(`    ✓ ${item.filename}`);
  }

  // Seed Bläserheft images
  console.log("  📸 Creating bläserheft images...");
  for (const item of mediaData.blaeserhefte) {
    const stats = getFileStats(item.path);
    const created = await db.media.create({
      data: {
        name: item.filename,
        filename: item.filename,
        url: item.path,
        path: item.path,
        mimeType: "image/jpeg",
        size: stats.size,
        extension: "jpg",
        alt: item.alt,
        folder: item.folder,
        isPublic: true,
      },
    });
    createdMedia.blaeserhefte[item.year] = created;
    console.log(`    ✓ ${item.filename}`);
  }

  // Seed AuswahlChor images
  console.log("  📸 Creating auswahlchor images...");
  for (const item of mediaData.auswahlchoere) {
    const stats = getFileStats(item.path);
    const created = await db.media.create({
      data: {
        name: item.filename,
        filename: item.filename,
        url: item.path,
        path: item.path,
        mimeType: "image/jpeg",
        size: stats.size,
        extension: "jpg",
        alt: item.alt,
        folder: item.folder,
        isPublic: true,
      },
    });
    createdMedia.auswahlchoere[item.slug] = created;
    console.log(`    ✓ ${item.filename}`);
  }

  // Seed news placeholders
  console.log("  📸 Creating news placeholder images...");
  for (const item of mediaData.newsPlaceholders) {
    const stats = getFileStats(item.path);
    const created = await db.media.create({
      data: {
        name: item.filename,
        filename: item.filename,
        url: item.path,
        path: item.path,
        mimeType: "image/jpeg",
        size: stats.size,
        extension: "jpg",
        alt: item.alt,
        folder: item.folder,
        isPublic: true,
      },
    });
    createdMedia.newsPlaceholders.push(created);
    console.log(`    ✓ ${item.filename}`);
  }

  return createdMedia;
}

async function seedBezirke() {
  const createdBezirke = [];

  for (const bezirk of bezirkeData) {
    const created = await db.bezirk.create({
      data: {
        number: bezirk.number,
        name: bezirk.name,
        shortName: bezirk.shortName,
      },
    });
    createdBezirke.push(created);
    console.log(`  ✓ Created Bezirk: ${created.name}`);
  }

  return createdBezirke;
}

async function seedUsers(bezirke: any[], media: any) {
  const userImageMap: Record<string, string> = {
    "joerg.haeusler": "joerg-haeusler",
    "sinika.haeusler": "sinika-haeusler",
    "tim.neuhaus": "neuhaus",
    "lars.lehmann": "lars-lehmann",
    "sonia.singel": "sonia-singel",
    "doris.haetzel": "haetzel",
    "dietmar.schruck": "schruck",
    "joerg.schroeder": "schroeder",
    "martin.weidner": "weidner",
    "gerhard.heywang": "heywang",
    "birgit.engelmann": "engelmann",
    "michael.geffert": "geffert",
    "beate.ising": "ising",
    "klaus.groth": "groth",
    "jochen.conrad": "conrad",
    "andrea.lehmann": "lehmann",
    "ursula.doering": "doering",
    "matthias.schirg": "schirg",
    "marion.kutscher": "kutscher",
    "gerald.muenster": "muenster",
    "eike.klein": "klein",
    "friedemann.schmidt-eggert": "schmidt-eggert",
    "dietmar.persian": "persian",
    "frank.beekmann": "beekmann",
  };

  const createdUsers: Record<string, any> = {};

  for (const u of usersData) {
    let obleuteBezirkId = null;
    if (u.obleuteBezirk !== null) {
      const bezirk = bezirke.find((b) => b.number === u.obleuteBezirk);
      obleuteBezirkId = bezirk?.id || null;
    }

    let profileImageId = null;
    const imageKey = userImageMap[u.username];
    if (imageKey) {
      const image =
        media.teamMembers[imageKey] ||
        media.obleute[imageKey] ||
        media.vorstand[imageKey] ||
        media.posaunenrat[imageKey];
      profileImageId = image?.id || null;
    }

    const created = await db.user.create({
      data: {
        firstName: u.firstName,
        lastName: u.lastName,
        displayName: u.displayName,
        email: u.email,
        role: u.role as UserRole,
        displayRole: u.displayRole,
        username: u.username,
        bio: u.bio,
        obleuteRole: u.obleuteRole,
        obleuteBezirkId: obleuteBezirkId,
        profileImageId: profileImageId,
      },
    });
    createdUsers[u.username] = created;
    console.log(
      `  ✓ Created user: ${created.email}${
        profileImageId ? " (with image)" : ""
      }`,
    );
  }

  return createdUsers;
}

async function seedTeamMembers(users: any) {
  console.log("👔 Creating Team Members...");

  for (const member of teamData) {
    const user = users[member.username];
    if (!user) {
      console.warn(`  ⚠️  User not found for team member: ${member.username}`);
      continue;
    }

    const created = await db.teamMember.create({
      data: {
        role: member.role,
        responsibilities: member.responsibilities,
        socials: member.socials,
        contactType: member.contactType as ContactType,
        sortOrder: member.sortOrder,
        userId: user.id,
      },
    });

    console.log(`  ✓ Created TeamMember: ${user.displayName} (${member.role})`);
  }
}

async function seedPosaunenratMembers(users: any, media: any) {
  console.log("🎖️  Creating Posaunenrat Members...");

  for (const member of posaunenratData) {
    // Find user if username is provided
    let userId = null;
    let name: string | null = member.name;
    let email: string | null = member.email;
    let imageId = null;

    if (member.username) {
      const user = users[member.username];
      if (user) {
        userId = user.id;
        // When user exists, we'll pull name/email/image from User
        name = null;
        email = null;
        // Check if user has profile image, otherwise use standalone
      } else {
        console.warn(`  ⚠️  User not found: ${member.username}`);
      }
    } else {
      // No user account - might have standalone image
      // Check if there's an image for this member in posaunenrat folder
      const imageKey = member.name
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
      const posaunenratImage = media.posaunenrat?.[imageKey];
      if (posaunenratImage) {
        imageId = posaunenratImage.id;
      }
    }

    const created = await db.posaunenratMember.create({
      data: {
        name: name,
        email: email,
        role: member.role as any,
        district: member.district,
        imageId: imageId,
        userId: userId,
        sortOrder: member.sortOrder,
      },
    });

    console.log(
      `  ✓ Created PosaunenratMember: ${member.name} (${member.role})${
        userId ? " - linked to user" : ""
      }`,
    );
  }
}

async function seedFoerdervereinMembers(users: any, media: any) {
  console.log("🤝 Creating Förderverein Members...");

  for (const member of foerdervereinData) {
    // Find user if username is provided
    let userId = null;
    let name = member.name;
    let email = member.email;
    let phone = member.phone;
    let imageId = null;

    if (member.username) {
      const user = users[member.username];
      if (user) {
        userId = user.id;
        // When user exists, we'll pull name/email/phone/image from User
        name = undefined;
        email = undefined;
        phone = undefined;
      } else {
        console.warn(`  ⚠️  User not found: ${member.username}`);
      }
    } else {
      // No user account - check for standalone image
      if (member.name) {
        const imageKey = member.name
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, "");
        const foerdervereinImage = media.foerderverein?.[imageKey];
        if (foerdervereinImage) {
          imageId = foerdervereinImage.id;
        }
      }
    }

    const created = await db.foerdervereinMember.create({
      data: {
        name: name,
        email: email,
        phone: phone,
        position: member.position,
        role: member.role as any,
        memberSince: member.memberSince ? new Date(member.memberSince) : null,
        description: member.description,
        sortOrder: member.sortOrder,
        imageId: imageId,
        userId: userId,
      },
    });

    console.log(
      `  ✓ Created FoerdervereinMember: ${member.name} (${member.role})${
        userId ? " - linked to user" : ""
      }`,
    );
  }
}

async function seedVorstandMembers(users: any, media: any) {
  console.log("🏛️  Creating Vorstand Members...");

  for (const member of vorstandData) {
    const user = users[member.username];
    if (!user) {
      console.warn(
        `  ⚠️  User not found for vorstand member: ${member.username}`,
      );
      continue;
    }

    // Get image from media if available
    let imageId = null;
    const imageKey = member.username.split(".").join("-");
    const vorstandImage = media.vorstand?.[imageKey];
    if (vorstandImage) {
      imageId = vorstandImage.id;
    }

    const created = await db.vorstandMember.create({
      data: {
        position: member.position,
        description: member.description,
        phone: member.phone,
        color: member.color,
        sortOrder: member.sortOrder,
        userId: user.id,
        imageId: imageId,
      },
    });

    console.log(
      `  ✓ Created VorstandMember: ${user.name} (${member.position})`,
    );
  }
}

async function seedAuswahlchoere(users: any, media: any) {
  const conductor = users["joerg.haeusler"];
  const createdChors: Record<string, any> = {};

  for (const chor of auswahlchoereData) {
    const imageId = media.auswahlchoere[chor.slug]?.id || null;

    const created = await db.auswahlChor.create({
      data: {
        name: chor.name,
        slug: chor.slug,
        subtitle: chor.subtitle,
        founded: chor.founded,
        members: chor.members,
        description: chor.description,
        color: chor.color,
        colorHex: chor.colorHex,
        showApplication: chor.showApplication,
        imageId: imageId,
        conductorId: conductor?.id || null,
      },
    });
    createdChors[chor.slug] = created;
    console.log(`  ✓ Created AuswahlChor: ${created.name}`);
  }

  return createdChors;
}

async function seedPosaunenwarteResponsibilities(
  users: Record<string, any>,
  bezirke: any[],
) {
  console.log("🎺 Creating Posaunenwarte Responsibilities...");

  let totalCreated = 0;

  for (const responsibility of posaunenwarteResponsibilitiesData) {
    // Find the user
    const user = users[responsibility.username];
    if (!user) {
      console.warn(
        `  ⚠️  User not found for username: ${responsibility.username}`,
      );
      continue;
    }

    // Verify user has correct role
    if (user.role !== "LPW" && user.role !== "RPW") {
      console.warn(
        `  ⚠️  User ${user.name} has role ${user.role}, expected LPW or RPW`,
      );
      continue;
    }

    // Create a responsibility record for each Bezirk
    for (const bezirkNumber of responsibility.bezirke) {
      const bezirk = bezirke.find((b) => b.number === bezirkNumber);
      if (!bezirk) {
        console.warn(`  ⚠️  Bezirk ${bezirkNumber} not found`);
        continue;
      }

      // Check if responsibility already exists
      const existing = await db.posaunenwartResponsibility.findUnique({
        where: {
          userId_bezirkId: {
            userId: user.id,
            bezirkId: bezirk.id,
          },
        },
      });

      if (existing) {
        console.log(
          `  → Already exists: ${user.name} -> Bezirk ${bezirkNumber}`,
        );
        continue;
      }

      // Create the responsibility
      await db.posaunenwartResponsibility.create({
        data: {
          userId: user.id,
          bezirkId: bezirk.id,
          roleType: responsibility.roleType,
          notes: responsibility.notes,
          priority: responsibility.priority,
        },
      });

      totalCreated++;
    }

    console.log(
      `  ✓ ${user.name} (${responsibility.roleType}) -> ${responsibility.bezirke.length} Bezirke`,
    );
  }

  console.log(
    `  ✅ Created ${totalCreated} Posaunenwart responsibility records`,
  );

  return;
}

// Update the seedEnsembles function
async function seedEnsembles(bezirke: any[], users: any, locations: any) {
  for (const ensemble of ensemblesData) {
    const bezirk = bezirke.find((b) => b.number === ensemble.bezirk);

    // Find location if specified
    let locationId = null;
    if (ensemble.locationName) {
      const location = locations[ensemble.locationName];
      locationId = location?.id || null;
    }

    // Assign conductor (30% chance)
    let conductorId = null;
    if (Math.random() > 0.7) {
      const obleuteUsers = Object.values(users).filter(
        (u: any) => u.role === "OBLEUTE",
      );
      if (obleuteUsers.length > 0) {
        const randomConductor = obleuteUsers[
          Math.floor(Math.random() * obleuteUsers.length)
        ] as any;
        conductorId = randomConductor.id;
      }
    }

    // Representative defaults to conductor (or null if no conductor)
    const representativeId = conductorId;

    const created = await db.ensemble.create({
      data: {
        name: ensemble.name,
        description: ensemble.description,
        bezirkId: bezirk?.id || null,
        locationId: locationId,
        rehearsalDay: ensemble.rehearsalDay || null,
        rehearsalTime: ensemble.rehearsalTime || null,
        contactEmail: ensemble.contactEmail || null,
        contactPhone: ensemble.contactPhone || null,
        contactWebsite: ensemble.contactWebsite || null,
        isActive: ensemble.isActive,
        conductorId: conductorId,
        representativeId: representativeId,
      },
    });
    console.log(
      `  ✓ Created Ensemble: ${created.name}${
        locationId ? " (with location)" : ""
      }${ensemble.rehearsalDay ? ` - ${ensemble.rehearsalDay}` : ""}`,
    );
  }
}

async function seedLocations() {
  const createdLocations: Record<string, any> = {};

  for (const location of locationsData) {
    const created = await db.location.create({
      data: {
        name: location.name,
        street: location.street,
        zipCode: location.zipCode,
        city: location.city,
        additionalInfo: location.additionalInfo,
      },
    });
    createdLocations[location.name] = created;
    console.log(`  ✓ Created Location: ${created.name} in ${created.city}`);
  }

  return createdLocations;
}

async function seedEvents(users: any, auswahlchoere: any, locations: any) {
  const creator = users["joerg.haeusler"];

  for (const event of eventsData) {
    // Find AuswahlChor if specified
    let auswahlChorId = null;
    if (event.auswahlChorSlug) {
      const chor = auswahlchoere[event.auswahlChorSlug];
      auswahlChorId = chor?.id || null;
    }

    // Find or create location
    let locationId = null;
    if (event.locationCity) {
      // Try to find existing location by city and venue
      const locationKey = event.locationVenue
        ? `${event.locationCity}-${event.locationVenue}`
            .toLowerCase()
            .replace(/\s+/g, "-")
        : event.locationCity.toLowerCase();

      let location = locations[locationKey];

      // If not found, try to find by city only
      if (!location) {
        location = Object.values(locations).find(
          (loc: any) => loc.city === event.locationCity,
        );
      }

      // If still not found, create new location
      if (!location) {
        location = await db.location.create({
          data: {
            name: event.locationVenue || null,
            street: event.locationStreet || null,
            zipCode: event.locationZipCode || null,
            city: event.locationCity,
          },
        });
        locations[locationKey] = location;
        console.log(
          `    → Created new Location: ${location.name || location.city}`,
        );
      }

      locationId = location.id;
    }

    const created = await db.event.create({
      data: {
        title: event.title,
        description: event.description || null,
        eventDate: new Date(event.eventDate),
        locationId: locationId,
        category: event.category as any,
        performingEnsembleType: event.performingEnsembleType || null,
        auswahlChorId: auswahlChorId,
        performingEnsembleName: event.performingEnsembleName || null,
        leitung: event.leitung || null,
        openToParticipants: event.openToParticipants,
        participationInfo: event.participationInfo || null,
        isFree: event.isFree,
        status: event.status as any,
        publishedAt: event.publishedAt ? new Date(event.publishedAt) : null,
        createdById: creator?.id || users.admin.id,
      },
    });

    console.log(
      `  ✓ Created Event: ${
        created.title
      } (${created.eventDate.toLocaleDateString()})`,
    );
  }
}

async function seedCourses(users: any, locations: any) {
  const creator = users["joerg.haeusler"];
  const createdCourses: Record<string, any> = {};

  for (const course of coursesData) {
    // Find or create location
    let locationId = null;
    if (course.locationCity) {
      // Try to find existing location by city and venue
      const locationKey = course.locationVenue
        ? `${course.locationCity}-${course.locationVenue}`
            .toLowerCase()
            .replace(/\s+/g, "-")
        : course.locationCity.toLowerCase();

      let location = locations[locationKey];

      // If not found, try to find by city only
      if (!location) {
        location = Object.values(locations).find(
          (loc: any) => loc.city === course.locationCity,
        );
      }

      // If still not found, create new location
      if (!location) {
        location = await db.location.create({
          data: {
            name: course.locationVenue || null,
            street: course.locationStreet || null,
            zipCode: null,
            city: course.locationCity,
            additionalInfo: null,
          },
        });
        locations[locationKey] = location;
        console.log(
          `    → Created new Location: ${location.name || location.city}`,
        );
      }

      locationId = location.id;
    }

    const created = await db.course.create({
      data: {
        title: course.title,
        description: course.description,
        startDate: new Date(course.startDate),
        endDate: new Date(course.endDate),
        locationId: locationId,
        courseType: course.courseType as any,
        targetAudience: course.targetAudience as any,
        registrationOpen: course.registrationOpen,
        registrationDeadline: course.registrationDeadline
          ? new Date(course.registrationDeadline)
          : null,
        maxParticipants: course.maxParticipants,
        allowWaitingList: course.allowWaitingList,
        isFree: course.isFree,
        prerequisites: course.prerequisites || undefined,
        status: course.status as any,
        publishedAt: course.publishedAt ? new Date(course.publishedAt) : null,
        createdById: creator?.id || users.admin.id,
        priceOptions: {
          create: course.priceOptions.map((po) => ({
            price: po.price,
            label: po.label,
            description: "description" in po ? po.description : null,
            maxParticipants: po.maxParticipants || null,
          })),
        },
      },
      include: {
        priceOptions: true,
      },
    });

    createdCourses[course.title] = created;
    console.log(
      `  ✓ Created Course: ${created.title} (${created.priceOptions.length} price options)`,
    );
  }

  return createdCourses;
}

async function seedCourseRegistrations(courses: any) {
  for (const reg of registrationsData) {
    const course = courses[reg.courseTitle];
    if (!course) {
      console.warn(`  ⚠️  Course not found: ${reg.courseTitle}`);
      continue;
    }

    // Calculate total price
    let totalPrice = 0;
    for (const participant of reg.participants) {
      const priceOption = course.priceOptions.find(
        (po: any) => po.label === participant.priceOption,
      );
      if (priceOption) {
        totalPrice += priceOption.price;
      }
    }

    const registration = await db.courseRegistration.create({
      data: {
        courseId: course.id,
        registrantFirstName: reg.registrantFirstName,
        registrantLastName: reg.registrantLastName,
        registrantEmail: reg.registrantEmail,
        registrantPhone: reg.registrantPhone || null,
        totalPrice: totalPrice,
        paymentStatus: reg.paymentStatus as any,
        registrationStatus: reg.registrationStatus as any,
        participants: {
          create: reg.participants.map((p) => ({
            firstName: p.firstName,
            lastName: p.lastName,
            birthDate: p.birthDate,
            city: p.city,
            instrument: p.instrument || null,
            priceOption: p.priceOption,
          })),
        },
      },
      include: {
        participants: true,
      },
    });

    console.log(
      `  ✓ Created Registration: ${registration.registrantFirstName} ${
        registration.registrantLastName
      } for "${reg.courseTitle}" (${
        registration.participants.length
      } participant${registration.participants.length !== 1 ? "s" : ""})`,
    );
  }
}

async function seedPosts(users: any, bezirke: any[], media: any) {
  const creator = users["joerg.haeusler"] || users.admin;

  for (const post of postsData) {
    // Find Bezirk if specified
    let bezirkId = null;
    if (post.bezirk !== null) {
      const bezirk = bezirke.find((b) => b.number === post.bezirk);
      bezirkId = bezirk?.id || null;
    }

    // Find cover image from placeholders
    let coverImageId = null;
    if (post.coverImagePlaceholder) {
      const placeholder =
        media.newsPlaceholders[post.coverImagePlaceholder - 1];
      coverImageId = placeholder?.id || null;
    }

    const created = await db.post.create({
      data: {
        title: post.title,
        content: post.content,
        excerpt: post.excerpt,
        category: post.category as any,
        bezirkId: bezirkId,
        pinned: post.pinned,
        coverImageId: coverImageId,
        status: post.status as any,
        publishedAt: post.publishedAt ? new Date(post.publishedAt) : null,
        createdById: creator.id,
      },
    });
    console.log(
      `  ✓ Created Post: ${created.title}${created.pinned ? " (pinned)" : ""}`,
    );
  }
}

async function seedDownloads() {
  for (const download of downloadsData) {
    const created = await db.download.create({
      data: {
        ...download,
        category: download.category as any,
      },
    });
    console.log(`  ✓ Created Download: ${created.title} (${created.category})`);
  }
}

async function seedBlaeserhefte(media: any) {
  for (const heft of blaeserhefteSeedData) {
    let imageId = null;
    if (heft.image) {
      const image = media.blaeserhefte[heft.year];
      imageId = image?.id || null;
    }

    const created = await db.blaeserheft.create({
      data: { ...heft, image: undefined, imageId: imageId },
    });
    console.log(`  ✓ Created Bläserheft: ${created.title} (${created.year})`);
  }
}

// ============================================================================
// RUN
// ============================================================================

main()
  .then(() => db.$disconnect())
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    db.$disconnect();
    process.exit(1);
  });
