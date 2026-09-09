/*
# Criar tabela de Procedimentos

1. Objetivo
- Criar a tabela `procedimentos` para cadastro dos procedimentos realizados nos atendimentos particulares.
- O campo "Procedimento" dos repasses particulares passa a referenciar estes procedimentos cadastrados.

2. Nova tabela: `procedimentos`
- `id` (serial, primary key): identificador único.
- `nome` (text, not null): nome do procedimento (ex: "Consulta", "Infiltração", "Onda de Choque").
- `created_at` (timestamptz): data de criação.

3. Segurança
- RLS habilitado na tabela `procedimentos`.
- Políticas para anon + authenticated fazer CRUD (mesmo padrão das demais tabelas de cadastro).
*/

CREATE TABLE IF NOT EXISTS public.procedimentos (
  id serial PRIMARY KEY,
  nome text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.procedimentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_procedimentos" ON public.procedimentos;
CREATE POLICY "anon_select_procedimentos" ON public.procedimentos FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_procedimentos" ON public.procedimentos;
CREATE POLICY "anon_insert_procedimentos" ON public.procedimentos FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_procedimentos" ON public.procedimentos;
CREATE POLICY "anon_update_procedimentos" ON public.procedimentos FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_procedimentos" ON public.procedimentos;
CREATE POLICY "anon_delete_procedimentos" ON public.procedimentos FOR DELETE
  TO anon, authenticated USING (true);