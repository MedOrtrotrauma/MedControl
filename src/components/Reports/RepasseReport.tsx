import React, { useState, useEffect } from 'react';
import { CreditCard, User, Calendar, DollarSign, Building, CreditCard as Edit, Trash2, Plus, Filter, Stethoscope, Scissors, Printer, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import { dbHelpers } from '../../lib/supabase';
import { Repasse, Medico, Convenio, Hospital } from '../../types';
import { supabase } from '../../lib/supabase';

interface RepasseReportProps {
  activeTab: 'convenio' | 'particular';
  onEdit: (repasse: Repasse) => void;
  onDelete: (id: number) => void;
  onNew: () => void;
  hasParticularAccess: boolean;
  selectedMonth: string;
}

interface MedicoSummary {
  medico: Medico;
  repasses: Repasse[];
  totalEntradas: number;
  totalRepasses: number;
  procedimentos: {
    [key: string]: {
      count: number;
      totalValor: number;
      totalRepasse: number;
    };
  };
}

export const RepasseReport: React.FC<RepasseReportProps> = ({
  activeTab,
  onEdit,
  onDelete,
  onNew,
  hasParticularAccess,
  selectedMonth
}) => {
  const [repasses, setRepasses] = useState<Repasse[]>([]);
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [hospitais, setHospitais] = useState<Hospital[]>([]);
  const [selectedMedico, setSelectedMedico] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [expandedMedicos, setExpandedMedicos] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (selectedMedico && activeTab === 'particular') {
      setExpandedMedicos(new Set([parseInt(selectedMedico)]));
    } else if (!selectedMedico) {
      setExpandedMedicos(new Set());
    }
  }, [selectedMedico, activeTab]);

  useEffect(() => {
    loadData();
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

  const filteredRepasses = repasses.filter(repasse => {
    const matchesTab = activeTab === 'convenio' ? !repasse.is_particular : repasse.is_particular;
    const matchesMedico = selectedMedico ? repasse.medico_id === parseInt(selectedMedico) : true;
    return matchesTab && matchesMedico;
  });

  const getMedicosSummary = (): MedicoSummary[] => {
    const medicoMap = new Map<number, MedicoSummary>();

    filteredRepasses.forEach(repasse => {
      if (!repasse.medico) return;

      if (!medicoMap.has(repasse.medico_id)) {
        medicoMap.set(repasse.medico_id, {
          medico: repasse.medico,
          repasses: [],
          totalEntradas: 0,
          totalRepasses: 0,
          procedimentos: {}
        });
      }

      const summary = medicoMap.get(repasse.medico_id)!;
      summary.repasses.push(repasse);
      summary.totalEntradas += repasse.valor;

      if (activeTab === 'particular' && repasse.tipo_procedimento_detalhado) {
        const tipo = repasse.tipo_procedimento_detalhado;
        if (!summary.procedimentos[tipo]) {
          summary.procedimentos[tipo] = {
            count: 0,
            totalValor: 0,
            totalRepasse: 0
          };
        }
        summary.procedimentos[tipo].count += 1;
        summary.procedimentos[tipo].totalValor += repasse.valor;
        summary.procedimentos[tipo].totalRepasse += repasse.valor_repasse_medico || 0;
        summary.totalRepasses += repasse.valor_repasse_medico || 0;
      }
    });

    return Array.from(medicoMap.values()).sort((a, b) =>
      a.medico.nome.localeCompare(b.medico.nome)
    );
  };

  const getTipoProcedimentoLabel = (tipo: string): string => {
    const labels: { [key: string]: string } = {
      'consulta': 'Consulta',
      'infiltracao': 'Infiltração',
      'onda_choque': 'Onda de Choque',
      'cirurgia_particular': 'Cirurgia Particular',
      'medico_parceiro': 'Médico Parceiro'
    };
    return labels[tipo] || tipo;
  };

  const getPorcentagemLabel = (tipo: string): string => {
    const porcentagens: { [key: string]: string } = {
      'consulta': '16,33%',
      'infiltracao': '40%',
      'onda_choque': '30%',
      'cirurgia_particular': '2%',
      'medico_parceiro': '50%'
    };
    return porcentagens[tipo] || '';
  };

  const toggleMedico = (medicoId: number) => {
    const newExpanded = new Set(expandedMedicos);
    if (newExpanded.has(medicoId)) {
      newExpanded.delete(medicoId);
    } else {
      newExpanded.add(medicoId);
    }
    setExpandedMedicos(newExpanded);
  };

  const medicosSummary = getMedicosSummary();
  const totalGeral = filteredRepasses.reduce((sum, item) => sum + item.valor, 0);
  const totalRepassesGeral = activeTab === 'particular'
    ? filteredRepasses.reduce((sum, item) => sum + (item.valor_repasse_medico || 0), 0)
    : 0;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className={`rounded-xl p-6 text-white shadow-lg ${
        activeTab === 'convenio'
          ? 'bg-gradient-to-r from-blue-600 to-blue-700'
          : 'bg-gradient-to-r from-green-600 to-green-700'
      }`}>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-lg backdrop-blur-sm">
              <CreditCard className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-2xl font-bold">
                Relatório de Repasse {activeTab === 'convenio' ? 'por Convênio' : 'Particular'}
              </h3>
              <p className={`${activeTab === 'convenio' ? 'text-blue-100' : 'text-green-100'}`}>
                Visualização individualizada por médico
              </p>
            </div>
          </div>
          <button
            onClick={onNew}
            className="bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-all duration-200 backdrop-blur-sm"
          >
            <Plus size={20} />
            Novo Repasse
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`rounded-xl p-6 text-white shadow-lg ${
          activeTab === 'convenio'
            ? 'bg-gradient-to-r from-green-500 to-green-600'
            : 'bg-gradient-to-r from-emerald-500 to-emerald-600'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${
                activeTab === 'convenio' ? 'text-green-100' : 'text-emerald-100'
              }`}>Total Arrecadado</p>
              <p className="text-2xl font-bold">R$ {totalGeral.toFixed(2)}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <DollarSign className="h-6 w-6" />
            </div>
          </div>
        </div>

        {activeTab === 'particular' && (
          <div className="rounded-xl p-6 text-white shadow-lg bg-gradient-to-r from-blue-500 to-blue-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-100">Total Repasse aos Médicos</p>
                <p className="text-2xl font-bold">R$ {totalRepassesGeral.toFixed(2)}</p>
              </div>
              <div className="bg-white/20 p-3 rounded-lg">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>
          </div>
        )}

        <div className={`rounded-xl p-6 text-white shadow-lg ${
          activeTab === 'convenio'
            ? 'bg-gradient-to-r from-blue-500 to-blue-600'
            : 'bg-gradient-to-r from-cyan-500 to-cyan-600'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${
                activeTab === 'convenio' ? 'text-blue-100' : 'text-cyan-100'
              }`}>Total de Repasses</p>
              <p className="text-2xl font-bold">{filteredRepasses.length}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <CreditCard className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
        <div className="flex items-center gap-4 flex-wrap justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="bg-gray-100 p-2 rounded-lg">
                <Filter className="h-5 w-5 text-gray-600" />
              </div>
              <span className="font-semibold text-gray-800">Filtro por Médico:</span>
            </div>
            <div className="max-w-xs">
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
          </div>
          <button
            onClick={handlePrint}
            className="bg-gradient-to-r from-gray-600 to-gray-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 hover:from-gray-700 hover:to-gray-800 transition-all duration-200 shadow-lg print:hidden"
          >
            <Printer size={20} />
            Imprimir
          </button>
        </div>
      </div>

      {activeTab === 'particular' ? (
        <div className="space-y-4">
          {medicosSummary.map(summary => (
            <div key={summary.medico.id} className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden print:break-inside-avoid print:shadow-none">
              <div
                className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-200 cursor-pointer hover:from-green-100 hover:to-emerald-100 transition-colors print:cursor-default print:bg-gray-100"
                onClick={() => toggleMedico(summary.medico.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-green-100 p-3 rounded-lg print:hidden">
                      <User className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-gray-900">{summary.medico.nome}</h4>
                      {summary.medico.crm && (
                        <p className="text-sm text-gray-600">CRM: {summary.medico.crm}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Total Entradas</p>
                      <p className="text-xl font-bold text-gray-900">R$ {summary.totalEntradas.toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Total Repasse</p>
                      <p className="text-xl font-bold text-green-600">R$ {summary.totalRepasses.toFixed(2)}</p>
                    </div>
                    <div className="bg-white p-2 rounded-lg print:hidden">
                      {expandedMedicos.has(summary.medico.id) ? (
                        <ChevronUp className="h-5 w-5 text-gray-600" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-600" />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {(expandedMedicos.has(summary.medico.id) || selectedMedico) && (
                <div className="p-6 print:p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 print:grid-cols-3 print:gap-2 print:mb-4">
                    {Object.entries(summary.procedimentos).map(([tipo, data]) => (
                      <div key={tipo} className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-lg border border-gray-200 print:p-2 print:bg-gray-50">
                        <div className="flex items-start justify-between mb-3 print:mb-1">
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{getTipoProcedimentoLabel(tipo)}</p>
                            <p className="text-xs text-gray-600">{getPorcentagemLabel(tipo)}</p>
                          </div>
                          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded">
                            {data.count}x
                          </span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-600">Entrada:</span>
                            <span className="font-medium text-gray-900">R$ {data.totalValor.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-600">Repasse:</span>
                            <span className="font-bold text-green-600">R$ {data.totalRepasse.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Tipo</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Paciente</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Data</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Valor</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Repasse</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Observação</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 print:hidden">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {summary.repasses.map(repasse => (
                          <tr key={repasse.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3">
                              <span className="text-sm font-medium text-gray-900">
                                {getTipoProcedimentoLabel(repasse.tipo_procedimento_detalhado || '')}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">{repasse.nome_paciente}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              {new Date(repasse.data_cirurgia).toLocaleDateString('pt-BR')}
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-medium text-gray-900">R$ {repasse.valor.toFixed(2)}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-bold text-green-600">
                                R$ {(repasse.valor_repasse_medico || 0).toFixed(2)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 max-w-xs">
                              {repasse.observacao || '-'}
                            </td>
                            <td className="px-4 py-3 print:hidden">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => onEdit(repasse)}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Editar"
                                >
                                  <CreditCard size={16} />
                                </button>
                                <button
                                  onClick={() => onDelete(repasse.id)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Excluir"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ))}

          {medicosSummary.length === 0 && !loading && (
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-12 text-center">
              <CreditCard className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">Nenhum registro encontrado</p>
              <p className="text-gray-600">Adicione novos repasses para começar</p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <h4 className="text-xl font-bold text-gray-900">Registros de Repasse por Convênio</h4>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-blue-50 to-blue-100">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-bold text-blue-800">Médico</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-blue-800">Convênio</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-blue-800">Tipo</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-blue-800">Paciente</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-blue-800">Hospital</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-blue-800">Data</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-blue-800">Valor</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-blue-800 print:hidden">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span className="text-gray-500">Carregando dados...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredRepasses.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <CreditCard className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-lg font-medium text-gray-900 mb-2">Nenhum registro encontrado</p>
                      <p className="text-gray-600">Adicione novos repasses para começar</p>
                    </td>
                  </tr>
                ) : (
                  filteredRepasses.map(repasse => (
                    <tr key={repasse.id} className="hover:bg-blue-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-blue-100 p-1.5 rounded-full">
                            <User size={14} className="text-blue-600" />
                          </div>
                          <span className="font-medium text-gray-900">{repasse.medico?.nome}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="bg-green-100 p-1.5 rounded-full">
                            <Building size={14} className="text-green-600" />
                          </div>
                          <span className="font-medium text-gray-900">{repasse.convenio?.nome}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          repasse.tipo === 'cirurgia'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {repasse.tipo === 'cirurgia' ? 'Cirurgia' : 'Consulta'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-700">{repasse.nome_paciente}</td>
                      <td className="px-6 py-4">
                        <span className="text-gray-900">{repasse.hospital?.nome}</span>
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        {new Date(repasse.data_cirurgia).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-green-600">R$ {repasse.valor.toFixed(2)}</span>
                      </td>
                      <td className="px-6 py-4 print:hidden">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onEdit(repasse)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => onDelete(repasse.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Excluir"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {filteredRepasses.length > 0 && (
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  {filteredRepasses.length} registro{filteredRepasses.length !== 1 ? 's' : ''}
                </div>
                <div className="text-lg font-bold text-gray-900">
                  Total: R$ {totalGeral.toFixed(2)}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
