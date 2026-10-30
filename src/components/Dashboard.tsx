import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3, Filter, TrendingUp, TrendingDown, DollarSign, Scissors, Stethoscope, Users,
  Download, ArrowUpDown, Percent, Receipt, Wallet,
} from 'lucide-react';
import { dbHelpers } from '../lib/supabase';
import { useAuth } from './Auth/AuthContext';
import type { Cirurgia, Medico, Procedimento, Repasse } from '../types';

/* ───────────── Formatadores ───────────── */
const money = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);
const compact = (value: number) =>
  new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value) || 0);
const pct = (value: number) => `${(Number.isFinite(value) ? value : 0).toFixed(1).replace('.', ',')}%`;
const formatDate = (d: string) => (d ? d.split('T')[0].split('-').reverse().join('/') : '-');
const monthLabel = (m: string) => {
  const [y, mo] = m.split('-');
  const names = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  return `${names[Number(mo) - 1] || mo}/${(y || '').slice(2)}`;
};

const PALETTE = ['#4a2d6e', '#3a6b52', '#b8853e', '#b04545', '#2f6690', '#8a5a9e', '#6b8e23', '#c0762f', '#5f6b7a', '#a23b72'];
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/* ───────────── Cálculo por lançamento ───────────── */
function calcRow(r: Repasse) {
  const a = r as any;
  const base = Number(r.valor || 0) + Number(r.auxilio_1 || 0) + Number(r.auxilio_2 || 0);
  const taxa = base * 0.015;
  const imposto = (base * Number(r.imposto_percentual || 0)) / 100;
  const adm = a.desc_adm !== false ? base * 0.01 : 0;
  const chefe = a.desc_chefe_faturamento !== false ? base * 0.0075 : 0;
  const fat = a.desc_faturista !== false ? base * 0.005 : 0;
  const aut = a.desc_autorizacao !== false ? base * 0.0025 : 0;
  const fixo = Number(a.desconto_fixo_clinica || 0);
  const outras = Number(r.outras_deducoes || 0);
  const descontos = taxa + imposto + adm + chefe + fat + aut + fixo + outras;
  const liquido = Number(r.valor_liquido || r.valor_repasse_medico || 0);
  return { base, taxa, imposto, adm, chefe, fat, aut, fixo, outras, descontos, liquido };
}

const monthKey = (r: Repasse) => r.month_reference || (r.data_cirurgia ? r.data_cirurgia.slice(0, 7) : '');

/* ───────────── Gráficos SVG ───────────── */
interface Serie { name: string; color: string; values: number[] }

/** Linhas/área com tooltip — evolução temporal de várias séries */
function TrendChart({ labels, series }: { labels: string[]; series: Serie[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 680, H = 290, pl = 52, pr = 18, pt = 18, pb = 34;
  const n = labels.length;
  const max = Math.max(...series.flatMap((s) => s.values), 1);
  const x = (i: number) => (n === 1 ? pl + (W - pl - pr) / 2 : pl + (i * (W - pl - pr)) / (n - 1));
  const y = (v: number) => pt + (H - pt - pb) * (1 - v / max);
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const step = Math.max(1, Math.ceil(n / 8));

  return (
    <div className="bi-svg-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="bi-svg" onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pl} x2={W - pr} y1={y(max * t)} y2={y(max * t)} className="bi-grid" />
            <text x={pl - 8} y={y(max * t) + 4} textAnchor="end" className="bi-axis">{compact(max * t)}</text>
          </g>
        ))}
        {labels.map((l, i) => (i % step === 0 ? (
          <text key={i} x={x(i)} y={H - 10} textAnchor="middle" className="bi-axis">{l}</text>
        ) : null))}

        {series.map((s, si) => {
          const pts = s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ');
          const area = `${x(0)},${y(0)} ${pts} ${x(n - 1)},${y(0)}`;
          return (
            <g key={s.name}>
              {si === 0 && <polygon points={area} fill={s.color} opacity={0.12} />}
              <polyline points={pts} fill="none" stroke={s.color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
              {s.values.map((v, i) => (
                <circle key={i} cx={x(i)} cy={y(v)} r={hover === i ? 5 : 3} fill="#fff" stroke={s.color} strokeWidth={2} />
              ))}
            </g>
          );
        })}

        {hover !== null && (
          <line x1={x(hover)} x2={x(hover)} y1={pt} y2={H - pb} className="bi-cursor" />
        )}
        {labels.map((_, i) => (
          <rect
            key={i}
            x={x(i) - (W - pl - pr) / Math.max(n - 1, 1) / 2}
            y={pt}
            width={(W - pl - pr) / Math.max(n - 1, 1)}
            height={H - pt - pb}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
          />
        ))}
      </svg>

      <div className="bi-legend">
        {series.map((s) => (
          <span key={s.name}><i style={{ background: s.color }} />{s.name}</span>
        ))}
      </div>

      {hover !== null && (
        <div className="bi-tooltip">
          <strong>{labels[hover]}</strong>
          {series.map((s) => (
            <div key={s.name}><i style={{ background: s.color }} />{s.name}: <b>{money(s.values[hover])}</b></div>
          ))}
        </div>
      )}
    </div>
  );
}

interface Slice { label: string; value: number; color?: string }

/** Rosca com legenda e percentuais */
function Donut({ data, center, format = money }: { data: Slice[]; center: string; format?: (v: number) => string }) {
  const [active, setActive] = useState<number | null>(null);
  const total = data.reduce((s, d) => s + d.value, 0);
  const R = 70, C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <div className="bi-donut">
      <svg viewBox="0 0 200 200" className="bi-donut-svg">
        <circle cx="100" cy="100" r={R} fill="none" stroke="#eee" strokeWidth="26" />
        {total > 0 && data.map((d, i) => {
          const len = (d.value / total) * C;
          const el = (
            <circle
              key={i}
              cx="100" cy="100" r={R} fill="none"
              stroke={d.color || PALETTE[i % PALETTE.length]}
              strokeWidth={active === i ? 32 : 26}
              strokeDasharray={`${len} ${C - len}`}
              strokeDashoffset={-acc}
              transform="rotate(-90 100 100)"
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              style={{ transition: 'stroke-width .15s' }}
            />
          );
          acc += len;
          return el;
        })}
        <text x="100" y="94" textAnchor="middle" className="bi-donut-sub">{active !== null ? data[active].label : 'Total'}</text>
        <text x="100" y="114" textAnchor="middle" className="bi-donut-val">
          {active !== null ? pct((data[active].value / (total || 1)) * 100) : center}
        </text>
      </svg>
      <ul className="bi-donut-legend">
        {data.map((d, i) => (
          <li key={i} onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)}>
            <i style={{ background: d.color || PALETTE[i % PALETTE.length] }} />
            <span>{d.label}</span>
            <b>{format(d.value)}</b>
            <em>{pct((d.value / (total || 1)) * 100)}</em>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Ranking horizontal com participação % e linha de acumulado (Pareto) */
function Ranking({ data, format = money, color = '#4a2d6e', pareto = false }: {
  data: Slice[]; format?: (v: number) => string; color?: string; pareto?: boolean;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  let acc = 0;
  return (
    <div className="bi-rank">
      {data.map((d, i) => {
        acc += d.value;
        return (
          <div className="bi-rank-row" key={i} title={`${d.label}: ${format(d.value)}`}>
            <span className="bi-rank-pos">{i + 1}</span>
            <div className="bi-rank-body">
              <div className="bi-rank-top">
                <span className="bi-rank-label">{d.label}</span>
                <span className="bi-rank-val">{format(d.value)} <em>{pct((d.value / total) * 100)}</em></span>
              </div>
              <div className="bi-rank-track">
                <div className="bi-rank-fill" style={{ width: `${(d.value / max) * 100}%`, background: color }} />
              </div>
              {pareto && <div className="bi-rank-acc">acumulado {pct((acc / total) * 100)}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Colunas simples (dia da semana) com destaque do maior valor */
function Columns({ data, format = money }: { data: Slice[]; format?: (v: number) => string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="bi-cols">
      {data.map((d, i) => (
        <div className="bi-col" key={i} title={`${d.label}: ${format(d.value)}`}>
          <span className="bi-col-val">{d.value > 0 ? compact(d.value) : ''}</span>
          <div className="bi-col-track">
            <div className="bi-col-fill" style={{ height: `${(d.value / max) * 100}%`, background: d.value === max && max > 0 ? '#b8853e' : '#4a2d6e' }} />
          </div>
          <span className="bi-col-label">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

/** Mapa de calor médico × mês */
function Heatmap({ rows, cols, matrix }: { rows: string[]; cols: string[]; matrix: number[][] }) {
  const max = Math.max(...matrix.flat(), 1);
  return (
    <div className="bi-heat-wrap">
      <table className="bi-heat">
        <thead>
          <tr><th />{cols.map((c) => <th key={c}>{monthLabel(c)}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r}>
              <th title={r}>{r}</th>
              {matrix[i].map((v, j) => (
                <td
                  key={j}
                  title={`${r} · ${monthLabel(cols[j])}: ${money(v)}`}
                  style={{ background: v > 0 ? `rgba(74,45,110,${0.12 + 0.88 * (v / max)})` : '#f6f4f8', color: v / max > 0.55 ? '#fff' : '#333' }}
                >
                  {v > 0 ? compact(v) : ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Delta({ current, previous }: { current: number; previous: number }) {
  if (!previous) return <small className="bi-delta">sem base de comparação</small>;
  const d = ((current - previous) / previous) * 100;
  const up = d >= 0;
  return (
    <small className={`bi-delta ${up ? 'up' : 'down'}`}>
      {up ? <TrendingUp size={13} /> : <TrendingDown size={13} />} {pct(Math.abs(d))} vs mês anterior
    </small>
  );
}

/* ───────────── Componente principal ───────────── */
type SortKey = 'data' | 'medico' | 'paciente' | 'valor' | 'repasse';

export function DashboardComponent() {
  const { perfil: _perfil } = useAuth();
  const [repasses, setRepasses] = useState<Repasse[]>([]);
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [procedimentos, setProcedimentos] = useState<Procedimento[]>([]);
  const [cirurgias, setCirurgias] = useState<Cirurgia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtroMedico, setFiltroMedico] = useState('');
  const [filtroCirurgia, setFiltroCirurgia] = useState('');
  const [filtroProcedimento, setFiltroProcedimento] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('data');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const PAGE = 15;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [repRes, medRes, procRes, cirRes] = await Promise.all([
        dbHelpers.getRepassesForReport({ tipo: 'todos' }),
        dbHelpers.getMedicos(),
        dbHelpers.getProcedimentos(),
        dbHelpers.getCirurgias(),
      ]);
      if (repRes.error) {
        setError('Não foi possível carregar os dados.');
      } else {
        setRepasses((repRes.data as Repasse[]) || []);
        setMedicos((medRes.data as Medico[]) || []);
        setProcedimentos((procRes.data as Procedimento[]) || []);
        setCirurgias((cirRes.data as Cirurgia[]) || []);
      }
      setLoading(false);
    };
    void load();
  }, []);

  useEffect(() => { setPage(0); }, [filtroMedico, filtroCirurgia, filtroProcedimento, filtroTipo, dataInicio, dataFim, sortKey, sortDir]);

  const filtered = useMemo(() => repasses.filter((item) => {
    const matchMedico = !filtroMedico || String(item.medico_id) === filtroMedico;
    const matchCirurgia = !filtroCirurgia || String(item.cirurgia_id || '') === filtroCirurgia;
    const matchProc = !filtroProcedimento || (item.tipo_procedimento || '').toLowerCase().includes(filtroProcedimento.toLowerCase());
    const matchTipo = !filtroTipo || item.tipo === filtroTipo;
    const itemDate = item.data_cirurgia?.split('T')[0] || '';
    const matchInicio = !dataInicio || itemDate >= dataInicio;
    const matchFim = !dataFim || itemDate <= dataFim;
    return matchMedico && matchCirurgia && matchProc && matchTipo && matchInicio && matchFim;
  }), [repasses, filtroMedico, filtroCirurgia, filtroProcedimento, filtroTipo, dataInicio, dataFim]);

  const calc = useMemo(() => filtered.map((r) => ({ r, c: calcRow(r) })), [filtered]);

  const stats = useMemo(() => {
    const totalCirurgias = filtered.filter((r) => r.tipo === 'cirurgia').length;
    const totalProcedimentos = filtered.filter((r) => r.tipo === 'consulta').length;
    const valorTotal = calc.reduce((s, x) => s + x.c.base, 0);
    const totalDescontos = calc.reduce((s, x) => s + x.c.descontos, 0);
    const valorRepassado = calc.reduce((s, x) => s + x.c.liquido, 0);
    const count = filtered.length;
    return {
      totalCirurgias, totalProcedimentos, valorTotal, totalDescontos, valorRepassado, count,
      ticket: count ? valorTotal / count : 0,
      taxaRepasse: valorTotal ? (valorRepassado / valorTotal) * 100 : 0,
      taxaDesconto: valorTotal ? (totalDescontos / valorTotal) * 100 : 0,
    };
  }, [filtered, calc]);

  /* Evolução mensal: bruto × descontos × repasse */
  const monthly = useMemo(() => {
    const map = new Map<string, { bruto: number; desc: number; liq: number; qtd: number }>();
    calc.forEach(({ r, c }) => {
      const m = monthKey(r);
      if (!m) return;
      const cur = map.get(m) || { bruto: 0, desc: 0, liq: 0, qtd: 0 };
      cur.bruto += c.base; cur.desc += c.descontos; cur.liq += c.liquido; cur.qtd += 1;
      map.set(m, cur);
    });
    const keys = Array.from(map.keys()).sort();
    return { keys, rows: keys.map((k) => map.get(k)!) };
  }, [calc]);

  const lastTwo = useMemo(() => {
    const n = monthly.rows.length;
    return { cur: n ? monthly.rows[n - 1] : null, prev: n > 1 ? monthly.rows[n - 2] : null };
  }, [monthly]);

  /* Composição do bruto (para onde vai o dinheiro) */
  const composicao = useMemo<Slice[]>(() => {
    const t = { Repasse: 0, 'Taxa 1,5%': 0, Impostos: 0, 'Adm / Chefe / Faturista / Autorização': 0, 'Fixo clínica': 0, 'Outras deduções': 0 };
    calc.forEach(({ c }) => {
      t.Repasse += c.liquido;
      t['Taxa 1,5%'] += c.taxa;
      t.Impostos += c.imposto;
      t['Adm / Chefe / Faturista / Autorização'] += c.adm + c.chefe + c.fat + c.aut;
      t['Fixo clínica'] += c.fixo;
      t['Outras deduções'] += c.outras;
    });
    return Object.entries(t).filter(([, v]) => v > 0).map(([label, value], i) => ({
      label, value, color: label === 'Repasse' ? '#3a6b52' : PALETTE[(i + 2) % PALETTE.length],
    }));
  }, [calc]);

  const porTipo = useMemo<Slice[]>(() => {
    const cir = calc.filter(({ r }) => r.tipo === 'cirurgia').reduce((s, x) => s + x.c.base, 0);
    const con = calc.filter(({ r }) => r.tipo === 'consulta').reduce((s, x) => s + x.c.base, 0);
    const outros = stats.valorTotal - cir - con;
    return [
      { label: 'Cirurgias', value: cir, color: '#4a2d6e' },
      { label: 'Consultas / proced.', value: con, color: '#3a6b52' },
      ...(outros > 0.01 ? [{ label: 'Outros', value: outros, color: '#b8853e' }] : []),
    ].filter((s) => s.value > 0);
  }, [calc, stats.valorTotal]);

  const byMedico = useMemo<Slice[]>(() => {
    const map = new Map<string, number>();
    calc.forEach(({ r, c }) => {
      const nome = r.medico?.nome || 'Sem médico';
      map.set(nome, (map.get(nome) || 0) + c.liquido);
    });
    return Array.from(map.entries()).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  }, [calc]);

  const byCirurgia = useMemo<Slice[]>(() => {
    const map = new Map<string, number>();
    calc.forEach(({ r, c }) => {
      const nome = r.cirurgia?.nome || (r.cirurgia_id ? `Cirurgia #${r.cirurgia_id}` : 'Não informada');
      map.set(nome, (map.get(nome) || 0) + c.base);
    });
    return Array.from(map.entries()).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [calc]);

  const byProcedimento = useMemo<Slice[]>(() => {
    const map = new Map<string, number>();
    filtered.forEach((r) => {
      const nome = r.tipo_procedimento || 'Não informado';
      map.set(nome, (map.get(nome) || 0) + 1);
    });
    return Array.from(map.entries()).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [filtered]);

  const byWeekday = useMemo<Slice[]>(() => {
    const arr = new Array(7).fill(0);
    calc.forEach(({ r, c }) => {
      const d = r.data_cirurgia?.split('T')[0];
      if (!d) return;
      arr[new Date(`${d}T00:00:00`).getDay()] += c.base;
    });
    return WEEKDAYS.map((label, i) => ({ label, value: arr[i] }));
  }, [calc]);

  const heat = useMemo(() => {
    const top = byMedico.slice(0, 8).map((m) => m.label);
    const cols = monthly.keys.slice(-8);
    const idx = new Map(top.map((n, i) => [n, i]));
    const matrix = top.map(() => cols.map(() => 0));
    calc.forEach(({ r, c }) => {
      const i = idx.get(r.medico?.nome || 'Sem médico');
      const j = cols.indexOf(monthKey(r));
      if (i !== undefined && j >= 0) matrix[i][j] += c.liquido;
    });
    return { rows: top, cols, matrix };
  }, [calc, byMedico, monthly.keys]);

  /* Tabela: ordenação + paginação */
  const tableRows = useMemo(() => {
    const val: Record<SortKey, (x: typeof calc[number]) => string | number> = {
      data: (x) => x.r.data_cirurgia || '',
      medico: (x) => (x.r.medico?.nome || '').toLowerCase(),
      paciente: (x) => (x.r.nome_paciente || '').toLowerCase(),
      valor: (x) => x.c.base,
      repasse: (x) => x.c.liquido,
    };
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...calc].sort((a, b) => {
      const va = val[sortKey](a), vb = val[sortKey](b);
      return va < vb ? -dir : va > vb ? dir : 0;
    });
  }, [calc, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(tableRows.length / PAGE));
  const pageRows = tableRows.slice(page * PAGE, page * PAGE + PAGE);

  const toggleSort = (k: SortKey) => {
    if (k === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(k); setSortDir('desc'); }
  };

  const exportCsv = () => {
    const head = ['Data', 'Médico', 'Paciente', 'Cirurgia', 'Procedimento', 'Tipo', 'Valor bruto', 'Descontos', 'Repasse'];
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = tableRows.map(({ r, c }) => [
      formatDate(r.data_cirurgia), r.medico?.nome || '', r.nome_paciente || '', r.cirurgia?.nome || '',
      r.tipo_procedimento || '', r.tipo || '', c.base.toFixed(2), c.descontos.toFixed(2), c.liquido.toFixed(2),
    ].map(esc).join(';'));
    const blob = new Blob(['\ufeff' + [head.map(esc).join(';'), ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `dashboard-lancamentos-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  /* Períodos rápidos */
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const setPeriodo = (meses: number | 'ano' | 'tudo') => {
    const hoje = new Date();
    if (meses === 'tudo') { setDataInicio(''); setDataFim(''); return; }
    if (meses === 'ano') { setDataInicio(`${hoje.getFullYear()}-01-01`); setDataFim(iso(hoje)); return; }
    const ini = new Date(hoje.getFullYear(), hoje.getMonth() - (meses - 1), 1);
    setDataInicio(iso(ini)); setDataFim(iso(hoje));
  };

  const limparFiltros = () => {
    setFiltroMedico(''); setFiltroCirurgia(''); setFiltroProcedimento(''); setFiltroTipo(''); setDataInicio(''); setDataFim('');
  };
  const hasFilters = filtroMedico || filtroCirurgia || filtroProcedimento || filtroTipo || dataInicio || dataFim;

  const Th = ({ k, children, right }: { k: SortKey; children: React.ReactNode; right?: boolean }) => (
    <th style={{ cursor: 'pointer', textAlign: right ? 'right' : 'left' }} onClick={() => toggleSort(k)}>
      {children} <ArrowUpDown size={12} style={{ opacity: sortKey === k ? 1 : 0.35, verticalAlign: 'middle' }} />
    </th>
  );

  return (
    <div className="space-y-6">
      <style>{BI_CSS}</style>

      <section className="hero-panel">
        <div>
          <div className="eyebrow"><BarChart3 size={15} /> Business Intelligence</div>
          <h1>Dashboard</h1>
          <p>Indicadores, tendências e composição dos repasses, cirurgias e procedimentos.</p>
        </div>
      </section>

      <section className="filter-panel">
        <div className="filter-heading"><Filter size={17} /><strong>Filtrar dados</strong></div>
        <div className="bi-presets">
          {([[1, 'Mês atual'], [3, '3 meses'], [6, '6 meses'], [12, '12 meses'], ['ano', 'Ano atual'], ['tudo', 'Tudo']] as const).map(([v, l]) => (
            <button key={l} type="button" className="bi-chip" onClick={() => setPeriodo(v as number | 'ano' | 'tudo')}>{l}</button>
          ))}
        </div>
        <div className="filter-grid">
          <select value={filtroMedico} onChange={(e) => setFiltroMedico(e.target.value)}>
            <option value="">Todos os médicos</option>
            {medicos.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
          </select>
          <select value={filtroCirurgia} onChange={(e) => setFiltroCirurgia(e.target.value)}>
            <option value="">Todas as cirurgias</option>
            {cirurgias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <select value={filtroProcedimento} onChange={(e) => setFiltroProcedimento(e.target.value)}>
            <option value="">Todos os procedimentos</option>
            {procedimentos.map((p) => <option key={p.id} value={p.nome}>{p.nome}</option>)}
          </select>
          <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
            <option value="">Cirurgias e consultas</option>
            <option value="cirurgia">Somente cirurgias</option>
            <option value="consulta">Somente consultas</option>
          </select>
          <label>Período início<input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} /></label>
          <label>Período fim<input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} /></label>
          {hasFilters && <button className="button button-muted" onClick={limparFiltros}>Limpar filtros</button>}
        </div>
      </section>

      {error && <div className="alert-error">{error}</div>}

      {/* KPIs principais */}
      <section className="summary-grid">
        <div className="summary-card summary-amber">
          <span>Valor bruto</span><strong>{money(stats.valorTotal)}</strong>
          {lastTwo.cur && lastTwo.prev ? <Delta current={lastTwo.cur.bruto} previous={lastTwo.prev.bruto} /> : <small>Produção no período</small>}
          <DollarSign />
        </div>
        <div className="summary-card summary-green">
          <span>Valor repassado</span><strong>{money(stats.valorRepassado)}</strong>
          {lastTwo.cur && lastTwo.prev ? <Delta current={lastTwo.cur.liq} previous={lastTwo.prev.liq} /> : <small>Líquido repassado</small>}
          <Wallet />
        </div>
        <div className="summary-card summary-blue">
          <span>Total descontos</span><strong>{money(stats.totalDescontos)}</strong>
          <small>{pct(stats.taxaDesconto)} do bruto</small><Receipt />
        </div>
      </section>

      <section className="summary-grid">
        <div className="summary-card summary-blue"><span>Cirurgias</span><strong>{stats.totalCirurgias}</strong><small>Quantidade de cirurgias</small><Scissors /></div>
        <div className="summary-card summary-green"><span>Consultas / proced.</span><strong>{stats.totalProcedimentos}</strong><small>Consultas e procedimentos</small><Stethoscope /></div>
        <div className="summary-card summary-amber"><span>Ticket médio</span><strong>{money(stats.ticket)}</strong><small>{stats.count} lançamentos · repasse {pct(stats.taxaRepasse)}</small><Percent /></div>
      </section>

      {loading ? (
        <div className="alert-error">Carregando dados...</div>
      ) : (
        <>
          <div className="dashboard-charts-grid bi-wide-left">
            <div className="chart-panel">
              <div className="chart-header"><TrendingUp size={18} /><h3>Evolução mensal</h3></div>
              {monthly.keys.length > 0 ? (
                <TrendChart
                  labels={monthly.keys.map(monthLabel)}
                  series={[
                    { name: 'Bruto', color: '#b8853e', values: monthly.rows.map((r) => r.bruto) },
                    { name: 'Repasse', color: '#3a6b52', values: monthly.rows.map((r) => r.liq) },
                    { name: 'Descontos', color: '#b04545', values: monthly.rows.map((r) => r.desc) },
                  ]}
                />
              ) : <div className="empty-state">Sem dados</div>}
            </div>
            <div className="chart-panel">
              <div className="chart-header"><Receipt size={18} /><h3>Para onde vai o valor bruto</h3></div>
              {composicao.length > 0 ? <Donut data={composicao} center={compact(stats.valorTotal)} /> : <div className="empty-state">Sem dados</div>}
            </div>
          </div>

          <div className="dashboard-charts-grid">
            <div className="chart-panel">
              <div className="chart-header"><Users size={18} /><h3>Ranking de médicos (repasse) — Pareto</h3></div>
              {byMedico.length > 0 ? <Ranking data={byMedico.slice(0, 8)} pareto /> : <div className="empty-state">Sem dados</div>}
            </div>
            <div className="chart-panel">
              <div className="chart-header"><Scissors size={18} /><h3>Cirurgias que mais faturam</h3></div>
              {byCirurgia.length > 0 ? <Ranking data={byCirurgia} color="#b04545" /> : <div className="empty-state">Sem dados</div>}
            </div>
          </div>

          <div className="dashboard-charts-grid">
            <div className="chart-panel">
              <div className="chart-header"><Stethoscope size={18} /><h3>Procedimentos mais realizados</h3></div>
              {byProcedimento.length > 0 ? <Ranking data={byProcedimento} format={(v) => `${v}`} color="#b8853e" /> : <div className="empty-state">Sem dados</div>}
            </div>
            <div className="chart-panel">
              <div className="chart-header"><BarChart3 size={18} /><h3>Mix de receita por tipo</h3></div>
              {porTipo.length > 0 ? <Donut data={porTipo} center={compact(stats.valorTotal)} /> : <div className="empty-state">Sem dados</div>}
            </div>
          </div>

          <div className="dashboard-charts-grid">
            <div className="chart-panel">
              <div className="chart-header"><BarChart3 size={18} /><h3>Faturamento por dia da semana</h3></div>
              <Columns data={byWeekday} />
            </div>
            <div className="chart-panel">
              <div className="chart-header"><Users size={18} /><h3>Mapa de calor — médico × mês (repasse)</h3></div>
              {heat.rows.length > 0 && heat.cols.length > 0
                ? <Heatmap rows={heat.rows} cols={heat.cols} matrix={heat.matrix} />
                : <div className="empty-state">Sem dados</div>}
            </div>
          </div>

          <div className="table-panel">
            <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div><span className="eyebrow">Detalhamento</span><h2>Lançamentos filtrados ({filtered.length})</h2></div>
              <button className="button button-muted" onClick={exportCsv}><Download size={15} /> Exportar CSV</button>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <Th k="data">Data</Th><Th k="medico">Médico</Th><Th k="paciente">Paciente</Th>
                    <th>Cirurgia</th><th>Procedimento</th>
                    <Th k="valor" right>Valor</Th><th style={{ textAlign: 'right' }}>Descontos</th><Th k="repasse" right>Repasse</Th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.length === 0 ? (
                    <tr><td colSpan={8} className="empty-state">Nenhum lançamento encontrado</td></tr>
                  ) : pageRows.map(({ r, c }) => (
                    <tr key={r.id}>
                      <td>{formatDate(r.data_cirurgia)}</td>
                      <td><strong>{r.medico?.nome || '-'}</strong></td>
                      <td>{r.nome_paciente}</td>
                      <td>{r.cirurgia?.nome || '-'}</td>
                      <td>{r.tipo_procedimento || '-'}</td>
                      <td style={{ textAlign: 'right' }}>{money(c.base)}</td>
                      <td style={{ textAlign: 'right' }}>{money(c.descontos)}</td>
                      <td className="positive strong" style={{ textAlign: 'right' }}>{money(c.liquido)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bi-pager">
              <button className="button button-muted" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Anterior</button>
              <span>Página {page + 1} de {totalPages}</span>
              <button className="button button-muted" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>Próxima</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ───────────── Estilos dos novos gráficos ───────────── */
const BI_CSS = `
.bi-wide-left{grid-template-columns:minmax(0,1.6fr) minmax(0,1fr)}
@media(max-width:1000px){.bi-wide-left{grid-template-columns:1fr}}
.bi-presets{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0 14px}
.bi-chip{border:1px solid #d9d2e3;background:#fff;color:#4a2d6e;border-radius:999px;padding:5px 14px;font-size:13px;cursor:pointer}
.bi-chip:hover{background:#4a2d6e;color:#fff}
.bi-svg-wrap{position:relative}
.bi-svg{width:100%;height:auto;display:block}
.bi-grid{stroke:#e9e5ef;stroke-dasharray:3 4}
.bi-axis{fill:#7a7285;font-size:11px}
.bi-cursor{stroke:#9a8fb0;stroke-dasharray:4 3}
.bi-legend{display:flex;gap:16px;flex-wrap:wrap;font-size:13px;margin-top:6px}
.bi-legend i,.bi-tooltip i,.bi-donut-legend i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px}
.bi-tooltip{position:absolute;top:6px;right:6px;background:#fff;border:1px solid #e1dcea;border-radius:10px;padding:8px 12px;font-size:12.5px;box-shadow:0 6px 18px rgba(0,0,0,.08)}
.bi-donut{display:flex;flex-direction:column;align-items:center;gap:10px}
.bi-donut-svg{width:190px;height:190px}
.bi-donut-sub{font-size:11px;fill:#7a7285}
.bi-donut-val{font-size:17px;font-weight:700;fill:#2b2236}
.bi-donut-legend{list-style:none;margin:0;padding:0;width:100%;font-size:13px}
.bi-donut-legend li{display:flex;align-items:center;padding:4px 0;border-bottom:1px solid #f0edf4;gap:4px}
.bi-donut-legend span{flex:1}
.bi-donut-legend em{font-style:normal;color:#7a7285;width:52px;text-align:right}
.bi-rank{display:flex;flex-direction:column;gap:12px}
.bi-rank-row{display:flex;gap:10px;align-items:flex-start}
.bi-rank-pos{width:22px;height:22px;border-radius:50%;background:#f1edf6;color:#4a2d6e;font-size:12px;font-weight:700;display:grid;place-items:center;flex:none;margin-top:2px}
.bi-rank-body{flex:1;min-width:0}
.bi-rank-top{display:flex;justify-content:space-between;gap:8px;font-size:13px}
.bi-rank-label{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:600}
.bi-rank-val{white-space:nowrap}
.bi-rank-val em{font-style:normal;color:#7a7285;margin-left:6px}
.bi-rank-track{height:8px;background:#f1edf6;border-radius:999px;overflow:hidden;margin-top:4px}
.bi-rank-fill{height:100%;border-radius:999px}
.bi-rank-acc{font-size:11px;color:#9a93a6;margin-top:2px}
.bi-cols{display:flex;gap:10px;align-items:flex-end;height:230px}
.bi-col{flex:1;display:flex;flex-direction:column;align-items:center;height:100%;gap:4px}
.bi-col-track{flex:1;width:100%;display:flex;align-items:flex-end;background:#f6f4f8;border-radius:8px;overflow:hidden}
.bi-col-fill{width:100%;border-radius:8px 8px 0 0;min-height:2px}
.bi-col-val{font-size:11px;color:#5d5568;height:14px}
.bi-col-label{font-size:12px;font-weight:600}
.bi-heat-wrap{overflow:auto}
.bi-heat{border-collapse:separate;border-spacing:3px;font-size:11.5px;width:100%}
.bi-heat th{font-weight:600;color:#5d5568;text-align:left;white-space:nowrap;max-width:130px;overflow:hidden;text-overflow:ellipsis;padding:2px 4px}
.bi-heat thead th{text-align:center}
.bi-heat td{text-align:center;padding:8px 4px;border-radius:6px;min-width:44px}
.bi-delta{display:inline-flex;align-items:center;gap:4px}
.bi-delta.up{color:#2e7d4f}.bi-delta.down{color:#b04545}
.bi-pager{display:flex;justify-content:center;align-items:center;gap:14px;padding:12px;font-size:13px}
