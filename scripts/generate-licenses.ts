/**
 * Regenerates src/lib/licenses.generated.ts from the packages we depend on
 * directly, i.e. the ones listed in our own package.json.
 *
 * The licence page used to be a hand-maintained list in the Impressum. It named
 * 15 packages while 45 were shipping — a list that goes stale silently is worse
 * than none, so it is derived now and runs as part of `pnpm build`.
 *
 * Each package's own copyright line comes along: MIT, ISC and BSD all require
 * the notice to travel with the software, and that notice differs per package
 * while the licence body does not.
 *
 * Fails soft on purpose: a build must not break because `pnpm licenses` could
 * not run. The previously generated (and committed) file then stays in place.
 */
import { execFileSync } from "child_process";
import { readdirSync, readFileSync, statSync, writeFileSync } from "fs";
import { join, resolve } from "path";

interface PnpmLicenseEntry {
  name: string;
  versions?: string[];
  license?: string;
  author?: string;
  homepage?: string;
  description?: string;
  paths?: string[];
}

interface LicensePackage {
  name: string;
  versions: string[];
  license: string;
  description: string | null;
  homepage: string | null;
  copyright: string | null;
}

const ROOT = resolve(import.meta.dirname, "..");
const OUT_FILE = resolve(ROOT, "src/lib/licenses.generated.ts");

function directDependencies(): Set<string> {
  const pkg = JSON.parse(
    readFileSync(resolve(ROOT, "package.json"), "utf8"),
  ) as { dependencies?: Record<string, string> };
  return new Set(Object.keys(pkg.dependencies ?? {}));
}

/**
 * The copyright line out of a package's own LICENSE file. Apache-2.0 packages
 * usually ship the bare licence with no such line — null is the right answer
 * there, not a fabricated notice.
 */
function copyrightNotice(packagePath: string | undefined): string | null {
  if (!packagePath) return null;
  try {
    if (!statSync(packagePath).isDirectory()) return null;
    const file = readdirSync(packagePath).find((name) =>
      /^(licen[cs]e|copying)/i.test(name),
    );
    if (!file) return null;

    const lines = readFileSync(join(packagePath, file), "utf8")
      .split(/\r?\n/)
      .map((l) => l.trim());

    // Must *start* with the notice: the Apache boilerplate merely mentions
    // "the copyright owner" mid-sentence and would match otherwise.
    const start = lines.findIndex((l) => /^copyright\b/i.test(l));
    if (start === -1) return null;

    const holders = /\d|\(c\)|©/i.test(lines[start]!) ? [lines[start]!] : [];
    if (holders.length === 0) {
      // Some packages (jsPDF) put a bare "Copyright" heading above the
      // holders, one per line, until the first blank line.
      for (const line of lines.slice(start + 1)) {
        if (!line) break;
        if (!/^(\(c\)|©|\d)/i.test(line)) break;
        holders.push(line);
      }
      if (holders.length === 0) return null;
      holders.unshift("Copyright");
    }

    return holders.join(" ").replace(/\s+/g, " ").trim();
  } catch {
    return null;
  }
}

function collect(): LicensePackage[] {
  // --prod skips our dev toolchain; the direct filter below then drops
  // everything that only comes along transitively.
  const raw = execFileSync("pnpm", ["licenses", "list", "--prod", "--json"], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });

  const byLicense = JSON.parse(raw) as Record<string, PnpmLicenseEntry[]>;
  const direct = directDependencies();

  const packages = Object.entries(byLicense).flatMap(([license, entries]) =>
    entries
      .filter((entry) => direct.has(entry.name))
      .map((entry) => ({
        name: entry.name,
        versions: [...new Set(entry.versions ?? [])].sort(),
        license: entry.license ?? license,
        description: entry.description?.trim() || null,
        homepage: entry.homepage?.trim() || null,
        copyright: copyrightNotice(entry.paths?.[0]),
      })),
  );

  return packages.sort((a, b) =>
    a.name.localeCompare(b.name, "en", { sensitivity: "base" }),
  );
}

function render(packages: LicensePackage[]): string {
  // No timestamp in the output: this runs on every build, and a moving date
  // would produce a diff on every build even when nothing changed.
  return `// AUTO-GENERATED — do not edit by hand.
// Run \`pnpm licenses:generate\` (or any \`pnpm build\`) to refresh.
//
// Source: the dependencies in our own package.json, resolved through
// \`pnpm licenses list --prod --json\`. Packages that only come along
// transitively are deliberately not listed.

export interface LicensePackage {
  name: string;
  versions: string[];
  license: string;
  description: string | null;
  homepage: string | null;
  /** Copyright line from the package's own LICENSE file, where it has one. */
  copyright: string | null;
}

export const LICENSE_PACKAGES: LicensePackage[] = ${JSON.stringify(
    packages,
    null,
    2,
  )};
`;
}

try {
  const packages = collect();
  if (packages.length === 0) throw new Error("no packages resolved");
  writeFileSync(OUT_FILE, render(packages), "utf8");
  console.log(
    `[licenses] wrote ${packages.length} direct dependencies to src/lib/licenses.generated.ts`,
  );
} catch (error) {
  console.warn(
    "[licenses] could not regenerate, keeping the committed list:",
    error instanceof Error ? error.message : error,
  );
}
