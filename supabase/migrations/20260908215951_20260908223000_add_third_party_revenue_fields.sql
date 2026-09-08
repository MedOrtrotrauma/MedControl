/*
# Ampliar o controle de repasses conforme os relatórios financeiros

1. Objetivo
- Registrar no repasse a terceiros os campos apresentados no relatório de consultas particulares.
- Separar descontos, valor recebido, percentual e valor destinado ao terceiro.

2. Novas colunas em `repasses`
- `desconto_paciente`: desconto concedido ao paciente.
- `desconto_cartao`: desconto ou taxa relacionada ao cartão.
- `valor_recebido`: valor efetivamente recebido.
- `percentual_terceiro`: percentual usado para calcular o repasse ao terceiro.
- `valor_terceiro`: valor calculado para o terceiro.
- `saldo_controle`: diferença entre o valor recebido e o valor repassado.

3. Integridade
- As colunas financeiras possuem padrão zero para preservar registros anteriores.
- Valores negativos são bloqueados.
- O percentual do terceiro fica entre 0 e 100.

4. Segurança
- A tabela `repasses` já possui RLS e as políticas existentes continuam valendo.
- Nenhuma permissão é ampliada nesta alteração.

5. Compatibilidade
- Lançamentos existentes recebem `valor_recebido` igual ao valor bruto e `valor_terceiro` igual ao valor de repasse existente quando disponível.
- Nenhuma coluna ou dado existente é removido.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'repasses' AND column_name = 'desconto_paciente') THEN
    ALTER TABLE public.repasses ADD COLUMN desconto_paciente numeric(10,2) NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'repasses' AND column_name = 'desconto_cartao') THEN
    ALTER TABLE public.repasses ADD COLUMN desconto_cartao numeric(10,2) NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'repasses' AND column_name = 'valor_recebido') THEN
    ALTER TABLE public.repasses ADD COLUMN valor_recebido numeric(10,2) NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'repasses' AND column_name = 'percentual_terceiro') THEN
    ALTER TABLE public.repasses ADD COLUMN percentual_terceiro numeric(5,2) NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'repasses' AND column_name = 'valor_terceiro') THEN
    ALTER TABLE public.repasses ADD COLUMN valor_terceiro numeric(10,2) NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'repasses' AND column_name = 'saldo_controle') THEN
    ALTER TABLE public.repasses ADD COLUMN saldo_controle numeric(10,2) NOT NULL DEFAULT 0;
  END IF;
END $$;

UPDATE public.repasses
SET valor_recebido = COALESCE(NULLIF(valor_recebido, 0), valor),
    valor_terceiro = COALESCE(NULLIF(valor_terceiro, 0), COALESCE(valor_repasse_medico, 0)),
    saldo_controle = COALESCE(NULLIF(saldo_controle, 0), COALESCE(valor_recebido, valor) - COALESCE(valor_repasse_medico, 0));

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'repasses_third_party_values_check') THEN
    ALTER TABLE public.repasses ADD CONSTRAINT repasses_third_party_values_check CHECK (desconto_paciente >= 0 AND desconto_cartao >= 0 AND valor_recebido >= 0 AND valor_terceiro >= 0 AND percentual_terceiro >= 0 AND percentual_terceiro <= 100);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_repasses_percentual_terceiro ON public.repasses(percentual_terceiro);
