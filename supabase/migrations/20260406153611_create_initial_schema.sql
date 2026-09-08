/*
  # Schema Inicial do Sistema de Controle Médico

  1. Novas Tabelas
    - `medicos`
      - `id` (integer, primary key, auto-increment)
      - `nome` (text, not null)
      - `crm` (text, optional)
      - `created_at` (timestamptz, default now())
    
    - `convenios`
      - `id` (integer, primary key, auto-increment)
      - `nome` (text, not null)
      - `created_at` (timestamptz, default now())
    
    - `hospitais`
      - `id` (integer, primary key, auto-increment)
      - `nome` (text, not null)
      - `cidade` (text, optional)
      - `created_at` (timestamptz, default now())
    
    - `producao_mensal`
      - `id` (integer, primary key, auto-increment)
      - `medico_id` (integer, foreign key -> medicos)
      - `convenio_id` (integer, foreign key -> convenios)
      - `nome_paciente` (text, not null)
      - `data_consulta` (date, not null)
      - `valor` (numeric(10,2), not null)
      - `tipo` (text, default 'consulta', check: 'consulta' | 'cirurgia')
      - `created_at` (timestamptz, default now())
    
    - `repasses`
      - `id` (integer, primary key, auto-increment)
      - `medico_id` (integer, foreign key -> medicos)
      - `convenio_id` (integer, nullable, foreign key -> convenios)
      - `nome_paciente` (text, not null)
      - `hospital_id` (integer, foreign key -> hospitais)
      - `data_cirurgia` (date, not null)
      - `valor` (numeric(10,2), not null)
      - `tipo` (text, default 'consulta', check: 'consulta' | 'cirurgia')
      - `is_particular` (boolean, default false)
      - `tipo_procedimento_detalhado` (text, check: 'consulta', 'infiltracao', 'onda_choque', 'cirurgia_particular', 'medico_parceiro')
      - `porcentagem_repasse` (numeric(5,2))
      - `valor_repasse_medico` (numeric(10,2))
      - `categoria_particular` (text, check: 'consulta_onda' | 'infiltracao_cirurgia')
      - `tipo_procedimento` (text)
      - `quantidade` (integer, default 1)
      - `forma_pagamento` (text, check: 'credito', 'pix', 'debito', 'especie')
      - `valor_unitario` (numeric(10,2))
      - `month_reference` (text, formato YYYY-MM)
      - `created_at` (timestamptz, default now())

  2. Segurança
    - Enable RLS em todas as tabelas
    - Políticas para usuários autenticados realizarem todas as operações
    
  3. Índices
    - Índices em chaves estrangeiras
    - Índices em campos de busca frequente
*/

-- Criar tabela de médicos
CREATE TABLE IF NOT EXISTS medicos (
  id serial PRIMARY KEY,
  nome text NOT NULL,
  crm text,
  created_at timestamptz DEFAULT now()
);

-- Criar tabela de convênios
CREATE TABLE IF NOT EXISTS convenios (
  id serial PRIMARY KEY,
  nome text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Criar tabela de hospitais
CREATE TABLE IF NOT EXISTS hospitais (
  id serial PRIMARY KEY,
  nome text NOT NULL,
  cidade text,
  created_at timestamptz DEFAULT now()
);

-- Criar tabela de produção mensal
CREATE TABLE IF NOT EXISTS producao_mensal (
  id serial PRIMARY KEY,
  medico_id integer NOT NULL REFERENCES medicos(id) ON DELETE CASCADE,
  convenio_id integer NOT NULL REFERENCES convenios(id) ON DELETE CASCADE,
  nome_paciente text NOT NULL,
  data_consulta date NOT NULL,
  valor numeric(10,2) NOT NULL DEFAULT 0,
  tipo text DEFAULT 'consulta' NOT NULL CHECK (tipo = ANY (ARRAY['consulta'::text, 'cirurgia'::text])),
  created_at timestamptz DEFAULT now()
);

-- Criar tabela de repasses
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
  created_at timestamptz DEFAULT now()
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_producao_medico ON producao_mensal(medico_id);
CREATE INDEX IF NOT EXISTS idx_producao_convenio ON producao_mensal(convenio_id);
CREATE INDEX IF NOT EXISTS idx_producao_tipo ON producao_mensal(tipo);

CREATE INDEX IF NOT EXISTS idx_repasses_medico ON repasses(medico_id);
CREATE INDEX IF NOT EXISTS idx_repasses_convenio ON repasses(convenio_id);
CREATE INDEX IF NOT EXISTS idx_repasses_hospital ON repasses(hospital_id);
CREATE INDEX IF NOT EXISTS idx_repasses_tipo_procedimento ON repasses(tipo_procedimento_detalhado);
CREATE INDEX IF NOT EXISTS idx_repasses_medico_tipo ON repasses(medico_id, tipo_procedimento_detalhado);
CREATE INDEX IF NOT EXISTS idx_repasses_medico_month ON repasses(medico_id, month_reference);
CREATE INDEX IF NOT EXISTS idx_repasses_is_particular ON repasses(is_particular);

-- Habilitar RLS
ALTER TABLE medicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE convenios ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospitais ENABLE ROW LEVEL SECURITY;
ALTER TABLE producao_mensal ENABLE ROW LEVEL SECURITY;
ALTER TABLE repasses ENABLE ROW LEVEL SECURITY;

-- Políticas para medicos
CREATE POLICY "Authenticated users can view medicos"
  ON medicos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert medicos"
  ON medicos FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update medicos"
  ON medicos FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete medicos"
  ON medicos FOR DELETE
  TO authenticated
  USING (true);

-- Políticas para convenios
CREATE POLICY "Authenticated users can view convenios"
  ON convenios FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert convenios"
  ON convenios FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update convenios"
  ON convenios FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete convenios"
  ON convenios FOR DELETE
  TO authenticated
  USING (true);

-- Políticas para hospitais
CREATE POLICY "Authenticated users can view hospitais"
  ON hospitais FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert hospitais"
  ON hospitais FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update hospitais"
  ON hospitais FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete hospitais"
  ON hospitais FOR DELETE
  TO authenticated
  USING (true);

-- Políticas para producao_mensal
CREATE POLICY "Authenticated users can view producao_mensal"
  ON producao_mensal FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert producao_mensal"
  ON producao_mensal FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update producao_mensal"
  ON producao_mensal FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete producao_mensal"
  ON producao_mensal FOR DELETE
  TO authenticated
  USING (true);

-- Políticas para repasses
CREATE POLICY "Authenticated users can view repasses"
  ON repasses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert repasses"
  ON repasses FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update repasses"
  ON repasses FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete repasses"
  ON repasses FOR DELETE
  TO authenticated
  USING (true);