import { describe, expect, it } from "@jest/globals";
import { FileType } from "~/generated/prisma/enums";
import {
  DOWNLOAD_FILE_TYPE_ICONS,
  DOWNLOAD_FILE_TYPE_LABELS,
  DOWNLOAD_UPLOAD_ACCEPT,
  DOWNLOAD_UPLOAD_MIME_TYPES,
  downloadAttachmentUrl,
  downloadFileTypeForExtension,
  downloadFormatCode,
  isPreviewableImageDownload,
} from "../download-file-types";

describe("Download-Dateitypen", () => {
  it("beschriftet und bebildert jeden FileType, auch künftige", () => {
    for (const type of Object.values(FileType)) {
      expect(DOWNLOAD_FILE_TYPE_LABELS[type]).toBeTruthy();
      expect(DOWNLOAD_FILE_TYPE_ICONS[type]).toBeTruthy();
    }
    expect(DOWNLOAD_FILE_TYPE_LABELS.IMAGE).toBe("Bild");
  });

  it("nimmt JPG, PNG und WebP an, aber kein GIF und kein SVG", () => {
    const types: readonly string[] = DOWNLOAD_UPLOAD_MIME_TYPES;
    expect(types).toEqual(
      expect.arrayContaining(["image/jpeg", "image/png", "image/webp"]),
    );
    expect(types).not.toContain("image/gif");
    expect(types).not.toContain("image/svg+xml");
    expect(DOWNLOAD_UPLOAD_ACCEPT.split(",")).toEqual(
      expect.arrayContaining([".jpg", ".jpeg", ".png", ".webp", ".pdf"]),
    );
  });
});

describe("downloadFileTypeForExtension", () => {
  it.each([
    ["pdf", FileType.PDF],
    ["docx", FileType.DOCX],
    ["doc", FileType.DOCX],
    ["xls", FileType.XLSX],
    ["zip", FileType.ZIP],
    ["wav", FileType.MP3],
    ["jpg", FileType.IMAGE],
    ["JPEG", FileType.IMAGE],
    [".png", FileType.IMAGE],
    ["webp", FileType.IMAGE],
  ])("%s → %s", (extension, expected) => {
    expect(downloadFileTypeForExtension(extension)).toBe(expected);
  });

  it("gibt für fremde Endungen null statt still PDF zurück", () => {
    expect(downloadFileTypeForExtension("gif")).toBeNull();
    expect(downloadFileTypeForExtension("svg")).toBeNull();
    expect(downloadFileTypeForExtension("")).toBeNull();
    // Kein Treffer über den Objekt-Prototyp.
    expect(downloadFileTypeForExtension("constructor")).toBeNull();
  });
});

describe("isPreviewableImageDownload", () => {
  it("zeigt Bilder aus dem eigenen Upload-Ordner als Vorschau", () => {
    expect(
      isPreviewableImageDownload({
        fileType: FileType.IMAGE,
        fileUrl: "/api/uploads/downloads/flyer-abc-1.png",
      }),
    ).toBe(true);
    expect(
      isPreviewableImageDownload({
        fileType: FileType.IMAGE,
        fileUrl: "/api/uploads/downloads/flyer-abc-1.JPG",
      }),
    ).toBe(true);
  });

  it("lässt fremde Hosts draußen, die next/image nicht laden darf", () => {
    expect(
      isPreviewableImageDownload({
        fileType: FileType.IMAGE,
        fileUrl: "https://example.org/flyer.png",
      }),
    ).toBe(false);
  });

  it("verlässt sich nicht allein auf den Typ", () => {
    expect(
      isPreviewableImageDownload({
        fileType: FileType.IMAGE,
        fileUrl: "/api/uploads/downloads/versehentlich.pdf",
      }),
    ).toBe(false);
    expect(
      isPreviewableImageDownload({
        fileType: FileType.PDF,
        fileUrl: "/api/uploads/downloads/flyer.png",
      }),
    ).toBe(false);
  });
});

describe("downloadFormatCode", () => {
  it("nennt bei Bildern das Format statt des Sammeltyps", () => {
    expect(
      downloadFormatCode({
        fileType: FileType.IMAGE,
        fileUrl: "/api/uploads/downloads/a.jpeg?x=1",
      }),
    ).toBe("JPG");
    expect(
      downloadFormatCode({
        fileType: FileType.IMAGE,
        fileUrl: "/api/uploads/downloads/a.webp",
      }),
    ).toBe("WebP");
    expect(
      downloadFormatCode({
        fileType: FileType.IMAGE,
        fileUrl: "https://example.org/bild",
      }),
    ).toBe("Bild");
  });

  it("lässt die übrigen Kürzel wie bisher", () => {
    expect(
      downloadFormatCode({ fileType: FileType.DOCX, fileUrl: "/x.docx" }),
    ).toBe("DOCX");
    expect(
      downloadFormatCode({ fileType: FileType.PDF, fileUrl: "/x.pdf" }),
    ).toBe("PDF");
  });
});

describe("downloadAttachmentUrl", () => {
  it("hängt Download-Schalter und lesbaren Namen an eigene Uploads", () => {
    const url = downloadAttachmentUrl({
      fileUrl: "/api/uploads/downloads/flyer-abc-1.png",
      title: "Flyer Landesposaunentag & Kirchentag",
    });
    const [path, query] = url.split("?");
    expect(path).toBe("/api/uploads/downloads/flyer-abc-1.png");
    const params = new URLSearchParams(query);
    expect(params.get("download")).toBe("1");
    expect(params.get("name")).toBe("Flyer Landesposaunentag & Kirchentag");
  });

  it("lässt fremde URLs unverändert", () => {
    expect(
      downloadAttachmentUrl({
        fileUrl: "https://example.org/flyer.png",
        title: "Flyer",
      }),
    ).toBe("https://example.org/flyer.png");
  });
});
