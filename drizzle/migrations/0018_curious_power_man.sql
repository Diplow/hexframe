CREATE TABLE IF NOT EXISTS "vde_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"root_coords" text NOT NULL,
	"status" text NOT NULL,
	"blockage_reason" text,
	"execution_log" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_runs" ON "vde_runs" USING btree ("user_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_root_coords_status" ON "vde_runs" USING btree ("root_coords","status");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unique_open_run" ON "vde_runs" USING btree ("root_coords") WHERE status = 'open';
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vde_run_hexplans" (
	"run_id" text NOT NULL,
	"coords" text NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "vde_run_hexplans_run_id_coords_pk" PRIMARY KEY("run_id","coords")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "vde_run_hexplans" ADD CONSTRAINT "vde_run_hexplans_run_id_vde_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."vde_runs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_run_hexplans_run_id" ON "vde_run_hexplans" USING btree ("run_id");