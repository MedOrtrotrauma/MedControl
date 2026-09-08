import React, { useState, useEffect } from 'react';
import { Calendar, Plus, DollarSign, User, Building, Guitar as Hospital, CreditCard, UserCheck, Stethoscope, BarChart3, ChevronDown, ChevronUp } from 'lucide-react';
import { dbHelpers } from '../lib/supabase';
import { Repasse, Medico, Convenio, Hospital as HospitalType } from '../types';
import { RepasseReport } from './Reports/RepasseReport';
import { EditRepasseModal } from './Modals/EditRepasseModal';
import { ConfirmDeleteModal } from './Modals/ConfirmDeleteModal';
import { useAuth } from './Auth/AuthContext';

export const RepasseComponent: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'convenio' | 'particular'>('convenio');
  const [activeView, setActiveView] = useState<'form' | 'report'>('form');
  const [repasses, setRepasses] = useState<Repasse[]>([]);
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [hospitais, setHospitais] = useState<HospitalType[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingRepasse, setEditingRepasse] = useState<Repasse | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().slice(0, 7);
  });
  const [showMonthSelector, setShowMonthSelector] = useState(false);

  const [formData, setFormData] = useState({
    medico_id: '',
    nome_paciente: '',
    data_cirurgia: '',
    tipo_procedimento_detalhado: 'consulta' as 'consulta' | 'infiltracao' | 'onda_choque' | 'cirurgia_particular' | 'medico_parceiro',
    valor: '',
    month_reference: '',
    observacao: ''
  });

  const [formDataConvenio, setFormDataConvenio] = useState({
    medico_id: '',
    convenio_id: '',
    nome_paciente: '',
    hospital_id: '',
    data_cirurgia: '',
    valor: '',
    tipo: 'consulta' as 'consulta' | 'cirurgia',
    month_reference: ''
  });

  useEffect(() => {
    loadData();
  }, [selectedMonth]);

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      month_reference: selectedMonth
    }));
    setFormDataConvenio(prev => ({
      ...prev,
      month_reference: selectedMonth
    }));
  }, [selectedMonth]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [repassesRes, medicosRes, conveniosRes, hospitaisRes] = await Promise.all([
        dbHelpers.getRepassesByMonth(selectedMonth),
        dbHelpers.getMedicos(),
        dbHelpers.getConvenios(),
        dbHelpers.getHospitais()
      ]);

      if (repassesRes.data) setRepasses(repassesRes.data);
      if (medicosRes.data) setMedicos(medicosRes.data);
      if (conveniosRes.data) setConvenios(conveniosRes.data);
      if (hospitaisRes.data) setHospitais(hospitaisRes.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
    setLoading(false);
  };

  const generateMonthOptions = () => {
    const months = [];
    const today = new Date();

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

  const formatSelectedMonth = (month: string) => {
    const [year, monthNum] = month.split('-');
    const date = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
    const label = date.toLocaleDateString('pt-BR', {
      month: 'long',
      year: 'numeric'
    });
    return label.charAt(0).toUpperCase() + label.slice(1);
  };

  const calcularValoresRepasse = (tipoProcedimento: string, valor: number) => {
    const porcentagens: { [key: string]: number } = {
      'consulta': 16.33,
      'infiltracao': 40.00,
      'onda_choque': 30.00,
      'cirurgia_particular': 2.00,
      'medico_parceiro': 50.00
    };

    const porcentagem = porcentagens[tipoProcedimento] || 0;
    const valorRepasse = (valor * porcentagem) / 100;

    return { porcentagem, valorRepasse };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let result;

      if (activeTab === 'convenio') {
        result = await dbHelpers.createRepasse({
          medico_id: parseInt(formDataConvenio.medico_id),
          convenio_id: parseInt(formDataConvenio.convenio_id),
          nome_paciente: formDataConvenio.nome_paciente,
          hospital_id: parseInt(formDataConvenio.hospital_id),
          data_cirurgia: formDataConvenio.data_cirurgia,
          valor: parseFloat(formDataConvenio.valor),
          tipo: formDataConvenio.tipo,
          is_particular: false,
          month_reference: formDataConvenio.month_reference
        });
      } else {
        const valor = parseFloat(formData.valor);
        const { porcentagem, valorRepasse } = calcularValoresRepasse(formData.tipo_procedimento_detalhado, valor);

        let hospitalId = 1;
        if (hospitais.length > 0) {
          hospitalId = hospitais[0].id;
        }

        result = await dbHelpers.createRepasse({
          medico_id: parseInt(formData.medico_id),
          nome_paciente: formData.nome_paciente,
          hospital_id: hospitalId,
          data_cirurgia: formData.data_cirurgia,
          valor: valor,
          tipo: 'consulta',
          is_particular: true,
          tipo_procedimento_detalhado: formData.tipo_procedimento_detalhado,
          porcentagem_repasse: porcentagem,
          valor_repasse_medico: valorRepasse,
          month_reference: formData.month_reference,
          observacao: formData.observacao
        });
      }

      if (result.error) {
        console.error('Erro:', result.error);
      } else {
        setFormDataConvenio({
          medico_id: '',
          convenio_id: '',
          nome_paciente: '',
          hospital_id: '',
          data_cirurgia: '',
          valor: '',
          tipo: 'consulta',
          month_reference: selectedMonth
        });

        setFormData({
          medico_id: '',
          nome_paciente: '',
          data_cirurgia: '',
          tipo_procedimento_detalhado: 'consulta',
          valor: '',
          month_reference: selectedMonth,
          observacao: ''
        });

        setShowForm(false);
        loadData();
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
    }
    setLoading(false);
  };

  const handleEdit = (repasse: Repasse) => {
    setEditingRepasse(repasse);
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;

    setDeleteLoading(true);
    try {
      const result = await dbHelpers.deleteRepasse(deletingId);
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

  const hasParticularAccess = user?.email === 'rayannyrego@gmail.com';

  const filteredRepasses = repasses.filter(repasse =>
    activeTab === 'convenio' ? !repasse.is_particular : repasse.is_particular
  );

  const getTipoProcedimentoLabel = (tipo?: string) => {
    const labels: { [key: string]: string } = {
      'consulta': 'Consulta (16,33%)',
      'infiltracao': 'Infiltração (40%)',
      'onda_choque': 'Onda de Choque (30%)',
      'cirurgia_particular': 'Cirurgia Particular (2%)',
      'medico_parceiro': 'Médico Parceiro (50%)'
    };
    return labels[tipo || ''] || tipo || '-';
  };

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

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-1">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('convenio')}
              className={`py-3 px-6 rounded-lg font-medium text-sm flex items-center gap-2 transition-all duration-200 ${
                activeTab === 'convenio'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Building size={16} />
              Repasse por Convênio
            </button>
            {hasParticularAccess && (
              <button
                onClick={() => setActiveTab('particular')}
                className={`py-3 px-6 rounded-lg font-medium text-sm flex items-center gap-2 transition-all duration-200 ${
                  activeTab === 'particular'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                <UserCheck size={16} />
                Repasse Particular
              </button>
            )}
          </nav>
        </div>

        <RepasseReport
          activeTab={activeTab}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onNew={handleNew}
          hasParticularAccess={hasParticularAccess}
          selectedMonth={selectedMonth}
        />

        <EditRepasseModal
          repasse={editingRepasse}
          isOpen={!!editingRepasse}
          onClose={() => setEditingRepasse(null)}
          onSave={loadData}
        />

        <ConfirmDeleteModal
          isOpen={!!deletingId}
          onClose={() => setDeletingId(null)}
          onConfirm={confirmDelete}
          title="Excluir Repasse"
          message="Tem certeza que deseja excluir este registro de repasse? Esta ação não pode ser desfeita."
          loading={deleteLoading}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-r from-green-500 to-green-600 p-2 rounded-lg">
            <CreditCard className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Controle de Repasse</h2>

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
            className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <BarChart3 size={20} />
            Relatório
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <Plus size={20} />
            Novo Repasse
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-1">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('convenio')}
            className={`py-3 px-6 rounded-lg font-medium text-sm flex items-center gap-2 transition-all duration-200 ${
              activeTab === 'convenio'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Building size={16} />
            Repasse por Convênio
          </button>
          {hasParticularAccess && (
            <button
              onClick={() => setActiveTab('particular')}
              className={`py-3 px-6 rounded-lg font-medium text-sm flex items-center gap-2 transition-all duration-200 ${
                activeTab === 'particular'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <UserCheck size={16} />
              Repasse Particular
            </button>
          )}
        </nav>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
          <div className="flex items-center gap-2 mb-6">
            {activeTab === 'convenio' ? (
              <Building className="h-5 w-5 text-blue-600" />
            ) : (
              <UserCheck className="h-5 w-5 text-green-600" />
            )}
            <h3 className="text-lg font-semibold text-gray-900">
              Novo Repasse {activeTab === 'convenio' ? 'por Convênio' : 'Particular'}
            </h3>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  Mês de Referência
                </div>
              </label>
              <select
                value={activeTab === 'convenio' ? formDataConvenio.month_reference : formData.month_reference}
                onChange={(e) => {
                  if (activeTab === 'convenio') {
                    setFormDataConvenio(prev => ({ ...prev, month_reference: e.target.value }));
                  } else {
                    setFormData(prev => ({ ...prev, month_reference: e.target.value }));
                  }
                }}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Selecione o mês de referência</option>
                {generateMonthOptions().map(month => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Mês ao qual este repasse será contabilizado
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Médico
              </label>
              <select
                value={activeTab === 'convenio' ? formDataConvenio.medico_id : formData.medico_id}
                onChange={(e) => {
                  if (activeTab === 'convenio') {
                    setFormDataConvenio(prev => ({ ...prev, medico_id: e.target.value }));
                  } else {
                    setFormData(prev => ({ ...prev, medico_id: e.target.value }));
                  }
                }}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                required
              >
                <option value="">Selecione o médico</option>
                {medicos.map(medico => (
                  <option key={medico.id} value={medico.id}>{medico.nome}</option>
                ))}
              </select>
            </div>

            {activeTab === 'convenio' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Convênio
                </label>
                <select
                  value={formDataConvenio.convenio_id}
                  onChange={(e) => setFormDataConvenio(prev => ({ ...prev, convenio_id: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  required
                >
                  <option value="">Selecione o convênio</option>
                  {convenios.map(convenio => (
                    <option key={convenio.id} value={convenio.id}>{convenio.nome}</option>
                  ))}
                </select>
              </div>
            )}

            {activeTab === 'particular' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <div className="flex items-center gap-2">
                    <Stethoscope size={16} />
                    Tipo de Procedimento
                  </div>
                </label>
                <select
                  value={formData.tipo_procedimento_detalhado}
                  onChange={(e) => setFormData(prev => ({ ...prev, tipo_procedimento_detalhado: e.target.value as any }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  required
                >
                  <option value="consulta">Consulta (16,33%)</option>
                  <option value="infiltracao">Infiltração (40%)</option>
                  <option value="onda_choque">Onda de Choque (30%)</option>
                  <option value="cirurgia_particular">Cirurgia Particular (2%)</option>
                  <option value="medico_parceiro">Médico Parceiro (50%)</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome do Paciente
              </label>
              <input
                type="text"
                value={activeTab === 'convenio' ? formDataConvenio.nome_paciente : formData.nome_paciente}
                onChange={(e) => {
                  if (activeTab === 'convenio') {
                    setFormDataConvenio(prev => ({ ...prev, nome_paciente: e.target.value }));
                  } else {
                    setFormData(prev => ({ ...prev, nome_paciente: e.target.value }));
                  }
                }}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                required
              />
            </div>

            {activeTab === 'convenio' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hospital
                </label>
                <select
                  value={formDataConvenio.hospital_id}
                  onChange={(e) => setFormDataConvenio(prev => ({ ...prev, hospital_id: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  required
                >
                  <option value="">Selecione o hospital</option>
                  {hospitais.map(hospital => (
                    <option key={hospital.id} value={hospital.id}>{hospital.nome}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data da Cirurgia
              </label>
              <input
                type="date"
                value={activeTab === 'convenio' ? formDataConvenio.data_cirurgia : formData.data_cirurgia}
                onChange={(e) => {
                  if (activeTab === 'convenio') {
                    setFormDataConvenio(prev => ({ ...prev, data_cirurgia: e.target.value }));
                  } else {
                    setFormData(prev => ({ ...prev, data_cirurgia: e.target.value }));
                  }
                }}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                required
              />
            </div>

            {activeTab === 'convenio' ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo
                  </label>
                  <select
                    value={formDataConvenio.tipo}
                    onChange={(e) => setFormDataConvenio(prev => ({ ...prev, tipo: e.target.value as 'consulta' | 'cirurgia' }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    required
                  >
                    <option value="consulta">Consulta</option>
                    <option value="cirurgia">Cirurgia</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valor
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formDataConvenio.valor}
                    onChange={(e) => setFormDataConvenio(prev => ({ ...prev, valor: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    required
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valor Total
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.valor}
                    onChange={(e) => setFormData(prev => ({ ...prev, valor: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    required
                  />
                  {formData.valor && (
                    <p className="text-xs text-green-600 mt-1">
                      Repasse: R$ {calcularValoresRepasse(formData.tipo_procedimento_detalhado, parseFloat(formData.valor || '0')).valorRepasse.toFixed(2)}
                    </p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Observação (Opcional)
                  </label>
                  <textarea
                    value={formData.observacao}
                    onChange={(e) => setFormData(prev => ({ ...prev, observacao: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    rows={3}
                    placeholder="Adicione observações sobre este repasse..."
                  />
                </div>
              </>
            )}

            <div className="md:col-span-2 flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Salvando...' : 'Salvar Repasse'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-colors duration-200"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-lg border border-gray-100">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Repasses {activeTab === 'convenio' ? 'por Convênio' : 'Particulares'} de {formatSelectedMonth(selectedMonth)}
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Médico</th>
                {activeTab === 'convenio' && (
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Convênio</th>
                )}
                {activeTab === 'particular' && (
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Tipo Procedimento</th>
                )}
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Paciente</th>
                {activeTab === 'convenio' && (
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Hospital</th>
                )}
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Data</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Valor Total</th>
                {activeTab === 'particular' && (
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Valor Repasse</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRepasses.map((repasse, index) => (
                <tr key={repasse.id} className={`transition-colors duration-150 hover:bg-blue-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <td className="px-6 py-4 flex items-center gap-3">
                    <div className="bg-blue-100 p-1.5 rounded-full">
                      <User size={14} className="text-blue-600" />
                    </div>
                    <span className="font-medium text-gray-900">{repasse.medico?.nome}</span>
                  </td>
                  {activeTab === 'convenio' && (
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-green-100 p-1.5 rounded-full">
                          <Building size={14} className="text-green-600" />
                        </div>
                        <span className="text-gray-700">{repasse.convenio?.nome}</span>
                      </div>
                    </td>
                  )}
                  {activeTab === 'particular' && (
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-700 font-medium">
                        {getTipoProcedimentoLabel(repasse.tipo_procedimento_detalhado)}
                      </span>
                    </td>
                  )}
                  <td className="px-6 py-4 text-gray-700">{repasse.nome_paciente}</td>
                  {activeTab === 'convenio' && (
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-orange-100 p-1.5 rounded-full">
                          <Hospital size={14} className="text-orange-600" />
                        </div>
                        <span className="text-gray-700">{repasse.hospital?.nome}</span>
                      </div>
                    </td>
                  )}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-gray-400" />
                      <span className="text-gray-700">{new Date(repasse.data_cirurgia).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-bold text-gray-900 text-lg">R$ {repasse.valor.toFixed(2)}</span>
                  </td>
                  {activeTab === 'particular' && (
                    <td className="px-6 py-4">
                      <span className="font-bold text-green-600 text-lg">
                        R$ {(repasse.valor_repasse_medico || 0).toFixed(2)}
                      </span>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
