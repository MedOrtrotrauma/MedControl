/*
# Controle de repasses mensais (taxa fixa única + repasse total/parcial + saldo)

1. Plain-English explanation
- Cada vez que o usuário "realiza um repasse" para um médico em um mês de competência,
  gravamos uma linha aqui descrevendo o repasse: se a taxa fixa da clínica foi cobrada,
  o valor dela, se o repasse foi TOTAL ou PARCIAL, o valor pago e o saldo que sobra
  para aquele mês.
- A taxa fixa da clínica passa a ser cobrada UMA ÚNICA VEZ por mês de competência
  (não por lançamento de cirurgia).
- Se o repasse for parcial, o saldo remanescente fica registrado e pode ser consultado
  em meses futuros; nos repasses seguintes, os saldos acumulados são descontados da conta.

2. New Tables
- `repasse_controles`
  - `id` (bigint, primary key)
  - `medico_id` (integer, not null) -> medicos.id
  - `month_reference` (text 'YYYY-MM', not null) — competência do repasse
  - `cobrar_fixo` (boolean, not null, default true) — se a taxa fixa da clínica entra na conta
  - `valor_fixo_clinica` (numeric, not null, default 0) — valor da taxa fixa (cobrada 1x no mês)
  - `tipo_repasse` (text: 'total' | 'parcial', not null, default 'total')
  - `valor_bruto_calculado` (numeric, not null, default 0) — líquido calculado antes do pagamento
  - `valor_pago` (numeric, not null, default 0) — valor efetivamente pago neste repasse
  - `saldo_remanescente` (numeric, not null, default 0) — o que sobrou para os próximos meses
  - `observacao` (text, nullable)
  - `data_repasse` (date, not null default hoje)
  - `created_at` (timestamptz, default now())

3. Security
- RLS habilitado em `repasse_controles`.
- Grants de SELECT/INSERT/UPDATE/DELETE para `authenticated` e `anon`
  (padrão já usado pelas demais tabelas do app, ex. `cirurgias`).
- 4 policies (select/insert/update/delete) para authenticated + anon, USING/WITH CHECK (true),
  mesmo padrão das outras tabelas deste app.

4. Notes
- Idempotente: CREATE TABLE IF NOT EXISTS, policies com DROP IF EXISTS antes.
*/

CREATE TABLE IF NOT EXISTS repasse_controles (
  id bigserial PRIMARY KEY,
  medico_id integer NOT NULL REFERENCES medicos(id),
  month_reference text NOT NULL,
  cobrar_fixo boolean NOT NULL DEFAULT true,
  valor_fixo_clinica numeric NOT NULL DEFAULT 0,
  tipo_repasse text NOT NULL DEFAULT 'total' CHECK (tipo_repasse IN ('total', 'parcial')),
  valor_bruto_calculado numeric NOT NULL DEFAULT 0,
  valor_pago numeric NOT NULL DEFAULT 0,
  saldo_remanescente numeric NOT NULL DEFAULT 0,
  observacao text,
  data_repasse date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_repasse_controles_medico_mes
  ON repasse_controles (medico_id, month_reference);
CREATE INDEX IF NOT EXISTS idx_repasse_controles_month
  ON repasse_controles (month_reference);

ALTER TABLE repasse_controles ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON repasse_controles TO authenticated, anon;

DROP POLICY IF EXISTS "authenticated_select_repasse_controles" ON repasse_controles;
CREATE POLICY "authenticated_select_repasse_controles"
ON repasse_controles FOR SELECT
TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "authenticated_insert_repasse_controles" ON repasse_controles;
CREATE POLICY "authenticated_insert_repasse_controles"
ON repasse_controles FOR INSERT
TO authenticated, anon WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update_repasse_controles" ON repasse_controles;
CREATE POLICY "authenticated_update_repasse_controles"
ON repasse_controles FOR UPDATE
TO authenticated, anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_delete_repasse_controles" ON repasse_controles;
CREATE POLICY "authenticated_delete_repasse_controles"
ON repasse_controles FOR DELETE
TO authenticated, anon USING (true);
