-- Rename descr column to content in base_items table (if it exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'vde_base_items'
    AND column_name = 'descr'
  ) THEN
    ALTER TABLE "vde_base_items" RENAME COLUMN "descr" TO "content";
  END IF;
END $$;
