import { pgTable, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core'

export const llmJobResults = pgTable('llm_job_results', {
  id: text('id').primaryKey(),
  jobId: text('job_id').notNull().unique(),
  userId: text('user_id').notNull(),
  status: text('status').notNull(), // 'pending', 'processing', 'completed', 'failed', 'cancelled'
  request: jsonb('request'), // Store the original LLM request params
  response: jsonb('response'), // Store the LLM response
  error: text('error'), // Error message if failed
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => {
  return {
    jobStatusIdx: index('idx_job_status').on(table.jobId, table.status),
    userJobsIdx: index('idx_user_jobs').on(table.userId, table.createdAt)
  }
})