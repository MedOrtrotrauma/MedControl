import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Plus, DollarSign, TrendingUp, Search, Trash2, FileText, Filter, X,
  CreditCard, Banknote, Calculator,
} from 'lucide-react';
import { dbHelpers } from '../lib/supabase';
import { useAuth } from './Auth/AuthContext';
import { MoneyInput, parseMoney } from './Ui/MoneyInput';
import type { RepasseParticular, Medico, Unidade, Procedimento } from '../types';

const money = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0);

const PAYMENT_TAX_RATES: Record<string, { label: string; rates: number[]; defaultRate: number }> = {
  credito: { label: 'Cartão de Crédito', rates: [3.5, 4, 4.5, 5], defaultRate: 4 },
  debito: { label: 'Cartão de Débito', rates: [1.5, 2, 2.5], defaultRate: 2 },
  pix: { label: 'PIX', rates: [0], defaultRate: 0 },
  especie: { label: 'Dinheiro', rates: [0], defaultRate: 0 },
  deposito: { label: 'Depósito/Transferência', rates: [0], defaultRate: 0 },
};

interface FormData {
  date: string;
  medico_id: string;
  unidade_id: string;
  patient_name: string;
  procedure_id: string;
  procedure_description: string;
  gross_value: string;
  payment_method: string;
  payment_tax_rate: string;
  invoice_tax_rate: string;
  medication_cost: string;
  supplies_cost: string;
  other_costs: string;
  other_costs_description: string;
  observations: string;
  is_split_payment: boolean;
  cash_amount: string;
  other_payment_method: string;
  other_payment_tax_rate: string;
  cash_settlement_type: string;
  month_reference: string;
  valor_repasse_medico: string;
  check_conferencia: boolean;
  destinatario_tipo: 'socio' | 'terceiro';
}

const initialForm = (month: string): FormData => ({
  date: new Date().toISOString().slice(0, 10),
  medico_id: '',
  unidade_id: '',
  patient_name: '',
  procedure_id: '',
  procedure_description: '',
  gross_value: '',
  payment_method: 'pix',
  payment_tax_rate: '0',
  invoice_tax_rate: '5',
  medication_cost: '0',
  supplies_cost: '0',
  other_costs: '0',
  other_costs_description: '',
  observations: '',
  is_split_payment: false,
  cash_amount: '',
  other_payment_method: 'pix',
  other_payment_tax_rate: '0',
  cash_settlement_type: 'left_at_clinic',
  month_reference: month,
  valor_repasse_medico: '',
  check_conferencia: false,
  destinatario_tipo: 'socio',
});

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

const formatDate = (d: string) => (d ? d.split('T')[0].split('-').reverse().join('/') : '-');

export function RepasseParticularComponent() {
  const { perfil } = useAuth();
  const isAdmin = perfil?.tipo === 'administrativo';

  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [items, setItems] = useState<RepasseParticular[]>([]);
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [procedimentos, setProcedimentos] = useState<Procedimento[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<RepasseParticular | null>(null);
  const [search, setSearch] = useState('');
  const [filterMedico, setFilterMedico] = useState('');
  const [form, setForm] = useState<FormData>(initialForm(month));

  const load = useCallback(async () => {
    setLoading(true);
    const [res, medRes, uniRes, procRes] = await Promise.all([
      dbHelpers.getRepassesParticularesByMonth(month),
      dbHelpers.getMedicos(),
      dbHelpers.getUnidades(),
      dbHelpers.getProcedimentos(),
    ]);
    if (res.data) setItems(res.data);
    if (medRes.data) setMedicos(medRes.data);
    if (uniRes.data) setUnidades(uniRes.data);
    if (procRes.data) setProcedimentos(procRes.data);
    setLoading(false);
  }, [month]);

  useEffect(() => { void load(); }, [load]);

  const update = (field: keyof FormData, value: string | boolean) => {
    setForm((p) => {
      const next = { ...p, [field]: value };
      if (field === 'payment_method') {
        next.payment_tax_rate = String(PAYMENT_TAX_RATES[value as string]?.defaultRate ?? 0);
      }
      if (field === 'other_payment_method') {
        next.other_payment_tax_rate = String(PAYMENT_TAX_RATES[value as string]?.defaultRate ?? 0);
      }
      return next;
    });
  };

  const calc = useMemo(() => {
    const gross = parseMoney(form.gross_value);
    const isSplit =
      form.is_split_payment &&
      parseMoney(form.cash_amount) > 0 &&
      parseMoney(form.cash_amount) < gross;
    const effMethod = isSplit ? form.other_payment_method : form.payment_method;
    const effRate = isSplit ? Number(form.other_payment_tax_rate) || 0 : Number(form.payment_tax_rate) || 0;
    const paymentTaxAmount = (gross * effRate) / 100;
    const invoiceRate = Number(form.invoice_tax_rate) || 0;
    const invoiceTaxAmount = (gross * invoiceRate) / 100;
    const medCost = parseMoney(form.medication_cost);
    const supCost = parseMoney(form.supplies_cost);
    const othCost = parseMoney(form.other_costs);
    const totalDeductions = paymentTaxAmount + invoiceTaxAmount + medCost + supCost + othCost;
    const netClinic = gross - totalDeductions;
    const cashAmount =
      isSplit ? parseMoney(form.cash_amount) : form.payment_method === 'especie' ? gross : 0;
    return {
      gross, isSplit, effMethod, effRate, paymentTaxAmount, invoiceTaxAmount,
      medCost, supCost, othCost, totalDeductions, netClinic, cashAmount,
    };
  }, [form]);

  const openNew = () => {
    setEditing(null);
    setForm(initialForm(month));
    setShowForm(true);
  };

  const openEdit = (item: RepasseParticular) => {
    setEditing(item);
    setForm({
      date: item.data_procedimento,
      medico_id: String(item.medico_id),
      unidade_id: item.unidade_id ? String(item.unidade_id) : '',
      patient_name: item.nome_paciente,
      procedure_id: item.procedimento_id ? String(item.procedimento_id) : '',
      procedure_description: item.procedimento_descricao || '',
      gross_value: String(item.valor_bruto),
      payment_method: item.forma_pagamento,
      payment_tax_rate: String(item.payment_tax_rate),
      invoice_tax_rate: String(item.invoice_tax_rate),
      medication_cost: String(item.medication_cost),
      supplies_cost: String(item.supplies_cost),
      other_costs: String(item.other_costs),
      other_costs_description: item.other_costs_description || '',
      observations: item.observacao || '',
      is_split_payment: item.is_split_payment,
      cash_amount: String(item.cash_amount),
      other_payment_method: item.other_payment_method || 'pix',
      other_payment_tax_rate: '0',
      cash_settlement_type: 'left_at_clinic',
      month_reference: item.month_reference,
      valor_repasse_medico: String(item.valor_repasse_medico),
      check_conferencia: item.check_conferencia,
      destinatario_tipo: item.destinatario_tipo,
    });
    setShowForm(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.medico_id || !form.patient_name || !form.date) {
      alert('Preencha médico, paciente e data.');
      return;
    }
    setLoading(true);
    const payload = {
      medico_id: Number(form.medico_id),
      unidade_id: form.unidade_id ? Number(form.unidade_id) : null,
      nome_paciente: form.patient_name.trim(),
      data_procedimento: form.date,
      procedimento_id: form.procedure_id ? Number(form.procedure_id) : null,
      procedimento_descricao: form.procedure_description || null,
      destinatario_tipo: form.destinatario_tipo,
      forma_pagamento: form.payment_method as any,
      is_split_payment: calc.isSplit,
      cash_amount: calc.cashAmount,
      other_payment_method: calc.isSplit ? form.other_payment_method : null,
      installments: 1,
      valor_bruto: calc.gross,
      valor_recebido: calc.gross,
      payment_tax_rate: calc.isSplit ? Number(form.other_payment_tax_rate) : Number(form.payment_tax_rate),
      payment_tax_amount: calc.paymentTaxAmount,
      invoice_tax_rate: Number(form.invoice_tax_rate),
      invoice_tax_amount: calc.invoiceTaxAmount,
      medication_cost: calc.medCost,
      supplies_cost: calc.supCost,
      other_costs: calc.othCost,
      other_costs_description: form.other_costs_description || null,
      total_deductions: calc.totalDeductions,
      valor_liquido: calc.netClinic,
      valor_repasse_medico: parseMoney(form.valor_repasse_medico),
      check_conferencia: form.check_conferencia,
      status_pagamento: 'pendente' as const,
      data_pagamento: null,
      month_reference: form.month_reference,
      observacao: form.observations || null,
    };

    const r = editing
      ? await dbHelpers.updateRepasseParticular(editing.id, payload)
      : await dbHelpers.createRepasseParticular(payload);

    if (r.error) alert('Erro: ' + r.error.message);
    else { setShowForm(false); await load(); }
    setLoading(false);
  };

  const del = async (id: number) => {
    if (!window.confirm('Excluir este lançamento?')) return;
    const r = await dbHelpers.deleteRepasseParticular(id);
    if (r.error) alert('Erro: ' + r.error.message);
    else await load();
  };

  const filtered = items.filter((i) => {
    const t = `${i.nome_paciente} ${i.medico?.nome || ''}`.toLowerCase();
    return t.includes(search.toLowerCase()) && (!filterMedico || String(i.medico_id) === filterMedico);
  });

  const totalRecebido = filtered.reduce((s, i) => s + Number(i.valor_bruto || 0), 0);
  const totalRepasse = filtered.reduce((s, i) => s + Number(i.valor_repasse_medico || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Repasses Particulares</h2>
          <select value={month} onChange={(e) => setMonth(e.target.value)}
            className="mt-1 px-3 py-1 border rounded-lg">
            {generateMonthOptions().map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <button onClick={openNew}
          className="bg-emerald-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 shadow-lg">
          <Plus size={20} /> Novo Lançamento
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl p-6 text-white shadow-lg">
          <p className="text-emerald-100 text-sm">Valor Recebido</p>
          <p className="text-2xl font-bold">{money(totalRecebido)}</p>
        </div>
        <div className="bg-gradient-to-r from-teal-500 to-teal-600 rounded-xl p-6 text-white shadow-lg">
          <p className="text-teal-100 text-sm">Valor de Repasse</p>
          <p className="text-2xl font-bold">{money(totalRepasse)}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-lg">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full p-3 border rounded-lg pl-10" placeholder="Buscar..." />
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
          <select value={filterMedico} onChange={(e) => setFilterMedico(e.target.value)}
            className="p-3 border rounded-lg">
            <option value="">Todos os médicos</option>
            {medicos.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
          </select>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto p-4 pt-10"
          onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full p-6"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">
                {editing ? 'Editar Lançamento' : 'Novo Lançamento'}
              </h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 text-2xl"><X /></button>
            </div>
            <form onSubmit={save} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Mês *</label>
                <select value={form.month_reference}
                  onChange={(e) => update('month_reference', e.target.value)}
                  className="w-full p-3 border rounded-lg" required>
                  {generateMonthOptions().map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Unidade</label>
                <select value={form.unidade_id}
                  onChange={(e) => update('unidade_id', e.target.value)}
                  className="w-full p-3 border rounded-lg">
                  <option value="">Selecione</option>
                  {unidades.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Médico *</label>
                <select value={form.medico_id}
                  onChange={(e) => update('medico_id', e.target.value)}
                  className="w-full p-3 border rounded-lg" required>
                  <option value="">Selecione</option>
                  {medicos.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Vínculo</label>
                <select value={form.destinatario_tipo}
                  onChange={(e) => update('destinatario_tipo', e.target.value)}
                  className="w-full p-3 border rounded-lg">
                  <option value="socio">Sócio</option>
                  <option value="terceiro">Externo</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Paciente *</label>
                <input type="text" value={form.patient_name}
                  onChange={(e) => update('patient_name', e.target.value)}
                  className="w-full p-3 border rounded-lg" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Data *</label>
                <input type="date" value={form.date}
                  onChange={(e) => update('date', e.target.value)}
                  className="w-full p-3 border rounded-lg" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Procedimento</label>
                <select value={form.procedure_id}
                  onChange={(e) => update('procedure_id', e.target.value)}
                  className="w-full p-3 border rounded-lg">
                  <option value="">Selecione</option>
                  {procedimentos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Forma de Pagamento</label>
                <select value={form.payment_method}
                  onChange={(e) => update('payment_method', e.target.value)}
                  className="w-full p-3 border rounded-lg">
                  <option value="pix">Pix</option>
                  <option value="credito">Crédito</option>
                  <option value="debito">Débito</option>
                  <option value="especie">Espécie</option>
                  <option value="deposito">Depósito</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Valor Bruto *</label>
                <MoneyInput value={form.gross_value}
                  onChange={(v) => update('gross_value', v)}
                  className="w-full p-3 border rounded-lg" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Taxa Cartão (%)</label>
                <input type="number" step="0.01" value={form.payment_tax_rate}
                  onChange={(e) => update('payment_tax_rate', e.target.value)}
                  className="w-full p-3 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Imposto NF (%)</label>
                <input type="number" step="0.01" value={form.invoice_tax_rate}
                  onChange={(e) => update('invoice_tax_rate', e.target.value)}
                  className="w-full p-3 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Medicação</label>
                <MoneyInput value={form.medication_cost}
                  onChange={(v) => update('medication_cost', v)}
                  className="w-full p-3 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Materiais</label>
                <MoneyInput value={form.supplies_cost}
                  onChange={(v) => update('supplies_cost', v)}
                  className="w-full p-3 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Outros Custos</label>
                <MoneyInput value={form.other_costs}
                  onChange={(v) => update('other_costs', v)}
                  className="w-full p-3 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Valor de Repasse</label>
                <MoneyInput value={form.valor_repasse_medico}
                  onChange={(v) => update('valor_repasse_medico', v)}
                  className="w-full p-3 border rounded-lg" />
              </div>

              <div className="md:col-span-2 bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-semibold mb-2">Resumo</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div><span className="text-gray-500">Bruto:</span> {money(calc.gross)}</div>
                  <div><span className="text-gray-500">Deduções:</span> {money(calc.totalDeductions)}</div>
                  <div><span className="text-gray-500">Líquido:</span> {money(calc.netClinic)}</div>
                  <div><span className="text-gray-500">Repasse:</span> {money(parseMoney(form.valor_repasse_medico))}</div>
                </div>
              </div>

              <div className="md:col-span-2 flex items-center gap-3">
                <input type="checkbox" checked={form.check_conferencia} disabled={!isAdmin}
                  onChange={(e) => update('check_conferencia', e.target.checked)}
                  className="h-5 w-5" />
                <label className="text-sm font-medium">Conferido {!isAdmin && '(apenas admin)'}</label>
              </div>

              <div className="md:col-span-2 flex justify-end gap-3">
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-6 py-3 text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
                <button type="submit" disabled={loading}
                  className="px-6 py-3 bg-emerald-600 text-white rounded-lg disabled:opacity-50">
                  {loading ? 'Salvando...' : editing ? 'Salvar' : 'Salvar Lançamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-lg overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              {['Unidade','Data','Médico','Vínculo','Paciente','Procedimento','Pagto','Recebido','Repasse','Check','Ações'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={11} className="px-4 py-8 text-center">Carregando...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={11} className="px-4 py-8 text-center">Nenhum lançamento.</td></tr>
            ) : filtered.map((item) => {
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
                  <td className="px-4 py-3 text-sm text-right">{money(item.valor_bruto)}</td>
                  <td className="px-4 py-3 text-sm text-right text-teal-700">{money(item.valor_repasse_medico)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center justify-center w-5 h-5 rounded ${item.check_conferencia ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
                      {item.check_conferencia ? '✓' : ''}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex gap-1 justify-center">
                      <button onClick={() => openEdit(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded">
                        <FileText className="h-4 w-4" />
                      </button>
                      <button onClick={() => del(item.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          {filtered.length > 0 && (
            <tfoot className="bg-gray-50 border-t">
              <tr>
                <td colSpan={7} className="px-4 py-3 text-sm text-right font-medium">Totais:</td>
                <td className="px-4 py-3 text-sm text-right font-bold">{money(totalRecebido)}</td>
                <td className="px-4 py-3 text-sm text-right font-bold text-teal-700">{money(totalRepasse)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
