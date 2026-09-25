import { createClient } from '@supabase/supabase-js';
import type { DestinatarioTipo } from '../types';
import type { PerfilUsuario } from '../components/Auth/AuthContext';

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

  // Unidades
  async getUnidades() {
    const { data, error } = await supabase
      .from('unidades')
      .select('*')
      .order('nome');
    return { data, error };
  },

  async createUnidade(unidade: Omit<any, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('unidades')
      .insert([unidade])
      .select();
    return { data, error };
  },

  async updateUnidade(id: number, unidade: Omit<any, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('unidades')
      .update(unidade)
      .eq('id', id)
      .select();
    return { data, error };
  },

  async deleteUnidade(id: number) {
    const { data, error } = await supabase
      .from('unidades')
      .delete()
      .eq('id', id);
    return { data, error };
  },

  // Procedimentos
  async getProcedimentos() {
    const { data, error } = await supabase
      .from('procedimentos')
      .select('*')
      .order('nome');
    return { data, error };
  },

  async createProcedimento(procedimento: Omit<any, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('procedimentos')
      .insert([procedimento])
      .select();
    return { data, error };
  },

  async updateProcedimento(id: number, procedimento: Omit<any, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('procedimentos')
      .update(procedimento)
      .eq('id', id)
      .select();
    return { data, error };
  },

  async deleteProcedimento(id: number) {
    const { data, error } = await supabase
      .from('procedimentos')
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

  async getRepassesByMonthAndTipo(month: string, destinatarioTipo: DestinatarioTipo) {
    const { data, error } = await supabase
      .from('repasses')
      .select(`
        *,
        medico:medicos(*),
        convenio:convenios(*),
        hospital:hospitais(*)
      `)
      .eq('month_reference', month)
      .eq('destinatario_tipo', destinatarioTipo)
      .order('data_cirurgia', { ascending: false });
    return { data, error };
  },

  async getRepassesParticularByMonth(month: string) {
    const { data, error } = await supabase
      .from('repasses')
      .select(`
        *,
        medico:medicos(*),
        hospital:hospitais(*)
      `)
      .eq('month_reference', month)
      .eq('is_particular', true)
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
  },

  // Repasse Imagem
  async getRepassesImagemByMonth(month: string) {
    const { data, error } = await supabase
      .from('repasses_imagem')
      .select(`
        *,
        hospital:hospitais(*),
        medico:medicos(*)
      `)
      .eq('month_reference', month)
      .order('created_at', { ascending: false });
    return { data, error };
  },

  async createRepasseImagem(repasse: Omit<any, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('repasses_imagem')
      .insert([repasse])
      .select();
    return { data, error };
  },

  async updateRepasseImagem(id: number, repasse: Omit<any, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('repasses_imagem')
      .update(repasse)
      .eq('id', id)
      .select();
    return { data, error };
  },

  async deleteRepasseImagem(id: number) {
    const { data, error } = await supabase
      .from('repasses_imagem')
      .delete()
      .eq('id', id);
    return { data, error };
  },

  // Perfis de usuário
  async getPerfis() {
    const { data, error } = await supabase
      .from('perfis_usuario')
      .select('*')
      .order('nome');
    return { data, error };
  },

  async getPerfil(uid: string) {
    const { data, error } = await supabase
      .from('perfis_usuario')
      .select('*')
      .eq('id', uid)
      .maybeSingle();
    return { data, error };
  },

  async createPerfilByAdmin(perfil: { id: string; nome: string; email: string; tipo: PerfilUsuario['tipo']; medico_id?: number | null; ativo?: boolean }) {
    const { data, error } = await supabase
      .from('perfis_usuario')
      .insert([perfil])
      .select();
    return { data, error };
  },

  async updatePerfil(id: string, perfil: Partial<Omit<PerfilUsuario, 'id'>>) {
    const { data, error } = await supabase
      .from('perfis_usuario')
      .update({ ...perfil, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select();
    return { data, error };
  },

  async deletePerfil(id: string) {
    const { data, error } = await supabase
      .from('perfis_usuario')
      .delete()
      .eq('id', id);
    return { data, error };
  },

  async createUserAuth(email: string, password: string, nome: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nome } },
    });
    return { data, error };
  },

  // Relatório: todos repasses com joins para filtros
  async getRepassesForReport(filters: { medico?: string; hospital?: string; procedimento?: string; unidade?: string; paciente?: string; dataInicio?: string; dataFim?: string; tipo?: DestinatarioTipo | 'todos' }) {
    let query = supabase
      .from('repasses')
      .select(`*, medico:medicos(*), convenio:convenios(*), hospital:hospitais(*)`)
      .order('data_cirurgia', { ascending: false });
    if (filters.tipo && filters.tipo !== 'todos') query = query.eq('destinatario_tipo', filters.tipo);
    if (filters.medico) query = query.eq('medico_id', Number(filters.medico));
    if (filters.hospital) query = query.eq('hospital_id', Number(filters.hospital));
    if (filters.unidade) query = query.ilike('unidade', `%${filters.unidade}%`);
    if (filters.paciente) query = query.ilike('nome_paciente', `%${filters.paciente}%`);
    if (filters.procedimento) query = query.ilike('tipo_procedimento', `%${filters.procedimento}%`);
    if (filters.dataInicio) query = query.gte('data_cirurgia', filters.dataInicio);
    if (filters.dataFim) query = query.lte('data_cirurgia', filters.dataFim);
    const { data, error } = await query;
    return { data, error };
  }
};
