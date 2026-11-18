import { useEffect, useMemo, useState } from 'react';
import { FileDown, Filter, Search, FileText, CircleDollarSign, CheckCircle2, Clock } from 'lucide-react';
import { dbHelpers } from '../../lib/supabase';
import { useAuth } from '../Auth/AuthContext';
import type { Cirurgia, Medico, RepasseCirurgia, StatusPagamento } from '../../types';

const money = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);
const dateLabel = (value: string) =>
  value ? value.split('T')[0].split('-').reverse().join('/') : '-';

export function CirurgiasExtracaoReport() {
  const { perfil } = useAuth();
  const [items, setItems] = useState<RepasseCirurgia[]>([]);
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [cirurgias, setCirurgias] = useState<Cirurgia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [medicoId, setMedicoId] = useState('');
  const [cirurgiaId, setCirurgiaId] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [status, setStatus] = useState<'todos' | 'pago' | 'pendente'>('todos');

  const load = async () => {
    setLoading(true);
    const [repRes, medRes, cirRes] = await Promise.all([
      dbHelpers.getCirurgiasForReport({
        medico: medicoId,
        cirurgia: cirurgiaId,
        dataInicio,
        dataFim,
        status,
      }),
      dbHelpers.getMedicos(),
      dbHelpers.getCirurgias(),
    ]);
    if (repRes.error) setError('Não foi possível carregar o relatório de cirurgias.');
    else setItems((repRes.data as RepasseCirurgia[]) || []);
    setMedicos((medRes.data as Medico[]) || []);
    setCirurgias((cirRes.data as Cirurgia[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [medicoId, cirurgiaId, dataInicio, dataFim, status]);

  const totals = useMemo(
    () => ({
      pago: items
        .filter((i) => i.status_pagamento === 'pago')
        .reduce((s, i) => s + Number(i.valor_liquido || i.valor_repasse_medico || 0), 0),
      pendente: items
        .filter((i) => i.status_pagamento !== 'pago')
        .reduce((s, i) => s + Number(i.valor_liquido || i.valor_repasse_medico || 0), 0),
      bruto: items.reduce((s, i) => s + Number(i.valor || 0), 0),
      count: items.length,
    }),
    [items],
  );

  const exportPdf = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    const medicoNome = medicos.find((m) => String(m.id) === medicoId)?.nome || 'Todos';
    const cirurgiaNome = cirurgias.find((c) => String(c.id) === cirurgiaId)?.nome || 'Todas';
    const rows = items
      .map(
        (item) => `<tr>
      <td>${item.id}</td>
      <td>${item.medico?.nome || '-'}</td>
      <td>${dateLabel(item.data_cirurgia)}</td>
      <td>${item.nome_paciente}</td>
      <td>${item.cirurgia?.nome || item.tipo_procedimento || '-'}</td>
      <td>${item.convenio?.nome || (item.is_particular ? 'Particular' : '-')}</td>
      <td style="text-align:right">${money(item.valor)}</td>
      <td style="text-align:right">-${money(Number(item.auxilio_1 || 0) + Number(item.auxilio_2 || 0))}</td>
      <td style="text-align:right">${money(item.valor_liquido || item.valor_repasse_medico || 0)}</td>
      <td>${item.status_pagamento === 'pago' ? 'Pago' : item.status_pagamento === 'aprovado' ? 'Aprovado' : 'Pendente'}</td>
      <td>${item.data_pagamento ? dateLabel(item.data_pagamento) : '-'}</td>
    </tr>`,
      )
      .join('');
    win.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>Extração de Cirurgias - Vertebrare</title>
    <style>
      body { font-family: Inter, Arial, sans-serif; color: #2a1a3e; padding: 32px; }
      h1 { font-size: 22px; color: #4a2d6e; margin: 0 0 4px; }
      h2 { font-size: 13px; font-weight: normal; color: #8a7a9e; margin: 0 0 20px; }
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
    <h1>Vertebrare — Extração de dados de cirurgias</h1>
    <h2>Médico: ${medicoNome} · Cirurgia: ${cirurgiaNome} · Período: ${dataInicio ? dateLabel(dataInicio) : 'início'} a ${dataFim ? dateLabel(dataFim) : 'hoje'} · Status: ${status === 'todos' ? 'Todos' : status === 'pago' ? 'Pago' : 'Pendente'}</h2>
    <div class="summary">
      <div class="card"><span>Total bruto</span><strong>${money(totals.bruto)}</strong></div>
      <div class="card"><span>Cirurgias</span><strong>${totals.count}</strong></div>
      <div class="card"><span>Total pago</span><strong>${money(totals.pago)}</strong></div>
      <div class="card"><span>Total pendente</span><strong>${money(totals.pendente)}</strong></div>
    </div>
    <table><thead><tr>
      <th>Nº</th><th>Médico</th><th>Data</th><th>Paciente</th><th>Cirurgia</th><th>Convênio</th><th>Valor</th><th>Auxílios</th><th>Líquido</th><th>Status</th><th>Data pagto</th>
    </tr></thead><tbody>${rows}</tbody></table>
    <div class="footer">Gerado por Vertebrare · ${new Date().toLocaleString('pt-BR')}</div>
    <script>window.onload = () => window.print();</script>
    </body></html>`);
    win.document.close();
  };

  const limpar = () => {
    setMedicoId('');
    setCirurgiaId('');
    setDataInicio('');
    setDataFim('');
    setStatus('todos');
  };

  return (
    <div className="space-y-6">
      <section className="hero-panel">
        <div>
          <div className="eyebrow">
            <FileText size={15} /> Relatórios
          </div>
          <h1>Extração de dados de cirurgias</h1>
          <p>
            Filtre por médico, período, cirurgia e status de pagamento (pago ou pendente).
          </p>
        </div>
        <div className="hero-actions">
          <button className="button button-light" onClick={exportPdf}>
            <FileDown size={18} /> Baixar PDF
          </button>
        </div>
      </section>

      <section className="summary-grid">
        <div className="summary-card summary-blue">
          <span>Total bruto</span>
          <strong>{money(totals.bruto)}</strong>
          <small>{totals.count} cirurgias no filtro</small>
          <CircleDollarSign />
        </div>
        <div className="summary-card summary-green">
          <span>Total pago</span>
          <strong>{money(totals.pago)}</strong>
          <small>Cirurgias com repasse pago</small>
          <CheckCircle2 />
        </div>
        <div className="summary-card summary-amber">
          <span>Total pendente</span>
          <strong>{money(totals.pendente)}</strong>
          <small>Cirurgias aguardando repasse</small>
          <Clock />
        </div>
      </section>

      <section className="filter-panel">
        <div className="filter-heading">
          <Filter size={17} />
          <strong>Filtros do relatório</strong>
          <button
            className="button button-muted"
            style={{ marginLeft: 'auto', minHeight: 32, padding: '0 12px' }}
            onClick={limpar}
          >
            Limpar
          </button>
        </div>
        <div className="filter-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
          <select value={medicoId} onChange={(e) => setMedicoId(e.target.value)}>
            <option value="">Todos os médicos</option>
            {medicos.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </select>
          <select value={cirurgiaId} onChange={(e) => setCirurgiaId(e.target.value)}>
            <option value="">Todas as cirurgias</option>
            {cirurgias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
          <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
          <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
          <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
            <option value="todos">Todos os status</option>
            <option value="pago">Pago</option>
            <option value="pendente">Pendente</option>
          </select>
        </div>
      </section>

      {error && <div className="alert-error">{error}</div>}

      <section className="table-panel">
        <div className="section-title">
          <div>
            <span className="eyebrow">Resultado</span>
            <h2>{items.length} cirurgias</h2>
          </div>
        </div>
        <div className="table-wrap">
          <table style={{ minWidth: 1100 }}>
            <thead>
              <tr>
                <th>Nº</th>
                <th>Médico</th>
                <th>Data</th>
                <th>Paciente</th>
                <th>Cirurgia</th>
                <th>Convênio</th>
                <th>Valor</th>
                <th>Auxílios</th>
                <th>Líquido</th>
                <th>Status</th>
                <th>Data pagto</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} className="empty-state">
                    Carregando...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={11} className="empty-state">
                    <FileText size={32} />
                    <strong>Nenhuma cirurgia encontrada</strong>
                    <span>Ajuste os filtros para ver resultados.</span>
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.id}</td>
                    <td>
                      <strong>{item.medico?.nome || '-'}</strong>
                    </td>
                    <td>{dateLabel(item.data_cirurgia)}</td>
                    <td>{item.nome_paciente}</td>
                    <td>{item.cirurgia?.nome || item.tipo_procedimento || '-'}</td>
                    <td>
                      {item.is_particular
                        ? 'Particular'
                        : item.convenio?.nome || (item.convenio_id ? `#${item.convenio_id}` : '-')}
                    </td>
                    <td>{money(item.valor)}</td>
                    <td className="negative">
                      -{money(Number(item.auxilio_1 || 0) + Number(item.auxilio_2 || 0))}
                    </td>
                    <td className="positive strong">
                      {money(item.valor_liquido || item.valor_repasse_medico || 0)}
                    </td>
                    <td>
                      <span
                        className={`status-pill status-${item.status_pagamento || 'pendente'}`}
                      >
                        {item.status_pagamento === 'pago'
                          ? 'Pago'
                          : item.status_pagamento === 'aprovado'
                            ? 'Aprovado'
                            : 'Pendente'}
                      </span>
                    </td>
                    <td>{item.data_pagamento ? dateLabel(item.data_pagamento) : '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
