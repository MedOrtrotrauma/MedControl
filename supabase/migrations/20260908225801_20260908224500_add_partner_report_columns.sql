/*
# Campos do relatório de faturamento e repasse

1. Objetivo
- Reproduzir no controle de repasses as colunas do relatório operacional.

2. Novas colunas
- `numero_atendimento`: identificador do atendimento.
- `valor_glosa`: valor glosado antes do recebimento.

3. Segurança e compatibilidade
- A tabela já possui RLS; nenhuma política é alterada.
- Os novos valores têm padrão zero e não removem dados existentes.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'repasses' AND column_name = 'numero_atendimento') THEN
    ALTER TABLE public.repasses ADD COLUMN numero_atendimento text NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'repasses' AND column_name = 'valor_glosa') THEN
    ALTER TABLE public.repasses ADD COLUMN valor_glosa numeric(10,2) NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'repasses_glosa_value_check') THEN
    ALTER TABLE public.repasses ADD CONSTRAINT repasses_glosa_value_check CHECK (valor_glosa >= 0);
  END IF;
END $$;
