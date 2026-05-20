CREATE TYPE "public"."grade_level" AS ENUM('elementary', 'middle', 'high');--> statement-breakpoint
CREATE TYPE "public"."program" AS ENUM('summer_camp', 'stem_program');--> statement-breakpoint
CREATE TABLE "students" (
	"id" serial PRIMARY KEY NOT NULL,
	"program" "program" NOT NULL,
	"parent_name" text NOT NULL,
	"student_name" text NOT NULL,
	"grade_level" "grade_level" NOT NULL,
	"paid" boolean DEFAULT false NOT NULL,
	"paid_until" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "workshop_signups" (
	"id" serial PRIMARY KEY NOT NULL,
	"parent_name" text NOT NULL,
	"student_name" text NOT NULL,
	"workshops" text[] DEFAULT '{}' NOT NULL,
	"additional_notes" text,
	"contacted" boolean DEFAULT false NOT NULL,
	"paid" boolean DEFAULT false NOT NULL,
	"paid_until" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
