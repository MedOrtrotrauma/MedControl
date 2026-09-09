/*
# Adequar lançamentos particulares ao modelo da planilha

1. Objetivo
- Ajustar a tabela `repasses` para armazenar os campos usados na aba Particular da Produção Mensal.
- A aba passa a representar somente os dados da planilha: unidade, data, médico, vínculo, paciente particular, procedimento, forma de pagamento, valor recebido, valor de repasse e conferência.

2. Novas colunas em `repasses`
- `unidade` (text): unidade onde o atendimento foi realizado.
- `vinculo` (text): vínculo do lançamento, com os valores `externo` ou `socio`.
- `valor_repasse` (numeric): valor do repasse exibido na planilha.
- `check_conferencia` (boolean): marcação de conferência do lançamento, iniciada como `false`.

3. Alterações na tabela `repasses`
- `hospital_id` deixa de ser obrigatório, pois hospital/clínica não é um campo da planilha de Particular.
- Nenhum dado existente é removido ou alterado.

4. Segurança
- Nenhuma tabela nova é criada.
- As regras de acesso existentes da tabela `repasses` permanecem inalteradas.

5. Observações
- A migração é idempotente: pode ser aplicada novamente sem recriar colunas ou restrições.
- Os valores antigos continuam preservados; os novos campos recebem valores padrão seguros quando aplicável.
*/

ALTER TABLE public.repasses
  ADD COLUMN IF NOT EXISTS unidade text,
  ADD COLUMN IF NOT EXISTS vinculo text,
  ADD COLUMN IF NOT EXISTS valor_repasse numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS check_conferencia boolean NOT NULL DEFAULT false;

ALTER TABLE public.repasses
  ALTER COLUMN hospital_id DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.repasses'::regclass
      AND conname = 'repasses_vinculo_check'
  ) THEN
    ALTER TABLE public.repasses
      ADD CONSTRAINT repasses_vinculo_check
      CHECK (vinculo IS NULL OR vinculo IN ('externo', 'socio'));
  END IF;
END $$;