import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Filter, TrendingUp, DollarSign, Scissors, Stethoscope, Users } from 'lucide-react';
import { dbHelpers } from '../lib/supabase';
import { useAuth } from './Auth/AuthContext';
import type { Cirurgia, Medico, Procedimento, Repasse } from '../types';

const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);
const formatDate = (d: string) => d ? d.split('T')[0].split('-').reverse().join('/') : '-';

interface BarData { label: string; value: number; }

function BarChart({ data, color, max }: { data: BarData[]; color: string; max?: number }) {
  const maxValue = max || Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="chart-bars">
      {data.map((d, i) => (
        <div className="chart-bar-col" key={i}>
          <div className="chart-bar-track">
            <div className="chart-bar-fill" style={{ height: `${(d.value / maxValue) * 100}%`, background: color }} />
          </div>
          <span className="chart-bar-label">{d.label}</span>
          <span className="chart-bar-value">{money(d.value)}</span>
        </div>
      ))}
    </div>
  );
}

function HBarChart({ data, color }: { data: BarData[]; color: string }) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="chart-hbars">
      {data.map((d, i) => (
        <div className="chart-hbar-row" key={i}>
          <span className="chart-hbar-label">{d.label}</span>
          <div className="chart-hbar-track">
            <div className="chart-hbar-fill" style={{ width: `${(d.value / maxValue) * 100}%`, background: color }} />
          </div>
          <span className="chart-hbar-value">{d.value}</span>
        </div>
      ))}
    </div>
  );
}

export function DashboardComponent() {
  const { perfil } = useAuth();
  const [repasses, setRepasses] = useState<Repasse[]>([]);
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [procedimentos, setProcedimentos] = useState<Procedimento[]>([]);
  const [cirurgias, setCirurgias] = useState<Cirurgia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtroMedico, setFiltroMedico] = useState('');
  const [filtroCirurgia, setFiltroCirurgia] = useState('');
  const [filtroProcedimento, setFiltroProcedimento] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [repRes, medRes, procRes, cirRes] = await Promise.all([
        dbHelpers.getRepassesForReport({ tipo: 'todos' }),
        dbHelpers.getMedicos(),
        dbHelpers.getProcedimentos(),
        dbHelpers.getCirurgias(),
      ]);
      if (repRes.error) { setError('Não foi possível carregar os dados.'); }
      else {
        setRepasses((repRes.data as Repasse[]) || []);
        setMedicos((medRes.data as Medico[]) || []);
        setProcedimentos((procRes.data as Procedimento[]) || []);
        setCirurgias((cirRes.data as Cirurgia[]) || []);
      }
      setLoading(false);
    };
    void load();
  }, []);

  const filtered = useMemo(() => repasses.filter((item) => {
    const matchMedico = !filtroMedico || String(item.medico_id) === filtroMedico;
    const matchCirurgia = !filtroCirurgia || String(item.cirurgia_id || '') === filtroCirurgia;
    const matchProc = !filtroProcedimento || (item.tipo_procedimento || '').toLowerCase().includes(filtroProcedimento.toLowerCase());
    const itemDate = item.data_cirurgia?.split('T')[0] || '';
    const matchInicio = !dataInicio || itemDate >= dataInicio;
    const matchFim = !dataFim || itemDate <= dataFim;
    return matchMedico && matchCirurgia && matchProc && matchInicio && matchFim;
  }), [repasses, filtroMedico, filtroCirurgia, filtroProcedimento, dataInicio, dataFim]);

  const stats = useMemo(() => {
    const totalCirurgias = filtered.filter((r) => r.tipo === 'cirurgia').length;
    const totalProcedimentos = filtered.filter((r) => r.tipo === 'consulta').length;
    const valorTotal = filtered.reduce((s, r) => s + (Number(r.valor || 0) + Number(r.auxilio_1 || 0) + Number(r.auxilio_2 || 0)), 0);
    const totalDescontos = filtered.reduce((s, r) => {
      const base = Number(r.valor || 0) + Number(r.auxilio_1 || 0) + Number(r.auxilio_2 || 0);
      const taxa = base * 0.015;
      const imposto = base * Number(r.imposto_percentual || 0) / 100;
      const descAdm = (r as any).desc_adm !== false ? base * 0.01 : 0;
      const descChefe = (r as any).desc_chefe_faturamento !== false ? base * 0.0075 : 0;
      const descFat = (r as any).desc_faturista !== false ? base * 0.005 : 0;
      const descAut = (r as any).desc_autorizacao !== false ? base * 0.0025 : 0;
      const fixo = Number((r as any).desconto_fixo_clinica || 0);
      return s + taxa + imposto + descAdm + descChefe + descFat + descAut + fixo + Number(r.outras_deducoes || 0);
    }, 0);
    const valorRepassado = filtered.reduce((s, r) => s + Number(r.valor_liquido || r.valor_repasse_medico || 0), 0);
    return { totalCirurgias, totalProcedimentos, valorTotal, totalDescontos, valorRepassado, count: filtered.length };
  }, [filtered]);

  const byMedico = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((r) => {
      const nome = r.medico?.nome || 'Sem médico';
      map.set(nome, (map.get(nome) || 0) + Number(r.valor_liquido || r.valor_repasse_medico || 0));
    });
    return Array.from(map.entries()).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [filtered]);

  const byCirurgia = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((r) => {
      const nome = r.cirurgia?.nome || (r.cirurgia_id ? `Cirurgia #${r.cirurgia_id}` : 'Não informada');
      map.set(nome, (map.get(nome) || 0) + 1);
    });
    return Array.from(map.entries()).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 10);
  }, [filtered]);

  const byProcedimento = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((r) => {
      const nome = r.tipo_procedimento || 'Não informado';
      map.set(nome, (map.get(nome) || 0) + 1);
    });
    return Array.from(map.entries()).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 10);
  }, [filtered]);

  const byMonth = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((r) => {
      const month = r.month_reference || '';
      if (month) map.set(month, (map.get(month) || 0) + Number(r.valor_liquido || r.valor_repasse_medico || 0));
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([label, value]) => ({
      label: label.split('-').reverse().join('/'),
      value,
    }));
  }, [filtered]);

  const limparFiltros = () => {
    setFiltroMedico(''); setFiltroCirurgia(''); setFiltroProcedimento(''); setDataInicio(''); setDataFim('');
  };

  const hasFilters = filtroMedico || filtroCirurgia || filtroProcedimento || dataInicio || dataFim;

  return (
    <div className="space-y-6">
      <section className="hero-panel">
        <div>
          <div className="eyebrow"><BarChart3 size={15} /> Business Intelligence</div>
          <h1>Dashboard</h1>
          <p>Visão geral dos repasses, cirurgias e procedimentos com gráficos e filtros.</p>
        </div>
      </section>

      <section className="filter-panel">
        <div className="filter-heading"><Filter size={17} /><strong>Filtrar dados</strong></div>
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
          <label>Período início<input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} /></label>
          <label>Período fim<input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} /></label>
          {hasFilters && <button className="button button-muted" onClick={limparFiltros}>Limpar filtros</button>}
        </div>
      </section>

      {error && <div className="alert-error">{error}</div>}

      <section className="summary-grid">
        <div className="summary-card summary-blue"><span>Cirurgias</span><strong>{stats.totalCirurgias}</strong><small>Quantidade de cirurgias</small><Scissors /></div>
        <div className="summary-card summary-green"><span>Procedimentos</span><strong>{stats.totalProcedimentos}</strong><small>Consultas e procedimentos</small><Stethoscope /></div>
        <div className="summary-card summary-amber"><span>Valor total</span><strong>{money(stats.valorTotal)}</strong><small>Valor bruto de produção</small><DollarSign /></div>
      </section>

      <section className="summary-grid">
        <div className="summary-card summary-blue"><span>Total descontos</span><strong>{money(stats.totalDescontos)}</strong><small>Taxas, impostos e deduções</small><TrendingUp /></div>
        <div className="summary-card summary-green"><span>Valor repassado</span><strong>{money(stats.valorRepassado)}</strong><small>Valor líquido repassado</small><DollarSign /></div>
        <div className="summary-card summary-amber"><span>Lançamentos</span><strong>{stats.count}</strong><small>Total de registros filtrados</small><Users /></div>
      </section>

      {loading ? (
        <div className="alert-error">Carregando dados...</div>
      ) : (
        <>
          <div className="dashboard-charts-grid">
            <div className="chart-panel">
              <div className="chart-header"><BarChart3 size={18} /><h3>Repasse por médico</h3></div>
              {byMedico.length > 0 ? <BarChart data={byMedico} color="linear-gradient(180deg, #6b4f8c, #4a2d6e)" /> : <div className="empty-state">Sem dados</div>}
            </div>
            <div className="chart-panel">
              <div className="chart-header"><BarChart3 size={18} /><h3>Cirurgias por mês</h3></div>
              {byMonth.length > 0 ? <BarChart data={byMonth} color="linear-gradient(180deg, #5a8a6e, #3a6b52)" /> : <div className="empty-state">Sem dados</div>}
            </div>
          </div>
          <div className="dashboard-charts-grid">
            <div className="chart-panel">
              <div className="chart-header"><Scissors size={18} /><h3>Quantidade por cirurgia</h3></div>
              {byCirurgia.length > 0 ? <HBarChart data={byCirurgia} color="#b04545" /> : <div className="empty-state">Sem dados</div>}
            </div>
            <div className="chart-panel">
              <div className="chart-header"><Stethoscope size={18} /><h3>Quantidade por procedimento</h3></div>
              {byProcedimento.length > 0 ? <HBarChart data={byProcedimento} color="#b8853e" /> : <div className="empty-state">Sem dados</div>}
            </div>
          </div>

          <div className="table-panel">
            <div className="section-title"><div><span className="eyebrow">Detalhamento</span><h2>Lançamentos filtrados</h2></div></div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Data</th><th>Médico</th><th>Paciente</th><th>Cirurgia</th><th>Procedimento</th><th>Valor</th><th>Repasse</th></tr></thead>
                <tbody>
                  {filtered.length === 0 ? <tr><td colSpan={7} className="empty-state">Nenhum lançamento encontrado</td></tr> :
                    filtered.slice(0, 50).map((r) => (
                      <tr key={r.id}>
                        <td>{formatDate(r.data_cirurgia)}</td>
                        <td><strong>{r.medico?.nome || '-'}</strong></td>
                        <td>{r.nome_paciente}</td>
                        <td>{r.cirurgia?.nome || '-'}</td>
                        <td>{r.tipo_procedimento || '-'}</td>
                        <td>{money(Number(r.valor || 0) + Number(r.auxilio_1 || 0) + Number(r.auxilio_2 || 0))}</td>
                        <td className="positive strong">{money(Number(r.valor_liquido || r.valor_repasse_medico || 0))}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
