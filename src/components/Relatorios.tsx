import { useEffect, useMemo, useState } from 'react';
import { FileDown, Filter, Search, FileText, CircleDollarSign, Users } from 'lucide-react';
import { dbHelpers } from '../lib/supabase';
import { useAuth } from './Auth/AuthContext';
import type { DestinatarioTipo, Hospital, Medico, Procedimento, Repasse, Unidade } from '../types';

const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);
const dateLabel = (value: string) => value ? value.split('T')[0].split('-').reverse().join('/') : '-';

export function RelatoriosComponent() {
  const { perfil } = useAuth();
  const [items, setItems] = useState<Repasse[]>([]);
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [hospitais, setHospitais] = useState<Hospital[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [procedimentos, setProcedimentos] = useState<Procedimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [paciente, setPaciente] = useState('');
  const [medicoId, setMedicoId] = useState('');
  const [unidadeNome, setUnidadeNome] = useState('');
  const [hospitalId, setHospitalId] = useState('');
  const [procedimentoNome, setProcedimentoNome] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [tipo, setTipo] = useState<DestinatarioTipo | 'todos'>('todos');

  const load = async () => {
    setLoading(true);
    const [repRes, medRes, hospRes, uniRes, procRes] = await Promise.all([
      dbHelpers.getRepassesForReport({ paciente, medico: medicoId, hospital: hospitalId, unidade: unidadeNome, procedimento: procedimentoNome, dataInicio, dataFim, tipo }),
      dbHelpers.getMedicos(),
      dbHelpers.getHospitais(),
      dbHelpers.getUnidades(),
      dbHelpers.getProcedimentos(),
    ]);
    if (repRes.error) setError('Não foi possível carregar o relatório.');
    else setItems((repRes.data as Repasse[]) || []);
    setMedicos((medRes.data as Medico[]) || []);
    setHospitais((hospRes.data as Hospital[]) || []);
    setUnidades((uniRes.data as Unidade[]) || []);
    setProcedimentos((procRes.data as Procedimento[]) || []);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [paciente, medicoId, unidadeNome, hospitalId, procedimentoNome, dataInicio, dataFim, tipo]);

  const totals = useMemo(() => ({
    terceiros: items.filter(i => i.destinatario_tipo === 'terceiro').reduce((s, i) => s + Number(i.valor_terceiro || i.valor_liquido || 0), 0),
    socios: items.filter(i => i.destinatario_tipo === 'socio').reduce((s, i) => s + Number(i.valor_liquido || i.valor_repasse_medico || 0), 0),
    bruto: items.reduce((s, i) => s + Number(i.valor || 0), 0),
    count: items.length,
  }), [items]);

  const exportPdf = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    const rows = items.map((item) => `<tr>
      <td>${item.numero_atendimento || '-'}</td>
      <td>${item.medico?.nome || '-'}</td>
      <td>${dateLabel(item.data_cirurgia)}</td>
      <td>${item.nome_paciente}</td>
      <td>${item.hospital?.nome || '-'}</td>
      <td>${item.unidade || '-'}</td>
      <td>${item.tipo_procedimento || '-'}</td>
      <td>${item.destinatario_tipo === 'socio' ? 'Sócio' : 'Terceiro'}</td>
      <td style="text-align:right">${money(item.valor)}</td>
      <td style="text-align:right">${money(item.valor_liquido || item.valor_repasse_medico || item.valor_terceiro || 0)}</td>
      <td>${item.status_pagamento || '-'}</td>
    </tr>`).join('');
    win.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório Vertebrare</title>
    <style>
      body { font-family: Inter, Arial, sans-serif; color: #2a1a3e; padding: 32px; }
      .header { display: flex; align-items: center; gap: 16px; border-bottom: 2px solid #6b4f8c; padding-bottom: 16px; margin-bottom: 24px; }
      .header h1 { font-size: 22px; margin: 0; color: #4a2d6e; }
      .header span { display: block; font-size: 12px; color: #8a7a9e; }
      .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
      .card { background: #f7f3fb; border: 1px solid #e5dcf0; border-radius: 8px; padding: 12px 16px; }
      .card span { display: block; font-size: 11px; color: #8a7a9e; text-transform: uppercase; letter-spacing: .05em; }
      .card strong { display: block; font-size: 18px; color: #4a2d6e; margin-top: 4px; }
      table { width: 100%; border-collapse: collapse; font-size: 11px; }
      th { background: #4a2d6e; color: #fff; padding: 8px 10px; text-align: left; text-transform: uppercase; letter-spacing: .04em; font-size: 9px; }
      td { padding: 8px 10px; border-bottom: 1px solid #ece4f2; color: #3d2a52; }
      tr:nth-child(even) td { background: #faf7fd; }
      .footer { margin-top: 24px; font-size: 10px; color: #8a7a9e; text-align: right; }
    </style></head><body>
    <div class="header"><div><h1>Vertebrare</h1><span>Relatório de Repasses — ${new Date().toLocaleDateString('pt-BR')}</span></div></div>
    <div class="summary">
      <div class="card"><span>Total bruto</span><strong>${money(totals.bruto)}</strong></div>
      <div class="card"><span>Repasse terceiros</span><strong>${money(totals.terceiros)}</strong></div>
      <div class="card"><span>Repasse sócios</span><strong>${money(totals.socios)}</strong></div>
      <div class="card"><span>Lançamentos</span><strong>${totals.count}</strong></div>
    </div>
    <table><thead><tr>
      <th>Nº</th><th>Médico</th><th>Data</th><th>Paciente</th><th>Hospital</th><th>Unidade</th><th>Procedimento</th><th>Tipo</th><th>Valor</th><th>Repasse</th><th>Status</th>
    </tr></thead><tbody>${rows}</tbody></table>
    <div class="footer">Gerado por Vertebrare · ${new Date().toLocaleString('pt-BR')}</div>
    <script>window.onload = () => window.print();</script>
    </body></html>`);
    win.document.close();
  };

  const limpar = () => {
    setPaciente(''); setMedicoId(''); setUnidadeNome(''); setHospitalId(''); setProcedimentoNome(''); setDataInicio(''); setDataFim(''); setTipo('todos');
  };

  return <div className="space-y-6">
    <section className="hero-panel"><div><div className="eyebrow"><FileText size={15} /> Relatórios</div><h1>Relatório de repasses</h1><p>Filtre por paciente, médico, unidade, hospital, procedimento e período. Inclui terceiros e sócios.</p></div><div className="hero-actions"><button className="button button-light" onClick={exportPdf}><FileDown size={18} /> Baixar PDF</button></div></section>

    <section className="summary-grid">
      <div className="summary-card summary-blue"><span>Total bruto</span><strong>{money(totals.bruto)}</strong><small>{totals.count} lançamentos</small><CircleDollarSign /></div>
      <div className="summary-card summary-green"><span>Repasse a terceiros</span><strong>{money(totals.terceiros)}</strong><small>Soma dos repasses</small><Users /></div>
      <div className="summary-card summary-amber"><span>Repasse a sócios</span><strong>{money(totals.socios)}</strong><small>Soma dos repasses</small><CircleDollarSign /></div>
    </section>

    <section className="filter-panel">
      <div className="filter-heading"><Filter size={17} /><strong>Filtros do relatório</strong><button className="button button-muted" style={{ marginLeft: 'auto', minHeight: 32, padding: '0 12px' }} onClick={limpar}>Limpar</button></div>
      <div className="filter-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <label className="search-field"><Search size={16} /><input value={paciente} onChange={(e) => setPaciente(e.target.value)} placeholder="Nome do paciente" /></label>
        <select value={medicoId} onChange={(e) => setMedicoId(e.target.value)}><option value="">Todos os médicos</option>{medicos.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}</select>
        <select value={hospitalId} onChange={(e) => setHospitalId(e.target.value)}><option value="">Todos os hospitais</option>{hospitais.map((h) => <option key={h.id} value={h.id}>{h.nome}</option>)}</select>
        <select value={unidadeNome} onChange={(e) => setUnidadeNome(e.target.value)}><option value="">Todas as unidades</option>{unidades.map((u) => <option key={u.id} value={u.nome}>{u.nome}</option>)}</select>
        <select value={procedimentoNome} onChange={(e) => setProcedimentoNome(e.target.value)}><option value="">Todos os procedimentos</option>{procedimentos.map((p) => <option key={p.id} value={p.nome}>{p.nome}</option>)}</select>
        <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} placeholder="Data início" />
        <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} placeholder="Data fim" />
        <select value={tipo} onChange={(e) => setTipo(e.target.value as DestinatarioTipo | 'todos')}><option value="todos">Todos os tipos</option><option value="terceiro">Terceiros</option><option value="socio">Sócios</option></select>
      </div>
    </section>

    {error && <div className="alert-error">{error}</div>}

    <section className="table-panel">
      <div className="section-title"><div><span className="eyebrow">Resultado</span><h2>{items.length} lançamentos</h2></div></div>
      <div className="table-wrap">
        <table style={{ minWidth: 1200 }}>
          <thead>
            <tr>
              <th>Nº</th><th>Médico</th><th>Data</th><th>Paciente</th><th>Hospital</th><th>Unidade</th><th>Procedimento</th><th>Tipo</th><th>Valor</th><th>Repasse</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={11} className="empty-state">Carregando...</td></tr> :
             items.length === 0 ? <tr><td colSpan={11} className="empty-state"><FileText size={32} /><strong>Nenhum lançamento encontrado</strong><span>Ajuste os filtros para ver resultados.</span></td></tr> :
             items.map((item) => (
              <tr key={item.id}>
                <td>{item.numero_atendimento || '-'}</td>
                <td><strong>{item.medico?.nome || '-'}</strong></td>
                <td>{dateLabel(item.data_cirurgia)}</td>
                <td>{item.nome_paciente}</td>
                <td>{item.hospital?.nome || '-'}</td>
                <td>{item.unidade || '-'}</td>
                <td>{item.tipo_procedimento || '-'}</td>
                <td><span className="type-pill">{item.destinatario_tipo === 'socio' ? 'Sócio' : 'Terceiro'}</span></td>
                <td>{money(item.valor)}</td>
                <td className="positive strong">{money(item.valor_liquido || item.valor_repasse_medico || item.valor_terceiro || 0)}</td>
                <td><span className={`status-pill status-${item.status_pagamento || 'pendente'}`}>{item.status_pagamento === 'pago' ? 'Pago' : item.status_pagamento === 'aprovado' ? 'Aprovado' : 'Pendente'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  </div>;
}
