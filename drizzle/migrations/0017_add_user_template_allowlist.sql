-- Migration: Add user_template_allowlist table
--
-- Stores per-user template allowlists for hexecute validation.
-- Users can only execute templates that are in their allowlist.
-- Built-in templates (system, user, organizational, context) are always allowed.
--
-- The allowed_templates column stores a JSON array of template names.

CREATE TABLE IF NOT EXISTS user_template_allowlist (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "users"(id) ON DELETE CASCADE,
  allowed_templates TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_user_allowlist UNIQUE (user_id)
);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS user_template_allowlist_user_id_idx ON user_template_allowlist(user_id);
