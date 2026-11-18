-- =====================================================================
-- CORRECAO para rodar no BANCO EXTERNO
-- Erro original: relation "repasses" does not exist
-- Causa: nesse banco a tabela principal de repasses se chama
--        `repasses_legacy` (antiga `repasses` renomeada). O app le/grava
--        na tabela `repasses`. Este script:
--   1) Renomeia repasses_legacy -> repasses (se necessario)
--   2) Cria as colunas que faltam (valor_clinica, unidade_id,
--      migrado_de_particulares, origem_migracao_id)
--   3) Garante acesso (grants) e policies do app
--   4) Importa os lancamentos de repasses_particulares para repasses
-- Idempotente: pode rodar varias vezes sem duplicar nem falhar.
-- Os dados originais em repasses_particulares NAO sao alterados/apagados.
-- =====================================================================

-- ------------------------------------------------------------------
-- 0) Seguranca: se nenhuma das duas tabelas existir, avisar claramente
-- ------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.repasses_legacy') IS NULL
     AND to_regclass('public.repasses') IS NULL THEN
    RAISE EXCEPTION 'Nenhuma tabela de repasses encontrada neste banco (nem "repasses" nem "repasses_legacy"). Verifique se este e o banco correto.';
  END IF;
END $$;

-- ------------------------------------------------------------------
-- 1) Restaurar o nome que o aplicativo usa
-- ------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.repasses_legacy') IS NOT NULL
     AND to_regclass('public.repasses') IS NULL THEN
    ALTER TABLE repasses_legacy RENAME TO repasses;
  END IF;
END $$;

-- ------------------------------------------------------------------
-- 2) Colunas que o app espera e podem faltar
-- ------------------------------------------------------------------
ALTER TABLE repasses ADD COLUMN IF NOT EXISTS valor_clinica numeric NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='repasses' AND column_name='unidade_id'
  ) THEN
    -- A tabela pode nao ter a FK para unidades se o schema dela for mais antigo
    IF to_regclass('public.unidades') IS NOT NULL THEN
      ALTER TABLE repasses ADD COLUMN unidade_id integer REFERENCES unidades(id);
    ELSE
      ALTER TABLE repasses ADD COLUMN unidade_id integer;
    END IF;
  END IF;
END $$;

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

-- ------------------------------------------------------------------
-- 3) Acesso do aplicativo
-- Grants sempre; policies apenas se o RLS ja estiver habilitado
-- (habilitar RLS aqui sem as policies prontas poderia travar o app)
-- ------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON repasses TO authenticated;

DO $$
DECLARE rls_ativo boolean;
BEGIN
  SELECT relrowsecurity INTO rls_ativo
  FROM pg_class
  WHERE oid = 'public.repasses'::regclass;

  IF rls_ativo THEN
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can view repasses" ON repasses';
    EXECUTE 'CREATE POLICY "Authenticated users can view repasses" ON repasses FOR SELECT TO authenticated USING (true)';

    EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can insert repasses" ON repasses';
    EXECUTE 'CREATE POLICY "Authenticated users can insert repasses" ON repasses FOR INSERT TO authenticated WITH CHECK (true)';

    EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can update repasses" ON repasses';
    EXECUTE 'CREATE POLICY "Authenticated users can update repasses" ON repasses FOR UPDATE TO authenticated USING (true) WITH CHECK (true)';

    EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can delete repasses" ON repasses';
    EXECUTE 'CREATE POLICY "Authenticated users can delete repasses" ON repasses FOR DELETE TO authenticated USING (true)';
  END IF;
END $$;

-- ------------------------------------------------------------------
-- 4) Importacao idempotente dos lancamentos do antigo menu Particulares
-- Somente se a tabela origem existir neste banco
-- ------------------------------------------------------------------
DO $$
DECLARE linhas bigint;
BEGIN
  IF to_regclass('public.repasses_particulares') IS NOT NULL THEN
    INSERT INTO repasses (
      medico_id, unidade_id, nome_paciente, data_cirurgia, valor, tipo,
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
      p.unidade_id,
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

    GET DIAGNOSTICS linhas = ROW_COUNT;
    RAISE NOTICE 'Importacao concluida: % lancamento(s) copiado(s) de repasses_particulares para repasses.', linhas;
  ELSE
    RAISE NOTICE 'Tabela repasses_particulares nao existe neste banco; nada foi importado.';
  END IF;
END $$;

-- ------------------------------------------------------------------
-- 5) Conferencia rapida (rode por conta propria depois, se quiser):
-- SELECT count(*) FROM repasses;                          -- total atual
-- SELECT count(*) FROM repasses WHERE migrado_de_particulares;  -- importados
-- SELECT count(*) FROM repasses_particulares;             -- originais
-- ------------------------------------------------------------------
