import React, { useState } from 'react';
import {
  CreditCard, User, DollarSign, Building, TrendingUp, Printer,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import type {
  RepasseParticular, RepasseCirurgia, Medico,
} from '../../types';

type Modo = 'particular' | 'cirurgia';

interface RepasseReportProps {
  modo: Modo;
  particulares?: RepasseParticular[];
  cirurgias?: RepasseCirurgia[];
  medicos: Medico[];
  selectedMonth: string;
  formatSelectedMonth: (m: string) => string;
  onNew?: () => void;
  onEdit?: (item: RepasseParticular | RepasseCirurgia) => void;
  onDelete?: (id: number) => void;
}

export const RepasseReport: React.FC<RepasseReportProps> = ({
  modo, particulares = [], cirurgias = [], medicos, selectedMonth,
  formatSelectedMonth, onNew, onEdit, onDelete,
}) => {
  const [selectedMedico, setSelectedMedico] = useState('');
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const data = modo === 'particular' ? particulares : cirurgias;

  const filtered = data.filter((r) => !selectedMedico || r.medico_id === Number(selectedMedico));

  const totalArrecadado = filtered.reduce(
    (s, r) => s + ('valor_bruto' in r ? Number(r.valor_bruto) : Number(r.valor)), 0
  );
  const totalRepasse = filtered.reduce(
    (s, r) => s + Number(r.valor_repasse_medico || 0), 0
  );

  const grupos = medicos
    .map((medico) => {
      const linhas = filtered.filter((r) => r.medico_id === medico.id);
      if (linhas.length === 0) return null;
      const arrecadado = linhas.reduce(
        (s, r) => s + ('valor_bruto' in r ? Number(r.valor_bruto) : Number(r.valor)), 0
      );
      const repasse = linhas.reduce((s, r) => s + Number(r.valor_repasse_medico || 0), 0);
      return { medico, linhas, arrecadado, repasse };
    })
    .filter(Boolean) as Array<{ medico: Medico; linhas: any[]; arrecadado: number; repasse: number }>;

  const toggle = (id: number) => {
    const n = new Set(expanded);
    if (n.has(id)) n.delete(id); else n.add(id);
    setExpanded(n);
  };

  const renderLinha = (r: any) => {
    const dataStr = 'data_procedimento' in r ? r.data_procedimento : r.data_cirurgia;
    const valor = 'valor_bruto' in r ? Number(r.valor_bruto) : Number(r.valor);
    const proc = r.procedimento?.nome || r.procedimento_descricao || r.tipo_procedimento || '-';
    return (
      <tr key={r.id} className="hover:bg-gray-50">
        <td className="px-4 py-3 text-sm">{proc}</td>
        <td className="px-4 py-3 text-sm">{r.nome_paciente}</td>
        <td className="px-4 py-3 text-sm">{new Date(dataStr).toLocaleDateString('pt-BR')}</td>
        <td className="px-4 py-3 text-sm font-medium">R$ {valor.toFixed(2)}</td>
        <td className="px-4 py-3 text-sm font-bold text-green-600">R$ {Number(r.valor_repasse_medico || 0).toFixed(2)}</td>
        <td className="px-4 py-3 text-sm text-gray-600">{r.observacao || '-'}</td>
        {onEdit && onDelete && (
          <td className="px-4 py-3 print:hidden">
            <div className="flex gap-2">
              <button onClick={() => onEdit(r)} className="p-2 text-blue-600 hover:bg-blue-50 rounded">Editar</button>
              <button onClick={() => onDelete(r.id)} className="p-2 text-red-600 hover:bg-red-50 rounded">Excluir</button>
            </div>
          </td>
        )}
      </tr>
    );
  };

  return (
    <div className="space-y-6">
      <div className={`rounded-xl p-6 text-white shadow-lg ${modo === 'particular' ? 'bg-gradient-to-r from-emerald-600 to-teal-700' : 'bg-gradient-to-r from-indigo-600 to-indigo-700'}`}>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-lg"><CreditCard className="h-8 w-8" /></div>
            <div>
              <h3 className="text-2xl font-bold">
                Relatório {modo === 'particular' ? 'Particular' : 'Cirurgias'}
              </h3>
              <p className="opacity-80">{formatSelectedMonth(selectedMonth)}</p>
            </div>
          </div>
          {onNew && (
            <button onClick={onNew} className="bg-white/20 hover:bg-white/30 px-6 py-3 rounded-lg">
              Novo Lançamento
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
          <p className="text-green-100 text-sm">Total Arrecadado</p>
          <p className="text-2xl font-bold">R$ {totalArrecadado.toFixed(2)}</p>
        </div>
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
          <p className="text-blue-100 text-sm">Total Repasse</p>
          <p className="text-2xl font-bold">R$ {totalRepasse.toFixed(2)}</p>
        </div>
        <div className="bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-xl p-6 text-white shadow-lg">
          <p className="text-cyan-100 text-sm">Registros</p>
          <p className="text-2xl font-bold">{filtered.length}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-lg flex justify-between items-center">
        <div className="flex items-center gap-4">
          <span className="font-semibold text-gray-800">Filtro por médico:</span>
          <select value={selectedMedico} onChange={(e) => setSelectedMedico(e.target.value)}
            className="p-3 border rounded-lg">
            <option value="">Todos</option>
            {medicos.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
          </select>
        </div>
        <button onClick={() => window.print()} className="bg-gray-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 print:hidden">
          <Printer size={20} /> Imprimir
        </button>
      </div>

      <div className="space-y-4">
        {grupos.map((g) => (
          <div key={g.medico.id} className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden print:break-inside-avoid">
            <div className="p-6 bg-gray-50 cursor-pointer flex justify-between" onClick={() => toggle(g.medico.id)}>
              <div className="flex items-center gap-4">
                <div className="bg-blue-100 p-3 rounded-lg print:hidden"><User className="h-6 w-6 text-blue-600" /></div>
                <div>
                  <h4 className="text-xl font-bold">{g.medico.nome}</h4>
                  {g.medico.crm && <p className="text-sm text-gray-600">CRM: {g.medico.crm}</p>}
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-sm text-gray-600">Arrecadado</p>
                  <p className="text-xl font-bold">R$ {g.arrecadado.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Repasse</p>
                  <p className="text-xl font-bold text-green-600">R$ {g.repasse.toFixed(2)}</p>
                </div>
                <div className="print:hidden">
                  {expanded.has(g.medico.id) ? <ChevronUp /> : <ChevronDown />}
                </div>
              </div>
            </div>
            {(expanded.has(g.medico.id) || selectedMedico) && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Procedimento</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Paciente</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Data</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Valor</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Repasse</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Obs</th>
                      {onEdit && onDelete && <th className="px-4 py-3 print:hidden">Ações</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {g.linhas.map(renderLinha)}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
        {grupos.length === 0 && (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <CreditCard className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-lg font-medium">Nenhum registro</p>
          </div>
        )}
      </div>
    </div>
  );
};
