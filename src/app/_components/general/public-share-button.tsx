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

function fileNameSlugForQrDownload(raw: string): string {
  const trimmed = raw.trim().slice(0, 72);
  const slug =
    trimmed
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
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
  color: { dark: "#111827", light: "#ffffff" },
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
  const radius = Math.round(box * 0.14);

  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(bx, by, box, box, radius);
  } else {
    ctx.rect(bx, by, box, box);
  }
  ctx.fill();
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
        <Share2Icon className="h-5 w-5" />
        <span className="hidden sm:inline">{label}</span>
      </button>

      {shareOpen && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 isolate z-[9999] flex items-center justify-center bg-black/55 p-4">
              <div className="dark:bg-dark-surface dark:border-dark-border relative z-[10000] w-full max-w-md rounded-xl border border-gray-200 bg-white p-5 shadow-xl">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-gray-900 dark:text-dark-text">
                      Link teilen
                    </p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Link kopieren oder QR-Code scannen.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeShareModal}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                    aria-label="Schließen"
                  >
                    <XIcon className="h-4 w-4" />
                  </button>
                </div>

                <div className="dark:border-dark-border mb-4 overflow-hidden rounded-lg border border-gray-200">
                  <div className="bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:bg-gray-900/40 dark:text-gray-300">
                    {shareUrl}
                  </div>
                </div>

                <div className="relative mb-4 flex flex-wrap gap-2">
                  <div
                    ref={moreOptsRef}
                    className="relative min-w-0 shrink-0 grow basis-[min(100%,16rem)]"
                  >
                    {hasNativeShare ? (
                      <div className="dark:border-dark-border flex overflow-hidden rounded-lg border border-gray-200">
                        <button
                          type="button"
                          onClick={() => void onCopy()}
                          className="inline-flex min-w-0 flex-1 items-center justify-center gap-2 border-0 bg-transparent px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800/80"
                        >
                          {copied ? (
                            <CheckIcon className="h-4 w-4" />
                          ) : (
                            <CopyIcon className="h-4 w-4" />
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
                          className="dark:border-dark-border inline-flex shrink-0 items-center border-0 border-l border-gray-200 bg-transparent px-2 py-2 text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800/80"
                          aria-label="Weitere Optionen zum Teilen"
                        >
                          <ChevronDownIcon
                            className={`h-4 w-4 transition-transform ${moreOptionsOpen ? "rotate-180" : ""}`}
                          />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void onCopy()}
                        className="dark:border-dark-border inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800/80"
                      >
                        {copied ? (
                          <CheckIcon className="h-4 w-4" />
                        ) : (
                          <CopyIcon className="h-4 w-4" />
                        )}
                        {copied ? "Kopiert" : "Link kopieren"}
                      </button>
                    )}
                    {moreOptionsOpen && hasNativeShare ? (
                      <div
                        role="menu"
                        className="dark:border-dark-border dark:bg-dark-surface absolute top-full left-0 z-30 mt-1 w-full min-w-[12rem] overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
                      >
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => void onNativeDeviceShare()}
                          className="flex w-full items-center px-4 py-2 text-left text-sm text-gray-800 hover:bg-gray-50 dark:text-gray-100 dark:hover:bg-gray-800"
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
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                  >
                    <QrCodeIcon className="h-4 w-4" />
                    QR neu laden
                  </button>
                </div>

                <div className="dark:border-dark-border rounded-lg border border-gray-200 p-3 dark:bg-gray-900/40">
                  <div className="flex justify-center">
                    {qrDataUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={qrDataUrl}
                        alt="QR-Code zum Teilen"
                        className="h-56 w-56 dark:invert"
                      />
                    ) : (
                      <div className="flex h-56 w-56 items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                        QR-Code wird erstellt...
                      </div>
                    )}
                  </div>
                  {qrDataUrl ? (
                    <div className="mt-4 flex justify-center">
                      <button
                        type="button"
                        onClick={downloadQrPng}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
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
