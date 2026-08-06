-- DropIndex
DROP INDEX "course_custom_field_template_fieldName_key";

-- AlterTable
ALTER TABLE "course_custom_field_template" ADD COLUMN     "isGlobal" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "course_custom_field_template_fieldName_idx" ON "course_custom_field_template"("fieldName");
