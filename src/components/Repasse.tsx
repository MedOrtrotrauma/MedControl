import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  Check,
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

const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);
const dateLabel = (value: string) => value ? value.split('T')[0].split('-').reverse().join('/') : '-';
const monthLabel = (value: string) => {
  const [year, month] = value.split('-');
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
};
const months = () => Array.from({ length: 13 }, (_, index) => {
  const date = new Date(new Date().getFullYear(), new Date().getMonth() - 6 + index, 1);
  const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  return { value, label: monthLabel(value) };
});
const numberValue = (value: string) => Math.max(0, Number(value.replace(',', '.')) || 0);

const createForm = (month: string) => ({
  medico_id: '', hospital_id: '', nome_paciente: '', data_cirurgia: '', tipo: 'consulta' as 'consulta' | 'cirurgia',
  valor: '', auxilio_1: '0', auxilio_2: '0', outras_deducoes: '0',
  desconto_paciente: '0', desconto_cartao: '0', valor_recebido: '', percentual_terceiro: '60',
  tipo_procedimento: 'Consulta', quantidade: '1', forma_pagamento: 'convenio', valor_unitario: '',
  imposto_percentual: '12', observacao: '', month_reference: month, status_pagamento: 'pendente' as StatusPagamento,
});
type FormData = ReturnType<typeof createForm>;

export function RepasseComponent() {
  const [tipo, setTipo] = useState<DestinatarioTipo>('terceiro');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [items, setItems] = useState<Repasse[]>([]);
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [hospitais, setHospitais] = useState<Hospital[]>([]);
  const [form, setForm] = useState<FormData>(createForm(month));
  const [editing, setEditing] = useState<Repasse | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'todos' | StatusPagamento>('todos');
  const [medico, setMedico] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    const [repasseResult, medicosResult, hospitaisResult] = await Promise.all([
      dbHelpers.getRepassesByMonthAndTipo(month, tipo), dbHelpers.getMedicos(), dbHelpers.getHospitais(),
    ]);
    if (repasseResult.error || medicosResult.error || hospitaisResult.error) setError('Não foi possível carregar os lançamentos.');
    else {
      setItems((repasseResult.data as Repasse[]) || []);
      setMedicos((medicosResult.data as Medico[]) || []);
      setHospitais((hospitaisResult.data as Hospital[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => { void load(); }, [month, tipo]);

  const update = (field: keyof FormData, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const openNew = () => { setEditing(null); setForm(createForm(month)); setShowForm(true); setError(''); };
  const openEdit = (item: Repasse) => {
    setEditing(item);
    setForm({
      medico_id: String(item.medico_id), hospital_id: String(item.hospital_id), nome_paciente: item.nome_paciente,
      data_cirurgia: item.data_cirurgia, tipo: item.tipo, valor: String(item.valor || 0), auxilio_1: String(item.auxilio_1 || 0),
      auxilio_2: String(item.auxilio_2 || 0), outras_deducoes: String(item.outras_deducoes || 0),
      desconto_paciente: String(item.desconto_paciente || 0), desconto_cartao: String(item.desconto_cartao || 0),
      valor_recebido: String(item.valor_recebido || item.valor || 0), percentual_terceiro: String(item.percentual_terceiro || 0),
      tipo_procedimento: item.tipo_procedimento || 'Consulta', quantidade: String(item.quantidade || 1),
      forma_pagamento: item.forma_pagamento || 'convenio', valor_unitario: String(item.valor_unitario || item.valor || 0),
      imposto_percentual: String(item.imposto_percentual ?? 12), observacao: item.observacao || '',
      month_reference: item.month_reference || month, status_pagamento: item.status_pagamento || 'pendente',
    });
    setShowForm(true);
  };

  const calculations = useMemo(() => {
    const bruto = numberValue(form.valor);
    if (tipo === 'socio') {
      const total = bruto + numberValue(form.auxilio_1) + numberValue(form.auxilio_2);
      const taxa = total * 0.015;
      const imposto = total * numberValue(form.imposto_percentual) / 100;
      const liquido = Math.max(0, total - taxa - imposto - numberValue(form.outras_deducoes));
      return { total, taxa, imposto, global: 0, recebido: 0, repasse: liquido, saldo: 0 };
    }
    const global = Math.max(0, bruto - numberValue(form.desconto_paciente) - numberValue(form.desconto_cartao));
    const recebido = form.valor_recebido === '' ? global : numberValue(form.valor_recebido);
    const repasse = recebido * numberValue(form.percentual_terceiro) / 100;
    return { total: bruto, taxa: 0, imposto: 0, global, recebido, repasse, saldo: Math.max(0, recebido - repasse) };
  }, [form, tipo]);

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true); setError('');
    const payload = tipo === 'socio' ? {
      medico_id: Number(form.medico_id), hospital_id: Number(form.hospital_id), nome_paciente: form.nome_paciente.trim(), data_cirurgia: form.data_cirurgia,
      valor: numberValue(form.valor), tipo: form.tipo, is_particular: true, tipo_procedimento_detalhado: 'cirurgia_particular',
      valor_repasse_medico: calculations.repasse, month_reference: form.month_reference, observacao: form.observacao.trim() || null,
      destinatario_tipo: tipo, auxilio_1: numberValue(form.auxilio_1), auxilio_2: numberValue(form.auxilio_2), taxa_1_5: calculations.taxa,
      imposto_percentual: numberValue(form.imposto_percentual), outras_deducoes: numberValue(form.outras_deducoes), valor_liquido: calculations.repasse,
      valor_terceiro: 0, saldo_controle: 0, status_pagamento: form.status_pagamento,
      data_pagamento: form.status_pagamento === 'pago' ? new Date().toISOString().slice(0, 10) : null,
    } : {
      medico_id: Number(form.medico_id), hospital_id: Number(form.hospital_id), nome_paciente: form.nome_paciente.trim(), data_cirurgia: form.data_cirurgia,
      valor: numberValue(form.valor), tipo: form.tipo, is_particular: false, tipo_procedimento_detalhado: 'medico_parceiro',
      tipo_procedimento: form.tipo_procedimento, quantidade: numberValue(form.quantidade), forma_pagamento: form.forma_pagamento,
      valor_unitario: form.valor_unitario === '' ? numberValue(form.valor) : numberValue(form.valor_unitario), porcentagem_repasse: numberValue(form.percentual_terceiro),
      valor_repasse_medico: calculations.repasse, month_reference: form.month_reference, observacao: form.observacao.trim() || null,
      destinatario_tipo: tipo, auxilio_1: 0, auxilio_2: 0, taxa_1_5: 0, imposto_percentual: 0, outras_deducoes: 0,
      desconto_paciente: numberValue(form.desconto_paciente), desconto_cartao: numberValue(form.desconto_cartao), valor_recebido: calculations.recebido,
      percentual_terceiro: numberValue(form.percentual_terceiro), valor_terceiro: calculations.repasse, saldo_controle: calculations.saldo,
      valor_liquido: calculations.repasse, status_pagamento: form.status_pagamento,
      data_pagamento: form.status_pagamento === 'pago' ? new Date().toISOString().slice(0, 10) : null,
    };
    const result = editing ? await dbHelpers.updateRepasse(editing.id, payload) : await dbHelpers.createRepasse(payload);
    if (result.error) setError('Não foi possível salvar o repasse. Confira os campos.');
    else { setShowForm(false); await load(); }
    setSaving(false);
  };

  const remove = async (id: number) => {
    if (!window.confirm('Excluir este lançamento de repasse?')) return;
    const result = await dbHelpers.deleteRepasse(id);
    if (result.error) setError('Não foi possível excluir o lançamento.'); else await load();
  };

  const filtered = useMemo(() => items.filter((item) => {
    const text = `${item.nome_paciente} ${item.medico?.nome || ''}`.toLowerCase();
    return text.includes(search.toLowerCase()) && (status === 'todos' || item.status_pagamento === status) && (!medico || String(item.medico_id) === medico);
  }), [items, search, status, medico]);
  const totals = useMemo(() => filtered.reduce((sum, item) => sum + Number(item.valor_liquido || item.valor_repasse_medico || 0), 0), [filtered]);
  const gross = useMemo(() => filtered.reduce((sum, item) => sum + (tipo === 'socio' ? Number(item.valor || 0) + Number(item.auxilio_1 || 0) + Number(item.auxilio_2 || 0) : Number(item.valor || 0)), 0), [filtered, tipo]);
  const deductions = Math.max(0, gross - totals - (tipo === 'terceiro' ? filtered.reduce((sum, item) => sum + Number(item.saldo_controle || 0), 0) : 0));

  return <div className="space-y-6">
    <section className="hero-panel"><div><div className="eyebrow"><ReceiptText size={15} /> Financeiro médico</div><h1>Controle de repasses</h1><p>Use uma aba para cada regra financeira dos seus relatórios.</p></div><div className="hero-actions"><label className="month-picker"><CalendarDays size={16} /><select value={month} onChange={(event) => setMonth(event.target.value)}>{months().map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><button className="button button-light" onClick={openNew}><Plus size={18} /> Novo lançamento</button></div></section>
    <div className="segmented-tabs"><button className={tipo === 'terceiro' ? 'active' : ''} onClick={() => setTipo('terceiro')}><Users size={17} /> Repasse a terceiros</button><button className={tipo === 'socio' ? 'active' : ''} onClick={() => setTipo('socio')}><CircleDollarSign size={17} /> Repasse para sócio</button></div>
    <section className="summary-grid"><div className="summary-card summary-blue"><span>{tipo === 'socio' ? 'Total da produção' : 'Valor total'}</span><strong>{money(gross)}</strong><small>{filtered.length} lançamentos no período</small><ArrowUpRight /></div><div className="summary-card summary-green"><span>{tipo === 'socio' ? 'Valor de repasse' : 'Repasse profissional'}</span><strong>{money(totals)}</strong><small>Calculado pela regra da aba</small><Check /></div><div className="summary-card summary-amber"><span>{tipo === 'socio' ? 'Descontos' : 'Saldo da clínica'}</span><strong>{money(tipo === 'socio' ? deductions : filtered.reduce((sum, item) => sum + Number(item.saldo_controle || 0), 0))}</strong><small>{tipo === 'socio' ? '1,5%, imposto e deduções' : 'Valor recebido menos repasse'}</small><ArrowDownRight /></div></section>
    <section className="filter-panel"><div className="filter-heading"><Filter size={17} /><strong>Filtrar lançamentos</strong></div><div className="filter-grid"><label className="search-field"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar médico ou paciente" /></label><select value={medico} onChange={(event) => setMedico(event.target.value)}><option value="">Todos os médicos</option>{medicos.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select><select value={status} onChange={(event) => setStatus(event.target.value as 'todos' | StatusPagamento)}><option value="todos">Todos os status</option><option value="pendente">Pendente</option><option value="aprovado">Aprovado</option><option value="pago">Pago</option></select></div></section>
    {error && <div className="alert-error">{error}</div>}
    {showForm && <section className="form-panel"><div className="section-title"><div><span className="eyebrow">{editing ? 'Editar lançamento' : 'Novo lançamento'}</span><h2>{tipo === 'socio' ? 'Repasse para sócio' : 'Repasse a terceiro'}</h2></div><button className="icon-button" onClick={() => setShowForm(false)}><X size={18} /></button></div><form className="form-grid" onSubmit={save}>
      <label>Mês de referência<select required value={form.month_reference} onChange={(event) => update('month_reference', event.target.value)}>{months().map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label>Médico<select required value={form.medico_id} onChange={(event) => update('medico_id', event.target.value)}><option value="">Selecione</option>{medicos.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></label><label>Hospital / clínica<select required value={form.hospital_id} onChange={(event) => update('hospital_id', event.target.value)}><option value="">Selecione</option>{hospitais.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></label><label>Paciente<input required value={form.nome_paciente} onChange={(event) => update('nome_paciente', event.target.value)} /></label><label>Data do atendimento<input required type="date" value={form.data_cirurgia} onChange={(event) => update('data_cirurgia', event.target.value)} /></label><label>Tipo<select value={form.tipo} onChange={(event) => update('tipo', event.target.value)}><option value="consulta">Consulta</option><option value="cirurgia">Cirurgia</option></select></label>
      {tipo === 'terceiro' ? <><label>Procedimento<input value={form.tipo_procedimento} onChange={(event) => update('tipo_procedimento', event.target.value)} placeholder="Consulta, infiltração..." /></label><label>Forma de pagamento<select value={form.forma_pagamento} onChange={(event) => update('forma_pagamento', event.target.value)}><option value="convenio">Convênio</option><option value="pix">Pix</option><option value="credito">Crédito</option><option value="debito">Débito</option><option value="especie">Espécie</option></select></label><label>Quantidade<input min="1" type="number" value={form.quantidade} onChange={(event) => update('quantidade', event.target.value)} /></label><label>Valor total<input required min="0" step="0.01" type="number" value={form.valor} onChange={(event) => update('valor', event.target.value)} /></label><label>Desconto paciente<input min="0" step="0.01" type="number" value={form.desconto_paciente} onChange={(event) => update('desconto_paciente', event.target.value)} /></label><label>Desconto cartão<input min="0" step="0.01" type="number" value={form.desconto_cartao} onChange={(event) => update('desconto_cartao', event.target.value)} /></label><label>Valor recebido<input min="0" step="0.01" type="number" value={form.valor_recebido} placeholder="Calculado pelo valor global" onChange={(event) => update('valor_recebido', event.target.value)} /></label><label>Repasse (%)<input required min="0" max="100" step="0.01" type="number" value={form.percentual_terceiro} onChange={(event) => update('percentual_terceiro', event.target.value)} /></label></> : <><label>Cirurgião<input required min="0" step="0.01" type="number" value={form.valor} onChange={(event) => update('valor', event.target.value)} /></label><label>1º auxílio<input min="0" step="0.01" type="number" value={form.auxilio_1} onChange={(event) => update('auxilio_1', event.target.value)} /></label><label>2º auxílio<input min="0" step="0.01" type="number" value={form.auxilio_2} onChange={(event) => update('auxilio_2', event.target.value)} /></label><label>Imposto (%)<input min="0" step="0.01" type="number" value={form.imposto_percentual} onChange={(event) => update('imposto_percentual', event.target.value)} /></label><label>Outras deduções<input min="0" step="0.01" type="number" value={form.outras_deducoes} onChange={(event) => update('outras_deducoes', event.target.value)} /></label></>}
      <label>Status<select value={form.status_pagamento} onChange={(event) => update('status_pagamento', event.target.value)}><option value="pendente">Pendente</option><option value="aprovado">Aprovado</option><option value="pago">Pago</option></select></label><label className="wide">Observação<textarea rows={3} value={form.observacao} onChange={(event) => update('observacao', event.target.value)} placeholder="Referência ou observação do relatório" /></label><div className="calculation-card wide"><div><span>{tipo === 'socio' ? 'Valor de repasse calculado' : 'Repasse profissional calculado'}</span><strong>{money(calculations.repasse)}</strong></div><small>{tipo === 'socio' ? `Total ${money(calculations.total)} - taxa 1,5% ${money(calculations.taxa)} - imposto ${money(calculations.imposto)}` : `Global ${money(calculations.global)} - recebido ${money(calculations.recebido)} - saldo ${money(calculations.saldo)}`}</small></div><div className="form-actions wide"><button type="button" className="button button-muted" onClick={() => setShowForm(false)}>Cancelar</button><button className="button button-primary" disabled={saving}>{saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Salvar lançamento'}</button></div>
    </form></section>}
    <section className="table-panel"><div className="section-title"><div><span className="eyebrow">Competência selecionada</span><h2>{monthLabel(month)}</h2></div><button className="button button-muted" onClick={() => window.print()}><FileDown size={17} /> Imprimir</button></div><div className="table-wrap"><table><thead><tr>{tipo === 'terceiro' ? <><th>Médico</th><th>Paciente / procedimento</th><th>Valor total</th><th>Global</th><th>Recebido</th><th>Repasse</th><th>%</th><th>Saldo</th></> : <><th>Médico</th><th>Paciente</th><th>Cirurgião</th><th>Auxílios</th><th>Total</th><th>1,5%</th><th>Imposto</th><th>Repasse</th></>}{<th>Status</th>}<th>Ações</th></tr></thead><tbody>{loading ? <tr><td colSpan={10} className="empty-state">Carregando lançamentos...</td></tr> : filtered.length === 0 ? <tr><td colSpan={10} className="empty-state"><ClipboardList size={32} /><strong>Nenhum lançamento encontrado</strong><span>Cadastre um lançamento para esta competência.</span></td></tr> : filtered.map((item) => tipo === 'terceiro' ? <tr key={item.id}><td><strong>{item.medico?.nome || '-'}</strong></td><td><strong>{item.nome_paciente}</strong><small>{item.tipo_procedimento || 'Consulta'} · {dateLabel(item.data_cirurgia)}</small></td><td>{money(item.valor)}</td><td>{money(Number(item.valor || 0) - Number(item.desconto_paciente || 0) - Number(item.desconto_cartao || 0))}</td><td>{money(item.valor_recebido)}</td><td className="positive strong">{money(item.valor_terceiro || item.valor_liquido)}</td><td>{Number(item.percentual_terceiro || 0).toFixed(2)}%</td><td className="positive strong">{money(item.saldo_controle)}</td><td><span className={`status-pill status-${item.status_pagamento || 'pendente'}`}>{item.status_pagamento === 'pago' ? 'Pago' : item.status_pagamento === 'aprovado' ? 'Aprovado' : 'Pendente'}</span></td><td><div className="row-actions"><button className="icon-button" onClick={() => openEdit(item)}><Pencil size={16} /></button><button className="icon-button danger" onClick={() => void remove(item.id)}><Trash2 size={16} /></button></div></td></tr> : <tr key={item.id}><td><strong>{item.medico?.nome || '-'}</strong></td><td><strong>{item.nome_paciente}</strong><small>{dateLabel(item.data_cirurgia)}</small></td><td>{money(item.valor)}</td><td>{money(Number(item.auxilio_1 || 0) + Number(item.auxilio_2 || 0))}</td><td>{money(Number(item.valor || 0) + Number(item.auxilio_1 || 0) + Number(item.auxilio_2 || 0))}</td><td className="negative">{money(item.taxa_1_5)}</td><td className="negative">{money((Number(item.valor || 0) + Number(item.auxilio_1 || 0) + Number(item.auxilio_2 || 0)) * Number(item.imposto_percentual || 0) / 100)}</td><td className="positive strong">{money(item.valor_liquido || item.valor_repasse_medico)}</td><td><span className={`status-pill status-${item.status_pagamento || 'pendente'}`}>{item.status_pagamento === 'pago' ? 'Pago' : item.status_pagamento === 'aprovado' ? 'Aprovado' : 'Pendente'}</span></td><td><div className="row-actions"><button className="icon-button" onClick={() => openEdit(item)}><Pencil size={16} /></button><button className="icon-button danger" onClick={() => void remove(item.id)}><Trash2 size={16} /></button></div></td></tr>)}</tbody></table></div></section>
  </div>;
}
