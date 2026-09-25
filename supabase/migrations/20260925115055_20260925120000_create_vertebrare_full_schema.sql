/*
# Esquema completo Vertebrare — repasse médico com perfis de acesso

1. Objetivo
- Criar toda a base do Sistema Vertebrare de Controle de Repasse Médico.
- Separar o acesso em administrativo, recepção e médico, aplicado no banco.

2. Tabelas de cadastro
- `medicos`: nome e CRM.
- `convenios`: nome do convênio.
- `hospitais`: nome e cidade do hospital/clínica.
- `unidades`: nome e cidade da unidade.
- `procedimentos`: nome do procedimento.

3. Tabelas de lançamento
- `repasses`: controle financeiro de repasses a terceiros e a sócios, com valor líquido, status e mês de referência.
- `repasses_imagem`: repasse de imagem por clínica e médico.

4. Tabela de acesso
- `perfis_usuario`: vínculo entre a conta autenticada e o perfil interno (administrativo, recepcao, medico).
- `medico_id` opcional liga uma conta médica ao cadastro de médicos.

5. Segurança
- RLS habilitado em todas as tabelas.
- Cadastros: leitura para todos autenticados; escrita apenas para administradores.
- Repasses: administradores veem e editam tudo; recepção vê e gerencia apenas terceiros; médicos veem somente seus próprios lançamentos.
- Perfis: cada pessoa lê o próprio perfil; administradores gerenciam todos.
- Trigger cria automaticamente o perfil de novos usuários: o primeiro vira administrador, os demais recepção.

6. Observações
- Nenhum dado pré-existente é alterado, pois o banco está vazio.
- A autorização é aplicada no banco, além da interface.
*/

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

CREATE TABLE IF NOT EXISTS public.repasses (
  id serial PRIMARY KEY,
  medico_id integer NOT NULL REFERENCES public.medicos(id) ON DELETE CASCADE,
  convenio_id integer REFERENCES public.convenios(id) ON DELETE SET NULL,
  nome_paciente text NOT NULL,
  hospital_id integer REFERENCES public.hospitais(id) ON DELETE SET NULL,
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
  forma_pagamento text CHECK (forma_pagamento IN ('credito', 'pix', 'debito', 'especie', 'convenio')),
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
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.repasses_imagem (
  id serial PRIMARY KEY,
  month_reference text,
  hospital_id integer REFERENCES public.hospitais(id) ON DELETE SET NULL,
  medico_id integer NOT NULL REFERENCES public.medicos(id) ON DELETE CASCADE,
  total numeric(10,2) NOT NULL DEFAULT 0,
  imposto_percentual numeric(5,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

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

CREATE INDEX IF NOT EXISTS idx_repasses_medico ON public.repasses(medico_id);
CREATE INDEX IF NOT EXISTS idx_repasses_convenio ON public.repasses(convenio_id);
CREATE INDEX IF NOT EXISTS idx_repasses_hospital ON public.repasses(hospital_id);
CREATE INDEX IF NOT EXISTS idx_repasses_month ON public.repasses(month_reference);
CREATE INDEX IF NOT EXISTS idx_repasses_destinatario_tipo ON public.repasses(destinatario_tipo);
CREATE INDEX IF NOT EXISTS idx_repasses_status ON public.repasses(status_pagamento);
CREATE INDEX IF NOT EXISTS idx_repasses_is_particular ON public.repasses(is_particular);
CREATE INDEX IF NOT EXISTS idx_perfis_tipo ON public.perfis_usuario(tipo);
CREATE INDEX IF NOT EXISTS idx_perfis_medico ON public.perfis_usuario(medico_id);

ALTER TABLE public.medicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.convenios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospitais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procedimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repasses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repasses_imagem ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfis_usuario ENABLE ROW LEVEL SECURITY;

-- Cadastros: leitura para todos autenticados; escrita apenas administradores
CREATE POLICY "cad_select_medicos" ON public.medicos FOR SELECT TO authenticated USING (true);
CREATE POLICY "cad_insert_medicos" ON public.medicos FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.perfis_usuario p WHERE p.id = auth.uid() AND p.ativo AND p.tipo = 'administrativo'));
CREATE POLICY "cad_update_medicos" ON public.medicos FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.perfis_usuario p WHERE p.id = auth.uid() AND p.ativo AND p.tipo = 'administrativo')) WITH CHECK (EXISTS (SELECT 1 FROM public.perfis_usuario p WHERE p.id = auth.uid() AND p.ativo AND p.tipo = 'administrativo'));
CREATE POLICY "cad_delete_medicos" ON public.medicos FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.perfis_usuario p WHERE p.id = auth.uid() AND p.ativo AND p.tipo = 'administrativo'));

CREATE POLICY "cad_select_convenios" ON public.convenios FOR SELECT TO authenticated USING (true);
CREATE POLICY "cad_insert_convenios" ON public.convenios FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.perfis_usuario p WHERE p.id = auth.uid() AND p.ativo AND p.tipo = 'administrativo'));
CREATE POLICY "cad_update_convenios" ON public.convenios FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.perfis_usuario p WHERE p.id = auth.uid() AND p.ativo AND p.tipo = 'administrativo')) WITH CHECK (EXISTS (SELECT 1 FROM public.perfis_usuario p WHERE p.id = auth.uid() AND p.ativo AND p.tipo = 'administrativo'));
CREATE POLICY "cad_delete_convenios" ON public.convenios FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.perfis_usuario p WHERE p.id = auth.uid() AND p.ativo AND p.tipo = 'administrativo'));

CREATE POLICY "cad_select_hospitais" ON public.hospitais FOR SELECT TO authenticated USING (true);
CREATE POLICY "cad_insert_hospitais" ON public.hospitais FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.perfis_usuario p WHERE p.id = auth.uid() AND p.ativo AND p.tipo = 'administrativo'));
CREATE POLICY "cad_update_hospitais" ON public.hospitais FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.perfis_usuario p WHERE p.id = auth.uid() AND p.ativo AND p.tipo = 'administrativo')) WITH CHECK (EXISTS (SELECT 1 FROM public.perfis_usuario p WHERE p.id = auth.uid() AND p.ativo AND p.tipo = 'administrativo'));
CREATE POLICY "cad_delete_hospitais" ON public.hospitais FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.perfis_usuario p WHERE p.id = auth.uid() AND p.ativo AND p.tipo = 'administrativo'));

CREATE POLICY "cad_select_unidades" ON public.unidades FOR SELECT TO authenticated USING (true);
CREATE POLICY "cad_insert_unidades" ON public.unidades FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.perfis_usuario p WHERE p.id = auth.uid() AND p.ativo AND p.tipo = 'administrativo'));
CREATE POLICY "cad_update_unidades" ON public.unidades FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.perfis_usuario p WHERE p.id = auth.uid() AND p.ativo AND p.tipo = 'administrativo')) WITH CHECK (EXISTS (SELECT 1 FROM public.perfis_usuario p WHERE p.id = auth.uid() AND p.ativo AND p.tipo = 'administrativo'));
CREATE POLICY "cad_delete_unidades" ON public.unidades FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.perfis_usuario p WHERE p.id = auth.uid() AND p.ativo AND p.tipo = 'administrativo'));

CREATE POLICY "cad_select_procedimentos" ON public.procedimentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "cad_insert_procedimentos" ON public.procedimentos FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.perfis_usuario p WHERE p.id = auth.uid() AND p.ativo AND p.tipo = 'administrativo'));
CREATE POLICY "cad_update_procedimentos" ON public.procedimentos FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.perfis_usuario p WHERE p.id = auth.uid() AND p.ativo AND p.tipo = 'administrativo')) WITH CHECK (EXISTS (SELECT 1 FROM public.perfis_usuario p WHERE p.id = auth.uid() AND p.ativo AND p.tipo = 'administrativo'));
CREATE POLICY "cad_delete_procedimentos" ON public.procedimentos FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.perfis_usuario p WHERE p.id = auth.uid() AND p.ativo AND p.tipo = 'administrativo'));

-- Repasses imagem: administrador tudo; recepção leitura; médico leitura dos próprios
CREATE POLICY "img_select" ON public.repasses_imagem FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.perfis_usuario p WHERE p.id = auth.uid() AND p.ativo AND (p.tipo = 'administrativo' OR p.tipo = 'recepcao' OR (p.tipo = 'medico' AND repasses_imagem.medico_id = p.medico_id))));
CREATE POLICY "img_insert" ON public.repasses_imagem FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.perfis_usuario p WHERE p.id = auth.uid() AND p.ativo AND p.tipo = 'administrativo'));
CREATE POLICY "img_update" ON public.repasses_imagem FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.perfis_usuario p WHERE p.id = auth.uid() AND p.ativo AND p.tipo = 'administrativo')) WITH CHECK (EXISTS (SELECT 1 FROM public.perfis_usuario p WHERE p.id = auth.uid() AND p.ativo AND p.tipo = 'administrativo'));
CREATE POLICY "img_delete" ON public.repasses_imagem FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.perfis_usuario p WHERE p.id = auth.uid() AND p.ativo AND p.tipo = 'administrativo'));

-- Repasses: administrador tudo; recepção terceiros; médico leitura dos próprios
CREATE POLICY "rep_select" ON public.repasses FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.perfis_usuario p WHERE p.id = auth.uid() AND p.ativo AND (p.tipo = 'administrativo' OR (p.tipo = 'recepcao' AND repasses.destinatario_tipo = 'terceiro') OR (p.tipo = 'medico' AND repasses.medico_id = p.medico_id))));
CREATE POLICY "rep_insert" ON public.repasses FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.perfis_usuario p WHERE p.id = auth.uid() AND p.ativo AND (p.tipo = 'administrativo' OR (p.tipo = 'recepcao' AND repasses.destinatario_tipo = 'terceiro'))));
CREATE POLICY "rep_update" ON public.repasses FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.perfis_usuario p WHERE p.id = auth.uid() AND p.ativo AND (p.tipo = 'administrativo' OR (p.tipo = 'recepcao' AND repasses.destinatario_tipo = 'terceiro'))))
WITH CHECK (EXISTS (SELECT 1 FROM public.perfis_usuario p WHERE p.id = auth.uid() AND p.ativo AND (p.tipo = 'administrativo' OR (p.tipo = 'recepcao' AND repasses.destinatario_tipo = 'terceiro'))));
CREATE POLICY "rep_delete" ON public.repasses FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.perfis_usuario p WHERE p.id = auth.uid() AND p.ativo AND (p.tipo = 'administrativo' OR (p.tipo = 'recepcao' AND repasses.destinatario_tipo = 'terceiro'))));

-- Perfis: cada um lê o próprio; administrador gerencia todos
CREATE POLICY "perfil_select" ON public.perfis_usuario FOR SELECT TO authenticated
USING (id = auth.uid() OR EXISTS (SELECT 1 FROM public.perfis_usuario admin WHERE admin.id = auth.uid() AND admin.ativo AND admin.tipo = 'administrativo'));
CREATE POLICY "perfil_insert" ON public.perfis_usuario FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.perfis_usuario admin WHERE admin.id = auth.uid() AND admin.ativo AND admin.tipo = 'administrativo'));
CREATE POLICY "perfil_update" ON public.perfis_usuario FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.perfis_usuario admin WHERE admin.id = auth.uid() AND admin.ativo AND admin.tipo = 'administrativo'))
WITH CHECK (EXISTS (SELECT 1 FROM public.perfis_usuario admin WHERE admin.id = auth.uid() AND admin.ativo AND admin.tipo = 'administrativo'));
CREATE POLICY "perfil_delete" ON public.perfis_usuario FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.perfis_usuario admin WHERE admin.id = auth.uid() AND admin.ativo AND admin.tipo = 'administrativo'));

-- Trigger de criação automática de perfil
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

GRANT SELECT, INSERT, UPDATE, DELETE ON public.medicos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.convenios TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hospitais TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.unidades TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.procedimentos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.repasses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.repasses_imagem TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.perfis_usuario TO authenticated;
