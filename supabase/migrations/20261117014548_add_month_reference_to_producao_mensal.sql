/*
# Add month_reference to producao_mensal

1. Modified tables
- `producao_mensal`: adds `month_reference` (text, 'YYYY-MM'), the reference month used by all monthly filters in the app. Existing rows (none today) are backfilled from `data_consulta`.
2. Indexes
- Index on `month_reference` to keep monthly filtering fast.
3. Security
- No policy changes; existing grants/policies remain. Explicit grants re-asserted for the roles the app uses.
*/

ALTER TABLE producao_mensal ADD COLUMN IF NOT EXISTS month_reference text;

UPDATE producao_mensal
SET month_reference = to_char(data_consulta, 'YYYY-MM')
WHERE month_reference IS NULL AND data_consulta IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_producao_mensal_month_reference ON producao_mensal (month_reference);

GRANT SELECT, INSERT, UPDATE, DELETE ON producao_mensal TO anon, authenticated;
