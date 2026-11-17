/*
# Criar ambiente Financeiro

1. Novas tabelas
- `finance_categories`: categorias de receitas e despesas, com nome, tipo e status ativo.
- `finance_subcategories`: detalhamento opcional de cada categoria.
- `finance_bills`: contas a pagar e receber, com descrição, valor, vencimento, pagamento, referência mensal, status e observações.

2. Integridade e relacionamento
- Subcategorias pertencem a uma categoria.
- Contas podem apontar para uma categoria e subcategoria.
- A exclusão de uma categoria não apaga contas existentes; apenas remove a classificação relacionada.
- Valores não podem ser negativos e mês de referência deve estar entre 1 e 12.

3. Segurança
- RLS habilitado nas três tabelas.
- Acesso concedido somente ao papel `authenticated`.
- Todas as operações são permitidas apenas para usuários ativos cujo perfil tenha tipo `administrativo`.
- Cada tabela possui políticas separadas para SELECT, INSERT, UPDATE e DELETE.
- Usuários anônimos não recebem acesso às tabelas financeiras.

4. Observações
- O ambiente Financeiro usa as contas existentes do sistema e não altera repasses, particulares ou demais lançamentos operacionais.
- As tabelas são criadas de forma idempotente para permitir reaplicação segura.
*/

CREATE TABLE IF NOT EXISTS public.finance_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(trim(name)) > 0),
  type text NOT NULL DEFAULT 'expense' CHECK (type IN ('expense', 'income')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.finance_subcategories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.finance_categories(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(trim(name)) > 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.finance_bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description text NOT NULL CHECK (length(trim(description)) > 0),
  type text NOT NULL DEFAULT 'expense' CHECK (type IN ('expense', 'income')),
  category_id uuid REFERENCES public.finance_categories(id) ON DELETE SET NULL,
  subcategory_id uuid REFERENCES public.finance_subcategories(id) ON DELETE SET NULL,
  amount numeric(12, 2) NOT NULL CHECK (amount >= 0),
  origin text,
  due_date date,
  payment_date date,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  month_ref smallint NOT NULL CHECK (month_ref BETWEEN 1 AND 12),
  year_ref smallint NOT NULL CHECK (year_ref BETWEEN 2000 AND 2200),
  recurring boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS finance_subcategories_category_id_idx
  ON public.finance_subcategories(category_id);
CREATE INDEX IF NOT EXISTS finance_bills_reference_idx
  ON public.finance_bills(year_ref, month_ref);
CREATE INDEX IF NOT EXISTS finance_bills_category_id_idx
  ON public.finance_bills(category_id);
CREATE INDEX IF NOT EXISTS finance_bills_status_idx
  ON public.finance_bills(status);

ALTER TABLE public.finance_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_bills ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_subcategories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_bills TO authenticated;

DROP POLICY IF EXISTS "finance_admin_select_categories" ON public.finance_categories;
CREATE POLICY "finance_admin_select_categories" ON public.finance_categories
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.perfis_usuario p WHERE p.id = auth.uid() AND p.tipo = 'administrativo' AND p.ativo = true));

DROP POLICY IF EXISTS "finance_admin_insert_categories" ON public.finance_categories;
CREATE POLICY "finance_admin_insert_categories" ON public.finance_categories
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.perfis_usuario p WHERE p.id = auth.uid() AND p.tipo = 'administrativo' AND p.ativo = true));

DROP POLICY IF EXISTS "finance_admin_update_categories" ON public.finance_categories;
CREATE POLICY "finance_admin_update_categories" ON public.finance_categories
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.perfis_usuario p WHERE p.id = auth.uid() AND p.tipo = 'administrativo' AND p.ativo = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.perfis_usuario p WHERE p.id = auth.uid() AND p.tipo = 'administrativo' AND p.ativo = true));

DROP POLICY IF EXISTS "finance_admin_delete_categories" ON public.finance_categories;
CREATE POLICY "finance_admin_delete_categories" ON public.finance_categories
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.perfis_usuario p WHERE p.id = auth.uid() AND p.tipo = 'administrativo' AND p.ativo = true));

DROP POLICY IF EXISTS "finance_admin_select_subcategories" ON public.finance_subcategories;
CREATE POLICY "finance_admin_select_subcategories" ON public.finance_subcategories
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.perfis_usuario p WHERE p.id = auth.uid() AND p.tipo = 'administrativo' AND p.ativo = true));

DROP POLICY IF EXISTS "finance_admin_insert_subcategories" ON public.finance_subcategories;
CREATE POLICY "finance_admin_insert_subcategories" ON public.finance_subcategories
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.perfis_usuario p WHERE p.id = auth.uid() AND p.tipo = 'administrativo' AND p.ativo = true));

DROP POLICY IF EXISTS "finance_admin_update_subcategories" ON public.finance_subcategories;
CREATE POLICY "finance_admin_update_subcategories" ON public.finance_subcategories
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.perfis_usuario p WHERE p.id = auth.uid() AND p.tipo = 'administrativo' AND p.ativo = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.perfis_usuario p WHERE p.id = auth.uid() AND p.tipo = 'administrativo' AND p.ativo = true));

DROP POLICY IF EXISTS "finance_admin_delete_subcategories" ON public.finance_subcategories;
CREATE POLICY "finance_admin_delete_subcategories" ON public.finance_subcategories
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.perfis_usuario p WHERE p.id = auth.uid() AND p.tipo = 'administrativo' AND p.ativo = true));

DROP POLICY IF EXISTS "finance_admin_select_bills" ON public.finance_bills;
CREATE POLICY "finance_admin_select_bills" ON public.finance_bills
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.perfis_usuario p WHERE p.id = auth.uid() AND p.tipo = 'administrativo' AND p.ativo = true));

DROP POLICY IF EXISTS "finance_admin_insert_bills" ON public.finance_bills;
CREATE POLICY "finance_admin_insert_bills" ON public.finance_bills
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.perfis_usuario p WHERE p.id = auth.uid() AND p.tipo = 'administrativo' AND p.ativo = true));

DROP POLICY IF EXISTS "finance_admin_update_bills" ON public.finance_bills;
CREATE POLICY "finance_admin_update_bills" ON public.finance_bills
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.perfis_usuario p WHERE p.id = auth.uid() AND p.tipo = 'administrativo' AND p.ativo = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.perfis_usuario p WHERE p.id = auth.uid() AND p.tipo = 'administrativo' AND p.ativo = true));

DROP POLICY IF EXISTS "finance_admin_delete_bills" ON public.finance_bills;
CREATE POLICY "finance_admin_delete_bills" ON public.finance_bills
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.perfis_usuario p WHERE p.id = auth.uid() AND p.tipo = 'administrativo' AND p.ativo = true));