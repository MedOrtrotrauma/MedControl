/*
# Add missing valor_glosa column to repasse_cirurgias

The sócio and terceiro save payloads from RepasseComponent include `valor_glosa`,
which was missing from the repasse_cirurgias table when it was created.
This adds the column with a default of 0 to match the repasses table.
*/

ALTER TABLE public.repasse_cirurgias
  ADD COLUMN IF NOT EXISTS valor_glosa numeric(10,2) NOT NULL DEFAULT 0;