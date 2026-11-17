// ============================================================
// Cadastros (inalterados)
// ============================================================
export interface Medico {
  id: number;
  nome: string;
  crm?: string | null;
  created_at?: string;
}

export interface Convenio {
  id: number;
  nome: string;
  created_at?: string;
}

export interface Hospital {
  id: number;
  nome: string;
  cidade?: string | null;
  created_at?: string;
}

export interface Unidade {
  id: number;
  nome: string;
  cidade?: string | null;
  created_at?: string;
}

export interface Procedimento {
  id: number;
  nome: string;
  created_at?: string;
}

export interface Cirurgia {
  id: number;
  nome: string;
  created_at?: string;
}

// ============================================================
// Tipos auxiliares
// ============================================================
export type DestinatarioTipo = 'socio' | 'terceiro';
export type StatusPagamento = 'pendente' | 'aprovado' | 'pago';
export type FormaPagamento = 'credito' | 'debito' | 'pix' | 'especie' | 'deposito';

// ============================================================
// Produção Convênios (aba Convênios)
// ============================================================
export interface ProducaoConvenio {
  id: number;
  medico_id: number;
  convenio_id: number;
  nome_paciente: string;
  data_atendimento: string;       // YYYY-MM-DD
  tipo: 'consulta' | 'cirurgia';
  valor: number;
  valor_glosa: number;
  valor_recebido: number;
  month_reference: string;        // YYYY-MM
  observacao?: string | null;
  created_at?: string;
  updated_at?: string;
  // joins
  medico?: Medico;
  convenio?: Convenio;
}

export type ProducaoConvenioInput = Omit<
  ProducaoConvenio,
  'id' | 'created_at' | 'updated_at' | 'medico' | 'convenio'
>;

// ============================================================
// Repasses Particulares (aba Particular)
// ============================================================
export interface RepasseParticular {
  id: number;
  medico_id: number;
  unidade_id: number | null;
  nome_paciente: string;
  data_procedimento: string;      // YYYY-MM-DD
  procedimento_id: number | null;
  procedimento_descricao: string | null;
  destinatario_tipo: DestinatarioTipo;
  forma_pagamento: FormaPagamento;
  is_split_payment: boolean;
  cash_amount: number;
  other_payment_method: string | null;
  installments: number;
  valor_bruto: number;
  valor_recebido: number;
  payment_tax_rate: number;
  payment_tax_amount: number;
  invoice_tax_rate: number;
  invoice_tax_amount: number;
  medication_cost: number;
  supplies_cost: number;
  other_costs: number;
  other_costs_description: string | null;
  total_deductions: number;
  valor_liquido: number;
  valor_repasse_medico: number;
  check_conferencia: boolean;
  status_pagamento: StatusPagamento;
  data_pagamento: string | null;
  month_reference: string;
  observacao: string | null;
  created_at?: string;
  updated_at?: string;
  // joins
  medico?: Medico;
  unidade?: Unidade;
  procedimento?: Procedimento;
}

export type RepasseParticularInput = Omit<
  RepasseParticular,
  'id' | 'created_at' | 'updated_at' | 'medico' | 'unidade' | 'procedimento'
>;

// ============================================================
// Repasses Cirurgias
// ============================================================
export interface RepasseCirurgia {
  id: number;
  medico_id: number;
  convenio_id: number | null;
  hospital_id: number | null;
  cirurgia_id: number | null;
  nome_paciente: string;
  data_cirurgia: string;          // YYYY-MM-DD
  is_particular: boolean;
  tipo_procedimento: string | null;
  quantidade: number;
  valor: number;
  valor_recebido: number;
  auxilio_1: number;
  auxilio_2: number;
  taxa_1_5: number;
  imposto_percentual: number;
  outras_deducoes: number;
  valor_repasse_medico: number;
  destinatario_tipo: DestinatarioTipo;
  status_pagamento: StatusPagamento;
  data_pagamento: string | null;
  month_reference: string;
  observacao: string | null;
  created_at?: string;
  updated_at?: string;
  // joins
  medico?: Medico;
  convenio?: Convenio;
  hospital?: Hospital;
  cirurgia?: Cirurgia;
}

export type RepasseCirurgiaInput = Omit<
  RepasseCirurgia,
  'id' | 'created_at' | 'updated_at' | 'medico' | 'convenio' | 'hospital' | 'cirurgia'
>;

// ============================================================
// Repasses Imagem (inalterado)
// ============================================================
export interface RepasseImagem {
  id: number;
  month_reference: string;
  hospital_id: number;
  medico_id: number;
  total: number;
  imposto_percentual: number;
  created_at?: string;
  hospital?: Hospital;
  medico?: Medico;
}
