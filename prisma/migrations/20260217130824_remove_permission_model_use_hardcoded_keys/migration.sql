-- Add permissionKey columns
ALTER TABLE role_permission 
ADD COLUMN IF NOT EXISTS "permissionKey" TEXT;

ALTER TABLE user_permission 
ADD COLUMN IF NOT EXISTS "permissionKey" TEXT;

-- Migrate data: Copy permission keys from permission table
-- Note: This assumes all records have valid permissionId references
UPDATE role_permission rp
SET "permissionKey" = p.key
FROM permission p
WHERE rp."permissionId" = p.id
  AND rp."permissionKey" IS NULL;

UPDATE user_permission up
SET "permissionKey" = p.key
FROM permission p
WHERE up."permissionId" = p.id
  AND up."permissionKey" IS NULL;

-- Verify no NULL values before making NOT NULL
-- If there are NULLs, you'll need to handle them first
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM role_permission WHERE "permissionKey" IS NULL) THEN
    RAISE EXCEPTION 'Cannot proceed: role_permission has NULL permissionKey values';
  END IF;
  IF EXISTS (SELECT 1 FROM user_permission WHERE "permissionKey" IS NULL) THEN
    RAISE EXCEPTION 'Cannot proceed: user_permission has NULL permissionKey values';
  END IF;
END $$;

-- Make permissionKey NOT NULL after data migration
ALTER TABLE role_permission 
ALTER COLUMN "permissionKey" SET NOT NULL;

ALTER TABLE user_permission 
ALTER COLUMN "permissionKey" SET NOT NULL;

-- Add indexes on new columns
CREATE INDEX IF NOT EXISTS "role_permission_permissionKey_idx" ON role_permission("permissionKey");
CREATE INDEX IF NOT EXISTS "user_permission_permissionKey_idx" ON user_permission("permissionKey");

-- Add unique constraints on new columns
CREATE UNIQUE INDEX IF NOT EXISTS "role_permission_roleId_permissionKey_key" 
ON role_permission("roleId", "permissionKey");

CREATE UNIQUE INDEX IF NOT EXISTS "user_permission_userId_permissionKey_key" 
ON user_permission("userId", "permissionKey");

-- Drop foreign key constraints
ALTER TABLE role_permission 
DROP CONSTRAINT IF EXISTS "role_permission_permissionId_fkey";

ALTER TABLE user_permission 
DROP CONSTRAINT IF EXISTS "user_permission_permissionId_fkey";

-- Drop unique constraints on old columns
DROP INDEX IF EXISTS "role_permission_roleId_permissionId_key";
DROP INDEX IF EXISTS "user_permission_userId_permissionId_key";

-- Drop indexes on old columns
DROP INDEX IF EXISTS "role_permission_permissionId_idx";
DROP INDEX IF EXISTS "user_permission_permissionId_idx";

-- Drop old columns
ALTER TABLE role_permission 
DROP COLUMN IF EXISTS "permissionId";

ALTER TABLE user_permission 
DROP COLUMN IF EXISTS "permissionId";

-- Drop indexes on permission table
DROP INDEX IF EXISTS "permission_key_key";
DROP INDEX IF EXISTS "permission_key_idx";
DROP INDEX IF EXISTS "permission_category_idx";
DROP INDEX IF EXISTS "permission_isSystem_idx";

-- Drop the permission table
DROP TABLE IF EXISTS permission CASCADE;
