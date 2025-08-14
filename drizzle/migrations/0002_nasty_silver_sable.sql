CREATE TABLE IF NOT EXISTS "llm_job_results" (
	"id" text PRIMARY KEY NOT NULL,
	"job_id" text NOT NULL,
	"user_id" text NOT NULL,
	"status" text NOT NULL,
	"request" jsonb,
	"response" jsonb,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "llm_job_results_job_id_unique" UNIQUE("job_id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_job_status" ON "llm_job_results" USING btree ("job_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_jobs" ON "llm_job_results" USING btree ("user_id","created_at");