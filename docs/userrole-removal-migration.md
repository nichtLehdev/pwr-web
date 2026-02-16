# UserRole Removal Migration Guide

## Overview

We're removing the `UserRole` enum and replacing it with a permission-based system. Users can now be assigned to districts with a dynamic role name (e.g., "Bezirksobmann", "Bezirksobfrau").

## Schema Changes

### Removed
- `UserRole` enum
- `role` field on User model
- `roleType` field on User model  
- `displayRole` field on User model
- `obleuteRole` field on User model

### Added
- `districtRoleName` field on User model (String?) - Dynamic role name for users assigned to a district

## Migration Steps

### Step 1: Run Migration
```bash
npx prisma migrate dev --name remove_userrole_add_district_role
```

This will:
- Remove the `role` column from User table
- Remove `roleType`, `displayRole`, `obleuteRole` columns
- Add `districtRoleName` column
- Drop the UserRole enum type

### Step 2: Migrate Existing Data

Before running the migration, you'll need to:
1. Create system roles for each old UserRole (ADMIN, LPW, RPW, OBLEUTE, USER)
2. Assign appropriate permissions to each role
3. Migrate existing users to use these roles instead of the enum

**Migration Script Example:**
```typescript
// Create system roles
const adminRole = await db.role.create({
  data: {
    name: "Administrator",
    description: "Full admin access",
    isSystem: true,
    permissions: {
      create: [/* all permissions */]
    }
  }
});

// Migrate users
await db.user.updateMany({
  where: { role: "ADMIN" },
  data: {
    customRoles: {
      create: { roleId: adminRole.id }
    }
  }
});
```

### Step 3: Update Code

#### tRPC Procedures

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

#### Dashboard Pages

**Before:**
```typescript
const DASHBOARD_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.LPW,
  UserRole.RPW,
  UserRole.OBLEUTE,
];

if (!DASHBOARD_ROLES.includes(profile.role)) {
  redirect("/");
}
```

**After:**
```typescript
import { PERMISSIONS } from "@/lib/permissions";

const { data: userPermissions } = api.permissions.getUserPermissions.useQuery(
  { userId: session.user.id },
  { enabled: !!session?.user }
);

const canAccessDashboard = userPermissions?.some(perm => 
  [
    PERMISSIONS.EVENTS_CREATE,
    PERMISSIONS.POSTS_CREATE,
    PERMISSIONS.COURSES_CREATE,
    PERMISSIONS.USERS_MANAGE,
    // ... other dashboard permissions
  ].includes(perm)
);

if (!canAccessDashboard) {
  redirect("/");
}
```

#### User Management

**Before:**
```typescript
<select value={user.role} onChange={...}>
  <option value={UserRole.ADMIN}>Admin</option>
  <option value={UserRole.OBLEUTE}>Obleute</option>
</select>
```

**After:**
```typescript
// Assign district with role name
<input 
  type="text" 
  value={user.districtRoleName || ""} 
  placeholder="z.B. Bezirksobmann"
/>
<select value={user.bezirkId || ""}>
  <option value="">Kein Bezirk</option>
  {bezirke.map(b => (
    <option key={b.id} value={b.id}>{b.name}</option>
  ))}
</select>

// Assign roles via permissions UI
<UserRoleAssignment userId={user.id} />
```

## Files That Need Updates

### tRPC Routers (use permissionProcedure)
- `src/server/api/routers/events.ts`
- `src/server/api/routers/courses.ts`
- `src/server/api/routers/posts.ts`
- `src/server/api/routers/users.ts`
- `src/server/api/routers/media.ts`
- `src/server/api/routers/materials.ts`
- `src/server/api/routers/organization.ts`
- `src/server/api/routers/homepage.ts`
- `src/server/api/trpc.ts` (remove role-based procedures)

### Dashboard Pages (check permissions instead of roles)
- `src/app/dashboard/page.tsx`
- `src/app/dashboard/events/**/*.tsx`
- `src/app/dashboard/courses/**/*.tsx`
- `src/app/dashboard/posts/**/*.tsx`
- `src/app/dashboard/users/**/*.tsx`
- All other dashboard pages

### Components
- `src/app/_components/dashboard/**/*.tsx`
- `src/app/_components/general/navigation.tsx`
- `src/app/_components/general/user-menu.tsx`

## District Role Assignment

Users assigned to a district can have a custom role name:

```typescript
// Example: Assign user to district with role name
await db.user.update({
  where: { id: userId },
  data: {
    bezirkId: "bezirk-123",
    districtRoleName: "Bezirksobmann" // or "Bezirksobfrau", etc.
  }
});
```

The `districtRoleName` is purely for display purposes. Actual permissions are managed through the roles/permissions system.

## Testing Checklist

- [ ] Migration runs successfully
- [ ] Existing users can log in
- [ ] Dashboard access works with permissions
- [ ] User management UI works
- [ ] District assignment works
- [ ] Permission checks work in all routers
- [ ] No references to UserRole enum remain
