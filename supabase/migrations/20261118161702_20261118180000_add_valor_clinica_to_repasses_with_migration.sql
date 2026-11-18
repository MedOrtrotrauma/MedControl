/*
# Valor da clínica + valor de repasse no menu Particulares (+ importação dos lançamentos antigos)

1. Plain-English explanation
- Novo campo "Valor da clínica" no formulário de Particulares: a tabela `repasses` ganha a
  coluna `valor_clinica`.
- O "Valor de repasse" é calculado no app como valor bruto − valor da clínica e gravado na
  coluna já existente `valor_repasse` (que não era usada).
- Esta migração TAMBÉM executa a importação dos lançamentos do antigo submenu Particulares
  (tabela `repasses_particulares`) para a tabela `repasses`, caso ainda não tenha ocorrido.
  A importação é idempotente: rodar mais de uma vez NÃO duplica registros.
- Dados originais em `repasses_particulares` não são alterados nem apagados.

2. Modified tables
- `repasses`: nova coluna `valor_clinica numeric NOT NULL DEFAULT 0`.
- Para os registros importados: `valor_repasse` = repasse do médico original e
  `valor_clinica` = valor bruto − repasse do médico.

3. Security
- Nenhuma mudança de RLS; grants existentes continuam válidos.
*/

ALTER TABLE repasses
  ADD COLUMN IF NOT EXISTS valor_clinica numeric NOT NULL DEFAULT 0;

-- Estrutura de rastreabilidade da importação (idempotente)
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

-- Importação (idempotente) dos lançamentos do antigo submenu Particulares
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
  valor_clinica, valor_repasse,
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
  GREATEST(COALESCE(p.valor_bruto, 0) - COALESCE(p.valor_repasse_medico, 0), 0),
  GREATEST(COALESCE(p.valor_repasse_medico, 0), 0),
  TRUE,
  TRUE,
  p.id
FROM repasses_particulares p
WHERE NOT EXISTS (
  SELECT 1 FROM repasses r WHERE r.origem_migracao_id = p.id
);
