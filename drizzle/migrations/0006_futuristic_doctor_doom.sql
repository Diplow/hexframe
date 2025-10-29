-- Add preview column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'vde_base_items'
    AND column_name = 'preview'
  ) THEN
    ALTER TABLE "vde_base_items" ADD COLUMN "preview" text;
  END IF;
END $$;