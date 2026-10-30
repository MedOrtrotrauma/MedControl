/*
# Esquema completo Vertebrare — repasse médico com tabela separada para cirurgias

## Objetivo
Criar toda a base do Sistema Vertebrare de Controle de Repasse Médico.
A tabela `repasse_cirurgias` é separada da tabela `repasses` — cirurgias de sócios
vão para `repasse_cirurgias`, enquanto `repasses` recebe apenas dados de Produção Mensal.

## Tabelas de cadastro
- `medicos`: nome e CRM.
- `convenios`: nome do convênio.
- `hospitais`: nome e cidade do hospital/clínica.
- `unidades`: nome e cidade da unidade.
- `procedimentos`: nome do procedimento.
- `cirurgias`: nome da cirurgia.

## Tabelas de lançamento
- `repasses`: dados vindos do componente ProducaoMensal (convênios, particulares, etc).
  - Coluna `categoria_lancamento` distingue: 'particular', 'procedimento'.
  - `repasse_particular` boolean identifica registros do Repasse Particular.
- `repasse_cirurgias`: controle financeiro de cirurgias de sócios e terceiros.
  - Mesma estrutura de colunas financeiras da tabela repasses original.
  - `destinatario_tipo`: 'socio' ou 'terceiro'.
  - Colunas de desconto: desc_adm, desc_chefe_faturamento, desc_faturista, desc_autorizacao.
  - `desconto_fixo_clinica` editável por lançamento.
  - `cirurgia_id` referência opcional ao cadastro de cirurgias.
- `repasses_imagem`: repasse de imagem por clínica e médico.

## Tabela de acesso
- `perfis_usuario`: vínculo entre a conta autenticada e o perfil interno.

## Segurança
- RLS habilitado em todas as tabelas.
- Cadastros: leitura para todos autenticados; escrita apenas para administradores.
- Repasses e repasse_cirurgias: administradores veem e editam tudo;
  recepção vê e gerencia apenas terceiros; médicos veem somente seus próprios lançamentos.
- Perfis: cada pessoa lê o próprio perfil; administradores gerenciam todos.
- Trigger cria automaticamente o perfil de novos usuários.
- Função `is_admin()` SECURITY DEFINER evita recursão de RLS.
*/

-- ============================================
-- TABELAS DE CADASTRO
-- ============================================

CREATE TABLE IF NOT EXISTS public.medicos (
  id serial PRIMARY KEY,
  nome text NOT NULL,
  crm text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.convenios (
  id serial PRIMARY KEY,
  nome text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hospitais (
  id serial PRIMARY KEY,
  nome text NOT NULL,
  cidade text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.unidades (
  id serial PRIMARY KEY,
  nome text NOT NULL,
  cidade text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.procedimentos (
  id serial PRIMARY KEY,
  nome text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cirurgias (
  id serial PRIMARY KEY,
  nome text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- TABELA repasses (dados de Produção Mensal)
-- ============================================

CREATE TABLE IF NOT EXISTS public.repasses (
  id serial PRIMARY KEY,
  medico_id integer NOT NULL REFERENCES public.medicos(id) ON DELETE CASCADE,
  convenio_id integer REFERENCES public.convenios(id) ON DELETE SET NULL,
  nome_paciente text NOT NULL,
  hospital_id integer REFERENCES public.hospitais(id) ON DELETE SET NULL,
  unidade_id integer REFERENCES public.unidades(id) ON DELETE SET NULL,
  data_cirurgia date NOT NULL,
  valor numeric(10,2) NOT NULL DEFAULT 0,
  tipo text NOT NULL DEFAULT 'consulta' CHECK (tipo IN ('consulta', 'cirurgia')),
  is_particular boolean NOT NULL DEFAULT false,
  tipo_procedimento_detalhado text CHECK (tipo_procedimento_detalhado IN ('consulta', 'infiltracao', 'onda_choque', 'cirurgia_particular', 'medico_parceiro')),
  porcentagem_repasse numeric(5,2),
  valor_repasse_medico numeric(10,2),
  categoria_particular text CHECK (categoria_particular IN ('consulta_onda', 'infiltracao_cirurgia')),
  tipo_procedimento text,
  quantidade integer DEFAULT 1,
  forma_pagamento text,
  valor_unitario numeric(10,2),
  month_reference text,
  observacao text,
  destinatario_tipo text NOT NULL DEFAULT 'terceiro' CHECK (destinatario_tipo IN ('terceiro', 'socio')),
  auxilio_1 numeric(10,2) NOT NULL DEFAULT 0,
  auxilio_2 numeric(10,2) NOT NULL DEFAULT 0,
  taxa_1_5 numeric(10,2) NOT NULL DEFAULT 0,
  imposto_percentual numeric(5,2) NOT NULL DEFAULT 12,
  outras_deducoes numeric(10,2) NOT NULL DEFAULT 0,
  valor_liquido numeric(10,2) NOT NULL DEFAULT 0,
  status_pagamento text NOT NULL DEFAULT 'pendente' CHECK (status_pagamento IN ('pendente', 'aprovado', 'pago')),
  data_pagamento date,
  desconto_paciente numeric(10,2) NOT NULL DEFAULT 0,
  desconto_cartao numeric(10,2) NOT NULL DEFAULT 0,
  valor_recebido numeric(10,2) NOT NULL DEFAULT 0,
  percentual_terceiro numeric(5,2) NOT NULL DEFAULT 0,
  valor_terceiro numeric(10,2) NOT NULL DEFAULT 0,
  saldo_controle numeric(10,2) NOT NULL DEFAULT 0,
  numero_atendimento text,
  unidade text,
  vinculo text CHECK (vinculo IN ('externo', 'socio')),
  valor_repasse numeric(10,2) NOT NULL DEFAULT 0,
  check_conferencia boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- Campos de repasse particular
  is_split_payment boolean NOT NULL DEFAULT false,
  cash_amount numeric NOT NULL DEFAULT 0,
  other_payment_method text,
  payment_tax_rate numeric NOT NULL DEFAULT 0,
  payment_tax_amount numeric NOT NULL DEFAULT 0,
  invoice_tax_rate numeric NOT NULL DEFAULT 0,
  invoice_tax_amount numeric NOT NULL DEFAULT 0,
  medication_cost numeric NOT NULL DEFAULT 0,
  supplies_cost numeric NOT NULL DEFAULT 0,
  other_costs numeric NOT NULL DEFAULT 0,
  other_costs_description text,
  total_deductions numeric NOT NULL DEFAULT 0,
  net_clinic_value numeric NOT NULL DEFAULT 0,
  cash_settlement_type text,
  installments integer NOT NULL DEFAULT 1,
  has_medication boolean NOT NULL DEFAULT false,
  has_other_costs boolean NOT NULL DEFAULT false,
  repasse_particular boolean NOT NULL DEFAULT false,
  -- Categoria para distinguir origem do lançamento
  categoria_lancamento text NOT NULL DEFAULT 'particular' CHECK (categoria_lancamento IN ('particular', 'procedimento'))
);

-- ============================================
-- TABELA repasse_cirurgias (cirurgias de sócios e terceiros)
-- ============================================

CREATE TABLE IF NOT EXISTS public.repasse_cirurgias (
  id serial PRIMARY KEY,
  medico_id integer NOT NULL REFERENCES public.medicos(id) ON DELETE CASCADE,
  convenio_id integer REFERENCES public.convenios(id) ON DELETE SET NULL,
  nome_paciente text NOT NULL,
  hospital_id integer REFERENCES public.hospitais(id) ON DELETE SET NULL,
  data_cirurgia date NOT NULL,
  valor numeric(10,2) NOT NULL DEFAULT 0,
  tipo text NOT NULL DEFAULT 'cirurgia' CHECK (tipo IN ('consulta', 'cirurgia')),
  is_particular boolean NOT NULL DEFAULT false,
  tipo_procedimento_detalhado text CHECK (tipo_procedimento_detalhado IN ('consulta', 'infiltracao', 'onda_choque', 'cirurgia_particular', 'medico_parceiro')),
  porcentagem_repasse numeric(5,2),
  valor_repasse_medico numeric(10,2),
  tipo_procedimento text,
  quantidade integer DEFAULT 1,
  forma_pagamento text,
  valor_unitario numeric(10,2),
  month_reference text,
  observacao text,
  destinatario_tipo text NOT NULL DEFAULT 'socio' CHECK (destinatario_tipo IN ('terceiro', 'socio')),
  auxilio_1 numeric(10,2) NOT NULL DEFAULT 0,
  auxilio_2 numeric(10,2) NOT NULL DEFAULT 0,
  taxa_1_5 numeric(10,2) NOT NULL DEFAULT 0,
  imposto_percentual numeric(5,2) NOT NULL DEFAULT 12,
  outras_deducoes numeric(10,2) NOT NULL DEFAULT 0,
  valor_liquido numeric(10,2) NOT NULL DEFAULT 0,
  status_pagamento text NOT NULL DEFAULT 'pendente' CHECK (status_pagamento IN ('pendente', 'aprovado', 'pago')),
  data_pagamento date,
  desconto_paciente numeric(10,2) NOT NULL DEFAULT 0,
  desconto_cartao numeric(10,2) NOT NULL DEFAULT 0,
  valor_recebido numeric(10,2) NOT NULL DEFAULT 0,
  percentual_terceiro numeric(5,2) NOT NULL DEFAULT 0,
  valor_terceiro numeric(10,2) NOT NULL DEFAULT 0,
  saldo_controle numeric(10,2) NOT NULL DEFAULT 0,
  numero_atendimento text,
  unidade text,
  valor_repasse numeric(10,2) NOT NULL DEFAULT 0,
  check_conferencia boolean NOT NULL DEFAULT false,
  desc_adm boolean NOT NULL DEFAULT true,
  desc_chefe_faturamento boolean NOT NULL DEFAULT true,
  desc_faturista boolean NOT NULL DEFAULT true,
  desc_autorizacao boolean NOT NULL DEFAULT true,
  desconto_fixo_clinica numeric(10,2) NOT NULL DEFAULT 0,
  cirurgia_id integer REFERENCES public.cirurgias(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- TABELA repasses_imagem
-- ============================================

CREATE TABLE IF NOT EXISTS public.repasses_imagem (
  id serial PRIMARY KEY,
  month_reference text,
  hospital_id integer REFERENCES public.hospitais(id) ON DELETE SET NULL,
  medico_id integer NOT NULL REFERENCES public.medicos(id) ON DELETE CASCADE,
  total numeric(10,2) NOT NULL DEFAULT 0,
  imposto_percentual numeric(5,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- TABELA perfis_usuario
-- ============================================

CREATE TABLE IF NOT EXISTS public.perfis_usuario (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL,
  email text NOT NULL,
  tipo text NOT NULL DEFAULT 'recepcao' CHECK (tipo IN ('administrativo', 'recepcao', 'medico')),
  medico_id integer REFERENCES public.medicos(id) ON DELETE SET NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- ÍNDICES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_repasses_medico ON public.repasses(medico_id);
CREATE INDEX IF NOT EXISTS idx_repasses_convenio ON public.repasses(convenio_id);
CREATE INDEX IF NOT EXISTS idx_repasses_hospital ON public.repasses(hospital_id);
CREATE INDEX IF NOT EXISTS idx_repasses_month ON public.repasses(month_reference);
CREATE INDEX IF NOT EXISTS idx_repasses_destinatario_tipo ON public.repasses(destinatario_tipo);
CREATE INDEX IF NOT EXISTS idx_repasses_status ON public.repasses(status_pagamento);
CREATE INDEX IF NOT EXISTS idx_repasses_is_particular ON public.repasses(is_particular);
CREATE INDEX IF NOT EXISTS idx_repasses_categoria ON public.repasses(categoria_lancamento);

CREATE INDEX IF NOT EXISTS idx_cirurgias_rep_medico ON public.repasse_cirurgias(medico_id);
CREATE INDEX IF NOT EXISTS idx_cirurgias_rep_hospital ON public.repasse_cirurgias(hospital_id);
CREATE INDEX IF NOT EXISTS idx_cirurgias_rep_month ON public.repasse_cirurgias(month_reference);
CREATE INDEX IF NOT EXISTS idx_cirurgias_rep_dest ON public.repasse_cirurgias(destinatario_tipo);
CREATE INDEX IF NOT EXISTS idx_cirurgias_rep_status ON public.repasse_cirurgias(status_pagamento);
CREATE INDEX IF NOT EXISTS idx_cirurgias_rep_cirurgia ON public.repasse_cirurgias(cirurgia_id);

CREATE INDEX IF NOT EXISTS idx_perfis_tipo ON public.perfis_usuario(tipo);
CREATE INDEX IF NOT EXISTS idx_perfis_medico ON public.perfis_usuario(medico_id);

-- ============================================
-- RLS
-- ============================================

ALTER TABLE public.medicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.convenios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospitais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procedimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cirurgias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repasses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repasse_cirurgias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repasses_imagem ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfis_usuario ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Função is_admin() — evita recursão de RLS
-- ============================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.perfis_usuario p
    WHERE p.id = auth.uid() AND p.ativo AND p.tipo = 'administrativo'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ============================================
-- POLÍTICAS — Cadastros (leitura para todos, escrita admin)
-- ============================================

DROP POLICY IF EXISTS "cad_select_medicos" ON public.medicos;
CREATE POLICY "cad_select_medicos" ON public.medicos FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "cad_insert_medicos" ON public.medicos;
CREATE POLICY "cad_insert_medicos" ON public.medicos FOR INSERT TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "cad_update_medicos" ON public.medicos;
CREATE POLICY "cad_update_medicos" ON public.medicos FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "cad_delete_medicos" ON public.medicos;
CREATE POLICY "cad_delete_medicos" ON public.medicos FOR DELETE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "cad_select_convenios" ON public.convenios;
CREATE POLICY "cad_select_convenios" ON public.convenios FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "cad_insert_convenios" ON public.convenios;
CREATE POLICY "cad_insert_convenios" ON public.convenios FOR INSERT TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "cad_update_convenios" ON public.convenios;
CREATE POLICY "cad_update_convenios" ON public.convenios FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "cad_delete_convenios" ON public.convenios;
CREATE POLICY "cad_delete_convenios" ON public.convenios FOR DELETE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "cad_select_hospitais" ON public.hospitais;
CREATE POLICY "cad_select_hospitais" ON public.hospitais FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "cad_insert_hospitais" ON public.hospitais;
CREATE POLICY "cad_insert_hospitais" ON public.hospitais FOR INSERT TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "cad_update_hospitais" ON public.hospitais;
CREATE POLICY "cad_update_hospitais" ON public.hospitais FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "cad_delete_hospitais" ON public.hospitais;
CREATE POLICY "cad_delete_hospitais" ON public.hospitais FOR DELETE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "cad_select_unidades" ON public.unidades;
CREATE POLICY "cad_select_unidades" ON public.unidades FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "cad_insert_unidades" ON public.unidades;
CREATE POLICY "cad_insert_unidades" ON public.unidades FOR INSERT TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "cad_update_unidades" ON public.unidades;
CREATE POLICY "cad_update_unidades" ON public.unidades FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "cad_delete_unidades" ON public.unidades;
CREATE POLICY "cad_delete_unidades" ON public.unidades FOR DELETE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "cad_select_procedimentos" ON public.procedimentos;
CREATE POLICY "cad_select_procedimentos" ON public.procedimentos FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "cad_insert_procedimentos" ON public.procedimentos;
CREATE POLICY "cad_insert_procedimentos" ON public.procedimentos FOR INSERT TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "cad_update_procedimentos" ON public.procedimentos;
CREATE POLICY "cad_update_procedimentos" ON public.procedimentos FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "cad_delete_procedimentos" ON public.procedimentos;
CREATE POLICY "cad_delete_procedimentos" ON public.procedimentos FOR DELETE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "cad_select_cirurgias" ON public.cirurgias;
CREATE POLICY "cad_select_cirurgias" ON public.cirurgias FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "cad_insert_cirurgias" ON public.cirurgias;
CREATE POLICY "cad_insert_cirurgias" ON public.cirurgias FOR INSERT TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "cad_update_cirurgias" ON public.cirurgias;
CREATE POLICY "cad_update_cirurgias" ON public.cirurgias FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "cad_delete_cirurgias" ON public.cirurgias;
CREATE POLICY "cad_delete_cirurgias" ON public.cirurgias FOR DELETE TO authenticated USING (public.is_admin());

-- ============================================
-- POLÍTICAS — repasses (Produção Mensal)
-- ============================================

DROP POLICY IF EXISTS "rep_select" ON public.repasses;
CREATE POLICY "rep_select" ON public.repasses FOR SELECT TO authenticated
USING (public.is_admin() OR (EXISTS (SELECT 1 FROM public.perfis_usuario p WHERE p.id = auth.uid() AND p.ativo AND p.tipo = 'recepcao')) OR (EXISTS (SELECT 1 FROM public.perfis_usuario p WHERE p.id = auth.uid() AND p.ativo AND p.tipo = 'medico' AND repasses.medico_id = p.medico_id)));

DROP POLICY IF EXISTS "rep_insert" ON public.repasses;
CREATE POLICY "rep_insert" ON public.repasses FOR INSERT TO authenticated
WITH CHECK (public.is_admin() OR (EXISTS (SELECT 1 FROM public.perfis_usuario p WHERE p.id = auth.uid() AND p.ativo AND p.tipo = 'recepcao')));

DROP POLICY IF EXISTS "rep_update" ON public.repasses;
CREATE POLICY "rep_update" ON public.repasses FOR UPDATE TO authenticated
USING (public.is_admin() OR (EXISTS (SELECT 1 FROM public.perfis_usuario p WHERE p.id = auth.uid() AND p.ativo AND p.tipo = 'recepcao')))
WITH CHECK (public.is_admin() OR (EXISTS (SELECT 1 FROM public.perfis_usuario p WHERE p.id = auth.uid() AND p.ativo AND p.tipo = 'recepcao')));

DROP POLICY IF EXISTS "rep_delete" ON public.repasses;
CREATE POLICY "rep_delete" ON public.repasses FOR DELETE TO authenticated
USING (public.is_admin() OR (EXISTS (SELECT 1 FROM public.perfis_usuario p WHERE p.id = auth.uid() AND p.ativo AND p.tipo = 'recepcao')));

-- ============================================
-- POLÍTICAS — repasse_cirurgias (mesmas regras de repasses)
-- ============================================

DROP POLICY IF EXISTS "cir_select" ON public.repasse_cirurgias;
CREATE POLICY "cir_select" ON public.repasse_cirurgias FOR SELECT TO authenticated
USING (public.is_admin() OR (EXISTS (SELECT 1 FROM public.perfis_usuario p WHERE p.id = auth.uid() AND p.ativo AND p.tipo = 'medico' AND repasse_cirurgias.medico_id = p.medico_id)));

DROP POLICY IF EXISTS "cir_insert" ON public.repasse_cirurgias;
CREATE POLICY "cir_insert" ON public.repasse_cirurgias FOR INSERT TO authenticated
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "cir_update" ON public.repasse_cirurgias;
CREATE POLICY "cir_update" ON public.repasse_cirurgias FOR UPDATE TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "cir_delete" ON public.repasse_cirurgias;
CREATE POLICY "cir_delete" ON public.repasse_cirurgias FOR DELETE TO authenticated
USING (public.is_admin());

-- ============================================
-- POLÍTICAS — repasses_imagem
-- ============================================

DROP POLICY IF EXISTS "img_select" ON public.repasses_imagem;
CREATE POLICY "img_select" ON public.repasses_imagem FOR SELECT TO authenticated
USING (public.is_admin() OR (EXISTS (SELECT 1 FROM public.perfis_usuario p WHERE p.id = auth.uid() AND p.ativo AND p.tipo = 'recepcao')) OR (EXISTS (SELECT 1 FROM public.perfis_usuario p WHERE p.id = auth.uid() AND p.ativo AND p.tipo = 'medico' AND repasses_imagem.medico_id = p.medico_id)));

DROP POLICY IF EXISTS "img_insert" ON public.repasses_imagem;
CREATE POLICY "img_insert" ON public.repasses_imagem FOR INSERT TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "img_update" ON public.repasses_imagem;
CREATE POLICY "img_update" ON public.repasses_imagem FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "img_delete" ON public.repasses_imagem;
CREATE POLICY "img_delete" ON public.repasses_imagem FOR DELETE TO authenticated USING (public.is_admin());

-- ============================================
-- POLÍTICAS — perfis_usuario
-- ============================================

DROP POLICY IF EXISTS "perfil_select" ON public.perfis_usuario;
CREATE POLICY "perfil_select" ON public.perfis_usuario FOR SELECT TO authenticated
USING (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "perfil_insert" ON public.perfis_usuario;
CREATE POLICY "perfil_insert" ON public.perfis_usuario FOR INSERT TO authenticated
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "perfil_update" ON public.perfis_usuario;
CREATE POLICY "perfil_update" ON public.perfis_usuario FOR UPDATE TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "perfil_delete" ON public.perfis_usuario;
CREATE POLICY "perfil_delete" ON public.perfis_usuario FOR DELETE TO authenticated
USING (public.is_admin());

-- ============================================
-- Trigger de criação automática de perfil
-- ============================================

CREATE OR REPLACE FUNCTION public.criar_perfil_usuario()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.perfis_usuario (id, nome, email, tipo)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'nome', split_part(NEW.email, '@', 1)),
    NEW.email,
    CASE WHEN NOT EXISTS (SELECT 1 FROM public.perfis_usuario) THEN 'administrativo' ELSE 'recepcao' END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_criar_perfil_usuario ON auth.users;
CREATE TRIGGER trigger_criar_perfil_usuario
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.criar_perfil_usuario();

REVOKE ALL ON FUNCTION public.criar_perfil_usuario() FROM public, anon, authenticated;

-- ============================================
-- GRANTS
-- ============================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.medicos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.convenios TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hospitais TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.unidades TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.procedimentos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cirurgias TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.repasses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.repasse_cirurgias TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.repasses_imagem TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.perfis_usuario TO authenticated;

-- ============================================
-- TABELA producao_mensal (para compatibilidade com Dashboard/Relatorios)
-- ============================================

CREATE TABLE IF NOT EXISTS public.producao_mensal (
  id serial PRIMARY KEY,
  medico_id integer NOT NULL REFERENCES public.medicos(id) ON DELETE CASCADE,
  convenio_id integer NOT NULL REFERENCES public.convenios(id) ON DELETE CASCADE,
  nome_paciente text NOT NULL,
  data_consulta date NOT NULL,
  valor numeric(10,2) NOT NULL DEFAULT 0,
  tipo text NOT NULL DEFAULT 'consulta' CHECK (tipo IN ('consulta', 'cirurgia')),
  month_reference text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.producao_mensal ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pm_select" ON public.producao_mensal;
CREATE POLICY "pm_select" ON public.producao_mensal FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "pm_insert" ON public.producao_mensal;
CREATE POLICY "pm_insert" ON public.producao_mensal FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "pm_update" ON public.producao_mensal;
CREATE POLICY "pm_update" ON public.producao_mensal FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "pm_delete" ON public.producao_mensal;
CREATE POLICY "pm_delete" ON public.producao_mensal FOR DELETE TO authenticated USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.producao_mensal TO authenticated;