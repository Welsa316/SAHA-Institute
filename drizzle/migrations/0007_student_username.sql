ALTER TABLE "students" RENAME COLUMN "email" TO "username";--> statement-breakpoint
ALTER TABLE "students" RENAME CONSTRAINT "students_email_unique" TO "students_username_unique";
