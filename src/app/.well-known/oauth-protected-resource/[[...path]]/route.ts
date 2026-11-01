import {
  METADATA_CORS_HEADERS,
  protectedResourceMetadata,
} from "@/server/mcp/metadata";

/**
 * RFC 9728: sagt MCP-Clients, bei welchem Autorisierungsserver sie für
 * `/api/mcp` ein Token holen. Erreichbar mit und ohne Pfad-Suffix.
 */
export function GET() {
  return Response.json(protectedResourceMetadata(), {
    headers: {
      ...METADATA_CORS_HEADERS,
      "Cache-Control": "public, max-age=3600",
    },
  });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: METADATA_CORS_HEADERS });
}
