/*
  # Adicionar campo tipo de atendimento

  1. Alterações nas Tabelas
    - Adicionar campo `tipo` na tabela `producao_mensal`
    - Campo `tipo` já existe na tabela `repasses`
    - Valores permitidos: 'consulta' ou 'cirurgia'
    - Valor padrão: 'consulta'

  2. Índices
    - Adicionar índice para melhor performance nas consultas por tipo

  3. Constraints
    - Adicionar constraint para validar valores permitidos
*/

-- Adicionar campo tipo na tabela producao_mensal
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'producao_mensal' AND column_name = 'tipo'
  ) THEN
    ALTER TABLE producao_mensal ADD COLUMN tipo text DEFAULT 'consulta' NOT NULL;
  END IF;
END $$;

-- Adicionar constraint para validar valores na producao_mensal
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'producao_mensal' AND constraint_name = 'producao_mensal_tipo_check'
  ) THEN
    ALTER TABLE producao_mensal ADD CONSTRAINT producao_mensal_tipo_check 
    CHECK (tipo = ANY (ARRAY['consulta'::text, 'cirurgia'::text]));
  END IF;
END $$;

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_producao_tipo ON producao_mensal USING btree (tipo);