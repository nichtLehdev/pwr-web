"use client";

import { useState } from "react";

import { Button } from "@/app/_components/ui";
import { Note } from "@/app/_components/programmheft/note";
import { oauth2 } from "@/lib/auth";

/** better-auth antwortet je nach Aufruf mit `url` oder `redirect_uri`. */
function nextUrl(data: unknown): string | null {
  if (typeof data !== "object" || data === null) return null;
  if ("url" in data && typeof data.url === "string") return data.url;
  if ("redirect_uri" in data && typeof data.redirect_uri === "string") {
    return data.redirect_uri;
  }
  return null;
}

export function ConsentForm() {
  const [pending, setPending] = useState<"accept" | "deny" | null>(null);
  const [error, setError] = useState("");

  const decide = async (accept: boolean) => {
    setError("");
    setPending(accept ? "accept" : "deny");
    // Die signierte Anfrage aus der Adresszeile hängt das Client-Plugin an.
    const result = await oauth2.consent({ accept });
    const target = nextUrl(result.data);
    if (result.error || !target) {
      setError(
        "Das hat nicht geklappt. Die Anfrage ist eventuell abgelaufen – starte die Verbindung in deiner KI-Anwendung bitte neu.",
      );
      setPending(null);
      return;
    }
    window.location.href = target;
  };

  return (
    <div className="space-y-4">
      {error && (
        <Note tone="error">
          <p>{error}</p>
        </Note>
      )}
      <div className="flex flex-col gap-3 sm:flex-row-reverse">
        <Button
          type="button"
          className="w-full sm:w-auto"
          isLoading={pending === "accept"}
          disabled={pending !== null}
          onClick={() => void decide(true)}
        >
          Zugriff erlauben
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full sm:w-auto"
          isLoading={pending === "deny"}
          disabled={pending !== null}
          onClick={() => void decide(false)}
        >
          Ablehnen
        </Button>
      </div>
    </div>
  );
}
