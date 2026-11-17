/*
# Add valor_liquido to repasses_cirurgias

1. Plain-English explanation
- The app sends `valor_liquido` when saving/updating surgery payouts (repasses de cirurgia),
  but the column did not exist in the live table, causing HTTP 400 (column not found) errors.

2. Modified tables
- `repasses_cirurgias`: add `valor_liquido numeric NOT NULL DEFAULT 0` (net payout amount).

3. Security
- No RLS changes; existing grants remain valid. New columns inherit table-level privileges.

4. Notes
- Idempotent: only adds the column if missing.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'repasses_cirurgias'
      AND column_name = 'valor_liquido'
  ) THEN
    ALTER TABLE repasses_cirurgias
      ADD COLUMN valor_liquido numeric NOT NULL DEFAULT 0;
  END IF;
END $$;
