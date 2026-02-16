import { PERMISSION_DEFINITIONS } from "@/lib/permissions";

/**
 * System Permissions Seed Data
 *
 * These permissions are created as system permissions (isSystem: true)
 * and cannot be deleted or modified via the UI.
 */
export const permissionsData = PERMISSION_DEFINITIONS.map((def) => ({
  key: def.key,
  name: def.name,
  description: def.description,
  category: def.category,
  isSystem: true,
}));
