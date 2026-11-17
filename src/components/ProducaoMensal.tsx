import React, { useState, useEffect } from 'react';
import {
  Calendar, Plus, DollarSign, User, Building, TrendingUp, FileText,
  BarChart3, Stethoscope, Scissors, Filter, ChevronDown, ChevronUp,
  Search, Users, Trash2,
} from 'lucide-react';
import { dbHelpers } from '../lib/supabase';
import { useAuth } from './Auth/AuthContext';
import {
  ProducaoConvenio, Medico, Convenio, RepasseParticular, Unidade,
  Procedimento, RepasseImagem, Hospital,
} from '../types';
import { ProducaoReport } from './Reports/ProducaoReport';
import { EditProducaoModal } from './Modals/EditProducaoModal';
import { ConfirmDeleteModal } from './Modals/ConfirmDeleteModal';
import { MoneyInput, parseMoney } from './Ui/MoneyInput';

interface ProducaoMensalProps {
  initialTab?: 'convenios' | 'particular' | 'repasse-imagem';
  visibleTabs?: Array<'convenios' | 'particular' | 'repasse-imagem'>;
}

export const ProducaoMensalComponent: React.FC<ProducaoMensalProps> = ({
  initialTab = 'convenios',
  visibleTabs,
}) => {
  const { perfil } = useAuth();
  const isAdmin = perfil?.tipo === 'administrativo';

  const [activeView, setActiveView] = useState<'form' | 'report'>('form');
  const [tab, setTab] = useState<'convenios' | 'particular' | 'repasse-imagem'>(initialTab);

  // --- Convênios ---
  const [producoes, setProducoes] = useState<ProducaoConvenio[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingProducao, setEditingProducao] = useState<ProducaoConvenio | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [selectedMedico, setSelectedMedico] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [selectedTipo, setSelectedTipo] = useState('');
  const [filtroPaciente, setFiltroPaciente] = useState('');
  const [filtroConvenio, setFiltroConvenio] = useState('');

  // --- Cadastros ---
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [hospitais, setHospitais] = useState<Hospital[]>([]);
  const [procedimentos, setProcedimentos] = useState<Procedimento[]>([]);

  // --- Mês ---
  const [selectedMonth, setSelectedMonth] = useState(() =>
    new Date().toISOString().slice(0, 7)
  );
  const [showMonthSelector, setShowMonthSelector] = useState(false);

  // --- Particular ---
  const [particulares, setParticulares] = useState<RepasseParticular[]>([]);
  const [particularLoading, setParticularLoading] = useState(false);
  const [showParticularForm, setShowParticularForm] = useState(false);
  const [editingParticular, setEditingParticular] = useState<RepasseParticular | null>(null);
  const [particularSearch, setParticularSearch] = useState('');
  const [particularMedico, setParticularMedico] = useState('');
  const [particularView, setParticularView] = useState<'form' | 'report'>('form');

  // --- Imagem ---
  const [repassesImagem, setRepassesImagem] = useState<RepasseImagem[]>([]);
  const [repasseImagemLoading, setRepasseImagemLoading] = useState(false);
  const [imagemClinica, setImagemClinica] = useState('');
  const [imagemImposto, setImagemImposto] = useState('6.15');
  const [imagemMedico, setImagemMedico] = useState('');
  const [imagemTotal, setImagemTotal] = useState('');
  const [editingRepasseImagem, setEditingRepasseImagem] = useState<RepasseImagem | null>(null);
  const [imagemMedicoFiltro, setImagemMedicoFiltro] = useState('');
  const [imagemView, setImagemView] = useState<'form' | 'report'>('form');

  // ============================================================
  // Carregamento
  // ============================================================
  useEffect(() => { void loadData(); }, [selectedMonth]);
  useEffect(() => { void loadParticulares(); }, [selectedMonth]);
  useEffect(() => { void loadRepassesImagem(); }, [selectedMonth]);

  const loadData = async () => {
    setLoading(true);
    const [prodRes, medRes, convRes, uniRes, procRes, hospRes] = await Promise.all([
      dbHelpers.getProducaoConveniosByMonth(selectedMonth),
      dbHelpers.getMedicos(),
      dbHelpers.getConvenios(),
      dbHelpers.getUnidades(),
      dbHelpers.getProcedimentos(),
      dbHelpers.getHospitais(),
    ]);
    if (prodRes.data) setProducoes(prodRes.data);
    if (medRes.data) setMedicos(medRes.data);
    if (convRes.data) setConvenios(convRes.data);
    if (uniRes.data) setUnidades(uniRes.data);
    if (procRes.data) setProcedimentos(procRes.data);
    if (hospRes.data) setHospitais(hospRes.data);
    setLoading(false);
  };

  const loadParticulares = async () => {
    setParticularLoading(true);
    const res = await dbHelpers.getRepassesParticularesByMonth(selectedMonth);
    if (res.data) setParticulares(res.data);
    setParticularLoading(false);
  };

  const loadRepassesImagem = async () => {
    setRepasseImagemLoading(true);
    const res = await dbHelpers.getRepassesImagemByMonth(selectedMonth);
    if (res.data) setRepassesImagem(res.data);
    setRepasseImagemLoading(false);
  };

  // ============================================================
  // Helpers
  // ============================================================
  const money = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0);

  const num = (v: string) => (v.includes(',') ? Math.max(0, parseMoney(v)) : Math.max(0, Number(v) || 0));

  const generateMonthOptions = () => {
    const months: { value: string; label: string }[] = [];
    const today = new Date();
    for (let i = -6; i <= 3; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const value = d.toISOString().slice(0, 7);
      const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      months.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
    }
    return months;
  };

  const formatSelectedMonth = (m: string) => {
    const [y, mo] = m.split('-');
    const d = new Date(Number(y), Number(mo) - 1, 1);
    const s = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  const formatDate = (d: string) => {
    if (!d) return '';
    const only = d.split('T')[0];
    const p = only.split('-');
    return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : d;
  };

  // ============================================================
  // Convênios: form + submit
  // ============================================================
  const [formData, setFormData] = useState({
    medico_id: '',
    convenio_id: '',
    nome_paciente: '',
    data_atendimento: '',
    valor: '',
    tipo: 'consulta' as 'consulta' | 'cirurgia',
    month_reference: selectedMonth,
  });

  useEffect(() => {
    setFormData((prev) => ({ ...prev, month_reference: selectedMonth }));
  }, [selectedMonth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.medico_id || !formData.convenio_id) {
      alert('Selecione médico e convênio.');
      return;
    }
    setLoading(true);
    const valor = parseMoney(formData.valor);
    const result = await dbHelpers.createProducaoConvenio({
      medico_id: Number(formData.medico_id),
      convenio_id: Number(formData.convenio_id),
      nome_paciente: formData.nome_paciente.trim(),
      data_atendimento: formData.data_atendimento,
      tipo: formData.tipo,
      valor,
      valor_glosa: 0,
      valor_recebido: valor,
      month_reference: formData.month_reference,
      observacao: null,
    });
    if (result.error) {
      alert('Erro ao salvar: ' + result.error.message);
    } else {
      setFormData({
        medico_id: '', convenio_id: '', nome_paciente: '', data_atendimento: '',
        valor: '', tipo: 'consulta', month_reference: selectedMonth,
      });
      setShowForm(false);
      await loadData();
    }
    setLoading(false);
  };

  const handleEdit = (p: ProducaoConvenio) => setEditingProducao(p);
  const handleDelete = (id: number) => setDeletingId(id);
  const confirmDelete = async () => {
    if (!deletingId) return;
    setDeleteLoading(true);
    const r = await dbHelpers.deleteProducaoConvenio(deletingId);
    if (!r.error) { await loadData(); setDeletingId(null); }
    setDeleteLoading(false);
  };

  const filteredProducoes = producoes.filter((p) => {
    const mMed = !selectedMedico || p.medico_id === Number(selectedMedico);
    const mIni = !dataInicio || p.data_atendimento >= dataInicio;
    const mFim = !dataFim || p.data_atendimento <= dataFim;
    const mTip = !selectedTipo || p.tipo === selectedTipo;
    const mPac = !filtroPaciente || p.nome_paciente.toLowerCase().includes(filtroPaciente.toLowerCase());
    const mConv = !filtroConvenio || p.convenio_id === Number(filtroConvenio);
    return mMed && mIni && mFim && mTip && mPac && mConv;
  });

  const totalPeriodo = filteredProducoes.reduce((s, i) => s + Number(i.valor || 0), 0);
  const cincoPorCento = totalPeriodo * 0.05;

  const limparFiltros = () => {
    setSelectedMedico(''); setDataInicio(''); setDataFim('');
    setSelectedTipo(''); setFiltroPaciente(''); setFiltroConvenio('');
  };
  const hasFilters = selectedMedico || dataInicio || dataFim || selectedTipo || filtroPaciente || filtroConvenio;

  // ============================================================
  // Particular: form + submit
  // ============================================================
  const particularInitial = () => ({
    medico_id: '',
    unidade_id: '',
    nome_paciente: '',
    data_procedimento: '',
    procedimento_id: '',
    procedimento_descricao: '',
    destinatario_tipo: 'socio' as 'socio' | 'terceiro',
    forma_pagamento: 'pix' as 'pix' | 'credito' | 'debito' | 'especie' | 'deposito',
    valor_bruto: '',
    valor_repasse_medico: '',
    check_conferencia: false,
    month_reference: selectedMonth,
  });
  const [particularForm, setParticularForm] = useState(particularInitial());

  const openParticularNew = () => {
    setEditingParticular(null);
    setParticularForm(particularInitial());
    setShowParticularForm(true);
  };

  const openParticularEdit = (item: RepasseParticular) => {
    setEditingParticular(item);
    setParticularForm({
      medico_id: String(item.medico_id),
      unidade_id: item.unidade_id ? String(item.unidade_id) : '',
      nome_paciente: item.nome_paciente,
      data_procedimento: item.data_procedimento,
      procedimento_id: item.procedimento_id ? String(item.procedimento_id) : '',
      procedimento_descricao: item.procedimento_descricao || '',
      destinatario_tipo: item.destinatario_tipo,
      forma_pagamento: item.forma_pagamento,
      valor_bruto: String(item.valor_bruto ?? ''),
      valor_repasse_medico: String(item.valor_repasse_medico ?? ''),
      check_conferencia: item.check_conferencia,
      month_reference: item.month_reference,
    });
    setShowParticularForm(true);
  };

  const saveParticular = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!particularForm.medico_id || !particularForm.nome_paciente || !particularForm.data_procedimento) {
      alert('Preencha médico, paciente e data.');
      return;
    }
    setParticularLoading(true);
    const valorBruto = num(particularForm.valor_bruto);
    const valorRepasse = num(particularForm.valor_repasse_medico);

    const payload = {
      medico_id: Number(particularForm.medico_id),
      unidade_id: particularForm.unidade_id ? Number(particularForm.unidade_id) : null,
      nome_paciente: particularForm.nome_paciente.trim(),
      data_procedimento: particularForm.data_procedimento,
      procedimento_id: particularForm.procedimento_id ? Number(particularForm.procedimento_id) : null,
      procedimento_descricao: particularForm.procedimento_descricao || null,
      destinatario_tipo: particularForm.destinatario_tipo,
      forma_pagamento: particularForm.forma_pagamento,
      is_split_payment: false,
      cash_amount: 0,
      other_payment_method: null,
      installments: 1,
      valor_bruto: valorBruto,
      valor_recebido: valorBruto,
      payment_tax_rate: 0, payment_tax_amount: 0,
      invoice_tax_rate: 0, invoice_tax_amount: 0,
      medication_cost: 0, supplies_cost: 0, other_costs: 0, other_costs_description: null,
      total_deductions: 0,
      valor_liquido: valorBruto,
      valor_repasse_medico: valorRepasse,
      check_conferencia: particularForm.check_conferencia,
      status_pagamento: 'pendente' as const,
      data_pagamento: null,
      month_reference: particularForm.month_reference,
      observacao: null,
    };

    const result = editingParticular
      ? await dbHelpers.updateRepasseParticular(editingParticular.id, payload)
      : await dbHelpers.createRepasseParticular(payload);

    if (result.error) alert('Erro: ' + result.error.message);
    else { setShowParticularForm(false); await loadParticulares(); }
    setParticularLoading(false);
  };

  const deleteParticular = async (id: number) => {
    if (!window.confirm('Excluir este lançamento particular?')) return;
    const r = await dbHelpers.deleteRepasseParticular(id);
    if (r.error) alert('Erro: ' + r.error.message);
    else await loadParticulares();
  };

  const filteredParticulares = particulares.filter((i) => {
    const t = `${i.nome_paciente} ${i.medico?.nome || ''}`.toLowerCase();
    return t.includes(particularSearch.toLowerCase()) &&
      (!particularMedico || String(i.medico_id) === particularMedico);
  });
  const particularTotal = filteredParticulares.reduce((s, i) => s + Number(i.valor_bruto || 0), 0);
  const particularRepasse = filteredParticulares.reduce((s, i) => s + Number(i.valor_repasse_medico || 0), 0);

  // ============================================================
  // Imagem: form + submit (inalterado conceitualmente)
  // ============================================================
  const imagemRowsFiltradas = repassesImagem.filter((i) => {
    const mCli = !imagemClinica || String(i.hospital_id) === imagemClinica;
    const mMed = !imagemMedicoFiltro || String(i.medico_id) === imagemMedicoFiltro;
    return mCli && mMed;
  });

  const kpisImagem = (() => {
    const total = imagemRowsFiltradas.reduce((s, i) => s + Number(i.total || 0), 0);
    const imposto = imagemRowsFiltradas.reduce(
      (s, i) => s + (Number(i.total || 0) * Number(i.imposto_percentual || 0)) / 100, 0
    );
    const sem = total - imposto;
    return { total, imposto, sem, casa: sem / 2, medico: sem / 2 };
  })();

  const resetImagemForm = () => {
    setEditingRepasseImagem(null);
    setImagemMedico('');
    setImagemTotal('');
  };

  const openImagemEdit = (item: RepasseImagem) => {
    setEditingRepasseImagem(item);
    setImagemClinica(String(item.hospital_id));
    setImagemMedico(String(item.medico_id));
    setImagemTotal(String(item.total));
    setImagemImposto(String(item.imposto_percentual));
  };

  const saveImagem = async (e: React.FormEvent) => {
    e.preventDefault();
    const total = num(imagemTotal);
    const imposto = num(imagemImposto);
    if (!imagemClinica || !imagemMedico || total <= 0) {
      alert('Selecione clínica, médico e total > 0.');
      return;
    }
    setRepasseImagemLoading(true);
    const payload = {
      month_reference: selectedMonth,
      hospital_id: Number(imagemClinica),
      medico_id: Number(imagemMedico),
      total,
      imposto_percentual: imposto,
    };
    const r = editingRepasseImagem
      ? await dbHelpers.updateRepasseImagem(editingRepasseImagem.id, payload)
      : await dbHelpers.createRepasseImagem(payload);
    if (r.error) alert('Erro: ' + r.error.message);
    else { resetImagemForm(); await loadRepassesImagem(); }
    setRepasseImagemLoading(false);
  };

  const deleteImagem = async (id: number) => {
    if (!window.confirm('Excluir este lançamento?')) return;
    setRepasseImagemLoading(true);
    const r = await dbHelpers.deleteRepasseImagem(id);
    if (r.error) alert('Erro: ' + r.error.message);
    await loadRepassesImagem();
    setRepasseImagemLoading(false);
  };

  // ============================================================
  // Views
  // ============================================================
  if (activeView === 'report') {
    return (
      <div className="space-y-6">
        <button
          onClick={() => setActiveView('form')}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
        >
          ← Voltar
        </button>
        <ProducaoReport
          onEdit={handleEdit}
          onDelete={handleDelete}
          onNew={() => { setShowForm(true); setActiveView('form'); }}
          selectedMonth={selectedMonth}
        />
        <EditProducaoModal
          producao={editingProducao}
          isOpen={!!editingProducao}
          onClose={() => setEditingProducao(null)}
          onSave={loadData}
        />
        <ConfirmDeleteModal
          isOpen={!!deletingId}
          onClose={() => setDeletingId(null)}
          onConfirm={confirmDelete}
          title="Excluir Produção"
          message="Tem certeza que deseja excluir este registro?"
          loading={deleteLoading}
        />
      </div>
    );
  }

  const showOnlyImagem = tab === 'repasse-imagem';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-gradient-to-r ${showOnlyImagem ? 'from-indigo-500 to-indigo-600' : 'from-green-500 to-green-600'}`}>
            {showOnlyImagem ? <Building className="h-6 w-6 text-white" /> : <TrendingUp className="h-6 w-6 text-white" />}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {showOnlyImagem ? 'Repasse Imagem' : 'Produção Mensal'}
            </h2>
            <div className="relative mt-1">
              <button
                onClick={() => setShowMonthSelector(!showMonthSelector)}
                className="flex items-center gap-2 px-3 py-1 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Calendar className="h-4 w-4 text-gray-600" />
                <span className="font-medium text-gray-700">{formatSelectedMonth(selectedMonth)}</span>
                {showMonthSelector ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {showMonthSelector && (
                <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg z-10 w-48">
                  {generateMonthOptions().map((m) => (
                    <button
                      key={m.value}
                      onClick={() => { setSelectedMonth(m.value); setShowMonthSelector(false); }}
                      className={`w-full text-left px-4 py-2 hover:bg-blue-50 ${m.value === selectedMonth ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-700'}`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {!showOnlyImagem && (
          <div className="flex gap-3">
            <button
              onClick={() => {
                if (tab === 'particular') setParticularView(particularView === 'report' ? 'form' : 'report');
                else setActiveView('report');
              }}
              className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 shadow-lg"
            >
              <BarChart3 size={20} />
              {tab === 'particular' && particularView === 'report' ? 'Voltar aos Lançamentos' : 'Relatório'}
            </button>
            {tab !== 'particular' && (
              <button
                onClick={() => setShowForm(!showForm)}
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 shadow-lg"
              >
                <Plus size={20} /> Nova Consulta
              </button>
            )}
          </div>
        )}

        {showOnlyImagem && (
          <button
            onClick={() => setImagemView(imagemView === 'report' ? 'form' : 'report')}
            className={`px-6 py-3 rounded-lg flex items-center gap-2 shadow-lg text-white ${imagemView === 'report' ? 'bg-gray-600' : 'bg-indigo-600'}`}
          >
            <BarChart3 size={20} />
            {imagemView === 'report' ? 'Voltar aos Lançamentos' : 'Relatório'}
          </button>
        )}
      </div>

      {/* Abas */}
      {(() => {
        const show = visibleTabs ?? ['convenios', 'particular', 'repasse-imagem'];
        if (show.length <= 1) return null;
        return (
          <div className="flex gap-2 border-b border-gray-200">
            {show.includes('convenios') && (
              <button onClick={() => { setTab('convenios'); setImagemView('form'); setParticularView('form'); }}
                className={`px-6 py-3 font-medium border-b-2 -mb-px ${tab === 'convenios' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500'}`}>
                <Building size={18} className="inline mr-2" />Convênios
              </button>
            )}
            {show.includes('particular') && (
              <button onClick={() => { setTab('particular'); setImagemView('form'); }}
                className={`px-6 py-3 font-medium border-b-2 -mb-px ${tab === 'particular' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500'}`}>
                <User size={18} className="inline mr-2" />Particular
              </button>
            )}
            {show.includes('repasse-imagem') && (
              <button onClick={() => { setTab('repasse-imagem'); setParticularView('form'); }}
                className={`px-6 py-3 font-medium border-b-2 -mb-px ${tab === 'repasse-imagem' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500'}`}>
                <Building size={18} className="inline mr-2" />Repasse imagem
              </button>
            )}
          </div>
        );
      })()}

      {/* ============ ABA CONVÊNIOS ============ */}
      {tab === 'convenios' && (
        <>
          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-gray-100 p-2 rounded-lg"><Filter className="h-5 w-5 text-gray-600" /></div>
              <span className="font-semibold text-gray-800">Filtros:</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Médico</label>
                <select value={selectedMedico} onChange={(e) => setSelectedMedico(e.target.value)}
                  className="w-full p-3 border rounded-lg">
                  <option value="">Todos</option>
                  {medicos.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Convênio</label>
                <select value={filtroConvenio} onChange={(e) => setFiltroConvenio(e.target.value)}
                  className="w-full p-3 border rounded-lg">
                  <option value="">Todos</option>
                  {convenios.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
                <select value={selectedTipo} onChange={(e) => setSelectedTipo(e.target.value)}
                  className="w-full p-3 border rounded-lg">
                  <option value="">Todos</option>
                  <option value="consulta">Consulta</option>
                  <option value="cirurgia">Cirurgia</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Paciente</label>
                <div className="relative">
                  <input type="text" value={filtroPaciente} onChange={(e) => setFiltroPaciente(e.target.value)}
                    className="w-full p-3 border rounded-lg pl-10" placeholder="Buscar..." />
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Data Início</label>
                <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)}
                  className="w-full p-3 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Data Fim</label>
                <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)}
                  className="w-full p-3 border rounded-lg" />
              </div>
            </div>
            {hasFilters && (
              <button onClick={limparFiltros}
                className="mt-4 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                Limpar Filtros
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
              <p className="text-green-100 text-sm">Total do Mês</p>
              <p className="text-2xl font-bold">R$ {totalPeriodo.toFixed(2)}</p>
              <p className="text-green-200 text-xs mt-1">{formatSelectedMonth(selectedMonth)}</p>
            </div>
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
              <p className="text-blue-100 text-sm">Total de Consultas</p>
              <p className="text-2xl font-bold">{filteredProducoes.length}</p>
            </div>
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
              <p className="text-purple-100 text-sm">5% do Total</p>
              <p className="text-2xl font-bold">R$ {cincoPorCento.toFixed(2)}</p>
            </div>
          </div>

          {showForm && (
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
              <div className="flex items-center gap-2 mb-6">
                <FileText className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold">Nova Consulta</h3>
              </div>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Mês de Referência *</label>
                  <select value={formData.month_reference}
                    onChange={(e) => setFormData((p) => ({ ...p, month_reference: e.target.value }))}
                    className="w-full p-3 border rounded-lg" required>
                    {generateMonthOptions().map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Médico *</label>
                  <select value={formData.medico_id}
                    onChange={(e) => setFormData((p) => ({ ...p, medico_id: e.target.value }))}
                    className="w-full p-3 border rounded-lg" required>
                    <option value="">Selecione</option>
                    {medicos.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Convênio *</label>
                  <select value={formData.convenio_id}
                    onChange={(e) => setFormData((p) => ({ ...p, convenio_id: e.target.value }))}
                    className="w-full p-3 border rounded-lg" required>
                    <option value="">Selecione</option>
                    {convenios.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tipo *</label>
                  <select value={formData.tipo}
                    onChange={(e) => setFormData((p) => ({ ...p, tipo: e.target.value as 'consulta' | 'cirurgia' }))}
                    className="w-full p-3 border rounded-lg" required>
                    <option value="consulta">Consulta</option>
                    <option value="cirurgia">Cirurgia</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Paciente *</label>
                  <input type="text" value={formData.nome_paciente}
                    onChange={(e) => setFormData((p) => ({ ...p, nome_paciente: e.target.value }))}
                    className="w-full p-3 border rounded-lg" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Data do Atendimento *</label>
                  <input type="date" value={formData.data_atendimento}
                    onChange={(e) => setFormData((p) => ({ ...p, data_atendimento: e.target.value }))}
                    className="w-full p-3 border rounded-lg" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Valor (R$) *</label>
                  <MoneyInput value={formData.valor}
                    onChange={(v) => setFormData((p) => ({ ...p, valor: v }))}
                    className="w-full p-3 border rounded-lg" required />
                </div>
                <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                  <button type="button" onClick={() => setShowForm(false)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
                  <button type="submit" disabled={loading}
                    className="bg-green-600 text-white px-6 py-3 rounded-lg disabled:opacity-50">
                    {loading ? 'Salvando...' : 'Salvar Consulta'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {!showForm && (
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-x-auto">
              <div className="p-6 border-b">
                <h4 className="text-lg font-semibold">
                  Produções de {formatSelectedMonth(selectedMonth)} — {filteredProducoes.length} registro(s)
                </h4>
              </div>
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Médico</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Convênio</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Tipo</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Paciente</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Data</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">Carregando...</td></tr>
                  ) : filteredProducoes.length === 0 ? (
                    <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      Nenhuma produção para {formatSelectedMonth(selectedMonth)}
                    </td></tr>
                  ) : filteredProducoes.slice(0, 10).map((p) => (
                    <tr key={p.id} className="hover:bg-blue-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{p.medico?.nome}</td>
                      <td className="px-6 py-4 text-gray-700">{p.convenio?.nome}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${p.tipo === 'cirurgia' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                          {p.tipo === 'cirurgia' ? <Scissors size={12} className="inline" /> : <Stethoscope size={12} className="inline" />}
                          {' '}{p.tipo}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-700">{p.nome_paciente}</td>
                      <td className="px-6 py-4 text-gray-700">{formatDate(p.data_atendimento)}</td>
                      <td className="px-6 py-4 font-bold text-green-600">R$ {Number(p.valor).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredProducoes.length > 10 && (
                <div className="p-4 text-center border-t">
                  <button onClick={() => setActiveView('report')} className="text-blue-600 hover:text-blue-700 font-medium">
                    Ver todos os {filteredProducoes.length} registros →
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ============ ABA PARTICULAR ============ */}
      {tab === 'particular' && particularView === 'form' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl p-6 text-white shadow-lg">
              <p className="text-emerald-100 text-sm">Valor Recebido</p>
              <p className="text-2xl font-bold">{money(particularTotal)}</p>
              <p className="text-emerald-200 text-xs mt-1">{formatSelectedMonth(selectedMonth)}</p>
            </div>
            <div className="bg-gradient-to-r from-teal-500 to-teal-600 rounded-xl p-6 text-white shadow-lg">
              <p className="text-teal-100 text-sm">Valor de Repasse</p>
              <p className="text-2xl font-bold">{money(particularRepasse)}</p>
              <p className="text-teal-200 text-xs mt-1">{filteredParticulares.length} lançamentos</p>
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={openParticularNew}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 shadow-lg">
              <Plus size={20} /> Novo Lançamento
            </button>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <input type="text" value={particularSearch}
                  onChange={(e) => setParticularSearch(e.target.value)}
                  className="w-full p-3 border rounded-lg pl-10" placeholder="Buscar paciente ou médico..." />
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
              <select value={particularMedico} onChange={(e) => setParticularMedico(e.target.value)}
                className="p-3 border rounded-lg">
                <option value="">Todos os médicos</option>
                {medicos.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
              </select>
            </div>
          </div>

          {showParticularForm && (
            <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto p-4 pt-10"
              onClick={() => setShowParticularForm(false)}>
              <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full p-6"
                onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold">
                    {editingParticular ? 'Editar Lançamento Particular' : 'Novo Lançamento Particular'}
                  </h3>
                  <button onClick={() => setShowParticularForm(false)} className="text-gray-400 text-2xl">&times;</button>
                </div>
                <form onSubmit={saveParticular} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Mês *</label>
                    <select value={particularForm.month_reference}
                      onChange={(e) => setParticularForm((p) => ({ ...p, month_reference: e.target.value }))}
                      className="w-full p-3 border rounded-lg" required>
                      {generateMonthOptions().map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Unidade</label>
                    <select value={particularForm.unidade_id}
                      onChange={(e) => setParticularForm((p) => ({ ...p, unidade_id: e.target.value }))}
                      className="w-full p-3 border rounded-lg">
                      <option value="">Selecione</option>
                      {unidades.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Médico *</label>
                    <select value={particularForm.medico_id}
                      onChange={(e) => setParticularForm((p) => ({ ...p, medico_id: e.target.value }))}
                      className="w-full p-3 border rounded-lg" required>
                      <option value="">Selecione</option>
                      {medicos.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Vínculo</label>
                    <select value={particularForm.destinatario_tipo}
                      onChange={(e) => setParticularForm((p) => ({ ...p, destinatario_tipo: e.target.value as 'socio' | 'terceiro' }))}
                      className="w-full p-3 border rounded-lg">
                      <option value="socio">Sócio</option>
                      <option value="terceiro">Externo</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Paciente *</label>
                    <input type="text" value={particularForm.nome_paciente}
                      onChange={(e) => setParticularForm((p) => ({ ...p, nome_paciente: e.target.value }))}
                      className="w-full p-3 border rounded-lg" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Data *</label>
                    <input type="date" value={particularForm.data_procedimento}
                      onChange={(e) => setParticularForm((p) => ({ ...p, data_procedimento: e.target.value }))}
                      className="w-full p-3 border rounded-lg" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Procedimento</label>
                    <select value={particularForm.procedimento_id}
                      onChange={(e) => setParticularForm((p) => ({ ...p, procedimento_id: e.target.value }))}
                      className="w-full p-3 border rounded-lg">
                      <option value="">Selecione</option>
                      {procedimentos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Forma de Pagamento</label>
                    <select value={particularForm.forma_pagamento}
                      onChange={(e) => setParticularForm((p) => ({ ...p, forma_pagamento: e.target.value as any }))}
                      className="w-full p-3 border rounded-lg">
                      <option value="pix">Pix</option>
                      <option value="credito">Crédito</option>
                      <option value="debito">Débito</option>
                      <option value="especie">Espécie</option>
                      <option value="deposito">Depósito</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Valor Recebido *</label>
                    <MoneyInput value={particularForm.valor_bruto}
                      onChange={(v) => setParticularForm((p) => ({ ...p, valor_bruto: v }))}
                      className="w-full p-3 border rounded-lg" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Valor de Repasse</label>
                    <MoneyInput value={particularForm.valor_repasse_medico}
                      onChange={(v) => setParticularForm((p) => ({ ...p, valor_repasse_medico: v }))}
                      className="w-full p-3 border rounded-lg" />
                  </div>
                  <div className="md:col-span-2 flex items-center gap-3">
                    <input type="checkbox" checked={particularForm.check_conferencia}
                      disabled={!isAdmin}
                      onChange={(e) => setParticularForm((p) => ({ ...p, check_conferencia: e.target.checked }))}
                      className="h-5 w-5" />
                    <label className="text-sm font-medium text-gray-700">
                      Conferido {!isAdmin && '(apenas admin)'}
                    </label>
                  </div>
                  <div className="md:col-span-2 flex justify-end gap-3">
                    <button type="button" onClick={() => setShowParticularForm(false)}
                      className="px-6 py-3 text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
                    <button type="submit" disabled={particularLoading}
                      className="px-6 py-3 bg-emerald-600 text-white rounded-lg disabled:opacity-50">
                      {particularLoading ? 'Salvando...' : editingParticular ? 'Salvar Alterações' : 'Salvar Lançamento'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Unidade', 'Data', 'Médico', 'Vínculo', 'Paciente', 'Procedimento', 'Pagto', 'Recebido', 'Repasse', 'Check', 'Ações'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {particularLoading ? (
                  <tr><td colSpan={11} className="px-4 py-8 text-center text-gray-500">Carregando...</td></tr>
                ) : filteredParticulares.length === 0 ? (
                  <tr><td colSpan={11} className="px-4 py-8 text-center text-gray-500">Nenhum lançamento encontrado.</td></tr>
                ) : filteredParticulares.map((item) => {
                  const un = unidades.find((u) => u.id === item.unidade_id)?.nome || '-';
                  const proc = item.procedimento?.nome || item.procedimento_descricao || '-';
                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">{un}</td>
                      <td className="px-4 py-3 text-sm">{formatDate(item.data_procedimento)}</td>
                      <td className="px-4 py-3 text-sm font-medium">{item.medico?.nome || '-'}</td>
                      <td className="px-4 py-3 text-sm">{item.destinatario_tipo === 'terceiro' ? 'Externo' : 'Sócio'}</td>
                      <td className="px-4 py-3 text-sm">{item.nome_paciente}</td>
                      <td className="px-4 py-3 text-sm">{proc}</td>
                      <td className="px-4 py-3 text-sm">{item.forma_pagamento}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium">{money(item.valor_bruto)}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-teal-700">{money(item.valor_repasse_medico)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center justify-center w-5 h-5 rounded ${item.check_conferencia ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
                          {item.check_conferencia ? '✓' : ''}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex gap-1 justify-center">
                          <button onClick={() => openParticularEdit(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded">
                            <FileText className="h-4 w-4" />
                          </button>
                          <button onClick={() => deleteParticular(item.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {filteredParticulares.length > 0 && (
                <tfoot className="bg-gray-50 border-t">
                  <tr>
                    <td colSpan={7} className="px-4 py-3 text-sm text-right font-medium">Totais:</td>
                    <td className="px-4 py-3 text-sm text-right font-bold">{money(particularTotal)}</td>
                    <td className="px-4 py-3 text-sm text-right font-bold text-teal-700">{money(particularRepasse)}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </>
      )}

      {/* ============ ABA PARTICULAR: RELATÓRIO ============ */}
      {tab === 'particular' && particularView === 'report' && (
        <ParticularReport
          particulares={particulares}
          medicos={medicos}
          unidades={unidades}
          selectedMonth={selectedMonth}
          formatSelectedMonth={formatSelectedMonth}
          formatDate={formatDate}
          money={money}
        />
      )}

      {/* ============ ABA REPASSE IMAGEM ============ */}
      {tab === 'repasse-imagem' && imagemView === 'form' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium mb-2">Clínica</label>
                <select value={imagemClinica} onChange={(e) => setImagemClinica(e.target.value)}
                  className="w-full p-3 border rounded-lg">
                  <option value="">Todas</option>
                  {hospitais.map((h) => <option key={h.id} value={h.id}>{h.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Médico</label>
                <select value={imagemMedicoFiltro} onChange={(e) => setImagemMedicoFiltro(e.target.value)}
                  className="w-full p-3 border rounded-lg">
                  <option value="">Todos</option>
                  {medicos.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Imposto (%)</label>
                <input type="number" min="0" max="100" step="0.01" value={imagemImposto}
                  onChange={(e) => setImagemImposto(e.target.value)}
                  className="w-full p-3 border rounded-lg" />
              </div>
              <div className="bg-indigo-50 rounded-lg px-5 py-3">
                <p className="text-xs font-medium text-indigo-600">Total filtrado</p>
                <p className="text-xl font-bold text-indigo-800">{money(kpisImagem.total)}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl p-6 text-white shadow-lg">
              <p className="text-indigo-100 text-sm">Total Recebido</p>
              <p className="text-2xl font-bold">{money(kpisImagem.total)}</p>
            </div>
            <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-xl p-6 text-white shadow-lg">
              <p className="text-red-100 text-sm">Imposto</p>
              <p className="text-2xl font-bold">{money(kpisImagem.imposto)}</p>
            </div>
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
              <p className="text-blue-100 text-sm">Ficou na Casa (50%)</p>
              <p className="text-2xl font-bold">{money(kpisImagem.casa)}</p>
            </div>
            <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl p-6 text-white shadow-lg">
              <p className="text-emerald-100 text-sm">Para Médicos (50%)</p>
              <p className="text-2xl font-bold">{money(kpisImagem.medico)}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <form onSubmit={saveImagem} className="grid grid-cols-1 md:grid-cols-[1fr_220px_auto] gap-4 items-end">
              <div>
                <label className="block text-sm font-medium mb-2">Médico</label>
                <select value={imagemMedico} onChange={(e) => setImagemMedico(e.target.value)}
                  className="w-full p-3 border rounded-lg" required>
                  <option value="">Selecione</option>
                  {medicos.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Total</label>
                <MoneyInput value={imagemTotal} onChange={setImagemTotal}
                  className="w-full p-3 border rounded-lg" required />
              </div>
              <button type="submit" disabled={repasseImagemLoading || !imagemClinica}
                className="px-5 py-3 bg-indigo-600 text-white rounded-lg disabled:opacity-50">
                {editingRepasseImagem ? 'Salvar' : 'Adicionar'}
              </button>
            </form>
          </div>

          <div className="bg-white rounded-xl shadow-lg overflow-x-auto">
            <table className="w-full min-w-[980px]">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th colSpan={2} className="px-4 py-3 text-left text-sm font-semibold">MÉDICO</th>
                  <th colSpan={2} className="px-4 py-3 text-right text-sm font-semibold">TOTAL</th>
                  <th colSpan={2} className="px-4 py-3 text-right text-sm font-semibold">
                    IMPOSTO {Number(imagemImposto).toFixed(2).replace('.', ',')} %
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">S/ IMPOSTO</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">CASA 50%</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">REPASSE 50%</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">AÇÕES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {repasseImagemLoading ? (
                  <tr><td colSpan={11} className="px-6 py-10 text-center text-gray-500">Carregando...</td></tr>
                ) : !imagemClinica && !imagemMedicoFiltro ? (
                  <tr><td colSpan={11} className="px-6 py-10 text-center text-gray-500">
                    Selecione uma clínica ou médico.
                  </td></tr>
                ) : imagemRowsFiltradas.length === 0 ? (
                  <tr><td colSpan={11} className="px-6 py-10 text-center text-gray-500">Nenhum lançamento.</td></tr>
                ) : imagemRowsFiltradas.map((item) => {
                  const t = Number(item.total || 0);
                  const imp = (t * Number(item.imposto_percentual || 0)) / 100;
                  const sem = t - imp;
                  return (
                    <tr key={item.id} className="hover:bg-indigo-50">
                      <td colSpan={2} className="px-4 py-3 text-sm font-medium">{item.medico?.nome || '-'}</td>
                      <td colSpan={2} className="px-4 py-3 text-sm text-right">{money(t)}</td>
                      <td colSpan={2} className="px-4 py-3 text-sm text-right text-red-600">{money(imp)}</td>
                      <td className="px-4 py-3 text-sm text-right">{money(sem)}</td>
                      <td className="px-4 py-3 text-sm text-right text-blue-700">{money(sem / 2)}</td>
                      <td className="px-4 py-3 text-sm text-right text-emerald-700">{money(sem / 2)}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex gap-1 justify-center">
                          <button onClick={() => openImagemEdit(item)} className="px-2 py-1 text-indigo-600 hover:bg-indigo-50 rounded text-xs">Editar</button>
                          <button onClick={() => deleteImagem(item.id)} className="px-2 py-1 text-red-600 hover:bg-red-50 rounded text-xs">Excluir</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {imagemRowsFiltradas.length > 0 && (
                <tfoot className="bg-gray-50 border-t">
                  <tr>
                    <td colSpan={2} className="px-4 py-3 text-sm font-bold">Total</td>
                    <td colSpan={2} className="px-4 py-3 text-sm text-right font-bold">{money(kpisImagem.total)}</td>
                    <td colSpan={2} className="px-4 py-3 text-sm text-right font-bold text-red-600">{money(kpisImagem.imposto)}</td>
                    <td className="px-4 py-3 text-sm text-right font-bold">{money(kpisImagem.sem)}</td>
                    <td className="px-4 py-3 text-sm text-right font-bold text-blue-700">{money(kpisImagem.casa)}</td>
                    <td className="px-4 py-3 text-sm text-right font-bold text-emerald-700">{money(kpisImagem.medico)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* ============ ABA REPASSE IMAGEM: RELATÓRIO ============ */}
      {tab === 'repasse-imagem' && imagemView === 'report' && (
        <RepasseImagemReport
          repasses={repassesImagem}
          medicos={medicos}
          hospitais={hospitais}
          selectedMonth={selectedMonth}
          formatSelectedMonth={formatSelectedMonth}
          money={money}
        />
      )}

      <EditProducaoModal
        producao={editingProducao}
        isOpen={!!editingProducao}
        onClose={() => setEditingProducao(null)}
        onSave={loadData}
      />
      <ConfirmDeleteModal
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={confirmDelete}
        title="Excluir Produção"
        message="Tem certeza que deseja excluir este registro?"
        loading={deleteLoading}
      />
    </div>
  );
};

/* ============================================================
 * Relatório de Repasse Imagem (inalterado)
 * ============================================================ */
interface RepasseImagemReportProps {
  repasses: RepasseImagem[];
  medicos: Medico[];
  hospitais: Hospital[];
  selectedMonth: string;
  formatSelectedMonth: (m: string) => string;
  money: (v: number) => string;
}

const RepasseImagemReport: React.FC<RepasseImagemReportProps> = ({
  repasses, medicos, hospitais, selectedMonth, formatSelectedMonth, money,
}) => {
  const [filtroMedico, setFiltroMedico] = useState('');
  const [filtroClinica, setFiltroClinica] = useState('');

  const rows = repasses.filter((i) => {
    const mM = !filtroMedico || String(i.medico_id) === filtroMedico;
    const mC = !filtroClinica || String(i.hospital_id) === filtroClinica;
    return mM && mC;
  });

  const total = rows.reduce((s, i) => s + Number(i.total || 0), 0);
  const imposto = rows.reduce((s, i) => s + (Number(i.total || 0) * Number(i.imposto_percentual || 0)) / 100, 0);
  const sem = total - imposto;

  const grupos = medicos.map((m) => {
    const linhas = rows.filter((r) => r.medico_id === m.id);
    if (linhas.length === 0) return null;
    const t = linhas.reduce((s, r) => s + Number(r.total || 0), 0);
    const i = linhas.reduce((s, r) => s + (Number(r.total || 0) * Number(r.imposto_percentual || 0)) / 100, 0);
    return { medico: m, linhas, total: t, imposto: i, sem: t - i, casa: (t - i) / 2, repasse: (t - i) / 2 };
  }).filter(Boolean) as any[];

  const hospitalNome = (id: number) => hospitais.find((h) => h.id === id)?.nome || '-';

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5 text-indigo-600" />
          <span className="font-semibold">Filtros</span>
          <span className="text-sm text-gray-500 ml-auto">{formatSelectedMonth(selectedMonth)}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <select value={filtroMedico} onChange={(e) => setFiltroMedico(e.target.value)} className="p-3 border rounded-lg">
            <option value="">Todos os médicos</option>
            {medicos.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
          </select>
          <select value={filtroClinica} onChange={(e) => setFiltroClinica(e.target.value)} className="p-3 border rounded-lg">
            <option value="">Todas as clínicas</option>
            {hospitais.map((h) => <option key={h.id} value={h.id}>{h.nome}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl p-6 text-white shadow-lg">
          <p className="text-sm">Total Recebido</p>
          <p className="text-2xl font-bold">{money(total)}</p>
        </div>
        <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-xl p-6 text-white shadow-lg">
          <p className="text-sm">Imposto</p>
          <p className="text-2xl font-bold">{money(imposto)}</p>
        </div>
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
          <p className="text-sm">Ficou na Casa</p>
          <p className="text-2xl font-bold">{money(sem / 2)}</p>
        </div>
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl p-6 text-white shadow-lg">
          <p className="text-sm">Para Médicos</p>
          <p className="text-2xl font-bold">{money(sem / 2)}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-x-auto">
        <table className="w-full min-w-[980px]">
          <thead>
            <tr className="bg-gray-50 border-b">
              {['Médico','Clínica','Total','Imposto (%)','Valor Imposto','S/ Imposto','Casa 50%','Médico 50%'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-sm font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {grupos.map((g) => (
              <React.Fragment key={g.medico.id}>
                <tr className="bg-indigo-50/60">
                  <td colSpan={2} className="px-4 py-2 text-sm font-bold text-indigo-800">{g.medico.nome}</td>
                  <td className="px-4 py-2 text-sm text-right font-bold">{money(g.total)}</td>
                  <td></td>
                  <td className="px-4 py-2 text-sm text-right font-bold text-red-600">{money(g.imposto)}</td>
                  <td className="px-4 py-2 text-sm text-right font-bold">{money(g.sem)}</td>
                  <td className="px-4 py-2 text-sm text-right font-bold text-blue-700">{money(g.casa)}</td>
                  <td className="px-4 py-2 text-sm text-right font-bold text-emerald-700">{money(g.repasse)}</td>
                </tr>
                {g.linhas.map((l: RepasseImagem) => {
                  const t = Number(l.total || 0);
                  const p = Number(l.imposto_percentual || 0);
                  const imp = (t * p) / 100;
                  const s = t - imp;
                  return (
                    <tr key={l.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">{l.medico?.nome || g.medico.nome}</td>
                      <td className="px-4 py-3 text-sm">{hospitalNome(l.hospital_id)}</td>
                      <td className="px-4 py-3 text-sm text-right">{money(t)}</td>
                      <td className="px-4 py-3 text-sm text-right">{p.toFixed(2).replace('.', ',')} %</td>
                      <td className="px-4 py-3 text-sm text-right text-red-600">{money(imp)}</td>
                      <td className="px-4 py-3 text-sm text-right">{money(s)}</td>
                      <td className="px-4 py-3 text-sm text-right text-blue-700">{money(s / 2)}</td>
                      <td className="px-4 py-3 text-sm text-right text-emerald-700">{money(s / 2)}</td>
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
          <tfoot className="bg-gray-50 border-t-2">
            <tr>
              <td colSpan={2} className="px-4 py-3 text-sm font-bold">TOTAL GERAL</td>
              <td className="px-4 py-3 text-sm text-right font-bold">{money(total)}</td>
              <td></td>
              <td className="px-4 py-3 text-sm text-right font-bold text-red-600">{money(imposto)}</td>
              <td className="px-4 py-3 text-sm text-right font-bold">{money(sem)}</td>
              <td className="px-4 py-3 text-sm text-right font-bold text-blue-700">{money(sem / 2)}</td>
              <td className="px-4 py-3 text-sm text-right font-bold text-emerald-700">{money(sem / 2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

/* ============================================================
 * Relatório Particular
 * ============================================================ */
interface ParticularReportProps {
  particulares: RepasseParticular[];
  medicos: Medico[];
  unidades: Unidade[];
  selectedMonth: string;
  formatSelectedMonth: (m: string) => string;
  formatDate: (d: string) => string;
  money: (v: number) => string;
}

const ParticularReport: React.FC<ParticularReportProps> = ({
  particulares, medicos, unidades, selectedMonth, formatSelectedMonth, formatDate, money,
}) => {
  const [filtroMedico, setFiltroMedico] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const iso = (d: string) => (d ? d.split('T')[0] : '');
  const rows = particulares.filter((i) => {
    const mM = !filtroMedico || String(i.medico_id) === filtroMedico;
    const ini = iso(i.data_procedimento);
    return mM && (!dataInicio || ini >= dataInicio) && (!dataFim || ini <= dataFim);
  });

  const totalRecebido = rows.reduce((s, i) => s + Number(i.valor_bruto || 0), 0);
  const totalRepasse = rows.reduce((s, i) => s + Number(i.valor_repasse_medico || 0), 0);
  const liquido = totalRecebido - totalRepasse;

  const grupos = medicos.map((m) => {
    const linhas = rows.filter((r) => r.medico_id === m.id);
    if (linhas.length === 0) return null;
    const rec = linhas.reduce((s, r) => s + Number(r.valor_bruto || 0), 0);
    const rep = linhas.reduce((s, r) => s + Number(r.valor_repasse_medico || 0), 0);
    return { medico: m, linhas, recebido: rec, repasse: rep, liquido: rec - rep, qtd: linhas.length };
  }).filter(Boolean) as any[];

  const unNome = (id?: number | null) => (id ? unidades.find((u) => u.id === id)?.nome || '-' : '-');

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5 text-emerald-600" />
          <span className="font-semibold">Filtros</span>
          <span className="text-sm text-gray-500 ml-auto">{formatSelectedMonth(selectedMonth)}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <select value={filtroMedico} onChange={(e) => setFiltroMedico(e.target.value)} className="p-3 border rounded-lg">
            <option value="">Todos os médicos</option>
            {medicos.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
          </select>
          <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="p-3 border rounded-lg" />
          <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="p-3 border rounded-lg" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl p-6 text-white shadow-lg">
          <p className="text-sm">Valor Recebido</p>
          <p className="text-2xl font-bold">{money(totalRecebido)}</p>
        </div>
        <div className="bg-gradient-to-r from-teal-500 to-teal-600 rounded-xl p-6 text-white shadow-lg">
          <p className="text-sm">Repasse Médico</p>
          <p className="text-2xl font-bold">{money(totalRepasse)}</p>
        </div>
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
          <p className="text-sm">Líquido da Casa</p>
          <p className="text-2xl font-bold">{money(liquido)}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-x-auto">
        <table className="w-full min-w-[1080px]">
          <thead>
            <tr className="bg-gray-50 border-b">
              {['Médico','Unidade','Data','Paciente','Procedimento','Recebido','Repasse','Líquido'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-sm font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {grupos.map((g) => (
              <React.Fragment key={g.medico.id}>
                <tr className="bg-emerald-50/60">
                  <td colSpan={5} className="px-4 py-2 text-sm font-bold text-emerald-800">
                    {g.medico.nome} — {g.qtd} lançamento(s)
                  </td>
                  <td className="px-4 py-2 text-sm text-right font-bold">{money(g.recebido)}</td>
                  <td className="px-4 py-2 text-sm text-right font-bold text-teal-700">{money(g.repasse)}</td>
                  <td className="px-4 py-2 text-sm text-right font-bold text-blue-700">{money(g.liquido)}</td>
                </tr>
                {g.linhas.map((l: RepasseParticular) => {
                  const rec = Number(l.valor_bruto || 0);
                  const rep = Number(l.valor_repasse_medico || 0);
                  return (
                    <tr key={l.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">{l.medico?.nome || g.medico.nome}</td>
                      <td className="px-4 py-3 text-sm">{unNome(l.unidade_id)}</td>
                      <td className="px-4 py-3 text-sm">{formatDate(l.data_procedimento)}</td>
                      <td className="px-4 py-3 text-sm">{l.nome_paciente}</td>
                      <td className="px-4 py-3 text-sm">{l.procedimento?.nome || l.procedimento_descricao || '-'}</td>
                      <td className="px-4 py-3 text-sm text-right">{money(rec)}</td>
                      <td className="px-4 py-3 text-sm text-right text-teal-700">{money(rep)}</td>
                      <td className="px-4 py-3 text-sm text-right text-blue-700">{money(rec - rep)}</td>
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
          <tfoot className="bg-gray-50 border-t-2">
            <tr>
              <td colSpan={5} className="px-4 py-3 text-sm font-bold">TOTAL GERAL</td>
              <td className="px-4 py-3 text-sm text-right font-bold">{money(totalRecebido)}</td>
              <td className="px-4 py-3 text-sm text-right font-bold text-teal-700">{money(totalRepasse)}</td>
              <td className="px-4 py-3 text-sm text-right font-bold text-blue-700">{money(liquido)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
