import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";
import { mkdtemp, mkdir, writeFile, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

/**
 * Download files are plain uploads referenced by URL, with no Media row behind
 * them, so they only reach the ZIP through the filePaths argument. UPLOADS_ROOT
 * is read at module load, hence the dynamic import after the env var is set.
 */
describe("export/import ZIP round trip for raw upload files", () => {
  let uploadsRoot: string;

  const loadModule = async () => await import("../export-import");

  beforeAll(async () => {
    uploadsRoot = await mkdtemp(join(tmpdir(), "pwr-uploads-"));
    process.env.UPLOADS_DIR = uploadsRoot;

    await mkdir(join(uploadsRoot, "downloads"), { recursive: true });
    await writeFile(
      join(uploadsRoot, "downloads", "noten.pdf"),
      "%PDF-1.4 noten",
    );
    await writeFile(
      join(uploadsRoot, "downloads", "anmeldung.pdf"),
      "%PDF-1.4 anmeldung",
    );
  });

  afterAll(async () => {
    await rm(uploadsRoot, { recursive: true, force: true });
  });

  it("packs the referenced files and restores them on extract", async () => {
    const { createExportZip, extractImportZip } = await loadModule();

    const payload = {
      downloads: [
        { id: "d1", fileUrl: "/api/uploads/downloads/noten.pdf" },
        { id: "d2", fileUrl: "/api/uploads/downloads/anmeldung.pdf" },
      ],
      count: 2,
    };

    const zipBuffer = await createExportZip(payload, [], "downloads.json", [
      "/api/uploads/downloads/noten.pdf",
      "/api/uploads/downloads/anmeldung.pdf",
    ]);

    const extracted = await extractImportZip(zipBuffer);

    expect(extracted.fileMapping).toEqual({
      "/api/uploads/downloads/noten.pdf": "noten.pdf",
      "/api/uploads/downloads/anmeldung.pdf": "anmeldung.pdf",
    });
    expect(extracted.uploadFiles.get("noten.pdf")?.toString()).toBe(
      "%PDF-1.4 noten",
    );
    expect(extracted.uploadFiles.get("anmeldung.pdf")?.toString()).toBe(
      "%PDF-1.4 anmeldung",
    );
  });

  it("keeps the payload JSON separate from the file mapping", async () => {
    const { createExportZip, extractImportZip } = await loadModule();

    const payload = { downloads: [{ id: "d1" }], count: 1 };

    const zipBuffer = await createExportZip(payload, [], "downloads.json", [
      "/api/uploads/downloads/noten.pdf",
    ]);

    const extracted = await extractImportZip(zipBuffer);

    // file-mapping.json is also a root-level .json: it must never be read as
    // the payload, or the import would silently find no records at all.
    expect(extracted.jsonData).toEqual(payload);
  });

  it("skips paths that are not managed uploads", async () => {
    const { createExportZip, extractImportZip } = await loadModule();

    const zipBuffer = await createExportZip(
      { downloads: [] },
      [],
      "downloads.json",
      ["https://example.com/extern.pdf", "/api/uploads/downloads/fehlt.pdf"],
    );

    const extracted = await extractImportZip(zipBuffer);

    expect(extracted.fileMapping).toEqual({});
    expect(extracted.uploadFiles.size).toBe(0);
  });
});

describe("buildImportFilename", () => {
  const loadModule = async () => await import("../export-import");

  it("strips separators from the extension so a ZIP entry cannot traverse", async () => {
    const { buildImportFilename } = await loadModule();

    // "a./../../evil".split(".").pop() is "/../../evil" — used raw, this walks
    // straight out of the uploads folder.
    const { filename, extension } = buildImportFilename(
      "a./../../evil",
      "user1234abcd",
      1700000000000,
      0,
    );

    expect(extension).toBe("evil");
    expect(filename).not.toContain("/");
    expect(filename).not.toContain("..");
  });

  it("strips separators from the base name", async () => {
    const { buildImportFilename } = await loadModule();

    const { filename } = buildImportFilename(
      "../../../etc/passwd.png",
      "user1234abcd",
      1700000000000,
      0,
    );

    expect(filename).not.toContain("/");
    expect(filename).not.toContain("..");
    expect(filename.endsWith(".png")).toBe(true);
  });

  it("keeps files apart whose names collapse to the same base", async () => {
    const { buildImportFilename } = await loadModule();

    const first = buildImportFilename(
      "a b.png",
      "user1234abcd",
      1700000000000,
      0,
    );
    const second = buildImportFilename(
      "a+b.png",
      "user1234abcd",
      1700000000000,
      1,
    );

    expect(first.filename).not.toBe(second.filename);
  });

  it("falls back for names without a usable extension or base", async () => {
    const { buildImportFilename } = await loadModule();

    expect(buildImportFilename("noext", "u", 1, 0).extension).toBe("noext");
    // ".png" has no base left after the extension is split off
    expect(buildImportFilename(".png", "u", 1, 0).filename).toContain("file-");
  });
});
