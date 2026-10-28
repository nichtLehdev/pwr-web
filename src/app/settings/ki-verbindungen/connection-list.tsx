"use client";

import { api } from "@/trpc/react";
import { Button } from "@/app/_components/ui";
import { useToast } from "@/app/_components/ui/toast";
import { formatBerlin } from "@/lib/berlin-time";
import { MCP_SCOPES } from "@/lib/mcp-scopes";
import { getErrorMessage } from "@/lib/utils";

export function ConnectionList() {
  const toast = useToast();
  const utils = api.useUtils();
  const { data: connections, isLoading } =
    api.oauthConnections.getMine.useQuery();
  const revoke = api.oauthConnections.revoke.useMutation({
    onSuccess: async () => {
      toast.success("Verbindung getrennt");
      await utils.oauthConnections.getMine.invalidate();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  if (isLoading) {
    return <p className="text-dark dark:text-night-muted text-sm">Lädt…</p>;
  }

  if (!connections?.length) {
    return (
      <p className="text-dark dark:text-night-muted text-sm">
        Noch keine Anwendung verbunden.
      </p>
    );
  }

  return (
    <ul className="divide-rule dark:divide-night-rule border-rule dark:border-night-rule divide-y border-y">
      {connections.map((connection) => {
        const canWrite = connection.scopes.includes(MCP_SCOPES.WRITE);
        return (
          <li
            key={connection.clientId}
            className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 space-y-1">
              <p className="text-ink dark:text-night-text font-semibold break-words">
                {connection.name ?? "Unbenannte Anwendung"}
              </p>
              <p className="text-dark dark:text-night-muted text-sm">
                {canWrite ? "Lesen und Schreiben" : "Nur lesen"} · verbunden am{" "}
                {formatBerlin(connection.connectedAt, "datum")}
                {connection.lastUsedAt && (
                  <>
                    {" "}
                    · zuletzt angemeldet am{" "}
                    {formatBerlin(connection.lastUsedAt, "datum")}
                  </>
                )}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="shrink-0"
              isLoading={
                revoke.isPending &&
                revoke.variables?.clientId === connection.clientId
              }
              disabled={revoke.isPending}
              onClick={() => {
                if (
                  confirm(
                    `Verbindung zu „${connection.name ?? "Unbenannte Anwendung"}“ trennen? Die Anwendung verliert sofort den Zugriff.`,
                  )
                ) {
                  revoke.mutate({ clientId: connection.clientId });
                }
              }}
            >
              Trennen
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
