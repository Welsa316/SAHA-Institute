ALTER TABLE "students" ALTER COLUMN "parent_name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "students" ALTER COLUMN "grade_level" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "password_hash" text;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_email_unique" UNIQUE("email");
