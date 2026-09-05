-- The seven tables the site's read-only role can see, for the data-layer tests.
--
-- This mirrors drizzle/0000_known_scarecrow.sql in the portfolio-cms
-- repository, minus the CMS-only tables (users, sessions, revisions) that
-- portfolio_reader is not granted. It is kept here so CI needs no access to
-- that repository. If the CMS adds a column the site starts reading, add it
-- here too — the integration test is what will notice when it is missing.
--
-- Applied by .github/workflows/pr-checks.yml, and locally with:
--   psql "$PORTFOLIO_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/test-database.sql

CREATE TYPE "public"."portfolio_content_status" AS ENUM('draft', 'published', 'archived');
CREATE TYPE "public"."portfolio_page_key" AS ENUM('home', 'about');
CREATE TYPE "public"."portfolio_paper_kind" AS ENUM('journal', 'conference', 'patent', 'thesis', 'preprint');
CREATE TYPE "public"."portfolio_project_category" AS ENUM('active', 'archived');
CREATE TYPE "public"."portfolio_project_stage" AS ENUM('napkin-sketch', 'research-prototype', 'piloted', 'completed', 'product');
CREATE TYPE "public"."portfolio_video_playback" AS ENUM('loop', 'once', 'viewer');

CREATE TABLE "portfolio_certificate" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"issuer" text NOT NULL,
	"issue_date" date NOT NULL,
	"expiry_date" date,
	"credential_id" text,
	"url" text,
	"badge" text,
	"featured" boolean DEFAULT false NOT NULL,
	"body_markdown" text DEFAULT '' NOT NULL,
	"status" "portfolio_content_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "portfolio_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"path" text NOT NULL,
	"original_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"byte_size" integer NOT NULL,
	"checksum_sha256" text NOT NULL,
	"width" integer,
	"height" integer,
	"alt_text" text,
	"uploaded_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "portfolio_page" (
	"key" "portfolio_page_key" PRIMARY KEY NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"body_markdown" text DEFAULT '' NOT NULL,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "portfolio_paper" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"authors" text NOT NULL,
	"venue" text NOT NULL,
	"year" integer NOT NULL,
	"kind" "portfolio_paper_kind" DEFAULT 'journal' NOT NULL,
	"abstract" text,
	"doi" text,
	"url" text,
	"pdf" text,
	"citations" integer,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"body_markdown" text DEFAULT '' NOT NULL,
	"status" "portfolio_content_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "portfolio_post" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"pub_date" date NOT NULL,
	"updated_date" date,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"kind" text DEFAULT 'Post' NOT NULL,
	"hero_image" text,
	"hero_video" text,
	"hero_video_playback" "portfolio_video_playback" DEFAULT 'loop' NOT NULL,
	"body_markdown" text DEFAULT '' NOT NULL,
	"status" "portfolio_content_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "portfolio_project" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"stage" "portfolio_project_stage" DEFAULT 'research-prototype' NOT NULL,
	"category" "portfolio_project_category" DEFAULT 'active' NOT NULL,
	"contributors" text[] DEFAULT '{}'::text[] NOT NULL,
	"purpose" text,
	"pub_date" date NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"repo_url" text,
	"live_url" text,
	"hero_image" text,
	"card_color" text DEFAULT '#BFE3E0' NOT NULL,
	"card_color_alt" text DEFAULT '' NOT NULL,
	"body_markdown" text DEFAULT '' NOT NULL,
	"status" "portfolio_content_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "portfolio_setting" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX "portfolio_certificate_slug_idx" ON "portfolio_certificate" USING btree ("slug");
CREATE INDEX "portfolio_certificate_publication_idx" ON "portfolio_certificate" USING btree ("status","issue_date");
CREATE UNIQUE INDEX "portfolio_media_path_idx" ON "portfolio_media" USING btree ("path");
CREATE UNIQUE INDEX "portfolio_paper_slug_idx" ON "portfolio_paper" USING btree ("slug");
CREATE INDEX "portfolio_paper_publication_idx" ON "portfolio_paper" USING btree ("status","year");
CREATE UNIQUE INDEX "portfolio_post_slug_idx" ON "portfolio_post" USING btree ("slug");
CREATE INDEX "portfolio_post_publication_idx" ON "portfolio_post" USING btree ("status","pub_date");
CREATE UNIQUE INDEX "portfolio_project_slug_idx" ON "portfolio_project" USING btree ("slug");
CREATE INDEX "portfolio_project_publication_idx" ON "portfolio_project" USING btree ("status","category","pub_date");
