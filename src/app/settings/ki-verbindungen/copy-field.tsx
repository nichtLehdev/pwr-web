"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { Button } from "@/app/_components/ui";

export function CopyField({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ohne Zwischenablage-Recht bleibt das Feld zum Markieren.
    }
  };

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
      <input
        readOnly
        aria-label={label}
        value={value}
        onFocus={(e) => e.currentTarget.select()}
        className="border-ink dark:border-night-text bg-paper dark:bg-night text-ink dark:text-night-text min-h-11 w-full min-w-0 border-2 px-3 font-mono text-sm"
      />
      <Button
        type="button"
        variant="outline"
        className="shrink-0"
        onClick={() => void copy()}
      >
        {copied ? (
          <Check className="h-4 w-4" aria-hidden />
        ) : (
          <Copy className="h-4 w-4" aria-hidden />
        )}
        {copied ? "Kopiert" : "Kopieren"}
      </Button>
    </div>
  );
}
