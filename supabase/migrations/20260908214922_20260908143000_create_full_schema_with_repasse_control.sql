/*
# Esquema completo do Sistema de Controle de Repasse Médico

1. Novas Tabelas
  - `medicos`: cadastro de médicos (id, nome, crm, created_at)
  - `convenios`: cadastro de convênios (id, nome, created_at)
  - `hospitais`: cadastro de hospitais (id, nome, cidade, created_at)
  - `producao_mensal`: consultas/cirurgias por médico e convênio, com mês de referência
  - `repasses`: controle financeiro de repasses a terceiros e a sócios, com cálculo de valor líquido

2. Tabela `repasses` — campos de controle financeiro
  - `destinatario_tipo`: 'terceiro' ou 'socio' (padrão 'terceiro')
  - `auxilio_1`, `auxilio_2`: auxílios/parcelas de apoio do atendimento
  - `taxa_1_5`: taxa operacional de 1,5% informada no relatório
  - `imposto_percentual`: percentual de imposto aplicado (padrão 12)
  - `outras_deducoes`: descontos adicionais específicos do sócio ou do lançamento
  - `valor_liquido`: valor final calculado e salvo para conferência
  - `status_pagamento`: 'pendente', 'aprovado', 'pago' (padrão 'pendente')
  - `data_pagamento`: data em que o pagamento foi realizado

3. Segurança
  - RLS habilitado em todas as tabelas
  - Políticas para usuários autenticados realizarem CRUD (dados compartilhados entre usuários autenticados)

4. Índices
  - Índices em chaves estrangeiras e campos de busca frequente
*/

CREATE TABLE IF NOT EXISTS medicos (
  id serial PRIMARY KEY,
  nome text NOT NULL,
  crm text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS convenios (
  id serial PRIMARY KEY,
  nome text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hospitais (
  id serial PRIMARY KEY,
  nome text NOT NULL,
  cidade text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS producao_mensal (
  id serial PRIMARY KEY,
  medico_id integer NOT NULL REFERENCES medicos(id) ON DELETE CASCADE,
  convenio_id integer NOT NULL REFERENCES convenios(id) ON DELETE CASCADE,
  nome_paciente text NOT NULL,
  data_consulta date NOT NULL,
  valor numeric(10,2) NOT NULL DEFAULT 0,
  tipo text DEFAULT 'consulta' NOT NULL CHECK (tipo = ANY (ARRAY['consulta'::text, 'cirurgia'::text])),
  month_reference text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS repasses (
  id serial PRIMARY KEY,
  medico_id integer NOT NULL REFERENCES medicos(id) ON DELETE CASCADE,
  convenio_id integer REFERENCES convenios(id) ON DELETE SET NULL,
  nome_paciente text NOT NULL,
  hospital_id integer NOT NULL REFERENCES hospitais(id) ON DELETE CASCADE,
  data_cirurgia date NOT NULL,
  valor numeric(10,2) NOT NULL DEFAULT 0,
  tipo text DEFAULT 'consulta' NOT NULL CHECK (tipo = ANY (ARRAY['consulta'::text, 'cirurgia'::text])),
  is_particular boolean DEFAULT false,
  tipo_procedimento_detalhado text CHECK (tipo_procedimento_detalhado = ANY (ARRAY['consulta'::text, 'infiltracao'::text, 'onda_choque'::text, 'cirurgia_particular'::text, 'medico_parceiro'::text])),
  porcentagem_repasse numeric(5,2),
  valor_repasse_medico numeric(10,2),
  categoria_particular text CHECK (categoria_particular = ANY (ARRAY['consulta_onda'::text, 'infiltracao_cirurgia'::text])),
  tipo_procedimento text,
  quantidade integer DEFAULT 1,
  forma_pagamento text CHECK (forma_pagamento = ANY (ARRAY['credito'::text, 'pix'::text, 'debito'::text, 'especie'::text])),
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
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_producao_medico ON producao_mensal(medico_id);
CREATE INDEX IF NOT EXISTS idx_producao_convenio ON producao_mensal(convenio_id);
CREATE INDEX IF NOT EXISTS idx_producao_tipo ON producao_mensal(tipo);
CREATE INDEX IF NOT EXISTS idx_producao_month ON producao_mensal(month_reference);

CREATE INDEX IF NOT EXISTS idx_repasses_medico ON repasses(medico_id);
CREATE INDEX IF NOT EXISTS idx_repasses_convenio ON repasses(convenio_id);
CREATE INDEX IF NOT EXISTS idx_repasses_hospital ON repasses(hospital_id);
CREATE INDEX IF NOT EXISTS idx_repasses_tipo_procedimento ON repasses(tipo_procedimento_detalhado);
CREATE INDEX IF NOT EXISTS idx_repasses_medico_tipo ON repasses(medico_id, tipo_procedimento_detalhado);
CREATE INDEX IF NOT EXISTS idx_repasses_medico_month ON repasses(medico_id, month_reference);
CREATE INDEX IF NOT EXISTS idx_repasses_is_particular ON repasses(is_particular);
CREATE INDEX IF NOT EXISTS idx_repasses_destinatario_tipo ON repasses(destinatario_tipo);
CREATE INDEX IF NOT EXISTS idx_repasses_status_pagamento ON repasses(status_pagamento);
CREATE INDEX IF NOT EXISTS idx_repasses_month ON repasses(month_reference);

ALTER TABLE medicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE convenios ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospitais ENABLE ROW LEVEL SECURITY;
ALTER TABLE producao_mensal ENABLE ROW LEVEL SECURITY;
ALTER TABLE repasses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view medicos" ON medicos;
CREATE POLICY "Authenticated users can view medicos" ON medicos FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated users can insert medicos" ON medicos;
CREATE POLICY "Authenticated users can insert medicos" ON medicos FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated users can update medicos" ON medicos;
CREATE POLICY "Authenticated users can update medicos" ON medicos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated users can delete medicos" ON medicos;
CREATE POLICY "Authenticated users can delete medicos" ON medicos FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can view convenios" ON convenios;
CREATE POLICY "Authenticated users can view convenios" ON convenios FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated users can insert convenios" ON convenios;
CREATE POLICY "Authenticated users can insert convenios" ON convenios FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated users can update convenios" ON convenios;
CREATE POLICY "Authenticated users can update convenios" ON convenios FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated users can delete convenios" ON convenios;
CREATE POLICY "Authenticated users can delete convenios" ON convenios FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can view hospitais" ON hospitais;
CREATE POLICY "Authenticated users can view hospitais" ON hospitais FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated users can insert hospitais" ON hospitais;
CREATE POLICY "Authenticated users can insert hospitais" ON hospitais FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated users can update hospitais" ON hospitais;
CREATE POLICY "Authenticated users can update hospitais" ON hospitais FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated users can delete hospitais" ON hospitais;
CREATE POLICY "Authenticated users can delete hospitais" ON hospitais FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can view producao_mensal" ON producao_mensal;
CREATE POLICY "Authenticated users can view producao_mensal" ON producao_mensal FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated users can insert producao_mensal" ON producao_mensal;
CREATE POLICY "Authenticated users can insert producao_mensal" ON producao_mensal FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated users can update producao_mensal" ON producao_mensal;
CREATE POLICY "Authenticated users can update producao_mensal" ON producao_mensal FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated users can delete producao_mensal" ON producao_mensal;
CREATE POLICY "Authenticated users can delete producao_mensal" ON producao_mensal FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can view repasses" ON repasses;
CREATE POLICY "Authenticated users can view repasses" ON repasses FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated users can insert repasses" ON repasses;
CREATE POLICY "Authenticated users can insert repasses" ON repasses FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated users can update repasses" ON repasses;
CREATE POLICY "Authenticated users can update repasses" ON repasses FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated users can delete repasses" ON repasses;
CREATE POLICY "Authenticated users can delete repasses" ON repasses FOR DELETE TO authenticated USING (true);
