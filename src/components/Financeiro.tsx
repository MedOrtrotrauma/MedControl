import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowDownCircle, ArrowLeft, ArrowUpCircle, CalendarClock, CalendarDays, Check, ChevronDown, ClipboardList, DollarSign, CreditCard as Edit3, FileText, FolderTree, LayoutDashboard, Plus, Receipt, Search, Tag, Trash2, Wallet, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from './Auth/AuthContext';
import { MoneyInput, parseMoney } from './Ui/MoneyInput';

type FinanceType = 'expense' | 'income';
type FinanceStatus = 'pending' | 'paid';
type FinanceView = 'dashboard' | 'bills' | 'categories';

type FinanceCategory = {
  id: string;
  name: string;
  type: FinanceType;
  active: boolean;
};

type FinanceSubcategory = {
  id: string;
  category_id: string;
  name: string;
  active: boolean;
};

type FinanceBill = {
  id: string;
  description: string;
  type: FinanceType;
  category_id: string | null;
  subcategory_id: string | null;
  amount: number;
  origin: string | null;
  due_date: string | null;
  payment_date: string | null;
  status: FinanceStatus;
  month_ref: number;
  year_ref: number;
  recurring: boolean;
  notes: string | null;
  category?: FinanceCategory | null;
  subcategory?: FinanceSubcategory | null;
};

type BillForm = {
  description: string;
  type: FinanceType;
  category_id: string;
  subcategory_id: string;
  amount: string;
  origin: string;
  due_date: string;
  payment_date: string;
  status: FinanceStatus;
  month_ref: string;
  year_ref: string;
  recurring: boolean;
  notes: string;
};

type CategoryForm = { name: string; type: FinanceType; active: boolean };
type SubcategoryForm = { name: string; category_id: string; active: boolean };

const money = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);

const formatDate = (value: string | null) => {
  if (!value) return '—';
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
};

const monthLabel = (month: number, year: number) =>
  new Date(year, month - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

const monthKey = (month: number, year: number) => `${year}-${String(month).padStart(2, '0')}`;

const monthOptions = Array.from({ length: 12 }, (_, index) => ({
  value: String(index + 1),
  label: new Date(2000, index, 1).toLocaleDateString('pt-BR', { month: 'long' }),
}));

const emptyBill = (month: number, year: number): BillForm => ({
  description: '',
  type: 'expense',
  category_id: '',
  subcategory_id: '',
  amount: '',
  origin: '',
  due_date: '',
  payment_date: '',
  status: 'pending',
  month_ref: String(month),
  year_ref: String(year),
  recurring: false,
  notes: '',
});

const categoryColors = ['bg-blue-50 text-blue-700', 'bg-emerald-50 text-emerald-700', 'bg-amber-50 text-amber-700', 'bg-rose-50 text-rose-700', 'bg-slate-100 text-slate-700'];

function ModalShell({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/45 p-4 pt-8" onClick={onClose}>
      <div className={`w-full ${wide ? 'max-w-5xl' : 'max-w-xl'} rounded-2xl bg-white shadow-2xl`} onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="Fechar">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function MonthDetailsModal({ month, year, bills, categories, onClose }: { month: number; year: number; bills: FinanceBill[]; categories: FinanceCategory[]; onClose: () => void }) {
  const entries = bills.filter((bill) => bill.month_ref === month && bill.year_ref === year);
  const income = entries.filter((bill) => bill.type === 'income').reduce((sum, bill) => sum + Number(bill.amount), 0);
  const expenses = entries.filter((bill) => bill.type === 'expense').reduce((sum, bill) => sum + Number(bill.amount), 0);
  const saldoAnterior = bills.reduce((sum, bill) => {
    const before = bill.year_ref < year || (bill.year_ref === year && bill.month_ref < month);
    if (!before) return sum;
    return sum + (bill.type === 'income' ? Number(bill.amount) : -Number(bill.amount));
  }, 0);
  const saldoMes = saldoAnterior + income - expenses;
  const groups = new Map<string, { label: string; total: number; entries: FinanceBill[] }>();

  entries.filter((bill) => bill.type === 'expense').forEach((bill) => {
    const label = bill.category?.name || categories.find((category) => category.id === bill.category_id)?.name || 'Sem categoria';
    const group = groups.get(label) || { label, total: 0, entries: [] };
    group.total += Number(bill.amount);
    group.entries.push(bill);
    groups.set(label, group);
  });

  return (
    <ModalShell title={`Detalhes de ${monthLabel(month, year)}`} onClose={onClose} wide>
      <div className="max-h-[78vh] overflow-y-auto p-6">
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Saldo inicial</span>
            <strong className="mt-2 block text-2xl text-slate-800">{money(saldoAnterior)}</strong>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Entradas</span>
            <strong className="mt-2 block text-2xl text-emerald-700">{money(income)}</strong>
          </div>
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
            <span className="text-xs font-semibold uppercase tracking-wide text-rose-700">Saídas</span>
            <strong className="mt-2 block text-2xl text-rose-700">{money(expenses)}</strong>
          </div>
          <div className={`rounded-xl border p-4 ${saldoMes >= 0 ? 'border-blue-200 bg-blue-50' : 'border-amber-200 bg-amber-50'}`}>
            <span className={`text-xs font-semibold uppercase tracking-wide ${saldoMes >= 0 ? 'text-blue-700' : 'text-amber-700'}`}>Saldo final</span>
            <strong className={`mt-2 block text-2xl ${saldoMes >= 0 ? 'text-blue-700' : 'text-amber-700'}`}>{money(saldoMes)}</strong>
          </div>
        </div>

        {entries.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-10 text-center text-slate-500">Nenhum lançamento neste mês.</div>
        ) : (
          <div className="space-y-4">
            {Array.from(groups.values()).map((group, index) => (
              <div key={group.label} className={`rounded-xl border p-4 ${categoryColors[index % categoryColors.length]}`}>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-bold">{group.label}</h3>
                  <strong>{money(group.total)}</strong>
                </div>
                <div className="space-y-2">
                  {group.entries.map((bill) => (
                    <div key={bill.id} className="flex items-center justify-between rounded-lg bg-white/80 px-3 py-2 text-sm text-slate-700">
                      <div><strong>{bill.description}</strong><span className="ml-2 text-xs text-slate-400">{formatDate(bill.due_date)}</span></div>
                      <span className="font-semibold text-rose-700">-{money(Number(bill.amount))}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {entries.filter((bill) => bill.type === 'income').length > 0 && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="mb-3 flex items-center justify-between"><h3 className="font-bold text-emerald-800">Entradas</h3><strong className="text-emerald-700">{money(income)}</strong></div>
                <div className="space-y-2">
                  {entries.filter((bill) => bill.type === 'income').map((bill) => (
                    <div key={bill.id} className="flex items-center justify-between rounded-lg bg-white/80 px-3 py-2 text-sm text-slate-700"><strong>{bill.description}</strong><span className="font-semibold text-emerald-700">+{money(Number(bill.amount))}</span></div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="border-t border-slate-100 bg-slate-50 p-4"><button type="button" onClick={onClose} className="button button-primary w-full">Fechar</button></div>
    </ModalShell>
  );
}

export function FinanceiroComponent({ onBack }: { onBack: () => void }) {
  const { perfil } = useAuth();
  const isAdmin = perfil?.tipo === 'administrativo';
  const today = new Date();
  const [view, setView] = useState<FinanceView>('dashboard');
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [bills, setBills] = useState<FinanceBill[]>([]);
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [subcategories, setSubcategories] = useState<FinanceSubcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [billModalOpen, setBillModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<FinanceBill | null>(null);
  const [billForm, setBillForm] = useState<BillForm>(emptyBill(month, year));
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [subcategoryModalOpen, setSubcategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<FinanceCategory | null>(null);
  const [editingSubcategory, setEditingSubcategory] = useState<FinanceSubcategory | null>(null);
  const [categoryForm, setCategoryForm] = useState<CategoryForm>({ name: '', type: 'expense', active: true });
  const [subcategoryForm, setSubcategoryForm] = useState<SubcategoryForm>({ name: '', category_id: '', active: true });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [payModal, setPayModal] = useState<{ bill: FinanceBill; date: string } | null>(null);

  const loadData = useCallback(async () => {
    if (!isAdmin) { setLoading(false); return; }
    setLoading(true);
    const [billResult, categoryResult, subcategoryResult] = await Promise.all([
      supabase.from('finance_bills').select('*, category:finance_categories(*), subcategory:finance_subcategories(*)').order('year_ref', { ascending: false }).order('month_ref', { ascending: false }).order('due_date', { ascending: true }),
      supabase.from('finance_categories').select('*').order('name'),
      supabase.from('finance_subcategories').select('*').order('name'),
    ]);
    if (billResult.error || categoryResult.error || subcategoryResult.error) {
      setError('Não foi possível carregar os dados financeiros.');
    } else {
      setBills((billResult.data ?? []) as FinanceBill[]);
      setCategories((categoryResult.data ?? []) as FinanceCategory[]);
      setSubcategories((subcategoryResult.data ?? []) as FinanceSubcategory[]);
      setError('');
    }
    setLoading(false);
  }, [isAdmin]);

  useEffect(() => { void loadData(); }, [loadData]);

  const currentBills = useMemo(() => bills.filter((bill) => bill.month_ref === month && bill.year_ref === year), [bills, month, year]);
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const isOverdue = useCallback((bill: FinanceBill) => bill.type === 'expense' && bill.status === 'pending' && !!bill.due_date && bill.due_date < todayStr, [todayStr]);
  const overdueBills = useMemo(() => bills.filter(isOverdue).sort((a, b) => (a.due_date || '').localeCompare(b.due_date || '')), [bills, isOverdue]);
  const dueTodayBills = useMemo(() => bills.filter((bill) => bill.type === 'expense' && bill.status === 'pending' && bill.due_date === todayStr), [bills, todayStr]);
  const filteredBills = useMemo(() => bills.filter((bill) => {
    if (search && !bill.description.toLowerCase().includes(search.toLowerCase())) return false;
    if (categoryFilter && bill.category_id !== categoryFilter) return false;
    if (statusFilter === 'overdue') {
      if (!isOverdue(bill)) return false;
    } else {
      if (statusFilter && bill.status !== statusFilter) return false;
      if (bill.month_ref !== month || bill.year_ref !== year) return false;
    }
    return true;
  }), [bills, search, statusFilter, categoryFilter, month, year, isOverdue]);
  const totalIncome = currentBills.filter((bill) => bill.type === 'income').reduce((sum, bill) => sum + Number(bill.amount), 0);
  const totalExpenses = currentBills.filter((bill) => bill.type === 'expense').reduce((sum, bill) => sum + Number(bill.amount), 0);
  const paidExpenses = currentBills.filter((bill) => bill.type === 'expense' && bill.status === 'paid').reduce((sum, bill) => sum + Number(bill.amount), 0);
  const pendingExpenses = currentBills.filter((bill) => bill.type === 'expense' && bill.status === 'pending').reduce((sum, bill) => sum + Number(bill.amount), 0);
  const saldoInicial = bills.reduce((sum, bill) => {
    const anterior = bill.year_ref < year || (bill.year_ref === year && bill.month_ref < month);
    if (!anterior) return sum;
    return sum + (bill.type === 'income' ? Number(bill.amount) : -Number(bill.amount));
  }, 0);
  const saldoFinal = saldoInicial + totalIncome - totalExpenses;
  const billSubcategories = subcategories.filter((subcategory) => subcategory.category_id === billForm.category_id);

  const showError = () => setError('Não foi possível concluir esta ação. Verifique os dados e tente novamente.');

  const openNewBill = () => {
    setEditingBill(null);
    setBillForm(emptyBill(month, year));
    setError('');
    setBillModalOpen(true);
  };

  const openEditBill = (bill: FinanceBill) => {
    setEditingBill(bill);
    setBillForm({
      description: bill.description,
      type: bill.type,
      category_id: bill.category_id || '',
      subcategory_id: bill.subcategory_id || '',
      amount: String(bill.amount),
      origin: bill.origin || '',
      due_date: bill.due_date || '',
      payment_date: bill.payment_date || '',
      status: bill.status,
      month_ref: String(bill.month_ref),
      year_ref: String(bill.year_ref),
      recurring: bill.recurring,
      notes: bill.notes || '',
    });
    setError('');
    setBillModalOpen(true);
  };

  const saveBill = async () => {
    const amount = parseMoney(billForm.amount);
    const monthRef = Number(billForm.month_ref);
    const yearRef = Number(billForm.year_ref);
    if (!billForm.description.trim() || !amount || monthRef < 1 || monthRef > 12 || yearRef < 2000) {
      setError('Preencha a descrição, um valor maior que zero e uma referência válida.');
      return;
    }
    const payload = {
      description: billForm.description.trim(),
      type: billForm.type,
      category_id: billForm.category_id || null,
      subcategory_id: billForm.subcategory_id || null,
      amount,
      origin: billForm.origin.trim() || null,
      due_date: billForm.due_date || null,
      payment_date: billForm.payment_date || null,
      status: billForm.status,
      month_ref: monthRef,
      year_ref: yearRef,
      recurring: billForm.recurring,
      notes: billForm.notes.trim() || null,
    };
    const result = editingBill
      ? await supabase.from('finance_bills').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editingBill.id)
      : await supabase.from('finance_bills').insert(payload);
    if (result.error) { showError(); return; }
    setBillModalOpen(false);
    await loadData();
  };

  const reopenBill = async (bill: FinanceBill) => {
    const result = await supabase.from('finance_bills').update({ status: 'pending', payment_date: null, updated_at: new Date().toISOString() }).eq('id', bill.id);
    if (result.error) showError(); else await loadData();
  };

  const confirmPayBill = async () => {
    if (!payModal) return;
    const result = await supabase.from('finance_bills').update({ status: 'paid', payment_date: payModal.date, updated_at: new Date().toISOString() }).eq('id', payModal.bill.id);
    if (result.error) { showError(); return; }
    setPayModal(null);
    await loadData();
  };

  const removeBill = async (bill: FinanceBill) => {
    if (!window.confirm(`Excluir a conta "${bill.description}"?`)) return;
    const result = await supabase.from('finance_bills').delete().eq('id', bill.id);
    if (result.error) showError(); else await loadData();
  };

  const openNewCategory = () => {
    setEditingCategory(null);
    setCategoryForm({ name: '', type: 'expense', active: true });
    setError('');
    setCategoryModalOpen(true);
  };

  const openEditCategory = (category: FinanceCategory) => {
    setEditingCategory(category);
    setCategoryForm({ name: category.name, type: category.type, active: category.active });
    setError('');
    setCategoryModalOpen(true);
  };

  const saveCategory = async () => {
    if (!categoryForm.name.trim()) { setError('Informe o nome da categoria.'); return; }
    const payload = { name: categoryForm.name.trim(), type: categoryForm.type, active: categoryForm.active, updated_at: new Date().toISOString() };
    const result = editingCategory
      ? await supabase.from('finance_categories').update(payload).eq('id', editingCategory.id)
      : await supabase.from('finance_categories').insert(payload);
    if (result.error) { showError(); return; }
    setCategoryModalOpen(false);
    await loadData();
  };

  const removeCategory = async (category: FinanceCategory) => {
    if (subcategories.some((subcategory) => subcategory.category_id === category.id) || bills.some((bill) => bill.category_id === category.id)) {
      setError('Esta categoria ainda está vinculada a lançamentos ou subcategorias.');
      return;
    }
    if (!window.confirm(`Excluir a categoria "${category.name}"?`)) return;
    const result = await supabase.from('finance_categories').delete().eq('id', category.id);
    if (result.error) showError(); else await loadData();
  };

  const openNewSubcategory = () => {
    setEditingSubcategory(null);
    setSubcategoryForm({ name: '', category_id: categories[0]?.id || '', active: true });
    setError('');
    setSubcategoryModalOpen(true);
  };

  const openEditSubcategory = (subcategory: FinanceSubcategory) => {
    setEditingSubcategory(subcategory);
    setSubcategoryForm({ name: subcategory.name, category_id: subcategory.category_id, active: subcategory.active });
    setError('');
    setSubcategoryModalOpen(true);
  };

  const saveSubcategory = async () => {
    if (!subcategoryForm.name.trim() || !subcategoryForm.category_id) { setError('Informe o nome e a categoria.'); return; }
    const payload = { name: subcategoryForm.name.trim(), category_id: subcategoryForm.category_id, active: subcategoryForm.active, updated_at: new Date().toISOString() };
    const result = editingSubcategory
      ? await supabase.from('finance_subcategories').update(payload).eq('id', editingSubcategory.id)
      : await supabase.from('finance_subcategories').insert(payload);
    if (result.error) { showError(); return; }
    setSubcategoryModalOpen(false);
    await loadData();
  };

  const removeSubcategory = async (subcategory: FinanceSubcategory) => {
    if (bills.some((bill) => bill.subcategory_id === subcategory.id)) {
      setError('Esta subcategoria ainda está vinculada a lançamentos.');
      return;
    }
    if (!window.confirm(`Excluir a subcategoria "${subcategory.name}"?`)) return;
    const result = await supabase.from('finance_subcategories').delete().eq('id', subcategory.id);
    if (result.error) showError(); else await loadData();
  };

  if (!isAdmin) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6"><div className="rounded-2xl bg-white p-8 text-center shadow-lg"><h1 className="text-xl font-bold text-slate-900">Acesso restrito</h1><p className="mt-2 text-slate-500">O ambiente Financeiro está disponível apenas para administradores.</p><button type="button" className="button button-primary mt-6" onClick={onBack}>Voltar</button></div></div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur md:px-8">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4">
          <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/20"><Wallet size={22} /></div><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Ambiente</p><h1 className="text-xl font-extrabold text-slate-900">Financeiro</h1></div></div>
          <button type="button" className="button button-muted" onClick={onBack}><ArrowLeft size={16} /> Ir para o operacional</button>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] p-4 md:p-8">
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="text-sm font-semibold text-blue-600">Controle financeiro</p><h2 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-950">Visão geral</h2><p className="mt-2 text-sm text-slate-500">Acompanhe contas, categorias e o resultado mensal da clínica.</p></div><div className="flex flex-wrap items-center gap-2"><label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600"><CalendarDays size={16} className="text-blue-600" /><select value={month} onChange={(event) => setMonth(Number(event.target.value))} className="border-0 bg-transparent p-0 text-sm font-semibold capitalize outline-none">{monthOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><select value={year} onChange={(event) => setYear(Number(event.target.value))} className="border-0 bg-transparent p-0 text-sm font-semibold outline-none"><option value={today.getFullYear() - 1}>{today.getFullYear() - 1}</option><option value={today.getFullYear()}>{today.getFullYear()}</option><option value={today.getFullYear() + 1}>{today.getFullYear() + 1}</option></select></label><button type="button" className="button button-primary" onClick={openNewBill}><Plus size={17} /> Nova conta</button></div></div>

        <nav className="mb-6 flex flex-wrap gap-2 border-b border-slate-200"><button type="button" onClick={() => setView('dashboard')} className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold ${view === 'dashboard' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><LayoutDashboard size={17} /> Dashboard</button><button type="button" onClick={() => setView('bills')} className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold ${view === 'bills' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><Receipt size={17} /> Contas a pagar</button><button type="button" onClick={() => setView('categories')} className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold ${view === 'categories' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><Tag size={17} /> Categorias</button></nav>

        {error && <div className="mb-5 flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700"><span>{error}</span><button type="button" onClick={() => setError('')}><X size={16} /></button></div>}

        {!loading && (overdueBills.length > 0 || dueTodayBills.length > 0) && (
          <div className="mb-5 space-y-2">
            {overdueBills.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                <span className="flex items-center gap-2"><AlertTriangle size={16} /> {overdueBills.length} conta(s) vencida(s) — total {money(overdueBills.reduce((sum, bill) => sum + Number(bill.amount), 0))}</span>
                <button type="button" className="button button-muted" onClick={() => { setView('bills'); setStatusFilter('overdue'); }}>Ver contas</button>
              </div>
            )}
            {dueTodayBills.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
                <span className="flex items-center gap-2"><CalendarClock size={16} /> {dueTodayBills.length} conta(s) vencendo hoje — total {money(dueTodayBills.reduce((sum, bill) => sum + Number(bill.amount), 0))}</span>
                <button type="button" className="button button-muted" onClick={() => { setView('bills'); setStatusFilter('pending'); }}>Ver contas</button>
              </div>
            )}
          </div>
        )}

        {loading ? <div className="rounded-2xl bg-white p-12 text-center text-slate-500 shadow-sm">Carregando financeiro...</div> : view === 'dashboard' ? (
          <div className="space-y-6">
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"><div className="rounded-2xl bg-emerald-600 p-5 text-white shadow-lg shadow-emerald-600/15"><div className="mb-4 flex items-center justify-between"><span className="text-sm font-semibold text-emerald-100">Receitas</span><ArrowUpCircle size={21} /></div><strong className="block text-2xl">{money(totalIncome)}</strong><small className="mt-2 block text-emerald-100">{currentBills.filter((bill) => bill.type === 'income').length} lançamentos</small></div><div className="rounded-2xl bg-rose-600 p-5 text-white shadow-lg shadow-rose-600/15"><div className="mb-4 flex items-center justify-between"><span className="text-sm font-semibold text-rose-100">Despesas pagas</span><ArrowDownCircle size={21} /></div><strong className="block text-2xl">{money(paidExpenses)}</strong><small className="mt-2 block text-rose-100">Contas quitadas</small></div><div className="rounded-2xl bg-amber-500 p-5 text-white shadow-lg shadow-amber-500/15"><div className="mb-4 flex items-center justify-between"><span className="text-sm font-semibold text-amber-100">Pendentes</span><Receipt size={21} /></div><strong className="block text-2xl">{money(pendingExpenses)}</strong><small className="mt-2 block text-amber-100">A pagar no mês</small></div><div className={`rounded-2xl p-5 text-white shadow-lg ${saldoFinal >= 0 ? 'bg-blue-700 shadow-blue-700/15' : 'bg-slate-800 shadow-slate-800/15'}`}><div className="mb-4 flex items-center justify-between"><span className="text-sm font-semibold text-blue-100">Saldo acumulado</span><DollarSign size={21} /></div><strong className="block text-2xl">{money(saldoFinal)}</strong><small className="mt-2 block text-blue-100">Saldo inicial: {money(saldoInicial)}</small></div></section>
            <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1.3fr_.7fr]"><div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-wide text-blue-600">Competência selecionada</p><h3 className="mt-1 text-xl font-bold capitalize text-slate-900">{monthLabel(month, year)}</h3></div><button type="button" className="button button-muted" onClick={() => setDetailsOpen(true)}><FileText size={16} /> Ver detalhes</button></div><div className="space-y-3"><div className="flex items-center justify-between border-b border-slate-100 pb-3 text-sm"><span className="text-slate-500">Saldo inicial (acumulado anterior)</span><strong className="text-slate-900">{money(saldoInicial)}</strong></div><div className="flex items-center justify-between border-b border-slate-100 pb-3 text-sm"><span className="text-slate-500">Entradas do mês</span><strong className="text-emerald-700">{money(totalIncome)}</strong></div><div className="flex items-center justify-between border-b border-slate-100 pb-3 text-sm"><span className="text-slate-500">Total de despesas</span><strong className="text-slate-900">{money(totalExpenses)}</strong></div><div className="flex items-center justify-between text-sm"><span className="text-slate-500">Saldo final (leva para o próximo mês)</span><strong className={saldoFinal >= 0 ? 'text-blue-700' : 'text-rose-700'}>{money(saldoFinal)}</strong></div></div></div><div className="space-y-6">{overdueBills.length > 0 && (<div className="rounded-2xl border border-rose-200 bg-white p-6 shadow-sm"><div className="mb-4 flex items-center gap-2"><AlertTriangle size={18} className="text-rose-600" /><h3 className="font-bold text-slate-900">Pagamentos vencidos</h3><span className="ml-auto rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">{overdueBills.length}</span></div><div className="space-y-3">{overdueBills.slice(0, 5).map((bill) => <div key={bill.id} className="flex items-center justify-between gap-3 rounded-xl bg-rose-50 p-3"><div className="min-w-0"><strong className="block truncate text-sm text-slate-800">{bill.description}</strong><span className="text-xs text-rose-600">Venceu em {formatDate(bill.due_date)}</span></div><span className="shrink-0 text-sm font-bold text-rose-700">{money(Number(bill.amount))}</span></div>)}</div>{overdueBills.length > 5 && <button type="button" className="button button-muted mt-3 w-full" onClick={() => { setView('bills'); setStatusFilter('overdue'); }}>Ver todas as {overdueBills.length} contas vencidas</button>}</div>)}<div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="mb-4 flex items-center gap-2"><ClipboardList size={18} className="text-blue-600" /><h3 className="font-bold text-slate-900">Próximos vencimentos</h3></div><div className="space-y-3">{currentBills.filter((bill) => bill.type === 'expense' && bill.status === 'pending' && (!bill.due_date || bill.due_date >= todayStr)).sort((a, b) => (a.due_date || '').localeCompare(b.due_date || '')).slice(0, 5).map((bill) => <div key={bill.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3"><div className="min-w-0"><strong className="block truncate text-sm text-slate-800">{bill.description}</strong><span className="text-xs text-slate-500">Vence em {formatDate(bill.due_date)}</span></div><span className="shrink-0 text-sm font-bold text-rose-700">{money(Number(bill.amount))}</span></div>)}{currentBills.filter((bill) => bill.type === 'expense' && bill.status === 'pending' && (!bill.due_date || bill.due_date >= todayStr)).length === 0 && <p className="py-5 text-center text-sm text-slate-500">Nenhuma conta a vencer neste mês.</p>}</div></div></div></section>
          </div>
        ) : view === 'bills' ? (
          <section className="space-y-5"><div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="grid grid-cols-1 gap-3 md:grid-cols-[1.5fr_1fr_1fr_auto]"><label className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar conta..." className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500" /></label><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500"><option value="">Todos os status</option><option value="pending">Pendente</option><option value="paid">Paga</option><option value="overdue">Vencidas</option></select><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500"><option value="">Todas as categorias</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select><button type="button" className="button button-primary" onClick={openNewBill}><Plus size={16} /> Nova conta</button></div></div><div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Descrição</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3">Categoria</th><th className="px-4 py-3 text-right">Valor</th><th className="px-4 py-3">Vencimento</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Ações</th></tr></thead><tbody className="divide-y divide-slate-100">{filteredBills.length === 0 ? <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-500">Nenhuma conta encontrada para {monthLabel(month, year)}.</td></tr> : filteredBills.map((bill) => <tr key={bill.id} className="transition hover:bg-slate-50"><td className="px-4 py-3"><strong className="block text-slate-900">{bill.description}</strong>{bill.origin && <span className="text-xs text-slate-400">{bill.origin}</span>}</td><td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${bill.type === 'expense' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>{bill.type === 'expense' ? 'Despesa' : 'Receita'}</span></td><td className="px-4 py-3 text-slate-600">{bill.category?.name || categories.find((category) => category.id === bill.category_id)?.name || 'Sem categoria'}</td><td className="px-4 py-3 text-right font-bold text-slate-900">{money(Number(bill.amount))}</td><td className="px-4 py-3 text-slate-600">{formatDate(bill.due_date)}</td><td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${bill.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : isOverdue(bill) ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>{bill.status === 'paid' ? 'Paga' : isOverdue(bill) ? 'Vencida' : 'Pendente'}</span></td><td className="px-4 py-3"><div className="flex justify-end gap-1">{bill.status === 'pending' && <button type="button" onClick={() => setPayModal({ bill, date: bill.payment_date || todayStr })} className="button button-primary" style={{ padding: '6px 12px', fontSize: 13 }}><Check size={14} /> Pago</button>}{bill.status === 'paid' && <button type="button" onClick={() => void reopenBill(bill)} className="button button-muted" style={{ padding: '6px 12px', fontSize: 13 }}>Reabrir</button>}<button type="button" onClick={() => openEditBill(bill)} className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-700" aria-label="Editar"><Edit3 size={16} /></button><button type="button" onClick={() => void removeBill(bill)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-700" aria-label="Excluir"><Trash2 size={16} /></button></div></td></tr>)}</tbody></table></div></div></section>
        ) : (
          <section className="grid grid-cols-1 gap-6 lg:grid-cols-2"><div><div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Categorias</h3><button type="button" className="button button-primary" onClick={openNewCategory}><Plus size={16} /> Nova categoria</button></div><div className="space-y-3">{categories.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-slate-500">Nenhuma categoria cadastrada.</div> : categories.map((category) => <div key={category.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center gap-3"><div className={`grid h-10 w-10 place-items-center rounded-xl ${category.type === 'expense' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}><Tag size={18} /></div><div><strong className="block text-slate-900">{category.name}</strong><span className="text-xs text-slate-500">{category.type === 'expense' ? 'Despesa' : 'Receita'} · {category.active ? 'Ativa' : 'Inativa'}</span></div></div><div className="flex gap-1"><button type="button" onClick={() => openEditCategory(category)} className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-700"><Edit3 size={16} /></button><button type="button" onClick={() => void removeCategory(category)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-700"><Trash2 size={16} /></button></div></div>)}</div></div><div><div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Subcategorias</h3><button type="button" className="button button-muted" onClick={openNewSubcategory}><Plus size={16} /> Nova subcategoria</button></div><div className="space-y-3">{subcategories.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-slate-500">Nenhuma subcategoria cadastrada.</div> : subcategories.map((subcategory) => <div key={subcategory.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-600"><FolderTree size={18} /></div><div><strong className="block text-slate-900">{subcategory.name}</strong><span className="text-xs text-slate-500">{categories.find((category) => category.id === subcategory.category_id)?.name || 'Sem categoria'} · {subcategory.active ? 'Ativa' : 'Inativa'}</span></div></div><div className="flex gap-1"><button type="button" onClick={() => openEditSubcategory(subcategory)} className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-700"><Edit3 size={16} /></button><button type="button" onClick={() => void removeSubcategory(subcategory)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-700"><Trash2 size={16} /></button></div></div>)}</div></div></section>
        )}
      </main>

      {detailsOpen && <MonthDetailsModal month={month} year={year} bills={bills} categories={categories} onClose={() => setDetailsOpen(false)} />}
      {billModalOpen && <ModalShell title={editingBill ? 'Editar conta' : 'Nova conta'} onClose={() => setBillModalOpen(false)}><div className="space-y-4 p-6"><div className="grid grid-cols-1 gap-4 md:grid-cols-2"><label className="text-sm font-semibold text-slate-700">Descrição *<input value={billForm.description} onChange={(event) => setBillForm((form) => ({ ...form, description: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500" placeholder="Ex.: Aluguel da clínica" /></label><label className="text-sm font-semibold text-slate-700">Tipo<select value={billForm.type} onChange={(event) => setBillForm((form) => ({ ...form, type: event.target.value as FinanceType }))} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"><option value="expense">Despesa</option><option value="income">Receita</option></select></label></div><div className="grid grid-cols-1 gap-4 md:grid-cols-2"><label className="text-sm font-semibold text-slate-700">Categoria<select value={billForm.category_id} onChange={(event) => setBillForm((form) => ({ ...form, category_id: event.target.value, subcategory_id: '' }))} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"><option value="">Sem categoria</option>{categories.filter((category) => category.active && category.type === billForm.type).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label className="text-sm font-semibold text-slate-700">Subcategoria<select value={billForm.subcategory_id} onChange={(event) => setBillForm((form) => ({ ...form, subcategory_id: event.target.value }))} disabled={!billForm.category_id} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none disabled:bg-slate-100 focus:border-blue-500"><option value="">Sem subcategoria</option>{billSubcategories.filter((subcategory) => subcategory.active).map((subcategory) => <option key={subcategory.id} value={subcategory.id}>{subcategory.name}</option>)}</select></label></div><div className="grid grid-cols-1 gap-4 md:grid-cols-2"><label className="text-sm font-semibold text-slate-700">Valor *<MoneyInput value={billForm.amount} onChange={(value) => setBillForm((form) => ({ ...form, amount: value }))} required className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500" /></label><label className="text-sm font-semibold text-slate-700">Origem<input value={billForm.origin} onChange={(event) => setBillForm((form) => ({ ...form, origin: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500" placeholder="Ex.: fornecedor, banco ou cliente" /></label></div><div className="grid grid-cols-1 gap-4 md:grid-cols-2"><label className="text-sm font-semibold text-slate-700">Data de vencimento<input type="date" value={billForm.due_date} onChange={(event) => setBillForm((form) => ({ ...form, due_date: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500" /></label><label className="text-sm font-semibold text-slate-700">Data de pagamento<input type="date" value={billForm.payment_date} onChange={(event) => setBillForm((form) => ({ ...form, payment_date: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500" /></label></div><div className="grid grid-cols-1 gap-4 md:grid-cols-3"><label className="text-sm font-semibold text-slate-700">Mês de referência<select value={billForm.month_ref} onChange={(event) => setBillForm((form) => ({ ...form, month_ref: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500">{monthOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label><label className="text-sm font-semibold text-slate-700">Ano de referência<input type="number" min="2000" value={billForm.year_ref} onChange={(event) => setBillForm((form) => ({ ...form, year_ref: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500" /></label><label className="flex items-end gap-2 pb-3 text-sm font-semibold text-slate-700"><input type="checkbox" checked={billForm.recurring} onChange={(event) => setBillForm((form) => ({ ...form, recurring: event.target.checked }))} className="h-4 w-4 accent-blue-600" /> Recorrente</label></div>{billForm.type === 'income' && <p className="rounded-xl bg-blue-50 px-3 py-2 text-xs leading-relaxed text-blue-700">Para receitas, use o mês de referência como o mês da produção (competência). O recebimento pode ocorrer em outro mês (informe na data de pagamento) — o valor entra no caixa deste mês de referência e o saldo que sobrar é acumulado automaticamente para o mês seguinte.</p>}<label className="text-sm font-semibold text-slate-700">Observações<textarea value={billForm.notes} onChange={(event) => setBillForm((form) => ({ ...form, notes: event.target.value }))} rows={3} className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500" /></label><div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" className="button button-muted" onClick={() => setBillModalOpen(false)}>Cancelar</button><button type="button" className="button button-primary" onClick={() => void saveBill()}><Check size={16} /> Salvar conta</button></div></div></ModalShell>}
      {payModal && <ModalShell title="Confirmar pagamento" onClose={() => setPayModal(null)}><div className="space-y-4 p-6"><p className="text-sm text-slate-600">Registrar a conta <strong className="text-slate-900">{payModal.bill.description}</strong> ({money(Number(payModal.bill.amount))}) como paga. Informe a data em que o pagamento foi realizado:</p><label className="text-sm font-semibold text-slate-700">Data de pagamento<input type="date" value={payModal.date} onChange={(event) => setPayModal((modal) => (modal ? { ...modal, date: event.target.value } : modal))} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500" /></label><div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" className="button button-muted" onClick={() => setPayModal(null)}>Cancelar</button><button type="button" className="button button-primary" onClick={() => void confirmPayBill()}><Check size={16} /> Confirmar pagamento</button></div></div></ModalShell>}
      {categoryModalOpen && <ModalShell title={editingCategory ? 'Editar categoria' : 'Nova categoria'} onClose={() => setCategoryModalOpen(false)}><div className="space-y-4 p-6"><label className="text-sm font-semibold text-slate-700">Nome *<input value={categoryForm.name} onChange={(event) => setCategoryForm((form) => ({ ...form, name: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500" placeholder="Ex.: Aluguel" /></label><label className="text-sm font-semibold text-slate-700">Tipo<select value={categoryForm.type} onChange={(event) => setCategoryForm((form) => ({ ...form, type: event.target.value as FinanceType }))} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"><option value="expense">Despesa</option><option value="income">Receita</option></select></label><label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={categoryForm.active} onChange={(event) => setCategoryForm((form) => ({ ...form, active: event.target.checked }))} className="h-4 w-4 accent-blue-600" /> Categoria ativa</label><div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" className="button button-muted" onClick={() => setCategoryModalOpen(false)}>Cancelar</button><button type="button" className="button button-primary" onClick={() => void saveCategory()}>Salvar</button></div></div></ModalShell>}
      {subcategoryModalOpen && <ModalShell title={editingSubcategory ? 'Editar subcategoria' : 'Nova subcategoria'} onClose={() => setSubcategoryModalOpen(false)}><div className="space-y-4 p-6"><label className="text-sm font-semibold text-slate-700">Nome *<input value={subcategoryForm.name} onChange={(event) => setSubcategoryForm((form) => ({ ...form, name: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500" placeholder="Ex.: Energia elétrica" /></label><label className="text-sm font-semibold text-slate-700">Categoria<select value={subcategoryForm.category_id} onChange={(event) => setSubcategoryForm((form) => ({ ...form, category_id: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"><option value="">Selecione</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={subcategoryForm.active} onChange={(event) => setSubcategoryForm((form) => ({ ...form, active: event.target.checked }))} className="h-4 w-4 accent-blue-600" /> Subcategoria ativa</label><div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" className="button button-muted" onClick={() => setSubcategoryModalOpen(false)}>Cancelar</button><button type="button" className="button button-primary" onClick={() => void saveSubcategory()}>Salvar</button></div></div></ModalShell>}
    </div>
  );
}
