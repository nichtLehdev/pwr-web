import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";

import { eventsRouter } from "./routers/events";
import { coursesRouter } from "./routers/courses";
import { registrationsRouter } from "./routers/registrations";
import { postsRouter } from "./routers/posts";
import { ensemblesRouter } from "./routers/ensembles";
import { auswahlchoereRouter } from "./routers/auswahlchoere";
import { bezirkeRouter } from "./routers/bezirke";
import { mediaRouter } from "./routers/media";
import { materialsRouter } from "./routers/materials";
import { locationsRouter, newsletterRouter } from "./routers/utils";
import { organizationRouter } from "./routers/organization";
import { usersRouter } from "./routers/users";
import { searchRouter } from "./routers/search";
import { savedParticipantsRouter } from "./routers/saved-participants";
import { homepageRouter } from "./routers/homepage";
import { statsRouter } from "./routers/stats";
import { permissionsRouter } from "./routers/permissions";
import { auditRouter } from "./routers/audit";
import { notificationsRouter } from "./routers/notifications";
import { contactRouter } from "./routers/contact";
import { noteSetsRouter } from "./routers/note-sets";
import { gamesRouter } from "./routers/games";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  users: usersRouter,
  events: eventsRouter,
  courses: coursesRouter,
  registrations: registrationsRouter,
  posts: postsRouter,
  ensembles: ensemblesRouter,
  auswahlchoere: auswahlchoereRouter,
  bezirke: bezirkeRouter,
  media: mediaRouter,
  organization: organizationRouter,
  materials: materialsRouter,
  locations: locationsRouter,
  newsletter: newsletterRouter,
  search: searchRouter,
  savedParticipants: savedParticipantsRouter,
  homepage: homepageRouter,
  stats: statsRouter,
  permissions: permissionsRouter,
  audit: auditRouter,
  notifications: notificationsRouter,
  contact: contactRouter,
  noteSets: noteSetsRouter,
  games: gamesRouter,
});

export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
