import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Database helper functions
export const dbHelpers = {
  // Medicos
  async getMedicos() {
    const { data, error } = await supabase
      .from('medicos')
      .select('*')
      .order('nome');
    return { data, error };
  },

  async createMedico(medico: Omit<any, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('medicos')
      .insert([medico])
      .select();
    return { data, error };
  },

  async updateMedico(id: number, medico: Omit<any, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('medicos')
      .update(medico)
      .eq('id', id)
      .select();
    return { data, error };
  },

  async deleteMedico(id: number) {
    const { data, error } = await supabase
      .from('medicos')
      .delete()
      .eq('id', id);
    return { data, error };
  },

  // Convenios
  async getConvenios() {
    const { data, error } = await supabase
      .from('convenios')
      .select('*')
      .order('nome');
    return { data, error };
  },

  async createConvenio(convenio: Omit<any, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('convenios')
      .insert([convenio])
      .select();
    return { data, error };
  },

  async updateConvenio(id: number, convenio: Omit<any, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('convenios')
      .update(convenio)
      .eq('id', id)
      .select();
    return { data, error };
  },

  async deleteConvenio(id: number) {
    const { data, error } = await supabase
      .from('convenios')
      .delete()
      .eq('id', id);
    return { data, error };
  },

  // Hospitais
  async getHospitais() {
    const { data, error } = await supabase
      .from('hospitais')
      .select('*')
      .order('nome');
    return { data, error };
  },

  async createHospital(hospital: Omit<any, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('hospitais')
      .insert([hospital])
      .select();
    return { data, error };
  },

  async updateHospital(id: number, hospital: Omit<any, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('hospitais')
      .update(hospital)
      .eq('id', id)
      .select();
    return { data, error };
  },

  async deleteHospital(id: number) {
    const { data, error } = await supabase
      .from('hospitais')
      .delete()
      .eq('id', id);
    return { data, error };
  },

  // Produção Mensal
  async getProducaoMensal() {
    const { data, error } = await supabase
      .from('producao_mensal')
      .select(`
        *,
        medico:medicos(*),
        convenio:convenios(*)
      `)
      .order('data_consulta', { ascending: false });
    return { data, error };
  },

  // NOVA FUNÇÃO: Produção Mensal por Mês
  async getProducaoMensalByMonth(month: string) {
    const { data, error } = await supabase
      .from('producao_mensal')
      .select(`
        *,
        medico:medicos(*),
        convenio:convenios(*)
      `)
      .eq('month_reference', month)
      .order('data_consulta', { ascending: false });
    return { data, error };
  },

  async getProducaoMensalByMedico(medicoId: number) {
    const { data, error } = await supabase
      .from('producao_mensal')
      .select(`
        *,
        medico:medicos(*),
        convenio:convenios(*)
      `)
      .eq('medico_id', medicoId)
      .order('data_consulta', { ascending: false });
    return { data, error };
  },

  async createProducaoMensal(producao: Omit<any, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('producao_mensal')
      .insert([producao])
      .select();
    return { data, error };
  },

  async updateProducaoMensal(id: number, producao: Omit<any, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('producao_mensal')
      .update(producao)
      .eq('id', id)
      .select();
    return { data, error };
  },

  async deleteProducaoMensal(id: number) {
    const { data, error } = await supabase
      .from('producao_mensal')
      .delete()
      .eq('id', id);
    return { data, error };
  },

  // Repasses
  async getRepasses() {
    const { data, error } = await supabase
      .from('repasses')
      .select(`
        *,
        medico:medicos(*),
        convenio:convenios(*),
        hospital:hospitais(*)
      `)
      .order('data_cirurgia', { ascending: false });
    return { data, error };
  },

  // NOVA FUNÇÃO: Repasses por Mês
  async getRepassesByMonth(month: string) {
    const { data, error } = await supabase
      .from('repasses')
      .select(`
        *,
        medico:medicos(*),
        convenio:convenios(*),
        hospital:hospitais(*)
      `)
      .eq('month_reference', month)
      .order('data_cirurgia', { ascending: false });
    return { data, error };
  },

  async getRepassesByMedico(medicoId: number) {
    const { data, error } = await supabase
      .from('repasses')
      .select(`
        *,
        medico:medicos(*),
        convenio:convenios(*),
        hospital:hospitais(*)
      `)
      .eq('medico_id', medicoId)
      .order('data_cirurgia', { ascending: false });
    return { data, error };
  },

  async createRepasse(repasse: Omit<any, 'id' | 'created_at'>) {
    // Limpar campos undefined ou null para evitar erro 400
    const cleanRepasse = Object.fromEntries(
      Object.entries(repasse).filter(([_, value]) => value !== undefined && value !== null)
    );
    
    const { data, error } = await supabase
      .from('repasses')
      .insert([cleanRepasse])
      .select();
    return { data, error };
  },

  async updateRepasse(id: number, repasse: Omit<any, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('repasses')
      .update(repasse)
      .eq('id', id)
      .select();
    return { data, error };
  },

  async deleteRepasse(id: number) {
    const { data, error } = await supabase
      .from('repasses')
      .delete()
      .eq('id', id);
    return { data, error };
  }
};
