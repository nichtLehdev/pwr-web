import { MCP_SCOPES } from "@/lib/mcp-scopes";
import {
  AUTH_BASE_URL,
  AUTH_ISSUER,
  MCP_RESOURCE,
} from "@/server/better-auth/urls";

/** Metadaten sind öffentlich; browserbasierte MCP-Clients lesen sie per fetch. */
export const METADATA_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

export const PROTECTED_RESOURCE_METADATA_URL = `${AUTH_BASE_URL}/.well-known/oauth-protected-resource/api/mcp`;

/** RFC 9728 Protected Resource Metadata für den MCP-Server. */
export function protectedResourceMetadata() {
  return {
    resource: MCP_RESOURCE,
    authorization_servers: [AUTH_ISSUER],
    scopes_supported: [MCP_SCOPES.READ, MCP_SCOPES.WRITE, "offline_access"],
    bearer_methods_supported: ["header"],
    resource_name: "Posaunenwerk Rheinland",
    resource_documentation: `${AUTH_BASE_URL}/settings/ki-verbindungen`,
  };
}
