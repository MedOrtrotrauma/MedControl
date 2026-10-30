import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar, CalendarDays, Plus, DollarSign, TrendingUp, Search, Trash2, X,
  CreditCard, Banknote, Package, Pill, Calculator, AlertCircle, CheckCircle,
  ChevronDown, ChevronUp, FileText, Receipt,
} from 'lucide-react';
import { dbHelpers } from '../lib/supabase';
import { useAuth } from './Auth/AuthContext';
import type { Repasse, Medico, Unidade, Procedimento } from '../types';

const money = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0);

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
  procedure_type: string;
  gross_value: string;
  payment_method: string;
  payment_tax_rate: string;
  invoice_tax_rate: string;
  medication_cost: string;
  supplies_cost: string;
  other_costs: string;
  other_costs_description: string;
  installments: string;
  observations: string;
  is_split_payment: boolean;
  cash_amount: string;
  other_payment_method: string;
  other_payment_tax_rate: string;
  cash_settlement_type: string;
  month_reference: string;
}

const initialForm = (month: string): FormData => ({
  date: new Date().toISOString().slice(0, 10),
  medico_id: '',
  unidade_id: '',
  patient_name: '',
  procedure_type: '',
  gross_value: '',
  payment_method: 'pix',
  payment_tax_rate: '0',
  invoice_tax_rate: '5',
  medication_cost: '0',
  supplies_cost: '0',
  other_costs: '0',
  other_costs_description: '',
  installments: '1',
  observations: '',
  is_split_payment: false,
  cash_amount: '',
  other_payment_method: 'pix',
  other_payment_tax_rate: '0',
  cash_settlement_type: 'left_at_clinic',
  month_reference: month,
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

const monthLabel = (m: string) => {
  const [y, mo] = m.split('-');
  const names = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  return `${names[Number(mo) - 1] || mo}/${(y || '').slice(2)}`;
};

const formatDate = (d: string) => (d ? d.split('T')[0].split('-').reverse().join('/') : '-');

export function RepasseParticularComponent() {
  const { perfil } = useAuth();
  const isAdmin = perfil?.tipo === 'administrativo';

  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [showMonthSelector, setShowMonthSelector] = useState(false);
  const [items, setItems] = useState<Repasse[]>([]);
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [procedimentos, setProcedimentos] = useState<Procedimento[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Repasse | null>(null);
  const [search, setSearch] = useState('');
  const [filterMedico, setFilterMedico] = useState('');
  const [form, setForm] = useState<FormData>(initialForm(month));
  const [showSuccess, setShowSuccess] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [res, medRes, uniRes, procRes] = await Promise.all([
      dbHelpers.getRepassesParticularByMonth(month),
      dbHelpers.getMedicos(),
      dbHelpers.getUnidades(),
      dbHelpers.getProcedimentos(),
    ]);
    if (res.data) {
      setItems((res.data as Repasse[]).filter((r) => r.repasse_particular === true));
    }
    if (medRes.data) setMedicos(medRes.data as Medico[]);
    if (uniRes.data) setUnidades(uniRes.data as Unidade[]);
    if (procRes.data) setProcedimentos(procRes.data as Procedimento[]);
    setLoading(false);
  }, [month]);

  useEffect(() => { void load(); }, [load]);

  const update = (field: keyof FormData, value: string | boolean) => {
    setForm((p) => {
      const next = { ...p, [field]: value };
      if (field === 'payment_method') {
        const m = value as string;
        next.payment_tax_rate = String(PAYMENT_TAX_RATES[m]?.defaultRate ?? 0);
      }
      if (field === 'other_payment_method') {
        const m = value as string;
        next.other_payment_tax_rate = String(PAYMENT_TAX_RATES[m]?.defaultRate ?? 0);
      }
      return next;
    });
  };

  const calc = useMemo(() => {
    const gross = Number(form.gross_value) || 0;
    const isSplit = form.is_split_payment && Number(form.cash_amount) > 0 && Number(form.cash_amount) < gross;
    const effectiveMethod = isSplit ? form.other_payment_method : form.payment_method;
    const effectiveTaxRate = isSplit ? Number(form.other_payment_tax_rate) || 0 : Number(form.payment_tax_rate) || 0;
    const paymentTaxAmount = (gross * effectiveTaxRate) / 100;
    const invoiceTaxRate = Number(form.invoice_tax_rate) || 0;
    const invoiceTaxAmount = (gross * invoiceTaxRate) / 100;
    const medCost = Number(form.medication_cost) || 0;
    const supCost = Number(form.supplies_cost) || 0;
    const othCost = Number(form.other_costs) || 0;
    const totalDeductions = paymentTaxAmount + invoiceTaxAmount + medCost + supCost + othCost;
    const netClinic = gross - totalDeductions;
    const cashAmount = isSplit ? Number(form.cash_amount) : (form.payment_method === 'especie' ? gross : 0);
    return { gross, isSplit, effectiveMethod, effectiveTaxRate, paymentTaxAmount, invoiceTaxAmount, medCost, supCost, othCost, totalDeductions, netClinic, cashAmount };
  }, [form]);

  const openNew = () => {
    setEditing(null);
    setForm(initialForm(month));
    setShowForm(true);
  };

  const openEdit = (item: Repasse) => {
    setEditing(item);
    setForm({
      date: item.data_cirurgia || new Date().toISOString().slice(0, 10),
      medico_id: String(item.medico_id),
      unidade_id: item.unidade_id ? String(item.unidade_id) : '',
      patient_name: item.nome_paciente || '',
      procedure_type: item.tipo_procedimento || '',
      gross_value: String(item.valor || 0),
      payment_method: item.forma_pagamento || 'pix',
      payment_tax_rate: String(item.payment_tax_rate || 0),
      invoice_tax_rate: String(item.invoice_tax_rate || 0),
      medication_cost: String(item.medication_cost || 0),
      supplies_cost: String(item.supplies_cost || 0),
      other_costs: String(item.other_costs || 0),
      other_costs_description: item.other_costs_description || '',
      installments: String(item.installments || 1),
      observations: item.observacao || '',
      is_split_payment: item.is_split_payment || false,
      cash_amount: String(item.cash_amount || 0),
      other_payment_method: item.other_payment_method || 'pix',
      other_payment_tax_rate: '0',
      cash_settlement_type: item.cash_settlement_type || 'left_at_clinic',
      month_reference: item.month_reference || month,
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
    const gross = Number(form.gross_value) || 0;

    const payload = {
      medico_id: Number(form.medico_id),
      hospital_id: null,
      nome_paciente: form.patient_name.trim(),
      data_cirurgia: form.date,
      tipo: 'consulta' as const,
      is_particular: true,
      repasse_particular: true,
      tipo_procedimento_detalhado: 'cirurgia_particular' as const,
      tipo_procedimento: form.procedure_type || null,
      forma_pagamento: calc.isSplit ? 'mixed' : form.payment_method,
      quantidade: 1,
      valor: gross,
      valor_repasse_medico: calc.netClinic,
      unidade_id: form.unidade_id ? Number(form.unidade_id) : null,
      desconto_paciente: 0,
      desconto_cartao: 0,
      valor_glosa: 0,
      valor_recebido: gross,
      destinatario_tipo: 'socio' as const,
      auxilio_1: 0, auxilio_2: 0, taxa_1_5: 0, imposto_percentual: 0, outras_deducoes: 0,
      valor_liquido: calc.netClinic,
      percentual_terceiro: 0, valor_terceiro: 0, saldo_controle: 0,
      month_reference: form.month_reference,
      observacao: form.observations || null,
      status_pagamento: 'pendente' as const,
      data_pagamento: null,
      check_conferencia: false,
      is_split_payment: calc.isSplit,
      cash_amount: calc.cashAmount,
      other_payment_method: calc.isSplit ? form.other_payment_method : null,
      payment_tax_rate: calc.effectiveTaxRate,
      payment_tax_amount: calc.paymentTaxAmount,
      invoice_tax_rate: Number(form.invoice_tax_rate) || 0,
      invoice_tax_amount: calc.invoiceTaxAmount,
      medication_cost: calc.medCost,
      supplies_cost: calc.supCost,
      other_costs: calc.othCost,
      other_costs_description: form.other_costs_description || null,
      total_deductions: calc.totalDeductions,
      net_clinic_value: calc.netClinic,
      cash_settlement_type: (form.payment_method === 'especie' || calc.isSplit) ? form.cash_settlement_type : null,
      installments: Number(form.installments) || 1,
      has_medication: calc.medCost > 0,
      has_other_costs: calc.othCost > 0,
    };

    const result = editing
      ? await dbHelpers.updateRepasse(editing.id, payload)
      : await dbHelpers.createRepasse(payload);

    if (result.error) {
      alert('Erro ao salvar: ' + result.error.message);
    } else {
      setShowForm(false);
      setShowSuccess(true);
      await load();
    }
    setLoading(false);
  };

  const remove = async (id: number) => {
    if (!window.confirm('Excluir este lançamento?')) return;
    const res = await dbHelpers.deleteRepasse(id);
    if (res.error) alert('Erro ao excluir: ' + res.error.message);
    else await load();
  };

  const filtered = items.filter((item) => {
    const text = `${item.nome_paciente} ${item.medico?.nome || ''}`.toLowerCase();
    return text.includes(search.toLowerCase()) && (!filterMedico || String(item.medico_id) === filterMedico);
  });

  const totalBruto = filtered.reduce((s, i) => s + Number(i.valor || 0), 0);
  const totalDeducoes = filtered.reduce((s, i) => s + Number(i.total_deductions || 0), 0);
  const totalLiquido = filtered.reduce((s, i) => s + Number(i.net_clinic_value || i.valor_liquido || 0), 0);

  return (
    <div className="space-y-6">
      <style>{`
        .rp-section { background: #fff; border-radius: 14px; border: 1px solid #ede8f3; box-shadow: 0 1px 4px rgba(74,45,110,.06); }
        .rp-form-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
        .rp-form-grid .wide { grid-column: 1 / -1; }
        .rp-field label { display: block; font-size: 13px; font-weight: 500; color: #4b4458; margin-bottom: 5px; }
        .rp-field input, .rp-field select, .rp-field textarea {
          width: 100%; padding: 10px 12px; border: 1px solid #d4cde0; border-radius: 9px;
          font-size: 14px; color: #2b2236; background: #fff; transition: border-color .15s, box-shadow .15s;
        }
        .rp-field input:focus, .rp-field select:focus, .rp-field textarea:focus {
          outline: none; border-color: #4a2d6e; box-shadow: 0 0 0 3px rgba(74,45,110,.1);
        }
        .rp-calc { background: linear-gradient(135deg, #f6f2fb, #eef0f8); border-radius: 12px; padding: 20px; }
        .rp-calc-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
        .rp-calc-label { color: #6b6378; }
        .rp-calc-val { font-weight: 600; color: #2b2236; }
        .rp-calc-val.red { color: #b04545; }
        .rp-calc-val.green { color: #2e7d4f; }
        .rp-checkbox { display: flex; align-items: center; gap: 8px; cursor: pointer; }
        .rp-checkbox input { width: 18px; height: 18px; accent-color: #4a2d6e; }
        .rp-radio-group { display: flex; gap: 20px; padding: 4px 0; }
        .rp-radio { display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 14px; }
        .rp-radio input { accent-color: #4a2d6e; }
        .rp-costs-box { background: #f8f6fc; border-radius: 10px; padding: 16px; }
        .rp-costs-title { font-weight: 600; font-size: 15px; color: #4b4458; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
      `}</style>

      {/* Header */}
      <section className="hero-panel">
        <div>
          <div className="eyebrow"><Receipt size={15} /> Financeiro</div>
          <h1>Repasse particular</h1>
          <p>Controle financeiro de repasses particulares com pagamentos divididos e custos diretos.</p>
        </div>
        <div className="hero-actions">
          <label className="month-picker">
            <CalendarDays size={16} />
            <select value={month} onChange={(e) => setMonth(e.target.value)}>
              {generateMonthOptions().map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </label>
          <button className="button button-light" onClick={openNew}><Plus size={18} /> Novo lançamento</button>
        </div>
      </section>

      {/* Summary cards */}
      <section className="summary-grid">
        <div className="summary-card summary-amber">
          <span>Valor bruto</span><strong>{money(totalBruto)}</strong>
          <small>{filtered.length} lançamentos · {monthLabel(month)}</small><DollarSign />
        </div>
        <div className="summary-card summary-blue">
          <span>Total deduções</span><strong>{money(totalDeducoes)}</strong>
          <small>Taxas, impostos e custos diretos</small><AlertCircle />
        </div>
        <div className="summary-card summary-green">
          <span>Líquido clínica</span><strong>{money(totalLiquido)}</strong>
          <small>Após todas as deduções</small><TrendingUp />
        </div>
      </section>

      {/* Filters */}
      <section className="filter-panel">
        <div className="filter-heading"><Search size={17} /><strong>Filtrar lançamentos</strong></div>
        <div className="filter-grid">
          <label className="search-field"><Search size={16} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar paciente ou médico" />
          </label>
          <select value={filterMedico} onChange={(e) => setFilterMedico(e.target.value)}>
            <option value="">Todos os médicos</option>
            {medicos.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
          </select>
        </div>
      </section>

      {/* Table */}
      <div className="rp-section">
        <div className="overflow-x-auto">
          <table className="w-full" style={{ fontSize: 13 }}>
            <thead style={{ background: '#f8f6fc', borderBottom: '1px solid #ede8f3' }}>
              <tr>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#6b6378' }}>Data</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#6b6378' }}>Médico</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#6b6378' }}>Paciente</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#6b6378' }}>Procedimento</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#6b6378' }}>Pagamento</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#6b6378' }}>Bruto</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#6b6378' }}>Deduções</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#6b6378' }}>Líquido</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#6b6378' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ padding: 32, textAlign: 'center', color: '#9a93a6' }}>Carregando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} style={{ padding: 32, textAlign: 'center', color: '#9a93a6' }}>
                  <FileText size={32} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                  <div>Nenhum lançamento para {monthLabel(month)}.</div>
                </td></tr>
              ) : filtered.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #f0edf4', transition: 'background .12s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#faf9fc')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '10px 16px' }}>{formatDate(item.data_cirurgia)}</td>
                  <td style={{ padding: '10px 16px', fontWeight: 500 }}>{item.medico?.nome || '-'}</td>
                  <td style={{ padding: '10px 16px' }}>{item.nome_paciente}</td>
                  <td style={{ padding: '10px 16px' }}>{item.tipo_procedimento || '-'}</td>
                  <td style={{ padding: '10px 16px' }}>
                    {item.is_split_payment ? 'Dividido' : (item.forma_pagamento || '-')}
                    {item.is_split_payment && item.cash_amount ? ` (${money(Number(item.cash_amount))} + ${item.other_payment_method || '-'})` : ''}
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600 }}>{money(Number(item.valor))}</td>
                  <td style={{ padding: '10px 16px', textAlign: 'right', color: '#b04545' }}>{money(Number(item.total_deductions))}</td>
                  <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600, color: '#2e7d4f' }}>{money(Number(item.net_clinic_value || item.valor_liquido))}</td>
                  <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 4 }}>
                      <button onClick={() => openEdit(item)} style={{ padding: 6, color: '#4a6bae', borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer' }} title="Editar">
                        <FileText size={15} />
                      </button>
                      <button onClick={() => remove(item.id)} style={{ padding: 6, color: '#b04545', borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer' }} title="Excluir">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            {filtered.length > 0 && (
              <tfoot style={{ background: '#f8f6fc', borderTop: '2px solid #ede8f3' }}>
                <tr>
                  <td colSpan={5} style={{ padding: '10px 16px', fontWeight: 600, textAlign: 'right' }}>Totais:</td>
                  <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700 }}>{money(totalBruto)}</td>
                  <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: '#b04545' }}>{money(totalDeducoes)}</td>
                  <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: '#2e7d4f' }}>{money(totalLiquido)}</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Modal: Form */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" style={{ maxWidth: 900 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="eyebrow">{editing ? 'Editar' : 'Novo lançamento'}</span>
                <h2>Repasse particular</h2>
              </div>
              <button className="icon-button" onClick={() => setShowForm(false)}><X size={18} /></button>
            </div>

            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: 12, marginBottom: 16, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <AlertCircle size={18} style={{ color: '#d97706', flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 13, color: '#92400e', margin: 0 }}>Registro gerencial para análise da clínica. Não afeta o fluxo de caixa.</p>
            </div>

            <form onSubmit={save}>
              <div className="rp-form-grid">
                <div className="rp-field">
                  <label>Data *</label>
                  <input type="date" value={form.date} onChange={(e) => update('date', e.target.value)} required />
                </div>
                <div className="rp-field">
                  <label>Mês de referência *</label>
                  <select value={form.month_reference} onChange={(e) => update('month_reference', e.target.value)} required>
                    {generateMonthOptions().map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div className="rp-field">
                  <label>Médico *</label>
                  <select value={form.medico_id} onChange={(e) => update('medico_id', e.target.value)} required>
                    <option value="">Selecione</option>
                    {medicos.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
                  </select>
                </div>
                <div className="rp-field">
                  <label>Unidade</label>
                  <select value={form.unidade_id} onChange={(e) => update('unidade_id', e.target.value)}>
                    <option value="">Selecione</option>
                    {unidades.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
                  </select>
                </div>
                <div className="rp-field">
                  <label>Paciente *</label>
                  <input type="text" value={form.patient_name} onChange={(e) => update('patient_name', e.target.value)} required placeholder="Nome do paciente" />
                </div>
                <div className="rp-field">
                  <label>Procedimento</label>
                  <select value={form.procedure_type} onChange={(e) => update('procedure_type', e.target.value)}>
                    <option value="">Selecione</option>
                    {procedimentos.map((p) => <option key={p.id} value={p.nome}>{p.nome}</option>)}
                  </select>
                </div>
                <div className="rp-field">
                  <label>Valor bruto (R$) *</label>
                  <input type="number" min="0" step="0.01" value={form.gross_value} onChange={(e) => update('gross_value', e.target.value)} required placeholder="0,00" />
                </div>
              </div>

              {/* Split payment */}
              <div style={{ marginTop: 16 }}>
                <label className="rp-checkbox">
                  <input type="checkbox" checked={form.is_split_payment} onChange={(e) => update('is_split_payment', e.target.checked)} />
                  <span style={{ fontSize: 14, fontWeight: 500, color: '#4b4458' }}>Pagamento dividido (parte em dinheiro + cartão/PIX)</span>
                </label>
              </div>

              <div className="rp-form-grid" style={{ marginTop: 12 }}>
                {!form.is_split_payment ? (
                  <div className="rp-field">
                    <label>Método de pagamento *</label>
                    <select value={form.payment_method} onChange={(e) => update('payment_method', e.target.value)}>
                      {Object.entries(PAYMENT_TAX_RATES).map(([key, val]) => (
                        <option key={key} value={key}>{val.label}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <>
                    <div className="rp-field">
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Banknote size={16} style={{ color: '#2e7d4f' }} /> Valor em dinheiro *
                      </label>
                      <input type="number" min="0" step="0.01" value={form.cash_amount} onChange={(e) => update('cash_amount', e.target.value)} placeholder="0,00" required={form.is_split_payment} />
                      <p style={{ fontSize: 11, color: '#9a93a6', margin: '4px 0 0' }}>Adiantamento ao médico no ato</p>
                    </div>
                    <div className="rp-field">
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <CreditCard size={16} style={{ color: '#4a6bae' }} /> Outro método (restante) *
                      </label>
                      <select value={form.other_payment_method} onChange={(e) => update('other_payment_method', e.target.value)} required={form.is_split_payment}>
                        <option value="credito">Cartão de Crédito</option>
                        <option value="debito">Cartão de Débito</option>
                        <option value="pix">PIX</option>
                        <option value="deposito">Depósito/Transferência</option>
                      </select>
                    </div>
                  </>
                )}

                {!form.is_split_payment && form.payment_method !== 'especie' && form.payment_method !== 'pix' && (
                  <div className="rp-field">
                    <label>Taxa da operadora (%)</label>
                    <select value={form.payment_tax_rate} onChange={(e) => update('payment_tax_rate', e.target.value)}>
                      {PAYMENT_TAX_RATES[form.payment_method]?.rates.map((r) => (
                        <option key={r} value={r}>{r}%</option>
                      ))}
                    </select>
                  </div>
                )}

                {form.is_split_payment && form.other_payment_method !== 'pix' && form.other_payment_method !== 'especie' && (
                  <div className="rp-field">
                    <label>Taxa do {PAYMENT_TAX_RATES[form.other_payment_method]?.label} (%)</label>
                    <select value={form.other_payment_tax_rate} onChange={(e) => update('other_payment_tax_rate', e.target.value)}>
                      {PAYMENT_TAX_RATES[form.other_payment_method]?.rates.map((r) => (
                        <option key={r} value={r}>{r}%</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="rp-field">
                  <label>Parcelas</label>
                  <select value={form.installments} onChange={(e) => update('installments', e.target.value)}>
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map((n) => <option key={n} value={n}>{n}x</option>)}
                  </select>
                </div>
                <div className="rp-field">
                  <label>Alíquota de imposto (ISS, etc) %</label>
                  <input type="number" min="0" step="0.01" value={form.invoice_tax_rate} onChange={(e) => update('invoice_tax_rate', e.target.value)} placeholder="Ex: 5" />
                </div>
              </div>

              {/* Cash settlement */}
              {(form.payment_method === 'especie' || form.is_split_payment) && (
                <div className="rp-form-grid" style={{ marginTop: 12 }}>
                  <div className="rp-field wide">
                    <label>Destino do dinheiro recebido:</label>
                    <div className="rp-radio-group">
                      <label className="rp-radio">
                        <input type="radio" value="left_at_clinic" checked={form.cash_settlement_type === 'left_at_clinic'} onChange={(e) => update('cash_settlement_type', e.target.value)} />
                        <span>Médico deixou na clínica (repasse depois)</span>
                      </label>
                      <label className="rp-radio">
                        <input type="radio" value="doctor_took" checked={form.cash_settlement_type === 'doctor_took'} onChange={(e) => update('cash_settlement_type', e.target.value)} />
                        <span>Médico levou no dia</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Direct costs */}
              <div className="rp-costs-box" style={{ marginTop: 16 }}>
                <div className="rp-costs-title"><Package size={18} /> Custos diretos (opcional)</div>
                <div className="rp-form-grid">
                  <div className="rp-field">
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Pill size={16} style={{ color: '#4a6bae' }} /> Medicação</label>
                    <input type="number" min="0" step="0.01" value={form.medication_cost} onChange={(e) => update('medication_cost', e.target.value)} placeholder="0,00" />
                  </div>
                  <div className="rp-field">
                    <label>Insumos</label>
                    <input type="number" min="0" step="0.01" value={form.supplies_cost} onChange={(e) => update('supplies_cost', e.target.value)} placeholder="0,00" />
                  </div>
                  <div className="rp-field">
                    <label>Outros custos</label>
                    <input type="number" min="0" step="0.01" value={form.other_costs} onChange={(e) => update('other_costs', e.target.value)} placeholder="0,00" />
                  </div>
                  <div className="rp-field">
                    <label>Descrição outros custos</label>
                    <input type="text" value={form.other_costs_description} onChange={(e) => update('other_costs_description', e.target.value)} placeholder="Ex: Material de consumo" />
                  </div>
                </div>
              </div>

              <div className="rp-form-grid" style={{ marginTop: 12 }}>
                <div className="rp-field wide">
                  <label>Observações</label>
                  <textarea rows={2} value={form.observations} onChange={(e) => update('observations', e.target.value)} placeholder="Observações adicionais..." style={{ width: '100%', padding: '10px 12px', border: '1px solid #d4cde0', borderRadius: 9, fontSize: 14, fontFamily: 'inherit', resize: 'vertical' }} />
                </div>
              </div>

              {/* Financial preview */}
              <div className="rp-calc" style={{ marginTop: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Calculator size={20} style={{ color: '#4a2d6e' }} /> Demonstrativo financeiro
                </div>
                <div className="rp-calc-row">
                  <span className="rp-calc-label">Valor bruto</span>
                  <span className="rp-calc-val">{money(calc.gross)}</span>
                </div>
                {calc.paymentTaxAmount > 0 && (
                  <div className="rp-calc-row">
                    <span className="rp-calc-label">Taxa da operadora ({calc.effectiveTaxRate}%)</span>
                    <span className="rp-calc-val red">-{money(calc.paymentTaxAmount)}</span>
                  </div>
                )}
                {calc.invoiceTaxAmount > 0 && (
                  <div className="rp-calc-row">
                    <span className="rp-calc-label">Imposto ({Number(form.invoice_tax_rate)}%)</span>
                    <span className="rp-calc-val red">-{money(calc.invoiceTaxAmount)}</span>
                  </div>
                )}
                {calc.medCost > 0 && (
                  <div className="rp-calc-row">
                    <span className="rp-calc-label">Medicação</span>
                    <span className="rp-calc-val red">-{money(calc.medCost)}</span>
                  </div>
                )}
                {calc.supCost > 0 && (
                  <div className="rp-calc-row">
                    <span className="rp-calc-label">Insumos</span>
                    <span className="rp-calc-val red">-{money(calc.supCost)}</span>
                  </div>
                )}
                {calc.othCost > 0 && (
                  <div className="rp-calc-row">
                    <span className="rp-calc-label">Outros custos</span>
                    <span className="rp-calc-val red">-{money(calc.othCost)}</span>
                  </div>
                )}
                <div className="rp-calc-row" style={{ borderTop: '2px solid #d4cde0', marginTop: 8, paddingTop: 12 }}>
                  <span className="rp-calc-label" style={{ fontWeight: 600 }}>Total de deduções</span>
                  <span className="rp-calc-val red" style={{ fontSize: 16 }}>-{money(calc.totalDeductions)}</span>
                </div>
                <div className="rp-calc-row" style={{ marginTop: 4 }}>
                  <span className="rp-calc-label" style={{ fontWeight: 700, fontSize: 16 }}>Líquido para a clínica</span>
                  <span className={`rp-calc-val ${calc.netClinic < 0 ? 'red' : 'green'}`} style={{ fontSize: 20 }}>{calc.netClinic < 0 && '-'}{money(Math.abs(calc.netClinic))}</span>
                </div>
              </div>

              <div className="form-actions wide" style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button type="button" className="button button-muted" onClick={() => setShowForm(false)}>Cancelar</button>
                <button type="submit" className="button button-primary" disabled={loading}>
                  {loading ? 'Salvando...' : editing ? 'Salvar alterações' : 'Registrar lançamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success modal */}
      {showSuccess && (
        <div className="modal-overlay" onClick={() => setShowSuccess(false)}>
          <div className="modal-content" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#e8f5e9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <CheckCircle size={28} style={{ color: '#2e7d4f' }} />
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: '#2b2236', marginBottom: 4 }}>Lançamento registrado!</h3>
              <p style={{ fontSize: 14, color: '#6b6378', marginBottom: 16 }}>O repasse particular foi salvo com sucesso.</p>
              <div style={{ background: '#f6f2fb', borderRadius: 10, padding: 12, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 14 }}>
                  <span style={{ color: '#6b6378' }}>Valor bruto</span>
                  <strong>{money(calc.gross)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 14 }}>
                  <span style={{ color: '#6b6378' }}>Deduções</span>
                  <strong style={{ color: '#b04545' }}>-{money(calc.totalDeductions)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 16, borderTop: '2px solid #d4cde0', marginTop: 4, paddingTop: 8 }}>
                  <span style={{ fontWeight: 600 }}>Líquido clínica</span>
                  <strong style={{ color: calc.netClinic < 0 ? '#b04545' : '#2e7d4f' }}>{money(calc.netClinic)}</strong>
                </div>
              </div>
              <button className="button button-primary" style={{ width: '100%' }} onClick={() => setShowSuccess(false)}>Continuar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
