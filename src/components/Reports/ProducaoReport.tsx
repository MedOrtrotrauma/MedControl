import React, { useState, useEffect } from 'react';
import {
  FileText, User, Calendar, DollarSign, Building, Pencil, Trash2, Plus,
  Filter, Printer, TrendingUp, Stethoscope, Scissors, ChevronDown, ChevronUp,
} from 'lucide-react';
import { dbHelpers } from '../../lib/supabase';
import { ProducaoConvenio, Medico, Convenio } from '../../types';

interface ProducaoReportProps {
  onEdit: (producao: ProducaoConvenio) => void;
  onDelete: (id: number) => void;
  onNew: () => void;
  selectedMonth?: string;
}

export const ProducaoReport: React.FC<ProducaoReportProps> = ({
  onEdit, onDelete, onNew, selectedMonth,
}) => {
  const [producoes, setProducoes] = useState<ProducaoConvenio[]>([]);
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [selectedMedico, setSelectedMedico] = useState('');
  const [selectedConvenio, setSelectedConvenio] = useState('');
  const [selectedTipo, setSelectedTipo] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [loading, setLoading] = useState(false);
  const [mesProducao, setMesProducao] = useState<string>(selectedMonth || '');
  const [showMonthSelector, setShowMonthSelector] = useState(false);

  useEffect(() => { if (selectedMonth) setMesProducao(selectedMonth); }, [selectedMonth]);
  useEffect(() => { void loadData(); }, [mesProducao, selectedMedico, selectedConvenio, selectedTipo, dataInicio, dataFim]);

  const generateMonthOptions = () => {
    const months: { value: string; label: string }[] = [];
    const today = new Date();
    for (let i = -12; i <= 3; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const value = d.toISOString().slice(0, 7);
      const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      months.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
    }
    return months;
  };

  const formatSelectedMonth = (m: string) => {
    if (!m) return 'Todos os meses';
    const [y, mo] = m.split('-');
    const d = new Date(Number(y), Number(mo) - 1, 1);
    return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  const formatDate = (d: string) => {
    if (!d) return '';
    const only = d.split('T')[0];
    const [y, m, day] = only.split('-');
    return y && m && day ? `${day}/${m}/${y}` : d;
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // Se há mês, usa o helper filtrado. Senão carrega todos + filtra em memória.
      let base: ProducaoConvenio[] = [];
      if (mesProducao) {
        const res = await dbHelpers.getProducaoConveniosByMonth(mesProducao);
        if (res.data) base = res.data;
      } else {
        // fallback: busca por todos os meses recentes via query direta
        const res = await dbHelpers.getProducaoConveniosAll?.();
        if (res?.data) base = res.data;
      }

      // filtros locais
      const filtered = base.filter((p) => {
        if (selectedMedico && p.medico_id !== Number(selectedMedico)) return false;
        if (selectedConvenio && p.convenio_id !== Number(selectedConvenio)) return false;
        if (selectedTipo && p.tipo !== selectedTipo) return false;
        if (dataInicio && p.data_atendimento < dataInicio) return false;
        if (dataFim && p.data_atendimento > dataFim) return false;
        return true;
      });
      setProducoes(filtered);

      const [medRes, convRes] = await Promise.all([
        dbHelpers.getMedicos(),
        dbHelpers.getConvenios(),
      ]);
      if (medRes.data) setMedicos(medRes.data);
      if (convRes.data) setConvenios(convRes.data);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    }
    setLoading(false);
  };

  const totalGeral = producoes.reduce((s, i) => s + Number(i.valor || 0), 0);
  const cincoPorCento = totalGeral * 0.05;

  const limparFiltros = () => {
    setSelectedMedico('');
    setSelectedConvenio('');
    setSelectedTipo('');
    setDataInicio('');
    setDataFim('');
    setMesProducao(selectedMonth || '');
  };

  const hasFilters =
    selectedMedico || selectedConvenio || selectedTipo || dataInicio || dataFim ||
    (mesProducao && mesProducao !== selectedMonth);

  const handlePrint = () => {
    const node = document.getElementById('relatorio-producao');
    if (!node) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`
      <html><head><title>Relatório de Produção</title>
      <style>
        body{font-family:Arial;margin:20px}table{width:100%;border-collapse:collapse;margin-top:20px}
        th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f2f2f2}
        .header{text-align:center;margin-bottom:20px}.print\\:hidden{display:none!important}
      </style></head><body>
      <div class="header">
        <h1>Relatório de Produção Mensal</h1>
        <p>Data: ${new Date().toLocaleDateString('pt-BR')}</p>
        ${mesProducao ? `<p>Mês: ${formatSelectedMonth(mesProducao)}</p>` : ''}
      </div>
      ${node.innerHTML}
      <p><strong>Total: R$ ${totalGeral.toFixed(2)} | 5%: R$ ${cincoPorCento.toFixed(2)} | ${producoes.length} registros</strong></p>
      </body></html>
    `);
    w.document.close();
    w.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white shadow-lg">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-lg">
              <TrendingUp className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-2xl font-bold">Relatório de Produção</h3>
              <p className="text-blue-100">Convênios</p>
              {mesProducao && <p className="text-blue-200 text-sm mt-1">{formatSelectedMonth(mesProducao)}</p>}
            </div>
          </div>
          <button onClick={onNew} className="bg-white/20 hover:bg-white/30 px-6 py-3 rounded-lg flex items-center gap-2">
            <Plus size={20} /> Nova Consulta
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
          <p className="text-green-100 text-sm">Total Arrecadado</p>
          <p className="text-2xl font-bold">R$ {totalGeral.toFixed(2)}</p>
        </div>
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
          <p className="text-blue-100 text-sm">Total de Registros</p>
          <p className="text-2xl font-bold">{producoes.length}</p>
        </div>
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
          <p className="text-purple-100 text-sm">5% do Total</p>
          <p className="text-2xl font-bold">R$ {cincoPorCento.toFixed(2)}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="bg-gray-100 p-2 rounded-lg"><Filter className="h-5 w-5 text-gray-600" /></div>
            <span className="font-semibold text-gray-800">Filtros</span>
          </div>
          {hasFilters && (
            <button onClick={limparFiltros} className="text-sm text-gray-600 hover:bg-gray-100 px-3 py-1 rounded">
              Limpar
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Mês</label>
            <div className="relative">
              <button
                onClick={() => setShowMonthSelector(!showMonthSelector)}
                className="w-full p-3 border rounded-lg text-left flex items-center justify-between bg-white"
              >
                <span className={mesProducao ? 'text-gray-900' : 'text-gray-500'}>
                  {formatSelectedMonth(mesProducao)}
                </span>
                {showMonthSelector ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {showMonthSelector && (
                <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg z-20 w-full max-h-60 overflow-y-auto">
                  <button
                    onClick={() => { setMesProducao(''); setShowMonthSelector(false); }}
                    className={`w-full text-left px-4 py-2 hover:bg-blue-50 ${!mesProducao ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-700'}`}
                  >
                    Todos os meses
                  </button>
                  {generateMonthOptions().map((m) => (
                    <button
                      key={m.value}
                      onClick={() => { setMesProducao(m.value); setShowMonthSelector(false); }}
                      className={`w-full text-left px-4 py-2 hover:bg-blue-50 ${m.value === mesProducao ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-700'}`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

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
            <select value={selectedConvenio} onChange={(e) => setSelectedConvenio(e.target.value)}
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

          <div className="flex gap-2 items-end lg:col-span-2">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Início</label>
              <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)}
                className="w-full p-3 border rounded-lg" />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Fim</label>
              <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)}
                className="w-full p-3 border rounded-lg" />
            </div>
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <button onClick={handlePrint} className="bg-gray-600 text-white px-6 py-3 rounded-lg flex items-center gap-2">
            <Printer size={20} /> Imprimir
          </button>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100" id="relatorio-producao">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h4 className="text-xl font-bold text-gray-900">
              Registros {mesProducao && `- ${formatSelectedMonth(mesProducao)}`}
            </h4>
            <div className="text-sm text-gray-500">{producoes.length} registro(s)</div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-50 to-blue-100">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-bold text-blue-800">Médico</th>
                <th className="px-6 py-4 text-left text-sm font-bold text-blue-800">Convênio</th>
                <th className="px-6 py-4 text-left text-sm font-bold text-blue-800">Tipo</th>
                <th className="px-6 py-4 text-left text-sm font-bold text-blue-800">Paciente</th>
                <th className="px-6 py-4 text-left text-sm font-bold text-blue-800">Data</th>
                <th className="px-6 py-4 text-left text-sm font-bold text-blue-800">Valor</th>
                <th className="px-6 py-4 text-left text-sm font-bold text-blue-800 print:hidden">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">Carregando...</td></tr>
              ) : producoes.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  <FileText className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                  Nenhum registro encontrado
                </td></tr>
              ) : producoes.map((p) => (
                <tr key={p.id} className="hover:bg-blue-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-100 p-1.5 rounded-full print:hidden"><User size={14} className="text-blue-600" /></div>
                      <div>
                        <div className="font-semibold text-gray-900">{p.medico?.nome}</div>
                        {p.medico?.crm && <div className="text-xs text-gray-500">CRM: {p.medico.crm}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-green-100 p-1.5 rounded-full print:hidden"><Building size={14} className="text-green-600" /></div>
                      <span className="font-medium text-gray-700">{p.convenio?.nome}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${p.tipo === 'cirurgia' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                      {p.tipo === 'cirurgia' ? <><Scissors size={12} className="print:hidden" />Cirurgia</> : <><Stethoscope size={12} className="print:hidden" />Consulta</>}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900">{p.nome_paciente}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-gray-400 print:hidden" />
                      <span className="font-medium text-gray-700">{formatDate(p.data_atendimento)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="bg-green-100 px-3 py-1 rounded-full w-fit">
                      <span className="font-bold text-green-700 text-sm">R$ {Number(p.valor).toFixed(2)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 print:hidden">
                    <div className="flex items-center gap-2">
                      <button onClick={() => onEdit(p)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg" title="Editar">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => onDelete(p.id)} className="p-2 text-red-600 hover:bg-red-100 rounded-lg" title="Excluir">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {producoes.length > 0 && (
          <div className="bg-gray-50 px-6 py-4 border-t flex justify-between items-center">
            <div className="text-sm text-gray-600">{producoes.length} registro(s)</div>
            <div className="flex gap-6 items-center">
              <div className="text-lg font-bold text-gray-900">Total: R$ {totalGeral.toFixed(2)}</div>
              <div className="bg-purple-100 px-4 py-2 rounded-lg">
                <div className="text-sm text-purple-600 font-medium">5%</div>
                <div className="text-lg font-bold text-purple-700">R$ {cincoPorCento.toFixed(2)}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
