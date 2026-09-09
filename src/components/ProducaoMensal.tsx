import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Plus,
  DollarSign,
  User,
  Building,
  TrendingUp,
  FileText,
  BarChart3,
  Stethoscope,
  Scissors,
  Filter,
  ChevronDown,
  ChevronUp,
  Search,
  Users,
  Trash2
} from 'lucide-react';
import { dbHelpers } from '../lib/supabase';
import { ProducaoMensal, Medico, Convenio, Repasse } from '../types';
import { ProducaoReport } from './Reports/ProducaoReport';
import { EditProducaoModal } from './Modals/EditProducaoModal';
import { ConfirmDeleteModal } from './Modals/ConfirmDeleteModal';

export const ProducaoMensalComponent: React.FC = () => {
  const [activeView, setActiveView] = useState<'form' | 'report'>('form');
  const [tab, setTab] = useState<'convenios' | 'particular'>('convenios');
  const [producoes, setProducoes] = useState<ProducaoMensal[]>([]);
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingProducao, setEditingProducao] = useState<ProducaoMensal | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [selectedMedico, setSelectedMedico] = useState<string>('');
  const [dataInicio, setDataInicio] = useState<string>('');
  const [dataFim, setDataFim] = useState<string>('');
  const [selectedTipo, setSelectedTipo] = useState<string>('');
  
  // NOVOS ESTADOS: Filtros por paciente e convênio
  const [filtroPaciente, setFiltroPaciente] = useState<string>('');
  const [filtroConvenio, setFiltroConvenio] = useState<string>('');
  
  // NOVO ESTADO: Mês de Referência
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().slice(0, 7); // 'YYYY-MM'
  });
  const [showMonthSelector, setShowMonthSelector] = useState(false);

  // === ESTADOS PARTICULAR ===
  const [particulares, setParticulares] = useState<Repasse[]>([]);
  const [particularLoading, setParticularLoading] = useState(false);
  const [showParticularForm, setShowParticularForm] = useState(false);
  const [editingParticular, setEditingParticular] = useState<Repasse | null>(null);
  const [particularSearch, setParticularSearch] = useState('');
  const [particularMedico, setParticularMedico] = useState('');

  // Carregar dados quando o mês selecionado mudar
  useEffect(() => {
    loadData();
    loadParticulares();
  }, [selectedMonth]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [producaoRes, medicosRes, conveniosRes] = await Promise.all([
        dbHelpers.getProducaoMensalByMonth(selectedMonth),
        dbHelpers.getMedicos(),
        dbHelpers.getConvenios()
      ]);

      if (producaoRes.data) setProducoes(producaoRes.data);
      if (medicosRes.data) setMedicos(medicosRes.data);
      if (conveniosRes.data) setConvenios(conveniosRes.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
    setLoading(false);
  };

  // === PARTICULAR: carregar, salvar, excluir ===
  const loadParticulares = async () => {
    setParticularLoading(true);
    try {
      const res = await dbHelpers.getRepassesParticularByMonth(selectedMonth);
      if (res.data) setParticulares(res.data as Repasse[]);
    } catch (error) {
      console.error('Erro ao carregar particulares:', error);
    }
    setParticularLoading(false);
  };

  const particularFormInitial = () => ({
    unidade: '',
    medico_id: '',
    nome_paciente: '',
    data_cirurgia: '',
    vinculo: 'socio' as 'externo' | 'socio',
    tipo_procedimento: '',
    forma_pagamento: 'pix' as 'pix' | 'credito' | 'debito' | 'especie',
    valor: '',
    valor_repasse: '',
    check_conferencia: false,
    month_reference: selectedMonth,
  });
  const [particularForm, setParticularForm] = useState(particularFormInitial());

  const openParticularNew = () => {
    setEditingParticular(null);
    setParticularForm(particularFormInitial());
    setShowParticularForm(true);
  };

  const openParticularEdit = (item: Repasse) => {
    setEditingParticular(item);
    setParticularForm({
      unidade: item.unidade || '',
      medico_id: String(item.medico_id),
      nome_paciente: item.nome_paciente,
      data_cirurgia: item.data_cirurgia,
      vinculo: (item.vinculo || 'socio') as 'externo' | 'socio',
      tipo_procedimento: item.tipo_procedimento || '',
      forma_pagamento: (item.forma_pagamento || 'pix') as 'pix' | 'credito' | 'debito' | 'especie',
      valor: String(item.valor || 0),
      valor_repasse: String(item.valor_repasse || 0),
      check_conferencia: item.check_conferencia || false,
      month_reference: item.month_reference || selectedMonth,
    });
    setShowParticularForm(true);
  };

  const num = (v: string) => Math.max(0, Number(v.replace(',', '.')) || 0);

  const saveParticular = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!particularForm.medico_id || !particularForm.nome_paciente || !particularForm.data_cirurgia) {
      alert('Preencha os campos obrigatórios: médico, paciente e data.');
      return;
    }
    setParticularLoading(true);
    const valor = num(particularForm.valor);
    const valorRepasse = num(particularForm.valor_repasse);
    const payload = {
      medico_id: Number(particularForm.medico_id),
      hospital_id: null,
      nome_paciente: particularForm.nome_paciente.trim(),
      data_cirurgia: particularForm.data_cirurgia,
      tipo: 'consulta' as const,
      is_particular: true,
      tipo_procedimento_detalhado: 'cirurgia_particular' as const,
      tipo_procedimento: particularForm.tipo_procedimento.trim() || null,
      forma_pagamento: particularForm.forma_pagamento,
      quantidade: 1,
      valor: valor,
      valor_repasse: valorRepasse,
      check_conferencia: particularForm.check_conferencia,
      unidade: particularForm.unidade.trim() || null,
      vinculo: particularForm.vinculo,
      desconto_paciente: 0,
      desconto_cartao: 0,
      valor_glosa: 0,
      valor_recebido: valor,
      destinatario_tipo: particularForm.vinculo === 'externo' ? 'terceiro' as const : 'socio' as const,
      auxilio_1: 0, auxilio_2: 0, taxa_1_5: 0, imposto_percentual: 0, outras_deducoes: 0,
      valor_liquido: valor, percentual_terceiro: 0, valor_terceiro: 0, saldo_controle: 0,
      month_reference: particularForm.month_reference,
      observacao: null,
      status_pagamento: 'pendente' as const,
      data_pagamento: null,
    };
    const result = editingParticular
      ? await dbHelpers.updateRepasse(editingParticular.id, payload)
      : await dbHelpers.createRepasse(payload);
    if (result.error) {
      alert('Erro ao salvar: ' + result.error.message);
    } else {
      setShowParticularForm(false);
      await loadParticulares();
    }
    setParticularLoading(false);
  };

  const deleteParticular = async (id: number) => {
    if (!window.confirm('Excluir este lançamento particular?')) return;
    const result = await dbHelpers.deleteRepasse(id);
    if (result.error) {
      alert('Erro ao excluir: ' + result.error.message);
    } else {
      await loadParticulares();
    }
  };

  const filteredParticulares = particulares.filter((item) => {
    const text = `${item.nome_paciente} ${item.medico?.nome || ''}`.toLowerCase();
    return text.includes(particularSearch.toLowerCase()) && (!particularMedico || String(item.medico_id) === particularMedico);
  });

  const particularTotal = filteredParticulares.reduce((sum, item) => sum + Number(item.valor || 0), 0);
  const particularRepasse = filteredParticulares.reduce((sum, item) => sum + Number(item.valor_repasse || 0), 0);
  const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);

  // Função para gerar opções de meses
  const generateMonthOptions = () => {
    const months = [];
    const today = new Date();
    
    // Últimos 6 meses e próximos 3 meses
    for (let i = -6; i <= 3; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const value = date.toISOString().slice(0, 7);
      const label = date.toLocaleDateString('pt-BR', { 
        month: 'long', 
        year: 'numeric' 
      });
      
      months.push({ 
        value, 
        label: label.charAt(0).toUpperCase() + label.slice(1) 
      });
    }
    
    return months;
  };

  // Função para formatar o mês selecionado para exibição
  const formatSelectedMonth = (month: string) => {
    const [year, monthNum] = month.split('-');
    const date = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
    return date.toLocaleDateString('pt-BR', { 
      month: 'long', 
      year: 'numeric' 
    });
  };

  // Restante das funções permanecem iguais...
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    
    try {
      const dateOnly = dateString.split('T')[0];
      if (dateOnly.includes('-')) {
        const parts = dateOnly.split('-');
        if (parts.length === 3) {
          const [year, month, day] = parts;
          return `${day}/${month}/${year}`;
        }
      }
      return dateString;
    } catch (error) {
      console.error('Erro ao formatar data:', error);
      return dateString;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.medico_id) {
      alert('Por favor, selecione um médico');
      return;
    }
    
    if (!formData.convenio_id) {
      alert('Por favor, selecione um convênio');
      return;
    }

    setLoading(true);

    try {
      // MODIFICADO: Incluir month_reference no objeto de criação
      const result = await dbHelpers.createProducaoMensal({
        medico_id: parseInt(formData.medico_id),
        convenio_id: parseInt(formData.convenio_id),
        nome_paciente: formData.nome_paciente,
        data_consulta: formData.data_consulta,
        valor: parseFloat(formData.valor),
        tipo: formData.tipo,
        month_reference: formData.month_reference // Novo campo
      });

      if (result.error) {
        console.error('Erro:', result.error);
        alert('Erro ao salvar: ' + result.error.message);
      } else {
        setFormData({
          medico_id: '',
          convenio_id: '',
          nome_paciente: '',
          data_consulta: '',
          valor: '',
          tipo: 'consulta',
          month_reference: selectedMonth // Reset para o mês atual
        });
        setShowForm(false);
        loadData();
      }
    } catch (error) {
      console.error('Erro ao salvar produção:', error);
      alert('Erro ao salvar produção');
    }

    setLoading(false);
  };

  // Estado do formulário atualizado com month_reference
  const [formData, setFormData] = useState({
    medico_id: '',
    convenio_id: '',
    nome_paciente: '',
    data_consulta: '',
    valor: '',
    tipo: 'consulta' as 'consulta' | 'cirurgia',
    month_reference: selectedMonth // Inicializar com o mês selecionado
  });

  // Atualizar formData quando selectedMonth mudar
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      month_reference: selectedMonth
    }));
  }, [selectedMonth]);

  // Restante das funções permanecem iguais...
  const handleEdit = (producao: ProducaoMensal) => {
    setEditingProducao(producao);
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;

    setDeleteLoading(true);
    try {
      const result = await dbHelpers.deleteProducaoMensal(deletingId);
      if (!result.error) {
        loadData();
        setDeletingId(null);
      }
    } catch (error) {
      console.error('Erro ao excluir:', error);
    }
    setDeleteLoading(false);
  };

  const handleNew = () => {
    setShowForm(true);
    setActiveView('form');
  };

  // MODIFICADO: Filtrar produções incluindo os novos filtros
  const filteredProducoes = producoes.filter(p => {
    const matchesMedico = selectedMedico ? p.medico_id === parseInt(selectedMedico) : true;
    const matchesDataInicio = dataInicio ? p.data_consulta >= dataInicio : true;
    const matchesDataFim = dataFim ? p.data_consulta <= dataFim : true;
    const matchesTipo = selectedTipo ? p.tipo === selectedTipo : true;
    const matchesPaciente = filtroPaciente ? 
      p.nome_paciente.toLowerCase().includes(filtroPaciente.toLowerCase()) : true;
    const matchesConvenio = filtroConvenio ? 
      p.convenio_id === parseInt(filtroConvenio) : true;
    
    return matchesMedico && matchesDataInicio && matchesDataFim && 
           matchesTipo && matchesPaciente && matchesConvenio;
  });

  // Calcular totais
  const totalPeriodo = filteredProducoes.reduce((sum, item) => sum + item.valor, 0);
  const totalMedicoSelecionado = filteredProducoes.reduce((sum, item) => sum + item.valor, 0);
  const cincoPorCentoMedico = totalMedicoSelecionado * 0.05;

  // Função para limpar todos os filtros
  const limparTodosFiltros = () => {
    setSelectedMedico('');
    setDataInicio('');
    setDataFim('');
    setSelectedTipo('');
    setFiltroPaciente('');
    setFiltroConvenio('');
  };

  // Verificar se há algum filtro ativo
  const hasActiveFilters = selectedMedico || dataInicio || dataFim || selectedTipo || filtroPaciente || filtroConvenio;

  if (activeView === 'report') {
    return (
      <div className="space-y-6">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveView('form')}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            ← Voltar ao Formulário
          </button>
        </div>

        <ProducaoReport
          onEdit={handleEdit}
          onDelete={handleDelete}
          onNew={handleNew}
          selectedMonth={selectedMonth} // Passar o mês selecionado
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
          message="Tem certeza que deseja excluir este registro de produção? Esta ação não pode ser desfeita."
          loading={deleteLoading}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section - MODIFICADO */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-r from-green-500 to-green-600 p-2 rounded-lg">
            <TrendingUp className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Produção Mensal</h2>
            
            {/* NOVO: Seletor de Mês */}
            <div className="relative mt-1">
              <button
                onClick={() => setShowMonthSelector(!showMonthSelector)}
                className="flex items-center gap-2 px-3 py-1 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Calendar className="h-4 w-4 text-gray-600" />
                <span className="font-medium text-gray-700">
                  {formatSelectedMonth(selectedMonth)}
                </span>
                {showMonthSelector ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {showMonthSelector && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 w-48">
                  {generateMonthOptions().map(month => (
                    <button
                      key={month.value}
                      onClick={() => {
                        setSelectedMonth(month.value);
                        setShowMonthSelector(false);
                      }}
                      className={`w-full text-left px-4 py-2 hover:bg-blue-50 transition-colors ${
                        month.value === selectedMonth 
                          ? 'bg-blue-100 text-blue-700 font-medium' 
                          : 'text-gray-700'
                      }`}
                    >
                      {month.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setActiveView('report')}
            className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 hover:from-purple-700 hover:to-purple-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <BarChart3 size={20} />
            Relatório
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <Plus size={20} />
            Nova Consulta
          </button>
        </div>
      </div>

      {/* ABAS: Convênios / Particular */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setTab('convenios')}
          className={`px-6 py-3 font-medium transition-colors border-b-2 -mb-px ${
            tab === 'convenios'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Building size={18} className="inline mr-2" />
          Convênios
        </button>
        <button
          onClick={() => setTab('particular')}
          className={`px-6 py-3 font-medium transition-colors border-b-2 -mb-px ${
            tab === 'particular'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <User size={18} className="inline mr-2" />
          Particular
        </button>
      </div>

      {/* === ABA CONVÊNIOS === */}
      {tab === 'convenios' && (
      <>

      {/* MODIFICADO: Filtro por médico - ADICIONADOS NOVOS FILTROS */}
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="bg-gray-100 p-2 rounded-lg">
              <Filter className="h-5 w-5 text-gray-600" />
            </div>
            <span className="font-semibold text-gray-800">Filtros:</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Médico</label>
              <select
                value={selectedMedico}
                onChange={(e) => setSelectedMedico(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos os médicos</option>
                {medicos.map(medico => (
                  <option key={medico.id} value={medico.id}>{medico.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Convênio</label>
              <select
                value={filtroConvenio}
                onChange={(e) => setFiltroConvenio(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos os convênios</option>
                {convenios.map(convenio => (
                  <option key={convenio.id} value={convenio.id}>{convenio.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
              <select
                value={selectedTipo}
                onChange={(e) => setSelectedTipo(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos os tipos</option>
                <option value="consulta">🩺 Consulta</option>
                <option value="cirurgia">✂️ Cirurgia</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Paciente</label>
              <div className="relative">
                <input
                  type="text"
                  value={filtroPaciente}
                  onChange={(e) => setFiltroPaciente(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pl-10"
                  placeholder="Buscar por nome..."
                />
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <Search size={16} className="text-gray-400" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Data Início</label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Data Fim</label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          {hasActiveFilters && (
            <div className="flex gap-2">
              <button
                onClick={limparTodosFiltros}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                Limpar Todos os Filtros
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards - MANTIDO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">
                {selectedMedico ? 'Total do Médico' : 'Total do Mês'}
              </p>
              <p className="text-2xl font-bold">
                R$ {selectedMedico ? totalMedicoSelecionado.toFixed(2) : totalPeriodo.toFixed(2)}
              </p>
              <p className="text-green-200 text-xs mt-1">
                {formatSelectedMonth(selectedMonth)}
              </p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <DollarSign className="h-6 w-6" />
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total de Consultas</p>
              <p className="text-2xl font-bold">{filteredProducoes.length}</p>
              <p className="text-blue-200 text-xs mt-1">
                {formatSelectedMonth(selectedMonth)}
              </p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <FileText className="h-6 w-6" />
            </div>
          </div>
        </div>
        
        {selectedMedico && (
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">5% do Total</p>
                <p className="text-2xl font-bold">R$ {cincoPorCentoMedico.toFixed(2)}</p>
                <p className="text-purple-200 text-xs mt-1">
                  {formatSelectedMonth(selectedMonth)}
                </p>
              </div>
              <div className="bg-white/20 p-3 rounded-lg">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>
          </div>
        )}
        
        {!selectedMedico && (
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Média por Consulta</p>
                <p className="text-2xl font-bold">R$ {filteredProducoes.length > 0 ? (totalPeriodo / filteredProducoes.length).toFixed(2) : '0.00'}</p>
                <p className="text-purple-200 text-xs mt-1">
                  {formatSelectedMonth(selectedMonth)}
                </p>
              </div>
              <div className="bg-white/20 p-3 rounded-lg">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Formulário de Nova Consulta - MODIFICADO */}
      {showForm && (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
          <div className="flex items-center gap-2 mb-6">
            <FileText className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Nova Consulta</h3>
          </div>
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {/* NOVO CAMPO: Mês de Referência */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mês de Referência *
              </label>
              <select
                value={formData.month_reference}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, month_reference: e.target.value }))
                }
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                required
              >
                {generateMonthOptions().map(month => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Médico *
              </label>
              <select
                value={formData.medico_id}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, medico_id: e.target.value }))
                }
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                required
              >
                <option value="">Selecione o médico</option>
                {medicos.map((medico) => (
                  <option key={medico.id} value={medico.id}>
                    {medico.nome} {medico.crm && `- CRM: ${medico.crm}`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Convênio *
              </label>
              <select
                value={formData.convenio_id}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, convenio_id: e.target.value }))
                }
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                required
              >
                <option value="">Selecione o convênio</option>
                {convenios.map((convenio) => (
                  <option key={convenio.id} value={convenio.id}>
                    {convenio.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Atendimento *
              </label>
              <select
                value={formData.tipo}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, tipo: e.target.value as 'consulta' | 'cirurgia' }))
                }
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                required
              >
                <option value="consulta">🩺 Consulta</option>
                <option value="cirurgia">✂️ Cirurgia</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome do Paciente *
              </label>
              <input
                type="text"
                value={formData.nome_paciente}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, nome_paciente: e.target.value }))
                }
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                required
                placeholder="Nome completo do paciente"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data do Atendimento *
              </label>
              <input
                type="date"
                value={formData.data_consulta}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, data_consulta: e.target.value }))
                }
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Valor (R$) *
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.valor}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, valor: e.target.value }))
                }
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                required
                placeholder="0,00"
              />
            </div>

            <div className="md:col-span-2 flex justify-end gap-3 mt-4">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Salvando...
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    Salvar Consulta
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODIFICADO: Lista de Produções - Adicionados indicadores dos filtros ativos */}
      {!showForm && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-gray-900">
                Produções de {formatSelectedMonth(selectedMonth)}
                {selectedMedico && ` - ${medicos.find(m => m.id === parseInt(selectedMedico))?.nome}`}
                {filtroConvenio && ` - ${convenios.find(c => c.id === parseInt(filtroConvenio))?.nome}`}
                {selectedTipo && ` - ${selectedTipo === 'consulta' ? 'Consultas' : 'Cirurgias'}`}
                {filtroPaciente && ` - Paciente: ${filtroPaciente}`}
              </h4>
              <div className="text-sm text-gray-500">
                {filteredProducoes.length} registro{filteredProducoes.length !== 1 ? 's' : ''} encontrado{filteredProducoes.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
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
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span className="text-gray-500">Carregando dados...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredProducoes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      <div className="flex flex-col items-center gap-3">
                        <FileText className="h-12 w-12 text-gray-300" />
                        <span className="text-lg font-medium">Nenhuma produção para {formatSelectedMonth(selectedMonth)}</span>
                        <span className="text-sm">Clique em "Nova Consulta" para começar</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredProducoes.slice(0, 10).map((producao, index) => (
                    <tr key={producao.id} className={`transition-colors duration-150 hover:bg-blue-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-blue-100 p-1.5 rounded-full">
                            <User size={14} className="text-blue-600" />
                          </div>
                          <span className="font-medium text-gray-900">{producao.medico?.nome}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-green-100 p-1.5 rounded-full">
                            <Building size={14} className="text-green-600" />
                          </div>
                          <span className="text-gray-700">{producao.convenio?.nome}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${
                          producao.tipo === 'cirurgia' 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {producao.tipo === 'cirurgia' ? (
                            <>
                              <Scissors size={12} />
                              Cirurgia
                            </>
                          ) : (
                            <>
                              <Stethoscope size={12} />
                              Consulta
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-700">{producao.nome_paciente}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-gray-400" />
                          <span className="text-gray-700">{formatDate(producao.data_consulta)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-green-600 text-lg">R$ {producao.valor.toFixed(2)}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* MODIFICADO: Footer com totais - Inclui informações dos filtros */}
          {hasActiveFilters && filteredProducoes.length > 0 && (
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  Total de {filteredProducoes.length} registro{filteredProducoes.length !== 1 ? 's' : ''}
                  {selectedMedico && ` para ${medicos.find(m => m.id === parseInt(selectedMedico))?.nome}`}
                  {filtroConvenio && ` no ${convenios.find(c => c.id === parseInt(filtroConvenio))?.nome}`}
                  {filtroPaciente && ` - Paciente: ${filtroPaciente}`}
                </div>
                <div className="flex gap-6 items-center">
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">
                      Total: R$ {totalMedicoSelecionado.toFixed(2)}
                    </div>
                  </div>
                  {selectedMedico && (
                    <div className="text-right bg-purple-100 px-4 py-2 rounded-lg">
                      <div className="text-sm text-purple-600 font-medium">5% do Total</div>
                      <div className="text-lg font-bold text-purple-700">
                        R$ {cincoPorCentoMedico.toFixed(2)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {filteredProducoes.length > 10 && (
            <div className="p-4 text-center border-t border-gray-200">
              <button
                onClick={() => setActiveView('report')}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Ver todos os {filteredProducoes.length} registros no relatório →
              </button>
            </div>
          )}
        </div>
      )}

      </>

      )}

      {/* === ABA PARTICULAR === */}
      {tab === 'particular' && (
      <>

      {/* Summary Cards - Particular */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-sm font-medium">Valor Recebido</p>
              <p className="text-2xl font-bold">{money(particularTotal)}</p>
              <p className="text-emerald-200 text-xs mt-1">{formatSelectedMonth(selectedMonth)}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <DollarSign className="h-6 w-6" />
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-r from-teal-500 to-teal-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-teal-100 text-sm font-medium">Valor de Repasse</p>
              <p className="text-2xl font-bold">{money(particularRepasse)}</p>
              <p className="text-teal-200 text-xs mt-1">{filteredParticulares.length} lançamentos</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <TrendingUp className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Botão Novo Lançamento Particular */}
      <div className="flex justify-end">
        <button
          onClick={openParticularNew}
          className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        >
          <Plus size={20} />
          Novo Lançamento
        </button>
      </div>

      {/* Filtros Particular */}
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              value={particularSearch}
              onChange={(e) => setParticularSearch(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent pl-10"
              placeholder="Buscar por paciente ou médico..."
            />
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
              <Search size={16} className="text-gray-400" />
            </div>
          </div>
          <select
            value={particularMedico}
            onChange={(e) => setParticularMedico(e.target.value)}
            className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          >
            <option value="">Todos os médicos</option>
            {medicos.map((m) => (
              <option key={m.id} value={m.id}>{m.nome}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Modal Formulário Particular */}
      {showParticularForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto p-4 pt-10" onClick={() => setShowParticularForm(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingParticular ? 'Editar Lançamento Particular' : 'Novo Lançamento Particular'}
              </h3>
              <button onClick={() => setShowParticularForm(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <form onSubmit={saveParticular} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mês de Referência *</label>
                <select
                  value={particularForm.month_reference}
                  onChange={(e) => setParticularForm((p) => ({ ...p, month_reference: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  required
                >
                  {generateMonthOptions().map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unidade</label>
                <input
                  type="text"
                  value={particularForm.unidade}
                  onChange={(e) => setParticularForm((p) => ({ ...p, unidade: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Nome da unidade"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Médico *</label>
                <select
                  value={particularForm.medico_id}
                  onChange={(e) => setParticularForm((p) => ({ ...p, medico_id: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  required
                >
                  <option value="">Selecione o médico</option>
                  {medicos.map((m) => (
                    <option key={m.id} value={m.id}>{m.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vínculo</label>
                <select
                  value={particularForm.vinculo}
                  onChange={(e) => setParticularForm((p) => ({ ...p, vinculo: e.target.value as 'externo' | 'socio' }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="socio">Sócio</option>
                  <option value="externo">Externo</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Paciente Particular *</label>
                <input
                  type="text"
                  value={particularForm.nome_paciente}
                  onChange={(e) => setParticularForm((p) => ({ ...p, nome_paciente: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data *</label>
                <input
                  type="date"
                  value={particularForm.data_cirurgia}
                  onChange={(e) => setParticularForm((p) => ({ ...p, data_cirurgia: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Procedimento</label>
                <input
                  type="text"
                  value={particularForm.tipo_procedimento}
                  onChange={(e) => setParticularForm((p) => ({ ...p, tipo_procedimento: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Consulta, infiltração..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Forma de Pagamento</label>
                <select
                  value={particularForm.forma_pagamento}
                  onChange={(e) => setParticularForm((p) => ({ ...p, forma_pagamento: e.target.value as 'pix' | 'credito' | 'debito' | 'especie' }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="pix">Pix</option>
                  <option value="credito">Crédito</option>
                  <option value="debito">Débito</option>
                  <option value="especie">Espécie</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valor Recebido *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={particularForm.valor}
                  onChange={(e) => setParticularForm((p) => ({ ...p, valor: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valor de Repasse</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={particularForm.valor_repasse}
                  onChange={(e) => setParticularForm((p) => ({ ...p, valor_repasse: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              <div className="md:col-span-2 flex items-center gap-3">
                <input
                  type="checkbox"
                  id="check_conferencia"
                  checked={particularForm.check_conferencia}
                  onChange={(e) => setParticularForm((p) => ({ ...p, check_conferencia: e.target.checked }))}
                  className="h-5 w-5 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                />
                <label htmlFor="check_conferencia" className="text-sm font-medium text-gray-700">Conferido (Check)</label>
              </div>
              <div className="md:col-span-2 flex justify-end gap-3">
                <button type="button" onClick={() => setShowParticularForm(false)} className="px-6 py-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors">Cancelar</button>
                <button type="submit" disabled={particularLoading} className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50">
                  {particularLoading ? 'Salvando...' : editingParticular ? 'Salvar Alterações' : 'Salvar Lançamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tabela Particular */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unidade</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Médico</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vínculo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paciente Particular</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Procedimento</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Forma Pagto</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Valor Recebido</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Valor Repasse</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Check</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {particularLoading ? (
                <tr><td colSpan={11} className="px-4 py-8 text-center text-gray-500">Carregando...</td></tr>
              ) : filteredParticulares.length === 0 ? (
                <tr><td colSpan={11} className="px-4 py-8 text-center text-gray-500">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <span className="block text-sm">Nenhum lançamento particular encontrado para este mês.</span>
                </td></tr>
              ) : filteredParticulares.map((item) => {
                return (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-700">{item.unidade || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{formatDate(item.data_cirurgia)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.medico?.nome || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{item.vinculo === 'externo' ? 'Externo' : 'Sócio'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{item.nome_paciente}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{item.tipo_procedimento || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{item.forma_pagamento || '-'}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">{money(item.valor)}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-teal-700">{money(item.valor_repasse)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center justify-center w-5 h-5 rounded ${item.check_conferencia ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
                        {item.check_conferencia ? '✓' : ''}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openParticularEdit(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors">
                          <FileText className="h-4 w-4" />
                        </button>
                        <button onClick={() => deleteParticular(item.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {filteredParticulares.length > 0 && (
              <tfoot className="bg-gray-50 border-t border-gray-200">
                <tr>
                  <td colSpan={7} className="px-4 py-3 text-sm font-medium text-gray-700 text-right">Totais:</td>
                  <td className="px-4 py-3 text-sm text-right font-bold text-gray-900">{money(particularTotal)}</td>
                  <td className="px-4 py-3 text-sm text-right font-bold text-teal-700">{money(particularRepasse)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      </>
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
        message="Tem certeza que deseja excluir este registro de produção? Esta ação não pode ser desfeita."
        loading={deleteLoading}
      />
    </div>
  );
};
