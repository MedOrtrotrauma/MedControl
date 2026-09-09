/*
# Criar tabela de Unidades

1. Objetivo
- Criar a tabela `unidades` para cadastro das unidades onde os atendimentos particulares são realizados.
- O campo `unidade` dos repasses particulares passa a referenciar estas unidades.

2. Nova tabela: `unidades`
- `id` (serial, primary key): identificador único.
- `nome` (text, not null): nome da unidade (ex: "Unidade Centro", "Clínica Norte").
- `cidade` (text): cidade onde a unidade está localizada.
- `created_at` (timestamptz): data de criação.

3. Segurança
- RLS habilitado na tabela `unidades`.
- Políticas para anon + authenticated fazer CRUD (app single-tenant com login, mas o frontend usa anon key para leitura de cadastros de apoio).
*/

CREATE TABLE IF NOT EXISTS public.unidades (
  id serial PRIMARY KEY,
  nome text NOT NULL,
  cidade text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.unidades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_unidades" ON public.unidades;
CREATE POLICY "anon_select_unidades" ON public.unidades FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_unidades" ON public.unidades;
CREATE POLICY "anon_insert_unidades" ON public.unidades FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_unidades" ON public.unidades;
CREATE POLICY "anon_update_unidades" ON public.unidades FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_unidades" ON public.unidades;
CREATE POLICY "anon_delete_unidades" ON public.unidades FOR DELETE
  TO anon, authenticated USING (true);