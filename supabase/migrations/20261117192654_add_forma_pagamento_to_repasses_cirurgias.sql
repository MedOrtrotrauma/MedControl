/*
# Add forma_pagamento to repasses_cirurgias

1. Plain-English explanation
- The surgery payout form lets the user pick a payment method (Convênio, Pix, Crédito,
  Débito, Espécie), but the column was missing from the live table, causing HTTP 400
  (column not found) errors when saving a new entry.

2. Modified tables
- `repasses_cirurgias`: add `forma_pagamento text` with a check constraint limited to the
  values the app uses: convenio, pix, credito, debito, especie.

3. Security
- No RLS changes; existing grants remain valid.

4. Notes
- Idempotent: only adds the column if missing.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'repasses_cirurgias'
      AND column_name = 'forma_pagamento'
  ) THEN
    ALTER TABLE repasses_cirurgias
      ADD COLUMN forma_pagamento text
        CHECK (forma_pagamento IN ('convenio', 'pix', 'credito', 'debito', 'especie'));
  END IF;
END $$;
