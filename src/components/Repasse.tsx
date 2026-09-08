import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  CircleDollarSign,
  ClipboardList,
  FileDown,
  Filter,
  Pencil,
  Plus,
  ReceiptText,
  Search,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { dbHelpers } from '../lib/supabase';
import type { DestinatarioTipo, Hospital, Medico, Repasse, StatusPagamento } from '../types';

const money = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);

const formatDate = (value: string) => {
  if (!value) return '-';
  const [year, month, day] = value.split('T')[0].split('-');
  return `${day}/${month}/${year}`;
};

const formatMonth = (value: string) => {
  const [year, month] = value.split('-');
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });
};

const monthOptions = () => {
  const today = new Date();
  return Array.from({ length: 13 }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth() - 6 + index, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    return { value, label: formatMonth(value) };
  });
};

const initialForm = (month: string) => ({
  medico_id: '',
  hospital_id: '',
  nome_paciente: '',
  data_cirurgia: '',
  tipo: 'consulta' as 'consulta' | 'cirurgia',
  valor: '',
  auxilio_1: '0',
  auxilio_2: '0',
  taxa_1_5: '0',
  imposto_percentual: '12',
  outras_deducoes: '0',
  observacao: '',
  month_reference: month,
  status_pagamento: 'pendente' as StatusPagamento,
});

type FormData = ReturnType<typeof initialForm>;

const toNumber = (value: string) => Math.max(0, Number(value.replace(',', '.')) || 0);

const calculateNet = (form: FormData, tipo: DestinatarioTipo) => {
  const bruto = toNumber(form.valor);
  const auxilios = toNumber(form.auxilio_1) + toNumber(form.auxilio_2);
  const taxa = toNumber(form.taxa_1_5);
  const outras = toNumber(form.outras_deducoes);
  const imposto = tipo === 'socio' ? (bruto * toNumber(form.imposto_percentual)) / 100 : 0;
  return Math.max(0, bruto + auxilios - taxa - imposto - outras);
};

export function RepasseComponent() {
  const [tipo, setTipo] = useState<DestinatarioTipo>('terceiro');
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [repasses, setRepasses] = useState<Repasse[]>([]);
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [hospitais, setHospitais] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Repasse | null>(null);
  const [form, setForm] = useState<FormData>(initialForm(selectedMonth));
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | StatusPagamento>('todos');
  const [medicoFilter, setMedicoFilter] = useState('');
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    const [repassesResult, medicosResult, hospitaisResult] = await Promise.all([
      dbHelpers.getRepassesByMonthAndTipo(selectedMonth, tipo),
      dbHelpers.getMedicos(),
      dbHelpers.getHospitais(),
    ]);
    if (repassesResult.error || medicosResult.error || hospitaisResult.error) {
      setError('Não foi possível carregar os dados deste período.');
    } else {
      setRepasses((repassesResult.data as Repasse[]) || []);
      setMedicos((medicosResult.data as Medico[]) || []);
      setHospitais((hospitaisResult.data as Hospital[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    void loadData();
  }, [selectedMonth, tipo]);

  const openNew = () => {
    setEditing(null);
    setForm(initialForm(selectedMonth));
    setShowForm(true);
    setError('');
  };

  const openEdit = (repasse: Repasse) => {
    setEditing(repasse);
    setForm({
      medico_id: String(repasse.medico_id),
      hospital_id: String(repasse.hospital_id),
      nome_paciente: repasse.nome_paciente,
      data_cirurgia: repasse.data_cirurgia,
      tipo: repasse.tipo,
      valor: String(repasse.valor),
      auxilio_1: String(repasse.auxilio_1 || 0),
      auxilio_2: String(repasse.auxilio_2 || 0),
      taxa_1_5: String(repasse.taxa_1_5 || 0),
      imposto_percentual: String(repasse.imposto_percentual ?? 12),
      outras_deducoes: String(repasse.outras_deducoes || 0),
      observacao: repasse.observacao || '',
      month_reference: repasse.month_reference || selectedMonth,
      status_pagamento: repasse.status_pagamento || 'pendente',
    });
    setShowForm(true);
  };

  const saveRepasse = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    const valor = toNumber(form.valor);
    const valorLiquido = calculateNet(form, tipo);
    const payload = {
      medico_id: Number(form.medico_id),
      hospital_id: Number(form.hospital_id),
      nome_paciente: form.nome_paciente.trim(),
      data_cirurgia: form.data_cirurgia,
      valor,
      tipo: form.tipo,
      is_particular: tipo === 'socio',
      tipo_procedimento_detalhado: tipo === 'socio' ? 'consulta' : 'medico_parceiro',
      valor_repasse_medico: valorLiquido,
      month_reference: form.month_reference,
      observacao: form.observacao.trim() || null,
      destinatario_tipo: tipo,
      auxilio_1: toNumber(form.auxilio_1),
      auxilio_2: toNumber(form.auxilio_2),
      taxa_1_5: toNumber(form.taxa_1_5),
      imposto_percentual: tipo === 'socio' ? toNumber(form.imposto_percentual) : 0,
      outras_deducoes: toNumber(form.outras_deducoes),
      valor_liquido: valorLiquido,
      status_pagamento: form.status_pagamento,
      data_pagamento: form.status_pagamento === 'pago' ? new Date().toISOString().slice(0, 10) : null,
    };
    const result = editing
      ? await dbHelpers.updateRepasse(editing.id, payload)
      : await dbHelpers.createRepasse(payload);
    if (result.error) {
      setError('Não foi possível salvar o repasse. Confira os campos e tente novamente.');
    } else {
      setShowForm(false);
      await loadData();
    }
    setSaving(false);
  };

  const removeRepasse = async (id: number) => {
    if (!window.confirm('Excluir este lançamento de repasse?')) return;
    const result = await dbHelpers.deleteRepasse(id);
    if (result.error) setError('Não foi possível excluir o lançamento.');
    else await loadData();
  };

  const filteredRepasses = useMemo(() => repasses.filter((repasse) => {
    const text = `${repasse.nome_paciente} ${repasse.medico?.nome || ''}`.toLowerCase();
    return text.includes(search.toLowerCase()) &&
      (statusFilter === 'todos' || repasse.status_pagamento === statusFilter) &&
      (!medicoFilter || String(repasse.medico_id) === medicoFilter);
  }), [repasses, search, statusFilter, medicoFilter]);

  const totals = useMemo(() => filteredRepasses.reduce((acc, item) => ({
    bruto: acc.bruto + Number(item.valor || 0),
    liquido: acc.liquido + Number(item.valor_liquido || item.valor_repasse_medico || 0),
    descontos: acc.descontos + Number(item.taxa_1_5 || 0) + Number(item.outras_deducoes || 0) + (tipo === 'socio' ? Number(item.valor || 0) * Number(item.imposto_percentual || 0) / 100 : 0),
  }), { bruto: 0, liquido: 0, descontos: 0 }), [filteredRepasses, tipo]);

  const updateForm = (field: keyof FormData, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const previewNet = calculateNet(form, tipo);

  return (
    <div className="space-y-6">
      <section className="hero-panel">
        <div>
          <div className="eyebrow"><ReceiptText size={15} /> Financeiro médico</div>
          <h1>Controle de repasses</h1>
          <p>Registre, confira e acompanhe os pagamentos por competência.</p>
        </div>
        <div className="hero-actions">
          <label className="month-picker">
            <CalendarDays size={16} />
            <select value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)}>
              {monthOptions().map((month) => <option key={month.value} value={month.value}>{month.label}</option>)}
            </select>
          </label>
          <button className="button button-light" onClick={openNew}><Plus size={18} /> Novo repasse</button>
        </div>
      </section>

      <div className="segmented-tabs">
        <button className={tipo === 'terceiro' ? 'active' : ''} onClick={() => setTipo('terceiro')}><Users size={17} /> Repasse a terceiros</button>
        <button className={tipo === 'socio' ? 'active' : ''} onClick={() => setTipo('socio')}><CircleDollarSign size={17} /> Repasse para sócio</button>
      </div>

      <section className="summary-grid">
        <div className="summary-card summary-blue"><span>Valor bruto</span><strong>{money(totals.bruto)}</strong><small>{filteredRepasses.length} lançamentos no período</small><ArrowUpRight /></div>
        <div className="summary-card summary-green"><span>Valor líquido</span><strong>{money(totals.liquido)}</strong><small>Pronto para conferência</small><Check /></div>
        <div className="summary-card summary-amber"><span>Descontos</span><strong>{money(totals.descontos)}</strong><small>{tipo === 'socio' ? 'Taxa, imposto e outras deduções' : 'Taxas e outras deduções'}</small><ArrowDownRight /></div>
      </section>

      <section className="filter-panel">
        <div className="filter-heading"><Filter size={17} /><strong>Filtrar lançamentos</strong></div>
        <div className="filter-grid">
          <label className="search-field"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar médico ou paciente" /></label>
          <select value={medicoFilter} onChange={(event) => setMedicoFilter(event.target.value)}><option value="">Todos os médicos</option>{medicos.map((medico) => <option key={medico.id} value={medico.id}>{medico.nome}</option>)}</select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'todos' | StatusPagamento)}><option value="todos">Todos os status</option><option value="pendente">Pendente</option><option value="aprovado">Aprovado</option><option value="pago">Pago</option></select>
        </div>
      </section>

      {error && <div className="alert-error">{error}</div>}

      {showForm && (
        <section className="form-panel">
          <div className="section-title"><div><span className="eyebrow">{editing ? 'Editar lançamento' : 'Novo lançamento'}</span><h2>{tipo === 'socio' ? 'Repasse para sócio' : 'Repasse a terceiro'}</h2></div><button className="icon-button" onClick={() => setShowForm(false)}><X size={18} /></button></div>
          <form onSubmit={saveRepasse} className="form-grid">
            <label>Mês de referência<select required value={form.month_reference} onChange={(event) => updateForm('month_reference', event.target.value)}>{monthOptions().map((month) => <option key={month.value} value={month.value}>{month.label}</option>)}</select></label>
            <label>Médico<select required value={form.medico_id} onChange={(event) => updateForm('medico_id', event.target.value)}><option value="">Selecione</option>{medicos.map((medico) => <option key={medico.id} value={medico.id}>{medico.nome}</option>)}</select></label>
            <label>Hospital / clínica<select required value={form.hospital_id} onChange={(event) => updateForm('hospital_id', event.target.value)}><option value="">Selecione</option>{hospitais.map((hospital) => <option key={hospital.id} value={hospital.id}>{hospital.nome}</option>)}</select></label>
            <label>Paciente<input required value={form.nome_paciente} onChange={(event) => updateForm('nome_paciente', event.target.value)} placeholder="Nome do paciente" /></label>
            <label>Data do atendimento<input required type="date" value={form.data_cirurgia} onChange={(event) => updateForm('data_cirurgia', event.target.value)} /></label>
            <label>Tipo<select value={form.tipo} onChange={(event) => updateForm('tipo', event.target.value)}><option value="consulta">Consulta</option><option value="cirurgia">Cirurgia</option></select></label>
            <label>Valor bruto<input required min="0" step="0.01" type="number" value={form.valor} onChange={(event) => updateForm('valor', event.target.value)} placeholder="0,00" /></label>
            <label>Auxílio 1<input min="0" step="0.01" type="number" value={form.auxilio_1} onChange={(event) => updateForm('auxilio_1', event.target.value)} /></label>
            <label>Auxílio 2<input min="0" step="0.01" type="number" value={form.auxilio_2} onChange={(event) => updateForm('auxilio_2', event.target.value)} /></label>
            <label>Taxa de 1,5%<input min="0" step="0.01" type="number" value={form.taxa_1_5} onChange={(event) => updateForm('taxa_1_5', event.target.value)} /></label>
            {tipo === 'socio' && <label>Imposto (%)<input min="0" step="0.01" type="number" value={form.imposto_percentual} onChange={(event) => updateForm('imposto_percentual', event.target.value)} /></label>}
            <label>Outras deduções<input min="0" step="0.01" type="number" value={form.outras_deducoes} onChange={(event) => updateForm('outras_deducoes', event.target.value)} /></label>
            <label>Status<select value={form.status_pagamento} onChange={(event) => updateForm('status_pagamento', event.target.value)}><option value="pendente">Pendente</option><option value="aprovado">Aprovado</option><option value="pago">Pago</option></select></label>
            <label className="wide">Observação<textarea rows={3} value={form.observacao} onChange={(event) => updateForm('observacao', event.target.value)} placeholder="Detalhes do lançamento, descontos ou referência do relatório" /></label>
            <div className="calculation-card wide"><div><span>Valor líquido calculado</span><strong>{money(previewNet)}</strong></div><small>{tipo === 'socio' ? 'Bruto + auxílios - taxa - imposto - outras deduções' : 'Bruto + auxílios - taxa - outras deduções'}</small></div>
            <div className="form-actions wide"><button type="button" className="button button-muted" onClick={() => setShowForm(false)}>Cancelar</button><button className="button button-primary" disabled={saving}>{saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Salvar repasse'}</button></div>
          </form>
        </section>
      )}

      <section className="table-panel">
        <div className="section-title"><div><span className="eyebrow">Competência selecionada</span><h2>{formatMonth(selectedMonth)}</h2></div><button className="button button-muted" onClick={() => window.print()}><FileDown size={17} /> Imprimir</button></div>
        <div className="table-wrap">
          <table><thead><tr><th>Médico</th><th>Paciente</th><th>Atendimento</th><th>Bruto</th><th>Descontos</th><th>Líquido</th><th>Status</th><th>Ações</th></tr></thead>
            <tbody>{loading ? <tr><td colSpan={8} className="empty-state">Carregando lançamentos...</td></tr> : filteredRepasses.length === 0 ? <tr><td colSpan={8} className="empty-state"><ClipboardList size={32} /><strong>Nenhum lançamento encontrado</strong><span>Cadastre um repasse para começar o controle desta competência.</span></td></tr> : filteredRepasses.map((repasse) => {
              const descontos = Number(repasse.taxa_1_5 || 0) + Number(repasse.outras_deducoes || 0) + (tipo === 'socio' ? Number(repasse.valor || 0) * Number(repasse.imposto_percentual || 0) / 100 : 0);
              return <tr key={repasse.id}><td><strong>{repasse.medico?.nome || 'Médico não informado'}</strong>{repasse.medico?.crm && <small>CRM {repasse.medico.crm}</small>}</td><td>{repasse.nome_paciente}</td><td><span className="type-pill">{repasse.tipo === 'cirurgia' ? 'Cirurgia' : 'Consulta'}</span><small>{formatDate(repasse.data_cirurgia)}</small></td><td>{money(repasse.valor)}</td><td className="negative">{money(descontos)}</td><td className="positive strong">{money(repasse.valor_liquido || repasse.valor_repasse_medico || 0)}</td><td><span className={`status-pill status-${repasse.status_pagamento || 'pendente'}`}>{repasse.status_pagamento === 'pago' ? 'Pago' : repasse.status_pagamento === 'aprovado' ? 'Aprovado' : 'Pendente'}</span></td><td><div className="row-actions"><button className="icon-button" onClick={() => openEdit(repasse)} title="Editar"><Pencil size={16} /></button><button className="icon-button danger" onClick={() => void removeRepasse(repasse.id)} title="Excluir"><Trash2 size={16} /></button></div></td></tr>;
            })}</tbody></table>
        </div>
      </section>
    </div>
  );
}
