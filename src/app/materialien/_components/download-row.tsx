import { Download } from "lucide-react";
import { SmartLink } from "@/app/_components/programmheft/link";
import { Tag } from "@/app/_components/programmheft/tag";
import type { RouterOutputs } from "@/trpc/react";
import { downloadFormatCode } from "@/lib/download-file-types";
import { formatBerlin } from "@/lib/berlin-time";

export type DownloadItem =
  RouterOutputs["materials"]["getDownloads"]["downloads"][number];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

/** Wegzeile, erweitert um Dateimeta (Typ, Größe, Datum), Auszug und Tags. */
export function DownloadRow({ download }: { download: DownloadItem }) {
  // Formatkürzel statt Enum-Wert: „PNG“ statt „IMAGE“, auch für den Screenreader.
  const fileType = downloadFormatCode(download);
  const date = formatBerlin(download.createdAt);

  return (
    <li className="fill-row border-rule dark:border-night-rule border-b">
      <SmartLink
        href={download.fileUrl}
        kind="download"
        fileType={fileType}
        className="flex items-start justify-between gap-6 px-1 py-5"
      >
        <span className="min-w-0">
          <span className="condensed text-ink dark:text-night-text block text-[1.5rem] leading-tight font-bold">
            {download.title}
          </span>
          <span className="semi-condensed text-dark dark:text-night-muted mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold">
            <span>{fileType}</span>
            {download.fileSize ? (
              <span>{formatFileSize(download.fileSize)}</span>
            ) : null}
            <span>{date}</span>
          </span>
          {download.description ? (
            <span className="text-dark dark:text-night-muted mt-2 block max-w-[60ch] text-base leading-relaxed">
              {download.description}
            </span>
          ) : null}
          {download.tags && download.tags.length > 0 ? (
            <span className="mt-3 flex flex-wrap gap-1.5">
              {download.tags.map((tag) => (
                <Tag key={tag} tone="inverse">
                  {tag}
                </Tag>
              ))}
            </span>
          ) : null}
        </span>
        <Download
          aria-hidden
          className="text-ink dark:text-night-text mt-1 h-5 w-5 shrink-0"
        />
      </SmartLink>
    </li>
  );
}
