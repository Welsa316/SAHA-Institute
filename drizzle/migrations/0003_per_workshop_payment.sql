ALTER TABLE "workshop_signups" DROP COLUMN "paid";--> statement-breakpoint
ALTER TABLE "workshop_signups" DROP COLUMN "paid_until";--> statement-breakpoint
ALTER TABLE "workshop_signups" ADD COLUMN "paid_workshops" text[] DEFAULT '{}'::text[] NOT NULL;
