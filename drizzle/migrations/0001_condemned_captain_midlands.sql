ALTER TYPE "public"."program" ADD VALUE 'regular';--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "phone_number" text;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "paid_from" date;