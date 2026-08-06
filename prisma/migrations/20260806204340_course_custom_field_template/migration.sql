-- CreateTable
CREATE TABLE "course_custom_field_template" (
    "id" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "fieldType" "CustomFieldType" NOT NULL,
    "options" JSONB,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "helpText" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_custom_field_template_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "course_custom_field_template_fieldName_key" ON "course_custom_field_template"("fieldName");

-- CreateIndex
CREATE INDEX "course_custom_field_template_createdById_idx" ON "course_custom_field_template"("createdById");

-- AddForeignKey
ALTER TABLE "course_custom_field_template" ADD CONSTRAINT "course_custom_field_template_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
