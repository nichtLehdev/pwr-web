"use client";

import { useState, useRef } from "react";
import {
  generateBulkInvoices,
  type InvoiceCourse,
  type InvoiceRegistration,
} from "@/lib/invoice-generator";
import { SignatureCanvas } from "./SignatureCanvas";

type SignatureMode = "none" | "upload" | "draw";

interface BulkInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: InvoiceCourse;
  registrations: InvoiceRegistration[];
}

export function BulkInvoiceModal({
  isOpen,
  onClose,
  course,
  registrations,
}: BulkInvoiceModalProps) {
  const [paymentDueDate, setPaymentDueDate] = useState<string>(() => {
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 21);
    return defaultDate.toISOString().split("T")[0] ?? "";
  });
  const [signatureBase64, setSignatureBase64] = useState<string | null>(null);
  const [signatureFileName, setSignatureFileName] = useState<string | null>(
    null,
  );
  const [signatureName, setSignatureName] = useState<string>("");
  const [signatureMode, setSignatureMode] = useState<SignatureMode>("none");
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [isComplete, setIsComplete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Bitte laden Sie ein Bild hoch (PNG, JPG, etc.)");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert("Die Datei ist zu groß. Maximale Größe: 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setSignatureBase64(reader.result as string);
      setSignatureFileName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const removeSignature = () => {
    setSignatureBase64(null);
    setSignatureFileName(null);
    setSignatureName("");
    setSignatureMode("none");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setProgress({ current: 0, total: registrations.length });
    setIsComplete(false);

    try {
      await generateBulkInvoices(
        course,
        registrations,
        {
          paymentDueDate: paymentDueDate ? new Date(paymentDueDate) : undefined,
          signatureBase64: signatureBase64 ?? undefined,
          signatureName: signatureName || undefined,
        },
        (current: number, total: number) => {
          setProgress({ current, total });
        },
      );
      setIsComplete(true);

      removeSignature();

      setTimeout(() => {
        onClose();
        setIsComplete(false);
        setProgress({ current: 0, total: 0 });
      }, 2000);
    } catch (error) {
      console.error("Error generating invoices:", error);
      alert(
        "Fehler beim Generieren der Rechnungen. Bitte versuchen Sie es erneut.",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    if (isGenerating) return;

    removeSignature();
    setIsComplete(false);
    setProgress({ current: 0, total: 0 });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        {/* Close Button */}
        <button
          onClick={handleClose}
          disabled={isGenerating}
          className="absolute top-4 right-4 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            Rechnungen exportieren
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {registrations.length} Rechnung
            {registrations.length !== 1 ? "en" : ""} werden generiert
          </p>
        </div>

        {/* Settings */}
        <div className="space-y-4">
          {/* Payment Due Date */}
          <div>
            <label
              htmlFor="paymentDueDate"
              className="block text-sm font-medium text-gray-700"
            >
              Zahlungsfrist
            </label>
            <input
              type="date"
              id="paymentDueDate"
              value={paymentDueDate}
              onChange={(e) => setPaymentDueDate(e.target.value)}
              disabled={isGenerating}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100"
            />
            <p className="mt-1 text-xs text-gray-500">
              Bis zu diesem Datum soll die Zahlung erfolgen
            </p>
          </div>

          {/* Signature Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Unterschrift (optional)
            </label>
            <p className="mb-2 text-xs text-gray-500">
              Wird nach dem Export automatisch gelöscht
            </p>

            {/* Mode Selection Tabs */}
            {signatureMode === "none" && (
              <div className="mt-1 flex gap-2">
                <button
                  type="button"
                  onClick={() => setSignatureMode("upload")}
                  disabled={isGenerating}
                  className="flex flex-1 flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-gray-300 px-4 py-4 transition-colors hover:border-blue-400 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <svg
                    className="h-6 w-6 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                    />
                  </svg>
                  <span className="text-sm text-gray-600">Hochladen</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSignatureMode("draw")}
                  disabled={isGenerating}
                  className="flex flex-1 flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-gray-300 px-4 py-4 transition-colors hover:border-blue-400 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <svg
                    className="h-6 w-6 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                    />
                  </svg>
                  <span className="text-sm text-gray-600">Zeichnen</span>
                </button>
              </div>
            )}

            {/* Upload Mode */}
            {signatureMode === "upload" && (
              <>
                {signatureBase64 ? (
                  <div className="mt-1 flex items-center gap-3 rounded-md border border-gray-300 bg-gray-50 p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={signatureBase64}
                      alt="Unterschrift Vorschau"
                      className="h-10 max-w-[120px] object-contain"
                    />
                    <span className="flex-1 truncate text-sm text-gray-600">
                      {signatureFileName}
                    </span>
                    <button
                      onClick={removeSignature}
                      disabled={isGenerating}
                      className="rounded p-1 text-red-500 hover:bg-red-50 disabled:opacity-50"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="mt-1">
                    <div
                      onClick={() =>
                        !isGenerating && fileInputRef.current?.click()
                      }
                      className={`flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-gray-300 px-4 py-6 transition-colors hover:border-blue-400 hover:bg-blue-50 ${isGenerating ? "cursor-not-allowed opacity-50" : ""}`}
                    >
                      <svg
                        className="mb-2 h-8 w-8 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                        />
                      </svg>
                      <span className="text-sm text-gray-600">
                        Klicken zum Hochladen
                      </span>
                      <span className="mt-1 text-xs text-gray-400">
                        PNG, JPG (max. 2MB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSignatureMode("none")}
                      className="mt-2 text-sm text-gray-500 hover:text-gray-700"
                    >
                      ← Zurück
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Draw Mode */}
            {signatureMode === "draw" && (
              <div className="mt-1">
                <SignatureCanvas
                  onSignatureChange={(dataUrl) => {
                    setSignatureBase64(dataUrl);
                    if (dataUrl) {
                      setSignatureFileName("Gezeichnete Unterschrift");
                    }
                  }}
                  disabled={isGenerating}
                />
                <div className="mt-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setSignatureBase64(null);
                      setSignatureFileName(null);
                      setSignatureMode("none");
                    }}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    ← Zurück
                  </button>
                  {signatureBase64 && (
                    <span className="text-xs text-green-600">
                      ✓ Unterschrift erfasst
                    </span>
                  )}
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleSignatureUpload}
              className="hidden"
            />

            {/* Signature Name Input */}
            {signatureBase64 && (
              <div className="mt-3">
                <label
                  htmlFor="signatureName"
                  className="block text-sm font-medium text-gray-700"
                >
                  Name des Unterzeichners
                </label>
                <input
                  type="text"
                  id="signatureName"
                  value={signatureName}
                  onChange={(e) => setSignatureName(e.target.value)}
                  placeholder="z.B. Max Mustermann"
                  disabled={isGenerating}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100"
                />
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        {isGenerating && (
          <div className="mt-6">
            <div className="mb-2 flex justify-between text-sm text-gray-600">
              <span>Generiere Rechnungen...</span>
              <span>
                {progress.current} / {progress.total}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{
                  width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Success Message */}
        {isComplete && (
          <div className="mt-6 flex items-center gap-2 rounded-md bg-green-50 p-3 text-green-700">
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm font-medium">
              Rechnungen erfolgreich exportiert!
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={handleClose}
            disabled={isGenerating}
            className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Abbrechen
          </button>
          <button
            onClick={handleGenerate}
            disabled={isGenerating || registrations.length === 0}
            className="flex flex-1 items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <svg
                  className="h-4 w-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Generiere...
              </>
            ) : (
              <>
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Generieren
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
