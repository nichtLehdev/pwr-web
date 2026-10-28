import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

import { MCP_SCOPES } from "@/lib/mcp-scopes";
import { authenticateMcpRequest } from "@/server/mcp/auth";
import { PROTECTED_RESOURCE_METADATA_URL } from "@/server/mcp/metadata";
import { createMcpServer } from "@/server/mcp/server";

export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Authorization, Content-Type, Accept, Mcp-Session-Id, Mcp-Protocol-Version, Last-Event-ID",
  "Access-Control-Expose-Headers": "WWW-Authenticate, Mcp-Session-Id",
};

/**
 * RFC 9728 §5.1: Ohne gültiges Token verweist die 401 auf die Metadaten, über
 * die der MCP-Client die OAuth-Anmeldung findet.
 */
function unauthorized(): Response {
  const scope = [MCP_SCOPES.READ, MCP_SCOPES.WRITE, "offline_access"].join(" ");
  return Response.json(
    { error: "invalid_token", error_description: "Anmeldung erforderlich" },
    {
      status: 401,
      headers: {
        ...CORS_HEADERS,
        "WWW-Authenticate": `Bearer resource_metadata="${PROTECTED_RESOURCE_METADATA_URL}", scope="${scope}"`,
      },
    },
  );
}

/**
 * MCP-Server (Streamable HTTP, zustandslos) für KI-Clients wie Claude. Jeder
 * Aufruf trägt ein OAuth-Zugriffstoken; die Werkzeuge rufen die tRPC-Prozeduren
 * mit den Rechten der Person auf, die den Zugriff erlaubt hat.
 */
async function handle(request: Request): Promise<Response> {
  const mcpAuth = await authenticateMcpRequest(request);
  if (!mcpAuth) return unauthorized();

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  const server = createMcpServer(mcpAuth, request.headers);
  await server.connect(transport);

  try {
    const response = await transport.handleRequest(request);
    const headers = new Headers(response.headers);
    for (const [key, value] of Object.entries(CORS_HEADERS)) {
      headers.set(key, value);
    }
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } finally {
    // Die Antwort ist bei enableJsonResponse bereits vollständig.
    void server.close();
  }
}

export { handle as GET, handle as POST, handle as DELETE };

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
