"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import QRCode from "qrcode";
import { createPortal } from "react-dom";
import {
  CheckIcon,
  ChevronDownIcon,
  CopyIcon,
  DownloadIcon,
  QrCodeIcon,
  Share2Icon,
  XIcon,
} from "lucide-react";

type PublicShareButtonProps = {
  title: string;
  text?: string;
  className?: string;
  label?: string;
};

/** Schaltfläche im Dialog: eckig, Haarlinie, füllt sich beim Zeigen mit Tinte. */
const DIALOG_BUTTON =
  "semi-condensed border-ink text-ink hover:bg-ink hover:text-paper dark:border-night-rule dark:text-night-text dark:hover:bg-night-text dark:hover:text-night inline-flex min-h-11 items-center justify-center gap-2 border-2 px-3 text-base font-semibold transition-colors";

function fileNameSlugForQrDownload(raw: string): string {
  const trimmed = raw.trim().slice(0, 72);
  const slug =
    trimmed
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^\w\s-]+/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-") || "teilen";
  return `${slug}-qr.png`;
}

const QR_SIZE = 320;
const QR_MARGIN = 2;

const BASE_QR_OPTS = {
  width: QR_SIZE,
  margin: QR_MARGIN,
  // Tinte auf Papier, wie alles andere im Heft.
  color: { dark: "#1c1d1f", light: "#ffffff" },
  errorCorrectionLevel: "H" as const,
};

function centerLogoOnQrCanvas(
  canvas: HTMLCanvasElement,
  logo: HTMLImageElement,
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const cw = canvas.width;
  const ch = canvas.height;
  const box = Math.round(cw * 0.29);
  const bx = (cw - box) / 2;
  const by = (ch - box) / 2;

  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(bx, by, box, box);
  ctx.restore();

  const nw = logo.naturalWidth || logo.width;
  const nh = logo.naturalHeight || logo.height;
  if (nw <= 0 || nh <= 0) return;

  const maxInner = box * 0.78;
  const scale = Math.min(maxInner / nw, maxInner / nh);
  const dw = nw * scale;
  const dh = nh * scale;
  const dx = bx + (box - dw) / 2;
  const dy = by + (box - dh) / 2;
  ctx.drawImage(logo, dx, dy, dw, dh);
}

/** High EC + centered logo; falls back to plain PNG if logo cannot be drawn. */
async function buildShareQrDataUrl(
  payload: string,
  logoSrc: string,
): Promise<string> {
  const canvas = document.createElement("canvas");
  await QRCode.toCanvas(canvas, payload, BASE_QR_OPTS);

  try {
    await new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          centerLogoOnQrCanvas(canvas, img);
          resolve();
        } catch {
          reject(new Error("compose"));
        }
      };
      img.onerror = () => reject(new Error("logo"));
      img.src = logoSrc;
    });
    return canvas.toDataURL("image/png");
  } catch {
    return QRCode.toDataURL(payload, BASE_QR_OPTS);
  }
}

export default function PublicShareButton({
  title,
  text,
  className,
  label = "Teilen",
}: PublicShareButtonProps) {
  const [shareOpen, setShareOpen] = useState(false);
  const [moreOptionsOpen, setMoreOptionsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [qrGeneration, setQrGeneration] = useState(0);
  const [shareUrl, setShareUrl] = useState("");
  const moreOptsRef = useRef<HTMLDivElement>(null);

  const pathname = usePathname();
  const searchParams = useSearchParams();

  const resolveShareUrl = useCallback(() => {
    if (typeof window === "undefined") return "";
    const qs = searchParams.toString();
    const path = pathname + (qs ? `?${qs}` : "");
    return `${window.location.origin}${path}`;
  }, [pathname, searchParams]);

  const hasNativeShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  useEffect(() => {
    if (!moreOptionsOpen) return;
    const onPointerDown = (e: MouseEvent | PointerEvent) => {
      const el = moreOptsRef.current;
      if (el && e.target instanceof Node && !el.contains(e.target)) {
        setMoreOptionsOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () =>
      document.removeEventListener("pointerdown", onPointerDown, true);
  }, [moreOptionsOpen]);

  useEffect(() => {
    if (!shareOpen || !shareUrl) return;
    let alive = true;
    const dark = document.documentElement.classList.contains("dark");
    const logoSrc = dark
      ? "/images/logo-icon-dark.svg"
      : "/images/logo-icon.svg";

    void buildShareQrDataUrl(shareUrl, logoSrc).then((data) => {
      if (alive) setQrDataUrl(data);
    });
    return () => {
      alive = false;
    };
  }, [shareOpen, shareUrl, qrGeneration]);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(t);
  }, [copied]);

  const closeShareModal = () => {
    setMoreOptionsOpen(false);
    setShareOpen(false);
  };

  const onOpenShare = () => {
    setShareUrl(resolveShareUrl());
    setQrDataUrl("");
    setShareOpen(true);
  };

  const onCopy = async () => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
  };

  const onNativeDeviceShare = async () => {
    if (typeof navigator === "undefined" || !navigator.share) return;
    setMoreOptionsOpen(false);
    try {
      await navigator.share({ title, text: text || title, url: shareUrl });
    } catch {
      /* user cancelled or transient failure — keep modal open */
    }
  };

  const downloadQrPng = () => {
    if (!qrDataUrl || typeof document === "undefined") return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = fileNameSlugForQrDownload(title);
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <>
      <button
        type="button"
        onClick={onOpenShare}
        className={className}
        aria-label={`${label}: ${title}`}
      >
        <Share2Icon className="h-5 w-5" aria-hidden />
        <span className="hidden sm:inline">{label}</span>
      </button>

      {shareOpen && typeof document !== "undefined"
        ? createPortal(
            <div className="programm font-programm bg-ink/55 fixed inset-0 isolate z-[9999] flex items-center justify-center p-4">
              <div
                role="dialog"
                aria-modal="true"
                aria-label="Link teilen"
                className="border-ink bg-paper dark:border-night-rule dark:bg-night-raised relative z-[10000] w-full max-w-md border-2 p-5"
              >
                <div className="border-rule dark:border-night-rule mb-5 flex items-start justify-between gap-3 border-b pb-4">
                  <div>
                    <p className="condensed text-ink dark:text-night-text text-[1.5rem] leading-none font-bold">
                      Link teilen
                    </p>
                    <p className="text-dark dark:text-night-muted mt-2 text-sm">
                      Link kopieren oder QR-Code scannen.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeShareModal}
                    className="text-ink hover:bg-ink hover:text-paper dark:text-night-text dark:hover:bg-night-text dark:hover:text-night -mt-1 -mr-1 inline-flex h-11 w-11 shrink-0 items-center justify-center transition-colors"
                    aria-label="Schließen"
                  >
                    <XIcon className="h-5 w-5" aria-hidden />
                  </button>
                </div>

                <p className="border-rule dark:border-night-rule text-dark dark:text-night-muted mb-5 border px-3 py-2 text-xs break-all">
                  {shareUrl}
                </p>

                <div className="relative mb-5 flex flex-wrap gap-2">
                  <div
                    ref={moreOptsRef}
                    className="relative min-w-0 shrink-0 grow basis-[min(100%,16rem)]"
                  >
                    {hasNativeShare ? (
                      <div className="flex">
                        <button
                          type="button"
                          onClick={() => void onCopy()}
                          className={`${DIALOG_BUTTON} min-w-0 flex-1 border-r-0`}
                        >
                          {copied ? (
                            <CheckIcon className="h-4 w-4" aria-hidden />
                          ) : (
                            <CopyIcon className="h-4 w-4" aria-hidden />
                          )}
                          <span className="truncate">
                            {copied ? "Kopiert" : "Link kopieren"}
                          </span>
                        </button>
                        <button
                          type="button"
                          aria-expanded={moreOptionsOpen}
                          aria-haspopup="menu"
                          onClick={() => setMoreOptionsOpen((o) => !o)}
                          className={`${DIALOG_BUTTON} shrink-0 px-2`}
                          aria-label="Weitere Optionen zum Teilen"
                        >
                          <ChevronDownIcon
                            className={`h-4 w-4 transition-transform ${moreOptionsOpen ? "rotate-180" : ""}`}
                            aria-hidden
                          />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void onCopy()}
                        className={`${DIALOG_BUTTON} w-full`}
                      >
                        {copied ? (
                          <CheckIcon className="h-4 w-4" aria-hidden />
                        ) : (
                          <CopyIcon className="h-4 w-4" aria-hidden />
                        )}
                        {copied ? "Kopiert" : "Link kopieren"}
                      </button>
                    )}
                    {moreOptionsOpen && hasNativeShare ? (
                      <div
                        role="menu"
                        className="border-ink bg-paper dark:border-night-rule dark:bg-night-raised absolute top-full left-0 z-30 mt-1 w-full min-w-[12rem] border-2"
                      >
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => void onNativeDeviceShare()}
                          className="text-ink hover:bg-primary dark:text-night-text dark:hover:bg-primary dark:hover:text-ink flex w-full items-center px-4 py-3 text-left text-base font-medium transition-colors"
                        >
                          Über Gerät teilen&nbsp;…
                        </button>
                      </div>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShareUrl(resolveShareUrl());
                      setQrDataUrl("");
                      setQrGeneration((g) => g + 1);
                    }}
                    className={DIALOG_BUTTON}
                  >
                    <QrCodeIcon className="h-4 w-4" aria-hidden />
                    QR neu laden
                  </button>
                </div>

                <div className="border-rule dark:border-night-rule border p-3">
                  <div className="flex justify-center">
                    {qrDataUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={qrDataUrl}
                        alt="QR-Code zum Teilen"
                        className="h-56 w-56 dark:invert"
                      />
                    ) : (
                      <div className="text-dark dark:text-night-muted flex h-56 w-56 items-center justify-center text-sm">
                        QR-Code wird erstellt …
                      </div>
                    )}
                  </div>
                  {qrDataUrl ? (
                    <div className="mt-4 flex justify-center">
                      <button
                        type="button"
                        onClick={downloadQrPng}
                        className={DIALOG_BUTTON}
                      >
                        <DownloadIcon className="h-4 w-4" aria-hidden />
                        QR-Code laden (PNG)
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
