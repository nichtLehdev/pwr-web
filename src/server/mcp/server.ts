import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolResult,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { TRPCError } from "@trpc/server";
import { z, ZodError } from "zod";

import { appRouter, createCaller } from "@/server/api/root";
import { createLogger } from "@/server/utils/logger";
import type { McpAuth } from "./auth";
import { createMcpTrpcContext } from "./context";
import { stripPersonalData } from "./personal-data";
import { reviveDates, toToolInputSchema } from "./schema";
import {
  MCP_SERVER_INSTRUCTIONS,
  MCP_TOOLS,
  type McpToolDefinition,
} from "./tools";

const log = createLogger("MCP");

/** Große Antworten (z. B. Kurs mit allen Feldern) kappen, statt den Client zu fluten. */
const MAX_RESULT_CHARS = 100_000;

type ProcedureDef = {
  _def: { type: string; inputs: unknown[] };
};

function getProcedure(path: string): ProcedureDef | undefined {
  const procedures = appRouter._def.procedures as Record<string, unknown>;
  return procedures[path] as ProcedureDef | undefined;
}

function inputParserOf(tool: McpToolDefinition): unknown {
  const input = getProcedure(tool.procedure)?._def.inputs[0];
  return tool.restrictInput && input instanceof z.ZodObject
    ? tool.restrictInput(input)
    : input;
}

/** Das Schema hängt nur am Code, also einmal pro Prozess berechnen. */
let toolListCache: Tool[] | null = null;

function listTools(): Tool[] {
  if (toolListCache) return toolListCache;
  toolListCache = MCP_TOOLS.map((tool): Tool => {
    const isQuery = getProcedure(tool.procedure)?._def.type === "query";
    return {
      name: tool.name,
      title: tool.title,
      description: tool.description,
      inputSchema: toToolInputSchema(inputParserOf(tool)),
      annotations: {
        title: tool.title,
        readOnlyHint: isQuery,
        destructiveHint: tool.destructive ?? false,
        idempotentHint: isQuery,
        openWorldHint: false,
      },
    };
  });
  return toolListCache;
}

function textResult(text: string, isError = false): CallToolResult {
  return { content: [{ type: "text", text }], isError };
}

function serialize(value: unknown): string {
  const text =
    JSON.stringify(
      value,
      (_key, item: unknown) =>
        typeof item === "bigint" ? item.toString() : item,
      2,
    ) ?? "null";
  return text.length > MAX_RESULT_CHARS
    ? `${text.slice(0, MAX_RESULT_CHARS)}\n… (gekürzt, Ergebnis zu groß – enger filtern oder kleineres limit wählen)`
    : text;
}

function describeError(error: unknown): string {
  const cause = error instanceof TRPCError ? error.cause : error;
  if (cause instanceof ZodError) {
    const issues = cause.issues
      .map(
        (issue) => `- ${issue.path.join(".") || "(Eingabe)"}: ${issue.message}`,
      )
      .join("\n");
    return `Ungültige Eingabe:\n${issues}`;
  }
  if (error instanceof TRPCError) {
    return `${error.code}: ${error.message}`;
  }
  return "Interner Fehler. Bitte später erneut versuchen.";
}

async function callTool(
  mcpAuth: McpAuth,
  headers: Headers,
  name: string,
  args: Record<string, unknown> | undefined,
): Promise<CallToolResult> {
  const tool = MCP_TOOLS.find((candidate) => candidate.name === name);
  if (!tool) return textResult(`Unbekanntes Werkzeug: ${name}`, true);

  if (!mcpAuth.scopes.has(tool.scope)) {
    return textResult(
      `Dieser Verbindung fehlt der Umfang "${tool.scope}". Die Person muss die Verbindung neu herstellen und ihn erlauben.`,
      true,
    );
  }

  const ctx = await createMcpTrpcContext(mcpAuth, headers);
  if (!ctx) return textResult("Konto nicht gefunden.", true);

  const parser = inputParserOf(tool);
  let input = reviveDates(parser, args ?? {});
  if (tool.restrictInput && parser instanceof z.ZodType) {
    const checked = parser.safeParse(input);
    if (!checked.success) return textResult(describeError(checked.error), true);
    input = checked.data;
  }

  const caller = createCaller(ctx) as unknown as Record<
    string,
    Record<string, (input: unknown) => Promise<unknown>>
  >;
  const [routerKey, procedureKey] = tool.procedure.split(".") as [
    string,
    string,
  ];

  try {
    const result = await caller[routerKey]![procedureKey]!(input);
    const shaped = tool.mapResult ? tool.mapResult(result) : result;
    return textResult(serialize(stripPersonalData(shaped)));
  } catch (error) {
    if (
      !(error instanceof TRPCError) ||
      error.code === "INTERNAL_SERVER_ERROR"
    ) {
      log.error(`tool ${name} failed:`, error);
    }
    return textResult(describeError(error), true);
  }
}

/** Ein frischer Server je Anfrage: zustandslos, das Token trägt die Identität. */
export function createMcpServer(mcpAuth: McpAuth, headers: Headers): Server {
  const server = new Server(
    { name: "posaunenwerk", title: "Posaunenwerk Rheinland", version: "1.0.0" },
    {
      capabilities: { tools: {} },
      instructions: MCP_SERVER_INSTRUCTIONS,
    },
  );

  // Eine Verbindung ohne Schreibumfang sieht die Schreibwerkzeuge gar nicht erst.
  server.setRequestHandler(ListToolsRequestSchema, () => ({
    tools: listTools().filter((_tool, index) =>
      mcpAuth.scopes.has(MCP_TOOLS[index]!.scope),
    ),
  }));

  server.setRequestHandler(CallToolRequestSchema, (request) =>
    callTool(mcpAuth, headers, request.params.name, request.params.arguments),
  );

  return server;
}
