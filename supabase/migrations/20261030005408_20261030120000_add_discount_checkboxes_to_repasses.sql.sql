/*
# Add discount checkbox columns to repasses table

1. New Columns on `repasses`
- `desc_adm` (boolean, default true) — whether to apply the 1% Adm discount
- `desc_chefe_faturamento` (boolean, default true) — whether to apply the 0.75% Chefe faturamento discount
- `desc_faturista` (boolean, default true) — whether to apply the 0.5% Faturista discount
- `desc_autorizacao` (boolean, default true) — whether to apply the 0.25% Autorização discount

2. Notes
- These columns are used only by the "Repasse a sócios" flow to calculate applicable discounts.
- Defaults are true so existing and new records have all discounts applied unless explicitly unchecked.
- No security changes: existing RLS policies and grants on `repasses` already cover these new columns.
*/

DO $$ BEGIN
  ALTER TABLE repasses ADD COLUMN desc_adm boolean NOT NULL DEFAULT true;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE repasses ADD COLUMN desc_chefe_faturamento boolean NOT NULL DEFAULT true;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE repasses ADD COLUMN desc_faturista boolean NOT NULL DEFAULT true;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE repasses ADD COLUMN desc_autorizacao boolean NOT NULL DEFAULT true;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
