/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Seed Script from Backup Data
 * This seed script uses data extracted from a database backup
 */
import "dotenv/config";
import { db } from "@/server/db";

// Import all seed data from backup
import { AuswahlChorSeedData } from "./seed-data-from-backup/AuswahlChor";
import { BezirkSeedData } from "./seed-data-from-backup/Bezirk";
import { BlaeserheftSeedData } from "./seed-data-from-backup/Blaeserheft";
import { CourseSeedData } from "./seed-data-from-backup/Course";
import { CourseCustomFieldSeedData } from "./seed-data-from-backup/CourseCustomField";
import { CoursePriceOptionSeedData } from "./seed-data-from-backup/CoursePriceOption";
import { CourseRegistrationSeedData } from "./seed-data-from-backup/CourseRegistration";
import { DownloadSeedData } from "./seed-data-from-backup/Download";
import { EnsembleSeedData } from "./seed-data-from-backup/Ensemble";
import { EventSeedData } from "./seed-data-from-backup/Event";
import { EventDownloadSeedData } from "./seed-data-from-backup/EventDownload";
import { EventPriceOptionSeedData } from "./seed-data-from-backup/EventPriceOption";
import { FoerdervereinMemberSeedData } from "./seed-data-from-backup/FoerdervereinMember";
import { HistoryEventSeedData } from "./seed-data-from-backup/HistoryEvent";
import { HomepageCarouselItemSeedData } from "./seed-data-from-backup/HomepageCarouselItem";
import { LocationSeedData } from "./seed-data-from-backup/Location";
import { MediaSeedData } from "./seed-data-from-backup/Media";
import { NewsletterSubscriberSeedData } from "./seed-data-from-backup/NewsletterSubscriber";
import { ParticipantSeedData } from "./seed-data-from-backup/Participant";
import { PosaunenratMemberSeedData } from "./seed-data-from-backup/PosaunenratMember";
import { PosaunenwartResponsibilitySeedData } from "./seed-data-from-backup/PosaunenwartResponsibility";
import { PostSeedData } from "./seed-data-from-backup/Post";
import { RehearsalScheduleSeedData } from "./seed-data-from-backup/RehearsalSchedule";
import { SavedParticipantSeedData } from "./seed-data-from-backup/SavedParticipant";
import { TeamMemberSeedData } from "./seed-data-from-backup/TeamMember";
import { VorstandMemberSeedData } from "./seed-data-from-backup/VorstandMember";
import { UserSeedData } from "./seed-data-from-backup/user";
import { AccountSeedData } from "./seed-data-from-backup/account";
import { PageViewSeedData } from "./seed-data-from-backup/page_view";
import { SessionSeedData } from "./seed-data-from-backup/session";
import { TwoFactorSeedData } from "./seed-data-from-backup/twoFactor";
import { VerificationSeedData } from "./seed-data-from-backup/verification";
import { _CourseInstructorsSeedData } from "./seed-data-from-backup/_CourseInstructors";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert PostgreSQL values to proper TypeScript types
 */
function convertValue(value: any, fieldName: string): any {
  if (value === null || value === undefined || value === "N" || value === "\\N") {
    return null;
  }

  // Handle booleans (PostgreSQL uses 't'/'f')
  if (value === "t" || value === true) return true;
  if (value === "f" || value === false) return false;

  // Define string fields that should never be converted to numbers or dates
  const stringFields = ["id", "email", "username", "name", "filename", "url", "path", "mimeType", 
    "extension", "alt", "caption", "title", "folder", "token", "phone", "street", "zipCode", "city",
    "displayName", "firstName", "lastName", "bio", "description", "content", "excerpt", "motto",
    "subtitle", "founded", "members", "color", "colorHex", "slug", "position", "role", "district",
    "shortName", "leitungs", "performingEnsembleName", "conductorName", "representativeName",
    "authorName", "rehearsalDay", "rehearsalTime", "contactEmail", "contactPhone", "contactWebsite",
    "audioSample", "identifier", "value", "secret", "backupCodes", "accountId", "providerId",
    "scope", "password", "fileUrl", "fileType", "registrantEmail", "billingEmail", "fieldName",
    "label", "priceInfo", "participationInfo", "additionalInfo", "notes", "reviewNotes",
    "registrantPhone", "registrantZipCode", "registrantStreet", "registrantCity"];
  
  // If it's a string field, convert to string if it's a number (backup might have mixed types)
  if (stringFields.includes(fieldName)) {
    if (typeof value === "number") {
      return String(value);
    }
    return value;
  }

  // Handle dates - only for fields that are actually date fields
  const dateFields = ["createdAt", "updatedAt", "birthDate", "eventDate", "startDate", "endDate", 
    "publishedAt", "reviewDate", "expiresAt", "subscribedAt", "unsubscribedAt", "invoiceDate",
    "registrationOpensAt", "registrationDeadline", "memberSince", "accessTokenExpiresAt", 
    "refreshTokenExpiresAt"];
  if (dateFields.includes(fieldName) && typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  // Handle numbers stored as strings (only for non-string fields)
  if (typeof value === "string" && /^-?\d+$/.test(value)) {
    return parseInt(value, 10);
  }
  if (typeof value === "string" && /^-?\d*\.\d+$/.test(value)) {
    return parseFloat(value);
  }

  // Handle JSON fields
  if (fieldName.includes("Json") || fieldName === "preferences" || fieldName === "tags" || fieldName === "options" || fieldName === "chapters" || fieldName === "highlights" || fieldName === "socials" || fieldName === "responsibilities" || fieldName === "customFields") {
    if (value === "N" || value === null) return null;
    if (typeof value === "string") {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
  }

  return value;
}

/**
 * Clean and convert a data object
 */
function cleanData<T extends Record<string, any>>(data: T): Partial<T> {
  const cleaned: any = {};
  for (const [key, value] of Object.entries(data)) {
    cleaned[key] = convertValue(value, key);
  }
  return cleaned;
}

/**
 * Helper to upsert a record (create or update if exists)
 */
async function upsertRecord<T extends { id: string }>(
  model: {
    upsert: (args: {
      where: any;
      update: any;
      create: any;
    }) => Promise<T>;
  },
  data: any,
  whereField: string = "id"
): Promise<T> {
  try {
    return await model.upsert({
      where: { [whereField]: data[whereField] },
      update: data,
      create: data,
    });
  } catch (error: any) {
    // If upsert fails (e.g., unique constraint), try create
    if (error.code === "P2002" || error.code === "P2003") {
      try {
        return await (model as any).create({ data });
      } catch {
        // If create also fails, try to find and return existing
        return await (model as any).findUnique({ where: { [whereField]: data[whereField] } });
      }
    }
    throw error;
  }
}

// ============================================================================
// MAIN SEED FUNCTION
// ============================================================================

async function main() {
  console.log("🌱 Starting database seed from backup data...");

  try {
    // 1. Seed Bezirke (no dependencies)
    console.log("📍 Creating Bezirke...");
    const bezirkeMap = new Map<string, string>();
    for (const data of BezirkSeedData) {
      const cleaned = cleanData(data);
      const created = await upsertRecord(db.bezirk, cleaned, "number");
      bezirkeMap.set(data.id, created.id);
      console.log(`  ✓ ${created.shortName}`);
    }

    // 2. Seed Media (needed for many relations)
    // Note: Media.uploadedById references User, but we create Media first
    // and set uploadedById to null, then update it after Users are created
    console.log("📸 Creating Media...");
    const mediaMap = new Map<string, string>();
    const mediaUploadedByMap = new Map<string, string>(); // Store original uploadedById for later update
    
    for (const data of MediaSeedData) {
      const cleaned = cleanData(data);
      // Handle width/height conversion
      if (cleaned.width === "N" || cleaned.width === null) cleaned.width = null;
      else if (typeof cleaned.width === "string") cleaned.width = parseInt(cleaned.width, 10);
      if (cleaned.height === "N" || cleaned.height === null) cleaned.height = null;
      else if (typeof cleaned.height === "string") cleaned.height = parseInt(cleaned.height, 10);
      
      // Store original uploadedById for later update
      if (cleaned.uploadedById) {
        mediaUploadedByMap.set(data.id, cleaned.uploadedById as string);
      }
      // Set uploadedById to null initially (will update after Users are created)
      cleaned.uploadedById = null;
      
      const created = await upsertRecord(db.media, cleaned, "filename");
      mediaMap.set(data.id, created.id);
    }
    console.log(`  ✓ Created ${mediaMap.size} media items`);

    // 3. Seed Users (depends on Bezirk, Media)
    console.log("👥 Creating Users...");
    const usersMap = new Map<string, string>();
    for (const data of UserSeedData) {
      const cleaned = cleanData(data);
      // Map foreign keys
      if (cleaned.profileImageId && mediaMap.has(cleaned.profileImageId as string)) {
        cleaned.profileImageId = mediaMap.get(cleaned.profileImageId as string);
      } else {
        cleaned.profileImageId = null;
      }
      if (cleaned.bezirkId && bezirkeMap.has(cleaned.bezirkId as string)) {
        cleaned.bezirkId = bezirkeMap.get(cleaned.bezirkId as string);
      } else {
        cleaned.bezirkId = null;
      }
      
      // Disable 2FA for all users (backup codes won't work in new environment)
      cleaned.twoFactorEnabled = false;
      
      const created = await upsertRecord(db.user, cleaned, "email");
      usersMap.set(data.id, created.id);
    }
    console.log(`  ✓ Created ${usersMap.size} users`);

    // 3.5 Update Media with uploadedById now that Users exist
    console.log("📸 Updating Media uploadedById references...");
    let updatedMediaCount = 0;
    for (const [mediaId, originalUserId] of mediaUploadedByMap.entries()) {
      if (mediaMap.has(mediaId) && usersMap.has(originalUserId)) {
        await db.media.update({
          where: { id: mediaMap.get(mediaId)! },
          data: { uploadedById: usersMap.get(originalUserId)! },
        });
        updatedMediaCount++;
      }
    }
    console.log(`  ✓ Updated ${updatedMediaCount} media items with uploadedById`);

    // 4. Seed Locations (no dependencies)
    console.log("📍 Creating Locations...");
    const locationsMap = new Map<string, string>();
    for (const data of LocationSeedData) {
      const cleaned = cleanData(data);
      const created = await upsertRecord(db.location, cleaned);
      locationsMap.set(data.id, created.id);
    }
    console.log(`  ✓ Created ${locationsMap.size} locations`);

    // 5. Seed AuswahlChöre (depends on User, Media)
    console.log("🎺 Creating AuswahlChöre...");
    const auswahlchoereMap = new Map<string, string>();
    for (const data of AuswahlChorSeedData) {
      const cleaned = cleanData(data);
      if (cleaned.imageId && mediaMap.has(cleaned.imageId as string)) {
        cleaned.imageId = mediaMap.get(cleaned.imageId as string);
      } else {
        cleaned.imageId = null;
      }
      if (cleaned.conductorId && usersMap.has(cleaned.conductorId as string)) {
        cleaned.conductorId = usersMap.get(cleaned.conductorId as string);
      } else {
        cleaned.conductorId = null;
      }
      
      const created = await upsertRecord(db.auswahlChor, cleaned, "slug");
      auswahlchoereMap.set(data.id, created.id);
    }
    console.log(`  ✓ Created ${auswahlchoereMap.size} AuswahlChöre`);

    // 6. Seed Ensembles (depends on Bezirk, User, Location, Media)
    console.log("🎵 Creating Ensembles...");
    const ensemblesMap = new Map<string, string>();
    for (const data of EnsembleSeedData) {
      const cleaned = cleanData(data);
      if (cleaned.bezirkId && bezirkeMap.has(cleaned.bezirkId as string)) {
        cleaned.bezirkId = bezirkeMap.get(cleaned.bezirkId as string);
      } else {
        cleaned.bezirkId = null;
      }
      if (cleaned.imageId && mediaMap.has(cleaned.imageId as string)) {
        cleaned.imageId = mediaMap.get(cleaned.imageId as string);
      } else {
        cleaned.imageId = null;
      }
      if (cleaned.locationId && locationsMap.has(cleaned.locationId as string)) {
        cleaned.locationId = locationsMap.get(cleaned.locationId as string);
      } else {
        cleaned.locationId = null;
      }
      if (cleaned.conductorId && usersMap.has(cleaned.conductorId as string)) {
        cleaned.conductorId = usersMap.get(cleaned.conductorId as string);
      } else {
        cleaned.conductorId = null;
      }
      if (cleaned.representativeId && usersMap.has(cleaned.representativeId as string)) {
        cleaned.representativeId = usersMap.get(cleaned.representativeId as string);
      } else {
        cleaned.representativeId = null;
      }
      
      const created = await upsertRecord(db.ensemble, cleaned);
      ensemblesMap.set(data.id, created.id);
    }
    console.log(`  ✓ Created ${ensemblesMap.size} ensembles`);

    // 7. Seed Rehearsal Schedules (depends on Ensemble)
    console.log("📅 Creating Rehearsal Schedules...");
    for (const data of RehearsalScheduleSeedData) {
      const cleaned = cleanData(data);
      if (cleaned.ensembleId && ensemblesMap.has(cleaned.ensembleId as string)) {
        cleaned.ensembleId = ensemblesMap.get(cleaned.ensembleId as string);
        await upsertRecord(db.rehearsalSchedule, cleaned);
      }
    }
    console.log(`  ✓ Created ${RehearsalScheduleSeedData.length} rehearsal schedules`);

    // 8. Seed Events (depends on User, Ensemble, AuswahlChor, Location, Media, Bezirk)
    console.log("📅 Creating Events...");
    const eventsMap = new Map<string, string>();
    for (const data of EventSeedData) {
      const cleaned = cleanData(data);
      if (cleaned.coverImageId && mediaMap.has(cleaned.coverImageId as string)) {
        cleaned.coverImageId = mediaMap.get(cleaned.coverImageId as string);
      } else {
        cleaned.coverImageId = null;
      }
      if (cleaned.locationId && locationsMap.has(cleaned.locationId as string)) {
        cleaned.locationId = locationsMap.get(cleaned.locationId as string);
      } else {
        cleaned.locationId = null;
      }
      if (cleaned.bezirkId && bezirkeMap.has(cleaned.bezirkId as string)) {
        cleaned.bezirkId = bezirkeMap.get(cleaned.bezirkId as string);
      } else {
        cleaned.bezirkId = null;
      }
      if (cleaned.ensembleId && ensemblesMap.has(cleaned.ensembleId as string)) {
        cleaned.ensembleId = ensemblesMap.get(cleaned.ensembleId as string);
      } else {
        cleaned.ensembleId = null;
      }
      if (cleaned.auswahlChorId && auswahlchoereMap.has(cleaned.auswahlChorId as string)) {
        cleaned.auswahlChorId = auswahlchoereMap.get(cleaned.auswahlChorId as string);
      } else {
        cleaned.auswahlChorId = null;
      }
      if (cleaned.createdById && usersMap.has(cleaned.createdById as string)) {
        cleaned.createdById = usersMap.get(cleaned.createdById as string);
      } else {
        cleaned.createdById = null;
      }
      if (cleaned.reviewerId && usersMap.has(cleaned.reviewerId as string)) {
        cleaned.reviewerId = usersMap.get(cleaned.reviewerId as string);
      } else {
        cleaned.reviewerId = null;
      }
      
      const created = await upsertRecord(db.event, cleaned);
      eventsMap.set(data.id, created.id);
    }
    console.log(`  ✓ Created ${eventsMap.size} events`);

    // 9. Seed Event Price Options (depends on Event)
    console.log("💰 Creating Event Price Options...");
    for (const data of EventPriceOptionSeedData) {
      const cleaned = cleanData(data);
      if (cleaned.eventId && eventsMap.has(cleaned.eventId as string)) {
        cleaned.eventId = eventsMap.get(cleaned.eventId as string);
        await upsertRecord(db.eventPriceOption, cleaned);
      }
    }
    console.log(`  ✓ Created ${EventPriceOptionSeedData.length} event price options`);

    // 10. Seed Downloads (depends on User)
    console.log("📥 Creating Downloads...");
    const downloadsMap = new Map<string, string>();
    for (const data of DownloadSeedData) {
      const cleaned = cleanData(data);
      if (cleaned.uploadedById && usersMap.has(cleaned.uploadedById as string)) {
        cleaned.uploadedById = usersMap.get(cleaned.uploadedById as string);
      } else {
        cleaned.uploadedById = null;
      }
      
      const created = await upsertRecord(db.download, cleaned);
      downloadsMap.set(data.id, created.id);
    }
    console.log(`  ✓ Created ${downloadsMap.size} downloads`);

    // 11. Seed Event Downloads (depends on Event, Download)
    console.log("🔗 Creating Event Downloads...");
    for (const data of EventDownloadSeedData) {
      const cleaned = cleanData(data);
      if (cleaned.eventId && eventsMap.has(cleaned.eventId as string) && cleaned.downloadId && downloadsMap.has(cleaned.downloadId as string)) {
        cleaned.eventId = eventsMap.get(cleaned.eventId as string);
        cleaned.downloadId = downloadsMap.get(cleaned.downloadId as string);
        // EventDownload has composite unique on eventId+downloadId - use create with error handling
        try {
          await db.eventDownload.create({ data: cleaned as any });
        } catch (error: any) {
          // Skip if already exists (unique constraint violation)
          if (error.code !== "P2002") throw error;
        }
      }
    }
    console.log(`  ✓ Created ${EventDownloadSeedData.length} event downloads`);

    // 12. Seed Courses (depends on User, Location, Media, Bezirk)
    console.log("📚 Creating Courses...");
    const coursesMap = new Map<string, string>();
    for (const data of CourseSeedData) {
      const cleaned = cleanData(data);
      if (cleaned.imageId && mediaMap.has(cleaned.imageId as string)) {
        cleaned.imageId = mediaMap.get(cleaned.imageId as string);
      } else {
        cleaned.imageId = null;
      }
      if (cleaned.locationId && locationsMap.has(cleaned.locationId as string)) {
        cleaned.locationId = locationsMap.get(cleaned.locationId as string);
      } else {
        cleaned.locationId = null;
      }
      if (cleaned.bezirkId && bezirkeMap.has(cleaned.bezirkId as string)) {
        cleaned.bezirkId = bezirkeMap.get(cleaned.bezirkId as string);
      } else {
        cleaned.bezirkId = null;
      }
      if (cleaned.createdById && usersMap.has(cleaned.createdById as string)) {
        cleaned.createdById = usersMap.get(cleaned.createdById as string);
      } else {
        cleaned.createdById = null;
      }
      if (cleaned.reviewerId && usersMap.has(cleaned.reviewerId as string)) {
        cleaned.reviewerId = usersMap.get(cleaned.reviewerId as string);
      } else {
        cleaned.reviewerId = null;
      }
      
      const created = await upsertRecord(db.course, cleaned);
      coursesMap.set(data.id, created.id);
    }
    console.log(`  ✓ Created ${coursesMap.size} courses`);

    // 13. Seed Course Instructors (many-to-many)
    console.log("👨‍🏫 Creating Course Instructors...");
    let instructorLinks = 0;
    // UUID regex to filter out corrupted data
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    for (const data of _CourseInstructorsSeedData) {
      const cleaned = cleanData(data);
      // A = courseId, B = userId - filter out non-UUID values
      if (cleaned.A && cleaned.B && 
          typeof cleaned.A === 'string' && typeof cleaned.B === 'string' &&
          uuidRegex.test(cleaned.A) && uuidRegex.test(cleaned.B) &&
          coursesMap.has(cleaned.A) && usersMap.has(cleaned.B)) {
        try {
          await db.course.update({
            where: { id: coursesMap.get(cleaned.A)! },
            data: {
              instructors: {
                connect: { id: usersMap.get(cleaned.B)! },
              },
            },
          });
          instructorLinks++;
        } catch (error) {
          // Skip if already connected or other error
        }
      }
    }
    console.log(`  ✓ Linked ${instructorLinks} course instructors`);

    // 14. Seed Course Custom Fields (depends on Course)
    console.log("📝 Creating Course Custom Fields...");
    for (const data of CourseCustomFieldSeedData) {
      const cleaned = cleanData(data);
      if (cleaned.courseId && coursesMap.has(cleaned.courseId as string)) {
        cleaned.courseId = coursesMap.get(cleaned.courseId as string);
        await upsertRecord(db.courseCustomField, cleaned);
      }
    }
    console.log(`  ✓ Created ${CourseCustomFieldSeedData.length} course custom fields`);

    // 15. Seed Course Price Options (depends on Course)
    console.log("💰 Creating Course Price Options...");
    for (const data of CoursePriceOptionSeedData) {
      const cleaned = cleanData(data);
      if (cleaned.courseId && coursesMap.has(cleaned.courseId as string)) {
        cleaned.courseId = coursesMap.get(cleaned.courseId as string);
        await upsertRecord(db.coursePriceOption, cleaned);
      }
    }
    console.log(`  ✓ Created ${CoursePriceOptionSeedData.length} course price options`);

    // 16. Seed Course Registrations (depends on Course, User)
    console.log("📝 Creating Course Registrations...");
    const registrationsMap = new Map<string, string>();
    for (const data of CourseRegistrationSeedData) {
      const cleaned = cleanData(data);
      if (cleaned.courseId && coursesMap.has(cleaned.courseId as string)) {
        cleaned.courseId = coursesMap.get(cleaned.courseId as string);
      } else {
        continue; // Skip if course doesn't exist
      }
      if (cleaned.registrantId && usersMap.has(cleaned.registrantId as string)) {
        cleaned.registrantId = usersMap.get(cleaned.registrantId as string);
      } else {
        cleaned.registrantId = null;
      }
      
      const created = await upsertRecord(db.courseRegistration, cleaned);
      registrationsMap.set(data.id, created.id);
    }
    console.log(`  ✓ Created ${registrationsMap.size} course registrations`);

    // 17. Seed Participants (depends on Course Registration)
    console.log("👤 Creating Participants...");
    for (const data of ParticipantSeedData) {
      const cleaned = cleanData(data);
      if (cleaned.registrationId && registrationsMap.has(cleaned.registrationId as string)) {
        cleaned.registrationId = registrationsMap.get(cleaned.registrationId as string);
        await upsertRecord(db.participant, cleaned);
      }
    }
    console.log(`  ✓ Created ${ParticipantSeedData.length} participants`);

    // 18. Seed Posts (depends on User, Bezirk, Media)
    console.log("📰 Creating Posts...");
    for (const data of PostSeedData) {
      const cleaned = cleanData(data);
      if (cleaned.coverImageId && mediaMap.has(cleaned.coverImageId as string)) {
        cleaned.coverImageId = mediaMap.get(cleaned.coverImageId as string);
      } else {
        cleaned.coverImageId = null;
      }
      if (cleaned.bezirkId && bezirkeMap.has(cleaned.bezirkId as string)) {
        cleaned.bezirkId = bezirkeMap.get(cleaned.bezirkId as string);
      } else {
        cleaned.bezirkId = null;
      }
      if (cleaned.authorId && usersMap.has(cleaned.authorId as string)) {
        cleaned.authorId = usersMap.get(cleaned.authorId as string);
      } else {
        cleaned.authorId = null;
      }
      if (cleaned.createdById && usersMap.has(cleaned.createdById as string)) {
        cleaned.createdById = usersMap.get(cleaned.createdById as string);
      } else {
        cleaned.createdById = null;
      }
      if (cleaned.reviewerId && usersMap.has(cleaned.reviewerId as string)) {
        cleaned.reviewerId = usersMap.get(cleaned.reviewerId as string);
      } else {
        cleaned.reviewerId = null;
      }
      
      await upsertRecord(db.post, cleaned);
    }
    console.log(`  ✓ Created ${PostSeedData.length} posts`);

    // 19. Seed Team Members (depends on User)
    console.log("👔 Creating Team Members...");
    for (const data of TeamMemberSeedData) {
      const cleaned = cleanData(data);
      if (cleaned.userId && usersMap.has(cleaned.userId as string)) {
        cleaned.userId = usersMap.get(cleaned.userId as string);
        await upsertRecord(db.teamMember, cleaned, "userId");
      }
    }
    console.log(`  ✓ Created ${TeamMemberSeedData.length} team members`);

    // 20. Seed Vorstand Members (depends on User, Media)
    console.log("👔 Creating Vorstand Members...");
    for (const data of VorstandMemberSeedData) {
      const cleaned = cleanData(data);
      if (cleaned.userId && usersMap.has(cleaned.userId as string)) {
        cleaned.userId = usersMap.get(cleaned.userId as string);
      } else {
        cleaned.userId = null;
      }
      if (cleaned.imageId && mediaMap.has(cleaned.imageId as string)) {
        cleaned.imageId = mediaMap.get(cleaned.imageId as string);
      } else {
        cleaned.imageId = null;
      }
      
      // VorstandMember uses userId or imageId as unique, try userId first
      if (cleaned.userId) {
        await upsertRecord(db.vorstandMember, cleaned, "userId");
      } else if (cleaned.imageId) {
        await upsertRecord(db.vorstandMember, cleaned, "imageId");
      } else {
        await upsertRecord(db.vorstandMember, cleaned);
      }
    }
    console.log(`  ✓ Created ${VorstandMemberSeedData.length} vorstand members`);

    // 21. Seed Posaunenrat Members (depends on User, Media)
    console.log("🎖️ Creating Posaunenrat Members...");
    for (const data of PosaunenratMemberSeedData) {
      const cleaned = cleanData(data);
      if (cleaned.userId && usersMap.has(cleaned.userId as string)) {
        cleaned.userId = usersMap.get(cleaned.userId as string);
      } else {
        cleaned.userId = null;
      }
      if (cleaned.imageId && mediaMap.has(cleaned.imageId as string)) {
        cleaned.imageId = mediaMap.get(cleaned.imageId as string);
      } else {
        cleaned.imageId = null;
      }
      
      // PosaunenratMember uses userId as unique if present
      if (cleaned.userId) {
        await upsertRecord(db.posaunenratMember, cleaned, "userId");
      } else {
        await upsertRecord(db.posaunenratMember, cleaned);
      }
    }
    console.log(`  ✓ Created ${PosaunenratMemberSeedData.length} posaunenrat members`);

    // 22. Seed Förderverein Members (depends on User, Media)
    console.log("🤝 Creating Förderverein Members...");
    for (const data of FoerdervereinMemberSeedData) {
      const cleaned = cleanData(data);
      if (cleaned.userId && usersMap.has(cleaned.userId as string)) {
        cleaned.userId = usersMap.get(cleaned.userId as string);
      } else {
        cleaned.userId = null;
      }
      if (cleaned.imageId && mediaMap.has(cleaned.imageId as string)) {
        cleaned.imageId = mediaMap.get(cleaned.imageId as string);
      } else {
        cleaned.imageId = null;
      }
      
      // FoerdervereinMember uses userId as unique if present
      if (cleaned.userId) {
        await upsertRecord(db.foerdervereinMember, cleaned, "userId");
      } else {
        await upsertRecord(db.foerdervereinMember, cleaned);
      }
    }
    console.log(`  ✓ Created ${FoerdervereinMemberSeedData.length} förderverein members`);

    // 23. Seed Posaunenwarte Responsibilities (depends on User, Bezirk)
    console.log("🎺 Creating Posaunenwarte Responsibilities...");
    for (const data of PosaunenwartResponsibilitySeedData) {
      const cleaned = cleanData(data);
      if (cleaned.userId && usersMap.has(cleaned.userId as string) && cleaned.bezirkId && bezirkeMap.has(cleaned.bezirkId as string)) {
        cleaned.userId = usersMap.get(cleaned.userId as string);
        cleaned.bezirkId = bezirkeMap.get(cleaned.bezirkId as string);
        // PosaunenwartResponsibility has composite unique on userId+bezirkId - use create with error handling
        try {
          await db.posaunenwartResponsibility.create({ data: cleaned as any });
        } catch (error: any) {
          // Skip if already exists (unique constraint violation)
          if (error.code !== "P2002") throw error;
        }
      }
    }
    console.log(`  ✓ Created ${PosaunenwartResponsibilitySeedData.length} posaunenwarte responsibilities`);

    // 24. Seed Bläserhefte (depends on Media)
    console.log("📖 Creating Bläserhefte...");
    for (const data of BlaeserheftSeedData) {
      const cleaned = cleanData(data);
      if (cleaned.imageId && mediaMap.has(cleaned.imageId as string)) {
        cleaned.imageId = mediaMap.get(cleaned.imageId as string);
        await upsertRecord(db.blaeserheft, cleaned);
      }
    }
    console.log(`  ✓ Created ${BlaeserheftSeedData.length} bläserhefte`);

    // 25. Seed History Events (depends on Media)
    console.log("📜 Creating History Events...");
    for (const data of HistoryEventSeedData) {
      const cleaned = cleanData(data);
      if (cleaned.imageId && mediaMap.has(cleaned.imageId as string)) {
        cleaned.imageId = mediaMap.get(cleaned.imageId as string);
      } else {
        cleaned.imageId = null;
      }
      
      await upsertRecord(db.historyEvent, cleaned);
    }
    console.log(`  ✓ Created ${HistoryEventSeedData.length} history events`);

    // 26. Seed Homepage Carousel Items (depends on Media)
    console.log("🎠 Creating Homepage Carousel Items...");
    for (const data of HomepageCarouselItemSeedData) {
      const cleaned = cleanData(data);
      if (cleaned.mediaId && mediaMap.has(cleaned.mediaId as string)) {
        cleaned.mediaId = mediaMap.get(cleaned.mediaId as string);
        await upsertRecord(db.homepageCarouselItem, cleaned);
      }
    }
    console.log(`  ✓ Created ${HomepageCarouselItemSeedData.length} homepage carousel items`);

    // 27. Seed Saved Participants (depends on User)
    console.log("💾 Creating Saved Participants...");
    for (const data of SavedParticipantSeedData) {
      const cleaned = cleanData(data);
      if (cleaned.userId && usersMap.has(cleaned.userId as string)) {
        cleaned.userId = usersMap.get(cleaned.userId as string);
        await upsertRecord(db.savedParticipant, cleaned);
      }
    }
    console.log(`  ✓ Created ${SavedParticipantSeedData.length} saved participants`);

    // 28. Seed Newsletter Subscribers (no dependencies)
    console.log("📧 Creating Newsletter Subscribers...");
    let subscriberCount = 0;
    for (const data of NewsletterSubscriberSeedData) {
      const cleaned = cleanData(data);
      // Skip records with null, invalid, or non-email values (required field)
      if (!cleaned.email || 
          cleaned.email === "N" || 
          cleaned.email === "\\N" || 
          cleaned.email === null ||
          !cleaned.email.includes("@") ||
          cleaned.id === "." ||
          cleaned.id === "--" ||
          cleaned.id.includes("-- Data for")) {
        continue;
      }
      // Ensure isActive is boolean
      if (typeof cleaned.isActive !== "boolean") {
        cleaned.isActive = cleaned.isActive === "t" || cleaned.isActive === true || cleaned.isActive === "true";
      }
      await upsertRecord(db.newsletterSubscriber, cleaned, "email");
      subscriberCount++;
    }
    console.log(`  ✓ Created ${subscriberCount} newsletter subscribers`);

    // 29. Seed Auth-related tables (Account, Session, TwoFactor, Verification)
    console.log("🔐 Creating Auth data...");
    for (const data of AccountSeedData) {
      const cleaned = cleanData(data);
      if (cleaned.userId && usersMap.has(cleaned.userId as string)) {
        cleaned.userId = usersMap.get(cleaned.userId as string);
        await upsertRecord(db.account, cleaned);
      }
    }
    console.log(`  ✓ Created ${AccountSeedData.length} accounts`);

    for (const data of SessionSeedData) {
      const cleaned = cleanData(data);
      if (cleaned.userId && usersMap.has(cleaned.userId as string)) {
        cleaned.userId = usersMap.get(cleaned.userId as string);
        await upsertRecord(db.session, cleaned);
      }
    }
    console.log(`  ✓ Created ${SessionSeedData.length} sessions`);

    // Skip TwoFactor seeding - 2FA is disabled for all users after restore
    // The backup codes won't work in the new environment, so we don't seed them
    console.log("  ⚠ Skipping TwoFactor records (2FA disabled for all users)");

    for (const data of VerificationSeedData) {
      const cleaned = cleanData(data);
      await upsertRecord(db.verification, cleaned);
    }
    console.log(`  ✓ Created ${VerificationSeedData.length} verification records`);

    // 30. Seed Page Views (depends on User, but can be null)
    console.log("👁️ Creating Page Views...");
    for (const data of PageViewSeedData) {
      const cleaned = cleanData(data);
      if (cleaned.userId && usersMap.has(cleaned.userId as string)) {
        cleaned.userId = usersMap.get(cleaned.userId as string);
      } else {
        cleaned.userId = null;
      }
      
      // PageView - use create with error handling for duplicates
      try {
        await db.pageView.create({
          data: cleaned as any,
        });
      } catch (error: any) {
        // Skip if already exists (unique constraint violation)
        if (error.code !== "P2002") throw error;
      }
    }
    console.log(`  ✓ Created ${PageViewSeedData.length} page views`);

    // Final cleanup: Ensure all users have 2FA disabled and delete any TwoFactor records
    console.log("");
    console.log("🔒 Disabling 2FA for all users and cleaning up TwoFactor records...");
    await db.user.updateMany({
      data: { twoFactorEnabled: false },
    });
    await db.twoFactor.deleteMany({});
    console.log("  ✓ 2FA disabled for all users");

    console.log("");
    console.log("✅ Seed from backup completed successfully!");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
