/*
# Add particular repasse fields to repasses table

1. New Columns on `repasses`:
- `is_split_payment` (boolean, default false) — whether the payment was split (cash + card/pix)
- `cash_amount` (numeric, default 0) — cash portion of a split payment
- `other_payment_method` (text, nullable) — the non-cash method in a split payment (credit/debit/pix/deposit)
- `payment_tax_rate` (numeric, default 0) — card/operator tax rate percentage
- `payment_tax_amount` (numeric, default 0) — calculated tax amount in BRL
- `invoice_tax_rate` (numeric, default 0) — ISS/imposto rate percentage
- `invoice_tax_amount` (numeric, default 0) — calculated imposto amount in BRL
- `medication_cost` (numeric, default 0) — direct cost: medication
- `supplies_cost` (numeric, default 0) — direct cost: supplies
- `other_costs` (numeric, default 0) — direct cost: other
- `other_costs_description` (text, nullable) — description of other costs
- `total_deductions` (numeric, default 0) — sum of all deductions
- `net_clinic_value` (numeric, default 0) — net value for the clinic after deductions
- `cash_settlement_type` (text, nullable) — 'doctor_took' or 'left_at_clinic'
- `installments` (integer, default 1) — number of installments
- `has_medication` (boolean, default false) — flag indicating medication costs
- `has_other_costs` (boolean, default false) — flag indicating other costs
- `repasse_particular` (boolean, default false) — flag to identify records from the Repasse particular menu (distinct from the Particulares menu)

2. Security
- No new tables. Existing RLS policies on `repasses` remain unchanged.
- No new grants needed — existing grants cover the new columns.
*/

ALTER TABLE repasses
  ADD COLUMN IF NOT EXISTS is_split_payment boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cash_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS other_payment_method text,
  ADD COLUMN IF NOT EXISTS payment_tax_rate numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_tax_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS invoice_tax_rate numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS invoice_tax_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS medication_cost numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS supplies_cost numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS other_costs numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS other_costs_description text,
  ADD COLUMN IF NOT EXISTS total_deductions numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_clinic_value numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cash_settlement_type text,
  ADD COLUMN IF NOT EXISTS installments integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS has_medication boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_other_costs boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS repasse_particular boolean NOT NULL DEFAULT false;
