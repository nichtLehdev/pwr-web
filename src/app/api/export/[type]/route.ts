import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/better-auth";
import { db } from "@/server/db";
import {
  createExportZip,
  collectMediaFromEntities,
} from "@/server/utils/export-import";
import type { Media } from "~/generated/prisma/client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> },
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { type } = await params;
    const date = new Date().toISOString().split("T")[0];

    let jsonData: Record<string, unknown>;
    let mediaFiles: Array<{
      coverImage?: Media | null;
      image?: Media | null;
      ensemble?: { image?: Media | null } | null;
      auswahlChor?: { image?: Media | null } | null;
    }> = [];
    let filename: string;

    switch (type) {
      case "posts": {
        const posts = await db.post.findMany({
          include: {
            coverImage: true,
            bezirk: true,
            createdBy: {
              select: {
                id: true,
                displayName: true,
                email: true,
              },
            },
            reviewer: {
              select: {
                id: true,
                displayName: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        });

        jsonData = {
          posts: posts.map((post) => ({
            ...post,
            coverImageUrl: post.coverImage?.url,
            bezirkName: post.bezirk?.name,
            createdByEmail: post.createdBy?.email,
            reviewerEmail: post.reviewer?.email,
          })),
          exportedAt: new Date().toISOString(),
          count: posts.length,
        };

        mediaFiles = posts;
        filename = `posts-export-${date}.zip`;
        break;
      }

      case "events": {
        const events = await db.event.findMany({
          include: {
            coverImage: true,
            location: true,
            bezirk: true,
            ensemble: {
              include: {
                conductor: {
                  select: {
                    id: true,
                    displayName: true,
                    email: true,
                  },
                },
                image: true,
              },
            },
            auswahlChor: {
              include: {
                conductor: {
                  select: {
                    id: true,
                    displayName: true,
                    email: true,
                  },
                },
                image: true,
              },
            },
          },
          orderBy: { eventDate: "desc" },
        });

        jsonData = {
          events: events.map((event) => ({
            ...event,
            coverImageUrl: event.coverImage?.url,
            locationName: event.location?.name,
            bezirkName: event.bezirk?.name,
            ensembleName: event.ensemble?.name,
            auswahlChorName: event.auswahlChor?.name,
          })),
          exportedAt: new Date().toISOString(),
          count: events.length,
        };

        mediaFiles = events;
        filename = `events-export-${date}.zip`;
        break;
      }

      case "ensembles": {
        const ensembles = await db.ensemble.findMany({
          include: {
            image: true,
            location: true,
            bezirk: true,
            conductor: {
              select: {
                id: true,
                displayName: true,
                email: true,
              },
            },
            representative: {
              select: {
                id: true,
                displayName: true,
                email: true,
              },
            },
          },
          orderBy: { name: "asc" },
        });

        jsonData = {
          ensembles: ensembles.map((ensemble) => ({
            ...ensemble,
            imageUrl: ensemble.image?.url,
            locationName: ensemble.location?.name,
            bezirkName: ensemble.bezirk?.name,
            conductorEmail: ensemble.conductor?.email,
            representativeEmail: ensemble.representative?.email,
          })),
          exportedAt: new Date().toISOString(),
          count: ensembles.length,
        };

        mediaFiles = ensembles;
        filename = `ensembles-export-${date}.zip`;
        break;
      }

      case "media": {
        const media = await db.media.findMany({
          include: {
            uploadedBy: {
              select: {
                id: true,
                displayName: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        });

        jsonData = {
          media: media.map((item) => ({
            ...item,
            uploadedByEmail: item.uploadedBy?.email,
          })),
          exportedAt: new Date().toISOString(),
          count: media.length,
        };

        const mediaList = await db.media.findMany();
        const zipBuffer = await createExportZip(
          jsonData,
          mediaList,
          "media.json",
        );

        return new NextResponse(zipBuffer as unknown as BodyInit, {
          headers: {
            "Content-Type": "application/zip",
            "Content-Disposition": `attachment; filename="media-export-${date}.zip"`,
          },
        });
      }

      case "downloads": {
        const downloads = await db.download.findMany({
          include: {
            uploadedBy: {
              select: {
                id: true,
                displayName: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        });

        jsonData = {
          downloads: downloads.map((download) => ({
            ...download,
            tags: (download.tags as string[]) || [],
            uploadedByEmail: download.uploadedBy?.email,
          })),
          exportedAt: new Date().toISOString(),
          count: downloads.length,
        };

        const { createExportZip } =
          await import("@/server/utils/export-import");
        const zipBuffer = await createExportZip(jsonData, [], "downloads.json");

        return new NextResponse(zipBuffer as unknown as BodyInit, {
          headers: {
            "Content-Type": "application/zip",
            "Content-Disposition": `attachment; filename="downloads-export-${date}.zip"`,
          },
        });
      }

      case "blaeserhefte": {
        const blaeserhefte = await db.blaeserheft.findMany({
          include: {
            image: true,
          },
          orderBy: { year: "desc" },
        });

        jsonData = {
          blaeserhefte: blaeserhefte.map((bh) => ({
            ...bh,
            imageUrl: bh.image?.url,
          })),
          exportedAt: new Date().toISOString(),
          count: blaeserhefte.length,
        };

        mediaFiles = blaeserhefte;
        filename = `blaeserhefte-export-${date}.zip`;
        break;
      }

      case "courses": {
        const courses = await db.course.findMany({
          include: {
            location: true,
            bezirk: true,
            createdBy: {
              select: {
                id: true,
                displayName: true,
                email: true,
              },
            },
            reviewer: {
              select: {
                id: true,
                displayName: true,
                email: true,
              },
            },
          },
          orderBy: { startDate: "desc" },
        });

        jsonData = {
          courses: courses.map((course) => ({
            ...course,
            locationName: course.location?.name,
            bezirkName: course.bezirk?.name,
            createdByEmail: course.createdBy?.email,
            reviewerEmail: course.reviewer?.email,
          })),
          exportedAt: new Date().toISOString(),
          count: courses.length,
        };

        const zipBuffer = await createExportZip(jsonData, [], "courses.json");

        return new NextResponse(zipBuffer as unknown as BodyInit, {
          headers: {
            "Content-Type": "application/zip",
            "Content-Disposition": `attachment; filename="courses-export-${date}.zip"`,
          },
        });
      }

      default:
        return NextResponse.json(
          { error: "Invalid export type" },
          { status: 400 },
        );
    }

    const mediaList = collectMediaFromEntities(mediaFiles);
    const zipBuffer = await createExportZip(
      jsonData,
      mediaList,
      `${type}.json`,
    );

    return new NextResponse(zipBuffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Failed to export data" },
      { status: 500 },
    );
  }
}
