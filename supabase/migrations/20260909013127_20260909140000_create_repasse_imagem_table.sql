/*
# Criar aba Repasse imagem

1. Objetivo
- Criar uma tabela própria para os lançamentos da aba "Repasse imagem" dentro de Produção Mensal.
- Cada lançamento representa o total de um médico em uma clínica, em uma competência mensal.
- O imposto e os valores de clínica/repasse são calculados na tela a partir dos dados salvos.

2. Nova tabela: `repasses_imagem`
- `id` (serial, primary key): identificador do lançamento.
- `month_reference` (text, not null): competência no formato YYYY-MM.
- `hospital_id` (integer, not null): clínica selecionada no cadastro de Hospitais/Clínicas.
- `medico_id` (integer, not null): médico relacionado ao lançamento.
- `total` (numeric, not null): total bruto do médico.
- `imposto_percentual` (numeric, not null, default 6.15): percentual do imposto usado no cálculo.
- `created_at` (timestamptz): data de criação.

3. Relacionamentos
- `hospital_id` referencia `public.hospitais(id)`.
- `medico_id` referencia `public.medicos(id)`.

4. Segurança
- RLS habilitado na tabela `repasses_imagem`.
- Políticas separadas de SELECT, INSERT, UPDATE e DELETE para usuários autenticados.
- A tela só é exibida após autenticação, seguindo o padrão da aplicação.

5. Observações
- Nenhuma tabela ou coluna existente é removida ou alterada.
- Os campos calculados da imagem permanecem derivados de `total` e `imposto_percentual`, evitando divergência entre valores gravados e exibidos.
*/

CREATE TABLE IF NOT EXISTS public.repasses_imagem (
  id serial PRIMARY KEY,
  month_reference text NOT NULL,
  hospital_id integer NOT NULL REFERENCES public.hospitais(id),
  medico_id integer NOT NULL REFERENCES public.medicos(id),
  total numeric NOT NULL DEFAULT 0 CHECK (total >= 0),
  imposto_percentual numeric NOT NULL DEFAULT 6.15 CHECK (imposto_percentual >= 0 AND imposto_percentual <= 100),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS repasses_imagem_month_hospital_idx
  ON public.repasses_imagem (month_reference, hospital_id);

ALTER TABLE public.repasses_imagem ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_select_repasse_imagem" ON public.repasses_imagem;
CREATE POLICY "authenticated_select_repasse_imagem" ON public.repasses_imagem FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_insert_repasse_imagem" ON public.repasses_imagem;
CREATE POLICY "authenticated_insert_repasse_imagem" ON public.repasses_imagem FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update_repasse_imagem" ON public.repasses_imagem;
CREATE POLICY "authenticated_update_repasse_imagem" ON public.repasses_imagem FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_delete_repasse_imagem" ON public.repasses_imagem;
CREATE POLICY "authenticated_delete_repasse_imagem" ON public.repasses_imagem FOR DELETE
  TO authenticated USING (true);