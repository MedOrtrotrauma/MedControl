/*
# Add conference marker to repasses

1. Altered Tables
- `public.repasses`
- Adds `check_conferencia` as a required boolean field with a safe default of `false`.
- Existing records remain intact and are treated as not yet checked.

2. Application Behavior
- The Particulars form can save whether a record was checked.
- Existing Particulars records can be edited and displayed without schema-cache errors.

3. Security
- No RLS policies are changed.
- Existing access rules for `public.repasses` remain in effect.

4. Safety Notes
- This migration is idempotent and can be safely run again.
- No columns, rows, or existing values are deleted.
*/

ALTER TABLE public.repasses
  ADD COLUMN IF NOT EXISTS check_conferencia boolean NOT NULL DEFAULT false;

NOTIFY pgrst, 'reload schema';