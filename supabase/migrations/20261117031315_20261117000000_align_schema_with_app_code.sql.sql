/*
# Align database schema with application code

1. New Tables
- `cirurgias`: catalog of surgeries (id, nome, created_at). Used by the surgery
  registration screen and as a foreign key target for repasses_cirurgias.
- `perfis_usuario`: application user profiles linked 1-to-1 with auth.users
  (id, nome, email, tipo: administrativo|recepcao|medico, medico_id, ativo,
  created_at, updated_at). Used by login and user management.
- `producao_convenios`: monthly production of attendances per health plan
  (medico_id, convenio_id, nome_paciente, data_atendimento, tipo, valor,
  valor_glosa, valor_recebido, month_reference, observacao, timestamps).
- `repasses_particulares`: private-pay procedure revenue sharing
  (medico_id, unidade_id, procedimento_id, pagamento details, taxes, costs,
  valor_bruto/liquido, valor_repasse_medico, status, month_reference).
- `repasses_cirurgias`: surgery revenue sharing, created with the union of the
  documented schema and every column the application writes:
  numero_atendimento, tipo_procedimento_detalhado, valor_unitario,
  porcentagem_repasse, desconto_paciente, desconto_cartao, valor_glosa,
  percentual_terceiro, valor_terceiro, saldo_controle, desc_adm,
  desc_chefe_faturamento, desc_faturista, desc_autorizacao,
  desconto_fixo_clinica.

2. Modified Tables
- None. Existing tables (medicos, convenios, hospitais, unidades, procedimentos,
  repasses_imagem, repasses, producao_mensal) are untouched. The legacy
  `repasses` and `producao_mensal` tables are kept as-is.

3. Security
- RLS enabled on all five new tables.
- Grants: SELECT/INSERT/UPDATE/DELETE to `authenticated` only (the app requires
  sign-in). Sequence grant for cirurgias_id_seq to authenticated.
- Four policies per table (select/insert/update/delete) TO authenticated,
  matching the convention already used by the existing tables.

4. Notes
- All tables are empty; no data is affected.
- Indexes added on month_reference and medico_id for the transactional tables.
*/

-- ============================================================
-- 1. cirurgias
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cirurgias (
  id serial PRIMARY KEY,
  nome text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. perfis_usuario
-- ============================================================
CREATE TABLE IF NOT EXISTS public.perfis_usuario (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL,
  email text NOT NULL,
  tipo text NOT NULL DEFAULT 'recepcao' CHECK (tipo IN ('administrativo','recepcao','medico')),
  medico_id integer REFERENCES public.medicos(id),
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. producao_convenios
-- ============================================================
CREATE TABLE IF NOT EXISTS public.producao_convenios (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  medico_id integer NOT NULL REFERENCES public.medicos(id),
  convenio_id integer NOT NULL REFERENCES public.convenios(id),
  nome_paciente text NOT NULL,
  data_atendimento date NOT NULL,
  tipo text NOT NULL DEFAULT 'consulta' CHECK (tipo IN ('consulta','cirurgia')),
  valor numeric NOT NULL DEFAULT 0 CHECK (valor >= 0),
  valor_glosa numeric NOT NULL DEFAULT 0 CHECK (valor_glosa >= 0),
  valor_recebido numeric NOT NULL DEFAULT 0,
  month_reference text NOT NULL,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 4. repasses_particulares
-- ============================================================
CREATE TABLE IF NOT EXISTS public.repasses_particulares (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  medico_id integer NOT NULL REFERENCES public.medicos(id),
  unidade_id integer REFERENCES public.unidades(id),
  nome_paciente text NOT NULL,
  data_procedimento date NOT NULL,
  procedimento_id integer REFERENCES public.procedimentos(id),
  procedimento_descricao text,
  destinatario_tipo text NOT NULL DEFAULT 'socio' CHECK (destinatario_tipo IN ('socio','terceiro')),
  forma_pagamento text NOT NULL CHECK (forma_pagamento IN ('credito','debito','pix','especie','deposito')),
  is_split_payment boolean NOT NULL DEFAULT false,
  cash_amount numeric NOT NULL DEFAULT 0,
  other_payment_method text,
  installments smallint NOT NULL DEFAULT 1 CHECK (installments >= 1),
  valor_bruto numeric NOT NULL CHECK (valor_bruto >= 0),
  valor_recebido numeric NOT NULL DEFAULT 0,
  payment_tax_rate numeric NOT NULL DEFAULT 0,
  payment_tax_amount numeric NOT NULL DEFAULT 0,
  invoice_tax_rate numeric NOT NULL DEFAULT 0,
  invoice_tax_amount numeric NOT NULL DEFAULT 0,
  medication_cost numeric NOT NULL DEFAULT 0,
  supplies_cost numeric NOT NULL DEFAULT 0,
  other_costs numeric NOT NULL DEFAULT 0,
  other_costs_description text,
  total_deductions numeric NOT NULL DEFAULT 0,
  valor_liquido numeric NOT NULL DEFAULT 0,
  valor_repasse_medico numeric NOT NULL DEFAULT 0,
  check_conferencia boolean NOT NULL DEFAULT false,
  status_pagamento text NOT NULL DEFAULT 'pendente' CHECK (status_pagamento IN ('pendente','aprovado','pago')),
  data_pagamento date,
  month_reference text NOT NULL,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 5. repasses_cirurgias
-- ============================================================
CREATE TABLE IF NOT EXISTS public.repasses_cirurgias (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  medico_id integer NOT NULL REFERENCES public.medicos(id),
  convenio_id integer REFERENCES public.convenios(id),
  hospital_id integer REFERENCES public.hospitais(id),
  cirurgia_id integer REFERENCES public.cirurgias(id),
  nome_paciente text NOT NULL,
  data_cirurgia date NOT NULL,
  is_particular boolean NOT NULL DEFAULT false,
  tipo_procedimento text,
  tipo_procedimento_detalhado text,
  quantidade smallint NOT NULL DEFAULT 1 CHECK (quantidade >= 1),
  valor numeric NOT NULL DEFAULT 0 CHECK (valor >= 0),
  valor_unitario numeric,
  porcentagem_repasse numeric,
  valor_recebido numeric NOT NULL DEFAULT 0,
  desconto_paciente numeric NOT NULL DEFAULT 0,
  desconto_cartao numeric NOT NULL DEFAULT 0,
  valor_glosa numeric NOT NULL DEFAULT 0 CHECK (valor_glosa >= 0),
  percentual_terceiro numeric NOT NULL DEFAULT 0,
  valor_terceiro numeric NOT NULL DEFAULT 0,
  saldo_controle numeric NOT NULL DEFAULT 0,
  numero_atendimento text,
  auxilio_1 numeric NOT NULL DEFAULT 0,
  auxilio_2 numeric NOT NULL DEFAULT 0,
  taxa_1_5 numeric NOT NULL DEFAULT 0,
  imposto_percentual numeric NOT NULL DEFAULT 12,
  outras_deducoes numeric NOT NULL DEFAULT 0,
  desc_adm boolean NOT NULL DEFAULT true,
  desc_chefe_faturamento boolean NOT NULL DEFAULT true,
  desc_faturista boolean NOT NULL DEFAULT true,
  desc_autorizacao boolean NOT NULL DEFAULT true,
  desconto_fixo_clinica numeric NOT NULL DEFAULT 0,
  valor_repasse_medico numeric NOT NULL DEFAULT 0,
  destinatario_tipo text NOT NULL DEFAULT 'socio' CHECK (destinatario_tipo IN ('socio','terceiro')),
  status_pagamento text NOT NULL DEFAULT 'pendente' CHECK (status_pagamento IN ('pendente','aprovado','pago')),
  data_pagamento date,
  month_reference text NOT NULL,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_producao_convenios_month ON public.producao_convenios(month_reference);
CREATE INDEX IF NOT EXISTS idx_producao_convenios_medico ON public.producao_convenios(medico_id);
CREATE INDEX IF NOT EXISTS idx_repasses_particulares_month ON public.repasses_particulares(month_reference);
CREATE INDEX IF NOT EXISTS idx_repasses_particulares_medico ON public.repasses_particulares(medico_id);
CREATE INDEX IF NOT EXISTS idx_repasses_cirurgias_month ON public.repasses_cirurgias(month_reference);
CREATE INDEX IF NOT EXISTS idx_repasses_cirurgias_medico ON public.repasses_cirurgias(medico_id);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.cirurgias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfis_usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.producao_convenios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repasses_particulares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repasses_cirurgias ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Grants (app requires sign-in; authenticated only)
-- ============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cirurgias TO authenticated;
GRANT USAGE ON SEQUENCE public.cirurgias_id_seq TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.perfis_usuario TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.producao_convenios TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.repasses_particulares TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.repasses_cirurgias TO authenticated;

-- ============================================================
-- Policies (4 per table, matching existing convention)
-- ============================================================
DROP POLICY IF EXISTS "authenticated_select_cirurgias" ON public.cirurgias;
CREATE POLICY "authenticated_select_cirurgias" ON public.cirurgias FOR SELECT
TO authenticated USING (true);
DROP POLICY IF EXISTS "authenticated_insert_cirurgias" ON public.cirurgias;
CREATE POLICY "authenticated_insert_cirurgias" ON public.cirurgias FOR INSERT
TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "authenticated_update_cirurgias" ON public.cirurgias;
CREATE POLICY "authenticated_update_cirurgias" ON public.cirurgias FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "authenticated_delete_cirurgias" ON public.cirurgias;
CREATE POLICY "authenticated_delete_cirurgias" ON public.cirurgias FOR DELETE
TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_select_perfis_usuario" ON public.perfis_usuario;
CREATE POLICY "authenticated_select_perfis_usuario" ON public.perfis_usuario FOR SELECT
TO authenticated USING (true);
DROP POLICY IF EXISTS "authenticated_insert_perfis_usuario" ON public.perfis_usuario;
CREATE POLICY "authenticated_insert_perfis_usuario" ON public.perfis_usuario FOR INSERT
TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "authenticated_update_perfis_usuario" ON public.perfis_usuario;
CREATE POLICY "authenticated_update_perfis_usuario" ON public.perfis_usuario FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "authenticated_delete_perfis_usuario" ON public.perfis_usuario;
CREATE POLICY "authenticated_delete_perfis_usuario" ON public.perfis_usuario FOR DELETE
TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_select_producao_convenios" ON public.producao_convenios;
CREATE POLICY "authenticated_select_producao_convenios" ON public.producao_convenios FOR SELECT
TO authenticated USING (true);
DROP POLICY IF EXISTS "authenticated_insert_producao_convenios" ON public.producao_convenios;
CREATE POLICY "authenticated_insert_producao_convenios" ON public.producao_convenios FOR INSERT
TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "authenticated_update_producao_convenios" ON public.producao_convenios;
CREATE POLICY "authenticated_update_producao_convenios" ON public.producao_convenios FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "authenticated_delete_producao_convenios" ON public.producao_convenios;
CREATE POLICY "authenticated_delete_producao_convenios" ON public.producao_convenios FOR DELETE
TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_select_repasses_particulares" ON public.repasses_particulares;
CREATE POLICY "authenticated_select_repasses_particulares" ON public.repasses_particulares FOR SELECT
TO authenticated USING (true);
DROP POLICY IF EXISTS "authenticated_insert_repasses_particulares" ON public.repasses_particulares;
CREATE POLICY "authenticated_insert_repasses_particulares" ON public.repasses_particulares FOR INSERT
TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "authenticated_update_repasses_particulares" ON public.repasses_particulares;
CREATE POLICY "authenticated_update_repasses_particulares" ON public.repasses_particulares FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "authenticated_delete_repasses_particulares" ON public.repasses_particulares;
CREATE POLICY "authenticated_delete_repasses_particulares" ON public.repasses_particulares FOR DELETE
TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_select_repasses_cirurgias" ON public.repasses_cirurgias;
CREATE POLICY "authenticated_select_repasses_cirurgias" ON public.repasses_cirurgias FOR SELECT
TO authenticated USING (true);
DROP POLICY IF EXISTS "authenticated_insert_repasses_cirurgias" ON public.repasses_cirurgias;
CREATE POLICY "authenticated_insert_repasses_cirurgias" ON public.repasses_cirurgias FOR INSERT
TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "authenticated_update_repasses_cirurgias" ON public.repasses_cirurgias;
CREATE POLICY "authenticated_update_repasses_cirurgias" ON public.repasses_cirurgias FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "authenticated_delete_repasses_cirurgias" ON public.repasses_cirurgias;
CREATE POLICY "authenticated_delete_repasses_cirurgias" ON public.repasses_cirurgias FOR DELETE
TO authenticated USING (true);
