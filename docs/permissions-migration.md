# Permissions System Migration Guide

## Overview

The application now uses a hybrid permission system:
- **System Permissions**: Hardcoded core permissions (type-safe, version-controlled)
- **Custom Permissions**: Can be added via UI for special cases
- **Backward Compatible**: Legacy UserRole enum still works

## Architecture

### 1. Permission Constants (`src/lib/permissions.ts`)

All core permissions are defined as constants:

```typescript
import { PERMISSIONS } from "@/lib/permissions";

// Use in code
if (await userHasPermission(userId, PERMISSIONS.EVENTS_CREATE)) {
  // User can create events
}
```

### 2. Permission Checking (`src/server/api/helpers/permissions.ts`)

Helper functions to check permissions:

```typescript
import { userHasPermission, getUserPermissions } from "@/server/api/helpers/permissions";

// Check single permission
const canCreate = await userHasPermission(userId, PERMISSIONS.EVENTS_CREATE);

// Get all user permissions
const allPermissions = await getUserPermissions(userId);
```

### 3. tRPC Middleware (`src/server/api/middleware/permissions.ts`)

Use permission-based procedures instead of role-based:

```typescript
import { permissionProcedure } from "@/server/api/middleware/permissions";
import { PERMISSIONS } from "@/lib/permissions";

export const eventsRouter = createTRPCRouter({
  // Old way (role-based)
  // create: adminProcedure.input(...).mutation(...)
  
  // New way (permission-based)
  create: permissionProcedure(PERMISSIONS.EVENTS_CREATE)
    .input(z.object({ title: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // User is guaranteed to have EVENTS_CREATE permission
      return await ctx.db.event.create({ data: input });
    }),
});
```

## Migration Steps

### Step 1: Replace Role Checks with Permission Checks

**Before:**
```typescript
export const eventsRouter = createTRPCRouter({
  create: adminProcedure
    .input(z.object({ title: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // ...
    }),
});
```

**After:**
```typescript
import { permissionProcedure } from "@/server/api/middleware/permissions";
import { PERMISSIONS } from "@/lib/permissions";

export const eventsRouter = createTRPCRouter({
  create: permissionProcedure(PERMISSIONS.EVENTS_CREATE)
    .input(z.object({ title: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // ...
    }),
});
```

### Step 2: Update Frontend Permission Checks

**Before:**
```typescript
const canCreate = profile.role === UserRole.ADMIN || profile.role === UserRole.LPW;
```

**After:**
```typescript
const { data: userPermissions } = api.permissions.getUserPermissions.useQuery(
  { userId: session.user.id }
);
const canCreate = userPermissions?.includes(PERMISSIONS.EVENTS_CREATE);
```

Or create a helper hook:

```typescript
function useHasPermission(permission: PermissionKey) {
  const { data: session } = useSession();
  const { data: permissions } = api.permissions.getUserPermissions.useQuery(
    { userId: session?.user.id! },
    { enabled: !!session?.user.id }
  );
  return permissions?.includes(permission) ?? false;
}

// Usage
const canCreate = useHasPermission(PERMISSIONS.EVENTS_CREATE);
```

## Permission Hierarchy

Permissions are checked in this order:
1. **Direct User Permissions** (explicit grant/deny) - highest priority
2. **Custom Role Permissions** (from UserRoleAssignment)
3. **Legacy Role Permissions** (from UserRole enum) - fallback

## Seeding System Permissions

System permissions are automatically seeded when you run:

```bash
pnpm tsx prisma/seed.ts
```

Or they're created during migration if you add a migration step.

## Adding New Permissions

1. **Add to constants** (`src/lib/permissions.ts`):
   ```typescript
   export const PERMISSIONS = {
     // ... existing
     NEW_FEATURE_CREATE: "new_feature.create",
   } as const;
   ```

2. **Add to definitions** (same file):
   ```typescript
   {
     key: PERMISSIONS.NEW_FEATURE_CREATE,
     name: "Neue Funktion erstellen",
     description: "Berechtigung zum Erstellen neuer Funktionen",
     category: "new_feature",
   }
   ```

3. **Update seed** - permissions are auto-seeded from definitions

4. **Use in code**:
   ```typescript
   permissionProcedure(PERMISSIONS.NEW_FEATURE_CREATE)
   ```

## Custom Permissions

Custom permissions can be added via the UI (`/dashboard/permissions`):
- They're marked as `isSystem: false`
- They can be deleted/modified
- Useful for one-off permissions or special workflows

## Best Practices

1. **Always use constants** - Never hardcode permission strings
2. **Use middleware** - Use `permissionProcedure` instead of manual checks
3. **Type safety** - Import `PermissionKey` type for type safety
4. **Document permissions** - Add descriptions explaining what each permission does
5. **Group by category** - Use categories to organize permissions in UI

## Examples

### Multiple Permissions (ANY)
```typescript
permissionProcedureAny([
  PERMISSIONS.EVENTS_EDIT,
  PERMISSIONS.EVENTS_APPROVE,
])
```

### Multiple Permissions (ALL)
```typescript
permissionProcedureAll([
  PERMISSIONS.EVENTS_DELETE,
  PERMISSIONS.EVENTS_APPROVE,
])
```

### Conditional Permission Check
```typescript
const canEdit = await userHasPermission(userId, PERMISSIONS.EVENTS_EDIT);
const canApprove = await userHasPermission(userId, PERMISSIONS.EVENTS_APPROVE);

if (canEdit || canApprove) {
  // Allow editing
}
```
