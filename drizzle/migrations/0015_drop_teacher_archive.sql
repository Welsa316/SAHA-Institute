-- Removing a teacher now HARD-deletes them and their scheduling footprint
-- (enrollments + class_instances + login), rather than soft-archiving. The
-- archived_at column is no longer used.
ALTER TABLE "teachers" DROP COLUMN "archived_at";
