-- AlterEnum
CREATE TYPE "Religion" AS ENUM ('ISLAM', 'HINDU', 'CHRISTIAN', 'OTHER');

-- Normalize existing free-text values to enum labels before casting
UPDATE "Student"
SET "religion" = 'ISLAM'
WHERE "religion" IS NOT NULL
  AND UPPER(BTRIM("religion")) IN ('ISLAM', 'MUSLIM', 'MUSLIMS');

UPDATE "AdmissionApplication"
SET "religion" = 'ISLAM'
WHERE "religion" IS NOT NULL
  AND UPPER(BTRIM("religion")) IN ('ISLAM', 'MUSLIM', 'MUSLIMS');

UPDATE "Student"
SET "religion" = 'HINDU'
WHERE "religion" IS NOT NULL
  AND UPPER(BTRIM("religion")) IN ('HINDU', 'HINDUISM');

UPDATE "AdmissionApplication"
SET "religion" = 'HINDU'
WHERE "religion" IS NOT NULL
  AND UPPER(BTRIM("religion")) IN ('HINDU', 'HINDUISM');

UPDATE "Student"
SET "religion" = 'CHRISTIAN'
WHERE "religion" IS NOT NULL
  AND UPPER(BTRIM("religion")) IN ('CHRISTIAN', 'CHRISTIANS', 'CRISTIANS', 'CHRISTIANITY');

UPDATE "AdmissionApplication"
SET "religion" = 'CHRISTIAN'
WHERE "religion" IS NOT NULL
  AND UPPER(BTRIM("religion")) IN ('CHRISTIAN', 'CHRISTIANS', 'CRISTIANS', 'CHRISTIANITY');

UPDATE "Student"
SET "religion" = 'OTHER'
WHERE "religion" IS NOT NULL
  AND UPPER(BTRIM("religion")) NOT IN ('ISLAM', 'HINDU', 'CHRISTIAN');

UPDATE "AdmissionApplication"
SET "religion" = 'OTHER'
WHERE "religion" IS NOT NULL
  AND UPPER(BTRIM("religion")) NOT IN ('ISLAM', 'HINDU', 'CHRISTIAN');

-- Convert columns from text to the new enum type
ALTER TABLE "Student" ALTER COLUMN "religion" TYPE "Religion" USING ("religion"::text::"Religion");
ALTER TABLE "AdmissionApplication" ALTER COLUMN "religion" TYPE "Religion" USING ("religion"::text::"Religion");