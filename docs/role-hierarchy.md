# Role Hierarchy Implementation

This document describes the hierarchical role system that allows roles to inherit permissions from parent roles.

## Overview

Roles can now have a `parentRoleId` field that allows them to inherit all permissions from a parent role. This enables creating role hierarchies like:

- **Course Manager** - Has all course permissions
- **Event Manager** - Has all event permissions  
- **Content Manager** - Inherits from Course Manager + Event Manager + Post Manager
- **Admin** - Inherits from all manager roles

## Database Schema Changes

The `Role` model now includes:

```prisma
model Role {
  // ... existing fields ...
  
  // Hierarchical role support
  parentRoleId String?
  parentRole   Role?   @relation("RoleHierarchy", fields: [parentRoleId], references: [id], onDelete: SetNull)
  childRoles   Role[]  @relation("RoleHierarchy")
  
  // ... rest of model ...
}
```

## Migration Steps

1. **Create and run the migration:**
   ```bash
   npx prisma migrate dev --name add_role_hierarchy
   ```

2. **Regenerate Prisma Client:**
   ```bash
   npx prisma generate
   ```

## API Changes

### Create Role

The `createRole` mutation now accepts an optional `parentRoleId`:

```typescript
api.permissions.createRole.mutate({
  name: "Content Manager",
  description: "Manages all content",
  parentRoleId: "course-manager-role-id", // Optional
  permissionIds: ["permission-id-1", "permission-id-2"], // Optional - can add additional permissions
});
```

### Update Role

The `updateRole` mutation now accepts an optional `parentRoleId`:

```typescript
api.permissions.updateRole.mutate({
  id: "role-id",
  parentRoleId: "new-parent-role-id", // Optional - can change parent
  permissionIds: ["permission-id-1"], // Optional
});
```

### Permission Resolution

When checking permissions, the system automatically includes inherited permissions:

1. Direct permissions assigned to the role
2. Permissions inherited from parent role (recursively)
3. Direct user permissions (can override role permissions)

## Helper Functions

### `getRolePermissionsIncludingInherited(roleId: string)`

Returns all permission keys for a role, including inherited ones from parent roles.

### `wouldCreateCircularReference(roleId: string, potentialParentId: string)`

Checks if setting a parent role would create a circular reference (prevents infinite loops).

## Example Usage

### Creating a Hierarchical Role Structure

```typescript
// 1. Create base role with course permissions
const courseManager = await api.permissions.createRole.mutate({
  name: "Course Manager",
  description: "Full access to courses",
  permissionIds: [
    "courses.create",
    "courses.edit", 
    "courses.delete",
    "courses.approve",
    "courses.view",
    "courses.manage_registrations"
  ].map(key => getPermissionId(key))
});

// 2. Create role that inherits from Course Manager
const courseEditor = await api.permissions.createRole.mutate({
  name: "Course Editor",
  description: "Can edit courses but inherits all course permissions",
  parentRoleId: courseManager.id,
  permissionIds: [] // No additional permissions needed - inherits all from parent
});

// 3. Create admin role that inherits from multiple roles
const admin = await api.permissions.createRole.mutate({
  name: "Admin",
  description: "Full system access",
  parentRoleId: courseManager.id, // Inherits from Course Manager
  permissionIds: [
    // Add all other permissions directly
    "events.create",
    "events.edit",
    // ... etc
  ]
});
```

## Seed Scripts

Two seed scripts are available:

1. **`pnpm run seed:user`** - Creates your admin user with all permissions
2. **`pnpm run seed:roles`** - Creates example hierarchical roles:
   - Course Manager (all course permissions)
   - Event Manager (all event permissions)
   - Post Manager (all post permissions)
   - Organization Manager (all organization permissions)
   - Admin (inherits from Course Manager + all other permissions)

## Benefits

1. **DRY Principle** - Don't repeat permission assignments
2. **Easy Updates** - Update parent role, all children inherit changes
3. **Flexible** - Roles can still have additional permissions beyond inheritance
4. **Clear Hierarchy** - Easy to understand role relationships

## Notes

- Circular references are prevented (role cannot be its own ancestor)
- When a parent role is deleted, child roles' `parentRoleId` is set to `null` (they keep their own permissions)
- Permission checking is recursive - checks parent, grandparent, etc. up the chain
