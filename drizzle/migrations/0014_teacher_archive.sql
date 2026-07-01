-- Soft-remove for teachers. A teacher who has ever been scheduled can't be hard
-- deleted — the calendar keeps their classes (including cancelled ones), and
-- those rows reference the teacher for name + colour. Removing such a teacher
-- sets archived_at instead: their login is revoked and they drop out of the
-- active calendar filter / scheduling picker / active list, but their history
-- stays intact. A teacher who was never scheduled has no history and is deleted
-- outright (archived_at never used for them).
ALTER TABLE "teachers" ADD COLUMN "archived_at" timestamptz;
