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