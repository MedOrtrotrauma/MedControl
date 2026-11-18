/*
# Migração de dados: lançamentos do antigo submenu Particulares → tabela repasses

1. Plain-English explanation
- O antigo submenu "Particulares" (produção mensal) gravava na tabela `repasses_particulares`.
  O novo menu "Particulares" grava na tabela `repasses` com a marca `repasse_particular = true`.
- Esta migração copia TODOS os lançamentos de `repasses_particulares` para `repasses`.
- Colunas sem correspondência ficam em branco/nulas. A tabela `repasses` não possui
  status_pagamento/data_pagamento/valor_liquido/destinatario_tipo/cash_settlement_type/unidade_id,
  então esses campos não são migrados.
- Forma de pagamento: a tabela `repasses` só aceita credito/pix/debito/especie/convenio.
  Valores fora dessa lista (ex.: 'deposito') vêm como NULL.
- Idempotente: rodar de novo NÃO duplica registros (índice único em origem_migracao_id).
- Os dados originais em `repasses_particulares` NÃO são apagados — ficam como backup histórico.

2. Modified tables
- `repasses`: novas colunas `migrado_de_particulares boolean NOT NULL DEFAULT false`
  e `origem_migracao_id bigint` (id original em repasses_particulares, rastreabilidade).
- Índice único parcial em `origem_migracao_id`.

3. Security
- Nenhuma mudança de RLS; grants existentes continuam válidos.

4. Notes
- Se `repasses_particulares` estiver vazia, nada é inserido (sem erro).
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='repasses' AND column_name='migrado_de_particulares'
  ) THEN
    ALTER TABLE repasses
      ADD COLUMN migrado_de_particulares boolean NOT NULL DEFAULT false,
      ADD COLUMN origem_migracao_id bigint;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_repasses_origem_migracao
  ON repasses (origem_migracao_id)
  WHERE origem_migracao_id IS NOT NULL;

INSERT INTO repasses (
  medico_id, hospital_id, nome_paciente, data_cirurgia, valor, tipo,
  is_particular, tipo_procedimento_detalhado, tipo_procedimento, quantidade,
  forma_pagamento, month_reference, observacao,
  valor_recebido, valor_repasse_medico,
  is_split_payment, cash_amount, other_payment_method,
  payment_tax_rate, payment_tax_amount,
  invoice_tax_rate, invoice_tax_amount,
  medication_cost, supplies_cost, other_costs, other_costs_description,
  total_deductions, installments,
  has_medication, has_other_costs,
  check_conferencia,
  repasse_particular,
  migrado_de_particulares, origem_migracao_id
)
SELECT
  p.medico_id,
  NULL,
  p.nome_paciente,
  p.data_procedimento,
  p.valor_bruto,
  'consulta',
  TRUE,
  'cirurgia_particular',
  p.procedimento_descricao,
  1,
  CASE WHEN p.forma_pagamento IN ('credito','pix','debito','especie','convenio')
       THEN p.forma_pagamento ELSE NULL END,
  p.month_reference,
  p.observacao,
  GREATEST(COALESCE(p.valor_recebido, 0), 0),
  GREATEST(COALESCE(p.valor_repasse_medico, 0), 0),
  p.is_split_payment,
  GREATEST(COALESCE(p.cash_amount, 0), 0),
  p.other_payment_method,
  GREATEST(COALESCE(p.payment_tax_rate, 0), 0),
  GREATEST(COALESCE(p.payment_tax_amount, 0), 0),
  GREATEST(COALESCE(p.invoice_tax_rate, 0), 0),
  GREATEST(COALESCE(p.invoice_tax_amount, 0), 0),
  GREATEST(COALESCE(p.medication_cost, 0), 0),
  GREATEST(COALESCE(p.supplies_cost, 0), 0),
  GREATEST(COALESCE(p.other_costs, 0), 0),
  p.other_costs_description,
  GREATEST(COALESCE(p.total_deductions, 0), 0),
  p.installments,
  COALESCE(p.medication_cost, 0) > 0,
  COALESCE(p.other_costs, 0) > 0,
  p.check_conferencia,
  TRUE,
  TRUE,
  p.id
FROM repasses_particulares p
WHERE NOT EXISTS (
  SELECT 1 FROM repasses r WHERE r.origem_migracao_id = p.id
);
