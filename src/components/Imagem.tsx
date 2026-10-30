import React, { useState, useEffect } from 'react';
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  TrendingUp,
} from 'lucide-react';
import { dbHelpers } from '../lib/supabase';
import type { Medico, Hospital, RepasseImagem } from '../types';

const money = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);

const num = (v: string) => Math.max(0, Number(v.replace(',', '.')) || 0);

const generateMonthOptions = () => {
  const months: { value: string; label: string }[] = [];
  const today = new Date();
  for (let i = -6; i <= 3; i++) {
    const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
    const value = date.toISOString().slice(0, 7);
    const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    months.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }
  return months;
};

const formatSelectedMonth = (month: string) => {
  const [year, monthNum] = month.split('-');
  const date = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
};

export const ImagemComponent: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState<string>(() => new Date().toISOString().slice(0, 7));
  const [showMonthSelector, setShowMonthSelector] = useState(false);

  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [hospitais, setHospitais] = useState<Hospital[]>([]);
  const [repassesImagem, setRepassesImagem] = useState<RepasseImagem[]>([]);
  const [repasseImagemLoading, setRepasseImagemLoading] = useState(false);

  const [imagemClinica, setImagemClinica] = useState('');
  const [imagemImposto, setImagemImposto] = useState('6.15');
  const [imagemMedico, setImagemMedico] = useState('');
  const [imagemTotal, setImagemTotal] = useState('');
  const [editingRepasseImagem, setEditingRepasseImagem] = useState<RepasseImagem | null>(null);

  useEffect(() => {
    void loadData();
    void loadRepassesImagem();
  }, [selectedMonth]);

  const loadData = async () => {
    const [medicosRes, hospitaisRes] = await Promise.all([
      dbHelpers.getMedicos(),
      dbHelpers.getHospitais(),
    ]);
    if (medicosRes.data) setMedicos(medicosRes.data);
    if (hospitaisRes.data) setHospitais(hospitaisRes.data);
  };

  const loadRepassesImagem = async () => {
    setRepasseImagemLoading(true);
    try {
      const result = await dbHelpers.getRepassesImagemByMonth(selectedMonth);
      if (result.data) setRepassesImagem(result.data as RepasseImagem[]);
    } catch (error) {
      console.error('Erro ao carregar repasses imagem:', error);
    }
    setRepasseImagemLoading(false);
  };

  const resetRepasseImagemForm = () => {
    setEditingRepasseImagem(null);
    setImagemMedico('');
    setImagemTotal('');
  };

  const openRepasseImagemEdit = (item: RepasseImagem) => {
    setEditingRepasseImagem(item);
    setImagemClinica(String(item.hospital_id));
    setImagemMedico(String(item.medico_id));
    setImagemTotal(String(item.total));
    setImagemImposto(String(item.imposto_percentual));
  };

  const saveRepasseImagem = async (e: React.FormEvent) => {
    e.preventDefault();
    const total = num(imagemTotal);
    const imposto = num(imagemImposto);
    if (!imagemClinica || !imagemMedico || total <= 0) {
      alert('Selecione a clínica, o médico e informe um total maior que zero.');
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
    const result = editingRepasseImagem
      ? await dbHelpers.updateRepasseImagem(editingRepasseImagem.id, payload)
      : await dbHelpers.createRepasseImagem(payload);

    if (result.error) {
      alert('Erro ao salvar: ' + result.error.message);
    } else {
      resetRepasseImagemForm();
      await loadRepassesImagem();
    }
    setRepasseImagemLoading(false);
  };

  const deleteRepasseImagem = async (id: number) => {
    if (!window.confirm('Excluir este lançamento de repasse imagem?')) return;
    setRepasseImagemLoading(true);
    const result = await dbHelpers.deleteRepasseImagem(id);
    if (result.error) alert('Erro ao excluir: ' + result.error.message);
    await loadRepassesImagem();
    setRepasseImagemLoading(false);
  };

  const imagemRowsFiltradas = repassesImagem.filter(
    (item) => !imagemClinica || String(item.hospital_id) === imagemClinica,
  );

  const totalClinica = imagemRowsFiltradas.reduce((s, i) => s + Number(i.total || 0), 0);
  const totalImposto = imagemRowsFiltradas.reduce(
    (s, i) => s + (Number(i.total || 0) * Number(i.imposto_percentual || 0) / 100), 0,
  );
  const totalSemImposto = imagemRowsFiltradas.reduce(
    (s, i) => s + Number(i.total || 0) * (1 - Number(i.imposto_percentual || 0) / 100), 0,
  );
  const totalClinica50 = imagemRowsFiltradas.reduce(
    (s, i) => s + Number(i.total || 0) * (1 - Number(i.imposto_percentual || 0) / 100) / 2, 0,
  );
  const totalRepasse50 = totalClinica50;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-2 rounded-lg">
            <TrendingUp className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Repasse Imagem</h2>
            <div className="relative mt-1">
              <button
                onClick={() => setShowMonthSelector(!showMonthSelector)}
                className="flex items-center gap-2 px-3 py-1 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Calendar className="h-4 w-4 text-gray-600" />
                <span className="font-medium text-gray-700">{formatSelectedMonth(selectedMonth)}</span>
                {showMonthSelector ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {showMonthSelector && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 w-48">
                  {generateMonthOptions().map((month) => (
                    <button
                      key={month.value}
                      onClick={() => { setSelectedMonth(month.value); setShowMonthSelector(false); }}
                      className={`w-full text-left px-4 py-2 hover:bg-blue-50 transition-colors ${
                        month.value === selectedMonth ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-700'
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
      </div>

      {/* Filtro clínica + imposto + total */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <div className="flex flex-col lg:flex-row lg:items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Clínica</label>
            <select
              value={imagemClinica}
              onChange={(e) => setImagemClinica(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Selecione a clínica</option>
              {hospitais.map((hospital) => (
                <option key={hospital.id} value={hospital.id}>{hospital.nome}</option>
              ))}
            </select>
          </div>
          <div className="w-full lg:w-48">
            <label className="block text-sm font-medium text-gray-700 mb-2">Imposto (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={imagemImposto}
              onChange={(e) => setImagemImposto(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="bg-blue-50 rounded-lg px-5 py-3 min-w-[220px]">
            <p className="text-xs font-medium uppercase tracking-wide text-blue-600">Total da clínica</p>
            <p className="text-2xl font-bold text-blue-800">{money(totalClinica)}</p>
          </div>
        </div>
      </div>

      {/* Formulário novo lançamento */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Lançamentos da clínica</h3>
            <p className="text-sm text-gray-500">Informe o total por médico para calcular o repasse automaticamente.</p>
          </div>
          {editingRepasseImagem && (
            <button type="button" onClick={resetRepasseImagemForm} className="text-sm text-gray-500 hover:text-gray-800">Cancelar edição</button>
          )}
        </div>
        <form onSubmit={saveRepasseImagem} className="grid grid-cols-1 md:grid-cols-[1fr_220px_auto] gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Médico</label>
            <select
              value={imagemMedico}
              onChange={(e) => setImagemMedico(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Selecione o médico</option>
              {medicos.map((medico) => (
                <option key={medico.id} value={medico.id}>{medico.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Total</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={imagemTotal}
              onChange={(e) => setImagemTotal(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0,00"
              required
            />
          </div>
          <button
            type="submit"
            disabled={repasseImagemLoading || !imagemClinica}
            className="px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50"
          >
            {editingRepasseImagem ? 'Salvar alteração' : 'Adicionar linha'}
          </button>
        </form>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th colSpan={2} className="px-4 py-3 text-left text-sm font-semibold text-gray-700">MÉDICO</th>
                <th colSpan={2} className="px-4 py-3 text-right text-sm font-semibold text-gray-700">TOTAL</th>
                <th colSpan={2} className="px-4 py-3 text-right text-sm font-semibold text-gray-700">IMPOSTO {Number(imagemImposto).toFixed(2).replace('.', ',')} %</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">TOTAL S/ IMPOSTO</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">CLÍNICA 50%</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">REPASSE 50%</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {repasseImagemLoading ? (
                <tr><td colSpan={11} className="px-6 py-10 text-center text-gray-500">Carregando lançamentos...</td></tr>
              ) : !imagemClinica ? (
                <tr><td colSpan={11} className="px-6 py-10 text-center text-gray-500">Selecione uma clínica para visualizar os lançamentos.</td></tr>
              ) : imagemRowsFiltradas.length === 0 ? (
                <tr><td colSpan={11} className="px-6 py-10 text-center text-gray-500">Nenhum lançamento para esta clínica em {formatSelectedMonth(selectedMonth)}.</td></tr>
              ) : (
                imagemRowsFiltradas.map((item) => {
                  const total = Number(item.total || 0);
                  const imposto = total * Number(item.imposto_percentual || 0) / 100;
                  const semImposto = total - imposto;
                  const metade = semImposto / 2;
                  return (
                    <tr key={item.id} className="hover:bg-blue-50 transition-colors">
                      <td colSpan={2} className="px-4 py-3 text-sm font-medium text-gray-900">{item.medico?.nome || '-'}</td>
                      <td colSpan={2} className="px-4 py-3 text-sm text-right font-medium text-gray-900">{money(total)}</td>
                      <td colSpan={2} className="px-4 py-3 text-sm text-right text-red-600">{money(imposto)}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">{money(semImposto)}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-blue-700">{money(metade)}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-emerald-700">{money(metade)}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openRepasseImagemEdit(item)} className="px-2 py-1 text-blue-600 hover:bg-blue-50 rounded text-xs">Editar</button>
                          <button onClick={() => deleteRepasseImagem(item.id)} className="px-2 py-1 text-red-600 hover:bg-red-50 rounded text-xs">Excluir</button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {imagemRowsFiltradas.length > 0 && (
              <tfoot className="bg-gray-50 border-t border-gray-200">
                <tr>
                  <td colSpan={2} className="px-4 py-3 text-sm font-bold text-gray-700">Total</td>
                  <td colSpan={2} className="px-4 py-3 text-sm text-right font-bold text-gray-900">{money(totalClinica)}</td>
                  <td colSpan={2} className="px-4 py-3 text-sm text-right font-bold text-red-600">{money(totalImposto)}</td>
                  <td className="px-4 py-3 text-sm text-right font-bold text-gray-900">{money(totalSemImposto)}</td>
                  <td className="px-4 py-3 text-sm text-right font-bold text-blue-700">{money(totalClinica50)}</td>
                  <td className="px-4 py-3 text-sm text-right font-bold text-emerald-700">{money(totalRepasse50)}</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
