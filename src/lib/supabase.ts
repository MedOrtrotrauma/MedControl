import { createClient } from '@supabase/supabase-js';
import type { DestinatarioTipo } from '../types';
import type { PerfilUsuario } from '../components/Auth/AuthContext';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Database helper functions
export const dbHelpers = {
  // ============================================================
  // Medicos
  // ============================================================
  async getMedicos() {
    const { data, error } = await supabase.from('medicos').select('*').order('nome');
    return { data, error };
  },
  async createMedico(medico: Omit<any, 'id' | 'created_at'>) {
    const { data, error } = await supabase.from('medicos').insert([medico]).select();
    return { data, error };
  },
  async updateMedico(id: number, medico: Omit<any, 'id' | 'created_at'>) {
    const { data, error } = await supabase.from('medicos').update(medico).eq('id', id).select();
    return { data, error };
  },
  async deleteMedico(id: number) {
    const { data, error } = await supabase.from('medicos').delete().eq('id', id);
    return { data, error };
  },

  // ============================================================
  // Convenios
  // ============================================================
  async getConvenios() {
    const { data, error } = await supabase.from('convenios').select('*').order('nome');
    return { data, error };
  },
  async createConvenio(convenio: Omit<any, 'id' | 'created_at'>) {
    const { data, error } = await supabase.from('convenios').insert([convenio]).select();
    return { data, error };
  },
  async updateConvenio(id: number, convenio: Omit<any, 'id' | 'created_at'>) {
    const { data, error } = await supabase.from('convenios').update(convenio).eq('id', id).select();
    return { data, error };
  },
  async deleteConvenio(id: number) {
    const { data, error } = await supabase.from('convenios').delete().eq('id', id);
    return { data, error };
  },

  // ============================================================
  // Hospitais
  // ============================================================
  async getHospitais() {
    const { data, error } = await supabase.from('hospitais').select('*').order('nome');
    return { data, error };
  },
  async createHospital(hospital: Omit<any, 'id' | 'created_at'>) {
    const { data, error } = await supabase.from('hospitais').insert([hospital]).select();
    return { data, error };
  },
  async updateHospital(id: number, hospital: Omit<any, 'id' | 'created_at'>) {
    const { data, error } = await supabase.from('hospitais').update(hospital).eq('id', id).select();
    return { data, error };
  },
  async deleteHospital(id: number) {
    const { data, error } = await supabase.from('hospitais').delete().eq('id', id);
    return { data, error };
  },

  // ============================================================
  // Unidades
  // ============================================================
  async getUnidades() {
    const { data, error } = await supabase.from('unidades').select('*').order('nome');
    return { data, error };
  },
  async createUnidade(unidade: Omit<any, 'id' | 'created_at'>) {
    const { data, error } = await supabase.from('unidades').insert([unidade]).select();
    return { data, error };
  },
  async updateUnidade(id: number, unidade: Omit<any, 'id' | 'created_at'>) {
    const { data, error } = await supabase.from('unidades').update(unidade).eq('id', id).select();
    return { data, error };
  },
  async deleteUnidade(id: number) {
    const { data, error } = await supabase.from('unidades').delete().eq('id', id);
    return { data, error };
  },

  // ============================================================
  // Procedimentos
  // ============================================================
  async getProcedimentos() {
    const { data, error } = await supabase.from('procedimentos').select('*').order('nome');
    return { data, error };
  },
  async createProcedimento(procedimento: Omit<any, 'id' | 'created_at'>) {
    const { data, error } = await supabase.from('procedimentos').insert([procedimento]).select();
    return { data, error };
  },
  async updateProcedimento(id: number, procedimento: Omit<any, 'id' | 'created_at'>) {
    const { data, error } = await supabase.from('procedimentos').update(procedimento).eq('id', id).select();
    return { data, error };
  },
  async deleteProcedimento(id: number) {
    const { data, error } = await supabase.from('procedimentos').delete().eq('id', id);
    return { data, error };
  },

  // ============================================================
  // Cirurgias
  // ============================================================
  async getCirurgias() {
    const { data, error } = await supabase.from('cirurgias').select('*').order('nome');
    return { data, error };
  },
  async createCirurgia(cirurgia: Omit<any, 'id' | 'created_at'>) {
    const { data, error } = await supabase.from('cirurgias').insert([cirurgia]).select();
    return { data, error };
  },
  async updateCirurgia(id: number, cirurgia: Omit<any, 'id' | 'created_at'>) {
    const { data, error } = await supabase.from('cirurgias').update(cirurgia).eq('id', id).select();
    return { data, error };
  },
  async deleteCirurgia(id: number) {
    const { data, error } = await supabase.from('cirurgias').delete().eq('id', id);
    return { data, error };
  },

  // ============================================================
  // PRODUÇÃO CONVÊNIOS  (tabela: producao_convenios)
  // Substitui producao_mensal.
  // ============================================================
  async getProducaoConveniosAll() {
    const { data, error } = await supabase
      .from('producao_convenios')
      .select(`*, medico:medicos(*), convenio:convenios(*)`)
      .order('data_atendimento', { ascending: false });
    return { data, error };
  },

  async getProducaoConveniosByMonth(month: string) {
    const { data, error } = await supabase
      .from('producao_convenios')
      .select(`*, medico:medicos(*), convenio:convenios(*)`)
      .eq('month_reference', month)
      .order('data_atendimento', { ascending: false });
    return { data, error };
  },

  async getProducaoConveniosByMedico(medicoId: number) {
    const { data, error } = await supabase
      .from('producao_convenios')
      .select(`*, medico:medicos(*), convenio:convenios(*)`)
      .eq('medico_id', medicoId)
      .order('data_atendimento', { ascending: false });
    return { data, error };
  },

  async getProducaoConveniosComFiltros(month: string, filters: {
    medico?: string;
    convenio?: string;
    tipo?: 'consulta' | 'cirurgia' | '';
    paciente?: string;
    dataInicio?: string;
    dataFim?: string;
  } = {}) {
    let q = supabase
      .from('producao_convenios')
      .select(`*, medico:medicos(*), convenio:convenios(*)`)
      .eq('month_reference', month)
      .order('data_atendimento', { ascending: false });
    if (filters.medico) q = q.eq('medico_id', Number(filters.medico));
    if (filters.convenio) q = q.eq('convenio_id', Number(filters.convenio));
    if (filters.tipo) q = q.eq('tipo', filters.tipo);
    if (filters.paciente) q = q.ilike('nome_paciente', `%${filters.paciente}%`);
    if (filters.dataInicio) q = q.gte('data_atendimento', filters.dataInicio);
    if (filters.dataFim) q = q.lte('data_atendimento', filters.dataFim);
    const { data, error } = await q;
    return { data, error };
  },

  async createProducaoConvenio(producao: Omit<any, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('producao_convenios')
      .insert([producao])
      .select();
    return { data, error };
  },

  async updateProducaoConvenio(id: number, producao: Omit<any, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('producao_convenios')
      .update({ ...producao, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select();
    return { data, error };
  },

  async deleteProducaoConvenio(id: number) {
    const { data, error } = await supabase
      .from('producao_convenios')
      .delete()
      .eq('id', id);
    return { data, error };
  },

  // --- aliases de compatibilidade (remova quando as telas estiverem migradas) ---
  async getProducaoMensal() {
    return dbHelpers.getProducaoConveniosAll();
  },
  async getProducaoMensalByMonth(month: string) {
    return dbHelpers.getProducaoConveniosByMonth(month);
  },
  async getProducaoMensalByMedico(medicoId: number) {
    return dbHelpers.getProducaoConveniosByMedico(medicoId);
  },
  async createProducaoMensal(producao: Omit<any, 'id' | 'created_at' | 'updated_at'>) {
    return dbHelpers.createProducaoConvenio(producao);
  },
  async updateProducaoMensal(id: number, producao: Omit<any, 'id' | 'created_at' | 'updated_at'>) {
    return dbHelpers.updateProducaoConvenio(id, producao);
  },
  async deleteProducaoMensal(id: number) {
    return dbHelpers.deleteProducaoConvenio(id);
  },

  // ============================================================
  // REPASSES PARTICULARES  (tabela: repasses_particulares)
  // Substitui leituras de `repasses` com categoria_lancamento='particular'.
  // ============================================================
  async getRepassesParticularesByMonth(month: string) {
    const { data, error } = await supabase
      .from('repasses_particulares')
      .select(`*, medico:medicos(*), unidade:unidades(*), procedimento:procedimentos(*)`)
      .eq('month_reference', month)
      .order('data_procedimento', { ascending: false });
    return { data, error };
  },

  async getRepassesParticularesByMedico(medicoId: number) {
    const { data, error } = await supabase
      .from('repasses_particulares')
      .select(`*, medico:medicos(*), unidade:unidades(*), procedimento:procedimentos(*)`)
      .eq('medico_id', medicoId)
      .order('data_procedimento', { ascending: false });
    return { data, error };
  },

  async getRepassesParticularesComFiltros(month: string, filters: {
    medico?: string;
    unidade?: string;
    paciente?: string;
    procedimento?: string;
    dataInicio?: string;
    dataFim?: string;
  } = {}) {
    let q = supabase
      .from('repasses_particulares')
      .select(`*, medico:medicos(*), unidade:unidades(*), procedimento:procedimentos(*)`)
      .eq('month_reference', month)
      .order('data_procedimento', { ascending: false });
    if (filters.medico) q = q.eq('medico_id', Number(filters.medico));
    if (filters.unidade) q = q.eq('unidade_id', Number(filters.unidade));
    if (filters.paciente) q = q.ilike('nome_paciente', `%${filters.paciente}%`);
    if (filters.procedimento) q = q.ilike('procedimento_descricao', `%${filters.procedimento}%`);
    if (filters.dataInicio) q = q.gte('data_procedimento', filters.dataInicio);
    if (filters.dataFim) q = q.lte('data_procedimento', filters.dataFim);
    const { data, error } = await q;
    return { data, error };
  },

  async createRepasseParticular(repasse: Omit<any, 'id' | 'created_at' | 'updated_at'>) {
    const clean = Object.fromEntries(
      Object.entries(repasse).filter(([_, v]) => v !== undefined)
    );
    const { data, error } = await supabase
      .from('repasses_particulares')
      .insert([clean])
      .select();
    return { data, error };
  },

  async updateRepasseParticular(id: number, repasse: Omit<any, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('repasses_particulares')
      .update({ ...repasse, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select();
    return { data, error };
  },

  async deleteRepasseParticular(id: number) {
    const { data, error } = await supabase
      .from('repasses_particulares')
      .delete()
      .eq('id', id);
    return { data, error };
  },

  // --- alias de compatibilidade ---
  async getRepassesParticularByMonth(month: string) {
    return dbHelpers.getRepassesParticularesByMonth(month);
  },

  // ============================================================
  // REPASSES CIRURGIAS  (tabela: repasses_cirurgias)
  // Substitui repasse_cirurgias (renomeada) e leituras de `repasses`
  // com categoria_lancamento='cirurgia'.
  // ============================================================
  async getRepassesCirurgiasByMonth(month: string) {
    const { data, error } = await supabase
      .from('repasses_cirurgias')
      .select(`*, medico:medicos(*), convenio:convenios(*), hospital:hospitais(*), cirurgia:cirurgias(*)`)
      .eq('month_reference', month)
      .order('data_cirurgia', { ascending: false });
    return { data, error };
  },

  async getRepassesCirurgiasByMonthAndTipo(month: string, destinatarioTipo: DestinatarioTipo) {
    const { data, error } = await supabase
      .from('repasses_cirurgias')
      .select(`*, medico:medicos(*), convenio:convenios(*), hospital:hospitais(*), cirurgia:cirurgias(*)`)
      .eq('month_reference', month)
      .eq('destinatario_tipo', destinatarioTipo)
      .order('data_cirurgia', { ascending: false });
    return { data, error };
  },

  async getRepassesCirurgiasByMedico(medicoId: number) {
    const { data, error } = await supabase
      .from('repasses_cirurgias')
      .select(`*, medico:medicos(*), convenio:convenios(*), hospital:hospitais(*), cirurgia:cirurgias(*)`)
      .eq('medico_id', medicoId)
      .order('data_cirurgia', { ascending: false });
    return { data, error };
  },

  async getRepassesCirurgiasComFiltros(month: string, filters: {
    medico?: string;
    hospital?: string;
    cirurgia?: string;
    paciente?: string;
    procedimento?: string;
    dataInicio?: string;
    dataFim?: string;
    tipo?: DestinatarioTipo | 'todos';
  } = {}) {
    let q = supabase
      .from('repasses_cirurgias')
      .select(`*, medico:medicos(*), convenio:convenios(*), hospital:hospitais(*), cirurgia:cirurgias(*)`)
      .eq('month_reference', month)
      .order('data_cirurgia', { ascending: false });
    if (filters.medico) q = q.eq('medico_id', Number(filters.medico));
    if (filters.hospital) q = q.eq('hospital_id', Number(filters.hospital));
    if (filters.cirurgia) q = q.eq('cirurgia_id', Number(filters.cirurgia));
    if (filters.paciente) q = q.ilike('nome_paciente', `%${filters.paciente}%`);
    if (filters.procedimento) q = q.ilike('tipo_procedimento', `%${filters.procedimento}%`);
    if (filters.dataInicio) q = q.gte('data_cirurgia', filters.dataInicio);
    if (filters.dataFim) q = q.lte('data_cirurgia', filters.dataFim);
    if (filters.tipo && filters.tipo !== 'todos') q = q.eq('destinatario_tipo', filters.tipo);
    const { data, error } = await q;
    return { data, error };
  },

  async createRepasseCirurgia(repasse: Omit<any, 'id' | 'created_at' | 'updated_at'>) {
    const clean = Object.fromEntries(
      Object.entries(repasse).filter(([_, v]) => v !== undefined)
    );
    const { data, error } = await supabase
      .from('repasses_cirurgias')
      .insert([clean])
      .select();
    return { data, error };
  },

  async updateRepasseCirurgia(id: number, repasse: Omit<any, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('repasses_cirurgias')
      .update({ ...repasse, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select();
    return { data, error };
  },

  async deleteRepasseCirurgia(id: number) {
    const { data, error } = await supabase
      .from('repasses_cirurgias')
      .delete()
      .eq('id', id);
    return { data, error };
  },

  // --- aliases de compatibilidade ---
  async getRepasseCirurgiasByMonthAndTipo(month: string, destinatarioTipo: DestinatarioTipo) {
    return dbHelpers.getRepassesCirurgiasByMonthAndTipo(month, destinatarioTipo);
  },
  async getRepassesCirurgiaByMonth(month: string) {
    return dbHelpers.getRepassesCirurgiasByMonth(month);
  },
  async getRepassesByMonthAndTipo(month: string, destinatarioTipo: DestinatarioTipo) {
    // Compatibilidade: antes lia `repasses` filtrando categoria_lancamento.
    // Cirurgia agora vive em repasses_cirurgias; procedimentos de terceiros
    // sem tabela dedicada — retornamos só cirurgias.
    return dbHelpers.getRepassesCirurgiasByMonthAndTipo(month, destinatarioTipo);
  },

  // ============================================================
  // REPASSES IMAGEM  (inalterado)
  // ============================================================
  async getRepassesImagemAll() {
    const { data, error } = await supabase
      .from('repasses_imagem')
      .select(`*, hospital:hospitais(*), medico:medicos(*)`)
      .order('month_reference', { ascending: false });
    return { data, error };
  },

  async getRepassesImagemByMonth(month: string) {
    const { data, error } = await supabase
      .from('repasses_imagem')
      .select(`*, hospital:hospitais(*), medico:medicos(*)`)
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

  // ============================================================
  // Perfis de usuário (inalterado)
  // ============================================================
  async getPerfis() {
    const { data, error } = await supabase.from('perfis_usuario').select('*').order('nome');
    return { data, error };
  },
  async getPerfil(uid: string) {
    const { data, error } = await supabase.from('perfis_usuario').select('*').eq('id', uid).maybeSingle();
    return { data, error };
  },
  async createPerfilByAdmin(perfil: { id: string; nome: string; email: string; tipo: PerfilUsuario['tipo']; medico_id?: number | null; ativo?: boolean }) {
    const { data, error } = await supabase.from('perfis_usuario').insert([perfil]).select();
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
    const { data, error } = await supabase.from('perfis_usuario').delete().eq('id', id);
    return { data, error };
  },
  async createUserAuth(email: string, password: string, nome: string) {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { nome } } });
    return { data, error };
  },

  // ============================================================
  // RELATÓRIO AGREGADO (particulares + cirurgias)
  // Filtros aplicados NO BANCO. Mantém retorno { data } no formato antigo.
  // ============================================================
  async getRepassesForReport(filters: {
    medico?: string;
    hospital?: string;
    procedimento?: string;
    unidade?: string;
    paciente?: string;
    dataInicio?: string;
    dataFim?: string;
    tipo?: DestinatarioTipo | 'todos';
    cirurgia?: string;
    month?: string;
  }) {
    // ---------- Particulares ----------
    let qPart = supabase
      .from('repasses_particulares')
      .select(`*, medico:medicos(*), unidade:unidades(*), procedimento:procedimentos(*)`)
      .order('data_procedimento', { ascending: false });

    if (filters.month) qPart = qPart.eq('month_reference', filters.month);
    if (filters.tipo && filters.tipo !== 'todos') qPart = qPart.eq('destinatario_tipo', filters.tipo);
    if (filters.medico) qPart = qPart.eq('medico_id', Number(filters.medico));
    if (filters.unidade) qPart = qPart.eq('unidade_id', Number(filters.unidade));
    if (filters.paciente) qPart = qPart.ilike('nome_paciente', `%${filters.paciente}%`);
    if (filters.procedimento) qPart = qPart.ilike('procedimento_descricao', `%${filters.procedimento}%`);
    if (filters.dataInicio) qPart = qPart.gte('data_procedimento', filters.dataInicio);
    if (filters.dataFim) qPart = qPart.lte('data_procedimento', filters.dataFim);

    // ---------- Cirurgias ----------
    let qCir = supabase
      .from('repasses_cirurgias')
      .select(`*, medico:medicos(*), convenio:convenios(*), hospital:hospitais(*), cirurgia:cirurgias(*)`)
      .order('data_cirurgia', { ascending: false });

    if (filters.month) qCir = qCir.eq('month_reference', filters.month);
    if (filters.tipo && filters.tipo !== 'todos') qCir = qCir.eq('destinatario_tipo', filters.tipo);
    if (filters.medico) qCir = qCir.eq('medico_id', Number(filters.medico));
    if (filters.hospital) qCir = qCir.eq('hospital_id', Number(filters.hospital));
    if (filters.cirurgia) qCir = qCir.eq('cirurgia_id', Number(filters.cirurgia));
    if (filters.paciente) qCir = qCir.ilike('nome_paciente', `%${filters.paciente}%`);
    if (filters.procedimento) qCir = qCir.ilike('tipo_procedimento', `%${filters.procedimento}%`);
    if (filters.dataInicio) qCir = qCir.gte('data_cirurgia', filters.dataInicio);
    if (filters.dataFim) qCir = qCir.lte('data_cirurgia', filters.dataFim);

    const [partRes, cirRes] = await Promise.all([qPart, qCir]);

    if (partRes.error || cirRes.error) {
      return { data: null, error: partRes.error || cirRes.error };
    }

    const particulares = (partRes.data || []).map((r: any) => ({
      ...r,
      __origem: 'particular' as const,
      data_cirurgia: r.data_procedimento,
      categoria_lancamento: 'particular',
      hospital_id: r.hospital_id ?? null,
      valor: r.valor_bruto,
      unidade: r.unidade?.nome ?? null,
      cirurgia_id: null,
      tipo_procedimento:
        r.procedimento?.nome || r.procedimento_descricao || r.tipo_procedimento || null,
    }));

    const cirurgias = (cirRes.data || []).map((r: any) => ({
      ...r,
      __origem: 'cirurgia' as const,
      categoria_lancamento: 'cirurgia',
    }));

    const todas = [...particulares, ...cirurgias].sort((a, b) =>
      (b.data_cirurgia || '').localeCompare(a.data_cirurgia || '')
    );

    return { data: todas, error: null };
  },
};
