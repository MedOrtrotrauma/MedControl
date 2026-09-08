/*
  # Adicionar campo observação aos repasses

  1. Alterações
    - Adicionar campo `observacao` na tabela `repasses`
      - Tipo: text
      - Opcional (nullable)
      - Para armazenar observações sobre o repasse
    
  2. Notas
    - Campo opcional para adicionar informações extras sobre cada repasse
    - Será exibido nos relatórios e impressões
*/

-- Adicionar campo observacao
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'repasses' AND column_name = 'observacao'
  ) THEN
    ALTER TABLE repasses ADD COLUMN observacao text;
  END IF;
END $$;