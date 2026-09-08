export interface Medico {
  id: number;
  nome: string;
  crm?: string;
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
  cidade?: string;
  created_at?: string;
}

export interface ProducaoMensal {
  id: number;
  medico_id: number;
  convenio_id: number;
  nome_paciente: string;
  data_consulta: string;
  valor: number;
  tipo: 'consulta' | 'cirurgia';
  month_reference?: string;
  created_at?: string;
  medico?: Medico;
  convenio?: Convenio;
}

export type DestinatarioTipo = 'terceiro' | 'socio';
export type StatusPagamento = 'pendente' | 'aprovado' | 'pago';

export interface Repasse {
  id: number;
  medico_id: number;
  convenio_id?: number;
  nome_paciente: string;
  hospital_id: number;
  data_cirurgia: string;
  valor: number;
  tipo: 'consulta' | 'cirurgia';
  is_particular: boolean;
  tipo_procedimento_detalhado?: 'consulta' | 'infiltracao' | 'onda_choque' | 'cirurgia_particular' | 'medico_parceiro';
  porcentagem_repasse?: number;
  valor_repasse_medico?: number;
  categoria_particular?: 'consulta_onda' | 'infiltracao_cirurgia';
  tipo_procedimento?: string;
  quantidade?: number;
  forma_pagamento?: 'credito' | 'pix' | 'debito' | 'especie' | 'convenio';
  valor_unitario?: number;
  month_reference?: string;
  observacao?: string;
  destinatario_tipo: DestinatarioTipo;
  auxilio_1: number;
  auxilio_2: number;
  taxa_1_5: number;
  imposto_percentual: number;
  outras_deducoes: number;
  valor_liquido: number;
  status_pagamento: StatusPagamento;
  data_pagamento?: string;
  created_at?: string;
  medico?: Medico;
  convenio?: Convenio;
  hospital?: Hospital;
  desconto_paciente: number;
  desconto_cartao: number;
  valor_recebido: number;
  percentual_terceiro: number;
  valor_terceiro: number;
  saldo_controle: number;
  numero_atendimento: string;
  valor_glosa: number;
}
