/*
  # Atualizar tabela de médicos para incluir CRM

  1. Alterações
    - Adicionar campo `crm` na tabela `medicos`
    - Remover campo `especialidade` (não solicitado)
    - Limpar dados existentes

  2. Limpeza
    - Remover todos os dados pré-cadastrados das tabelas
*/

-- Limpar dados existentes
DELETE FROM producao_mensal;
DELETE FROM repasses;
DELETE FROM medicos;
DELETE FROM convenios;
DELETE FROM hospitais;

-- Adicionar campo CRM à tabela médicos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'medicos' AND column_name = 'crm'
  ) THEN
    ALTER TABLE medicos ADD COLUMN crm text;
  END IF;
END $$;

-- Remover campo especialidade se existir
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'medicos' AND column_name = 'especialidade'
  ) THEN
    ALTER TABLE medicos DROP COLUMN especialidade;
  END IF;
END $$;