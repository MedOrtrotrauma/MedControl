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
  Printer,
  ReceiptText,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { dbHelpers } from '../lib/supabase';
import { useAuth } from './Auth/AuthContext';
import type { Cirurgia, DestinatarioTipo, Hospital, Medico, Procedimento, Repasse, StatusPagamento } from '../types';

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
  numero_atendimento: '', medico_id: '', hospital_id: '', nome_paciente: '', data_cirurgia: '', tipo: 'cirurgia' as 'consulta' | 'cirurgia',
  valor: '', auxilio_1: '0', auxilio_2: '0', outras_deducoes: '0',
  desconto_paciente: '0', desconto_cartao: '0', valor_recebido: '', percentual_terceiro: '60',
  tipo_procedimento: '', quantidade: '1', forma_pagamento: 'convenio', valor_unitario: '', valor_glosa: '0',
  imposto_percentual: '12', observacao: '', month_reference: month, status_pagamento: 'pendente' as StatusPagamento,
  desc_adm: true, desc_chefe_faturamento: true, desc_faturista: true, desc_autorizacao: true,
  cirurgia_id: '', desconto_fixo_clinica: '12500',
});
type FormData = ReturnType<typeof createForm>;

interface Props {
  tipo: DestinatarioTipo;
}

export function RepasseComponent({ tipo }: Props) {
  const { perfil } = useAuth();
  const isReadOnly = perfil?.tipo === 'medico';
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [items, setItems] = useState<Repasse[]>([]);
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [hospitais, setHospitais] = useState<Hospital[]>([]);
  const [procedimentos, setProcedimentos] = useState<Procedimento[]>([]);
  const [cirurgias, setCirurgias] = useState<Cirurgia[]>([]);
  const [form, setForm] = useState<FormData>(createForm(month));
  const [editing, setEditing] = useState<Repasse | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'todos' | StatusPagamento>('todos');
  const [medico, setMedico] = useState('');
  const [error, setError] = useState('');

  // === Realizar Repasse modal ===
  const [showRepasseModal, setShowRepasseModal] = useState(false);
  const [repasseMedicoId, setRepasseMedicoId] = useState('');
  const [repasseFixoClinica, setRepasseFixoClinica] = useState('12500');
  const [repasseLoading, setRepasseLoading] = useState(false);
  const [repasseCirurgias, setRepasseCirurgias] = useState<Repasse[]>([]);
  const [repasseRealizado, setRepasseRealizado] = useState(false);

  const load = async () => {
    setLoading(true);
    const [repasseResult, medicosResult, hospitaisResult, procedimentosResult, cirurgiasResult] = await Promise.all([
      dbHelpers.getRepasseCirurgiasByMonthAndTipo(month, tipo), dbHelpers.getMedicos(), dbHelpers.getHospitais(), dbHelpers.getProcedimentos(), dbHelpers.getCirurgias(),
    ]);
    if (repasseResult.error || medicosResult.error || hospitaisResult.error || procedimentosResult.error || cirurgiasResult.error) setError('Não foi possível carregar os lançamentos.');
    else {
      setItems((repasseResult.data as Repasse[]) || []);
      setMedicos((medicosResult.data as Medico[]) || []);
      setHospitais((hospitaisResult.data as Hospital[]) || []);
      setProcedimentos((procedimentosResult.data as Procedimento[]) || []);
      setCirurgias((cirurgiasResult.data as Cirurgia[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => { void load(); }, [month, tipo]);

  const update = (field: keyof FormData, value: string | boolean) => setForm((current) => ({ ...current, [field]: value }));
  const openNew = () => { setEditing(null); setForm(createForm(month)); setShowForm(true); setError(''); };
  const openEdit = (item: Repasse) => {
    setEditing(item);
    setForm({
      numero_atendimento: item.numero_atendimento || '', medico_id: String(item.medico_id), hospital_id: String(item.hospital_id), nome_paciente: item.nome_paciente,
      data_cirurgia: item.data_cirurgia, tipo: item.tipo, valor: String(item.valor || 0), auxilio_1: String(item.auxilio_1 || 0),
      auxilio_2: String(item.auxilio_2 || 0), outras_deducoes: String(item.outras_deducoes || 0),
      desconto_paciente: String(item.desconto_paciente || 0), desconto_cartao: String(item.desconto_cartao || 0),
      valor_recebido: String(item.valor_recebido || item.valor || 0), percentual_terceiro: String(item.percentual_terceiro || 0),
      tipo_procedimento: item.tipo_procedimento || '', quantidade: String(item.quantidade || 1),
      forma_pagamento: item.forma_pagamento || 'convenio', valor_unitario: String(item.valor_unitario || item.valor || 0), valor_glosa: String(item.valor_glosa || 0),
      imposto_percentual: String(item.imposto_percentual ?? 12), observacao: item.observacao || '',
      month_reference: item.month_reference || month, status_pagamento: item.status_pagamento || 'pendente',
      desc_adm: (item as any).desc_adm ?? true, desc_chefe_faturamento: (item as any).desc_chefe_faturamento ?? true, desc_faturista: (item as any).desc_faturista ?? true, desc_autorizacao: (item as any).desc_autorizacao ?? true,
      cirurgia_id: item.cirurgia_id ? String(item.cirurgia_id) : '', desconto_fixo_clinica: String(item.desconto_fixo_clinica ?? 12500),
    });
    setShowForm(true);
  };

  const calculations = useMemo(() => {
    const bruto = numberValue(form.valor);
    if (tipo === 'socio') {
      // auxilio 1 e 2 agora são subtraídos do valor total (desconto)
      const total = bruto - numberValue(form.auxilio_1) - numberValue(form.auxilio_2);
      const taxa = total * 0.015;
      const imposto = total * numberValue(form.imposto_percentual) / 100;
      const descAdm = form.desc_adm ? total * 0.01 : 0;
      const descChefe = form.desc_chefe_faturamento ? total * 0.0075 : 0;
      const descFaturista = form.desc_faturista ? total * 0.005 : 0;
      const descAutorizacao = form.desc_autorizacao ? total * 0.0025 : 0;
      const descontos = descAdm + descChefe + descFaturista + descAutorizacao;
      const descFixo = 0; // fixo clínica não está mais no formulário
      const liquido = Math.max(0, total - taxa - imposto - descontos - numberValue(form.outras_deducoes));
      return { total, taxa, imposto, global: 0, recebido: 0, repasse: liquido, saldo: 0, descontos, descFixo, descAdm, descChefe, descFaturista, descAutorizacao, auxilioTotal: numberValue(form.auxilio_1) + numberValue(form.auxilio_2) };
    }
    const global = Math.max(0, bruto - numberValue(form.desconto_paciente) - numberValue(form.desconto_cartao) - numberValue(form.valor_glosa));
    const recebido = form.valor_recebido === '' ? global : numberValue(form.valor_recebido);
    const repasse = recebido * numberValue(form.percentual_terceiro) / 100;
    return { total: bruto, taxa: 0, imposto: 0, global, recebido, repasse, saldo: Math.max(0, recebido - repasse), descontos: 0, descFixo: 0, auxilioTotal: 0 };
  }, [form, tipo]);

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true); setError('');
    const payload = tipo === 'socio' ? {
      numero_atendimento: form.numero_atendimento.trim(), medico_id: Number(form.medico_id), hospital_id: Number(form.hospital_id), nome_paciente: form.nome_paciente.trim(), data_cirurgia: form.data_cirurgia,
      valor: numberValue(form.valor), tipo: 'cirurgia', is_particular: false, tipo_procedimento_detalhado: 'cirurgia_particular',
      valor_repasse_medico: calculations.repasse, month_reference: form.month_reference, observacao: form.observacao.trim() || null,
      destinatario_tipo: tipo, auxilio_1: numberValue(form.auxilio_1), auxilio_2: numberValue(form.auxilio_2), taxa_1_5: calculations.taxa,
      imposto_percentual: numberValue(form.imposto_percentual), outras_deducoes: numberValue(form.outras_deducoes), valor_liquido: calculations.repasse,
      valor_glosa: 0, valor_recebido: 0, percentual_terceiro: 0, valor_terceiro: 0, saldo_controle: 0, status_pagamento: form.status_pagamento,
      desc_adm: form.desc_adm, desc_chefe_faturamento: form.desc_chefe_faturamento, desc_faturista: form.desc_faturista, desc_autorizacao: form.desc_autorizacao,
      cirurgia_id: form.cirurgia_id ? Number(form.cirurgia_id) : null, desconto_fixo_clinica: 0,
      tipo_procedimento: form.tipo_procedimento, quantidade: numberValue(form.quantidade), forma_pagamento: form.forma_pagamento,
      data_pagamento: form.status_pagamento === 'pago' ? new Date().toISOString().slice(0, 10) : null,
    } : {
      numero_atendimento: form.numero_atendimento.trim(), medico_id: Number(form.medico_id), hospital_id: Number(form.hospital_id), nome_paciente: form.nome_paciente.trim(), data_cirurgia: form.data_cirurgia,
      valor: numberValue(form.valor), tipo: form.tipo, is_particular: false, tipo_procedimento_detalhado: 'medico_parceiro',
      tipo_procedimento: form.tipo_procedimento, quantidade: numberValue(form.quantidade), forma_pagamento: form.forma_pagamento,
      valor_unitario: form.valor_unitario === '' ? numberValue(form.valor) : numberValue(form.valor_unitario), porcentagem_repasse: numberValue(form.percentual_terceiro),
      valor_repasse_medico: calculations.repasse, month_reference: form.month_reference, observacao: form.observacao.trim() || null,
      destinatario_tipo: tipo, auxilio_1: 0, auxilio_2: 0, taxa_1_5: 0, imposto_percentual: 0, outras_deducoes: 0,
      desconto_paciente: numberValue(form.desconto_paciente), desconto_cartao: numberValue(form.desconto_cartao), valor_glosa: numberValue(form.valor_glosa), valor_recebido: calculations.recebido,
      percentual_terceiro: numberValue(form.percentual_terceiro), valor_terceiro: calculations.repasse, saldo_controle: calculations.saldo,
      valor_liquido: calculations.repasse, status_pagamento: form.status_pagamento,
      data_pagamento: form.status_pagamento === 'pago' ? new Date().toISOString().slice(0, 10) : null,
    };
    const result = editing ? await dbHelpers.updateRepasseCirurgia(editing.id, payload) : await dbHelpers.createRepasseCirurgia(payload);
    if (result.error) setError('Não foi possível salvar o repasse. Confira os campos.');
    else { setShowForm(false); await load(); }
    setSaving(false);
  };

  const remove = async (id: number) => {
    if (!window.confirm('Excluir este lançamento de repasse?')) return;
    const result = await dbHelpers.deleteRepasseCirurgia(id);
    if (result.error) setError('Não foi possível excluir o lançamento.'); else await load();
  };

  // === Realizar Repasse: buscar cirurgias do médico no mês ===
  const openRepasseModal = () => {
    setRepasseMedicoId('');
    setRepasseFixoClinica('12500');
    setRepasseCirurgias([]);
    setRepasseRealizado(false);
    setShowRepasseModal(true);
  };

  const buscarCirurgias = async () => {
    if (!repasseMedicoId) { alert('Selecione um médico.'); return; }
    setRepasseLoading(true);
    const result = await dbHelpers.getRepasseCirurgiasByMonthAndTipo(month, tipo);
    if (result.error) { alert('Erro ao buscar cirurgias.'); setRepasseLoading(false); return; }
    const allRepasses = (result.data as Repasse[]) || [];
    const medicoCirurgias = allRepasses.filter((r) => String(r.medico_id) === repasseMedicoId);
    setRepasseCirurgias(medicoCirurgias);
    setRepasseLoading(false);
  };

  const repasseCalculations = useMemo(() => {
    const fixoClinica = numberValue(repasseFixoClinica);
    const totalBruto = repasseCirurgias.reduce((s, c) => s + Number(c.valor || 0), 0);
    const totalAuxilio1 = repasseCirurgias.reduce((s, c) => s + Number(c.auxilio_1 || 0), 0);
    const totalAuxilio2 = repasseCirurgias.reduce((s, c) => s + Number(c.auxilio_2 || 0), 0);
    const totalAposAuxilios = totalBruto - totalAuxilio1 - totalAuxilio2;
    const taxa = totalAposAuxilios * 0.015;
    const totalImposto = repasseCirurgias.reduce((s, c) => s + (totalAposAuxilios * Number(c.imposto_percentual || 0) / 100 / repasseCirurgias.length), 0);
    const totalDescontos = repasseCirurgias.reduce((s, c) => {
      const base = Number(c.valor || 0) - Number(c.auxilio_1 || 0) - Number(c.auxilio_2 || 0);
      const descAdm = (c as any).desc_adm === false ? 0 : base * 0.01;
      const descChefe = (c as any).desc_chefe_faturamento === false ? 0 : base * 0.0075;
      const descFaturista = (c as any).desc_faturista === false ? 0 : base * 0.005;
      const descAutorizacao = (c as any).desc_autorizacao === false ? 0 : base * 0.0025;
      return s + descAdm + descChefe + descFaturista + descAutorizacao;
    }, 0);
    const totalOutrasDeducoes = repasseCirurgias.reduce((s, c) => s + Number(c.outras_deducoes || 0), 0);
    const liquido = Math.max(0, totalAposAuxilios - taxa - totalImposto - totalDescontos - fixoClinica - totalOutrasDeducoes);
    return { fixoClinica, totalBruto, totalAuxilio1, totalAuxilio2, totalAposAuxilios, taxa, totalImposto, totalDescontos, totalOutrasDeducoes, liquido };
  }, [repasseCirurgias, repasseFixoClinica]);

  const confirmarRepasse = async () => {
    if (repasseCirurgias.length === 0) { alert('Nenhuma cirurgia encontrada para este médico no período.'); return; }
    setRepasseLoading(true);
    const fixoClinica = numberValue(repasseFixoClinica);
    for (const cirurgiaItem of repasseCirurgias) {
      const base = Number(cirurgiaItem.valor || 0) - Number(cirurgiaItem.auxilio_1 || 0) - Number(cirurgiaItem.auxilio_2 || 0);
      const taxa = base * 0.015;
      const imposto = base * Number(cirurgiaItem.imposto_percentual || 0) / 100;
      const descAdm = (cirurgiaItem as any).desc_adm === false ? 0 : base * 0.01;
      const descChefe = (cirurgiaItem as any).desc_chefe_faturamento === false ? 0 : base * 0.0075;
      const descFaturista = (cirurgiaItem as any).desc_faturista === false ? 0 : base * 0.005;
      const descAutorizacao = (cirurgiaItem as any).desc_autorizacao === false ? 0 : base * 0.0025;
      const descontos = descAdm + descChefe + descFaturista + descAutorizacao;
      const novoLiquido = Math.max(0, base - taxa - imposto - descontos - fixoClinica - Number(cirurgiaItem.outras_deducoes || 0));
      const payload = {
        desconto_fixo_clinica: fixoClinica,
        valor_liquido: novoLiquido,
        valor_repasse_medico: novoLiquido,
        status_pagamento: 'pago' as StatusPagamento,
        data_pagamento: new Date().toISOString().slice(0, 10),
      };
      await dbHelpers.updateRepasseCirurgia(cirurgiaItem.id, payload);
    }
    setRepasseRealizado(true);
    setRepasseLoading(false);
    await load();
  };

  const filtered = useMemo(() => items.filter((item) => {
    const text = `${item.nome_paciente} ${item.medico?.nome || ''}`.toLowerCase();
    return text.includes(search.toLowerCase()) && (status === 'todos' || item.status_pagamento === status) && (!medico || String(item.medico_id) === medico);
  }), [items, search, status, medico]);

  const totals = useMemo(() => filtered.reduce((sum, item) => sum + Number(item.valor_liquido || item.valor_repasse_medico || 0), 0), [filtered]);
  const gross = useMemo(() => filtered.reduce((sum, item) => sum + (tipo === 'socio' ? Number(item.valor || 0) - Number(item.auxilio_1 || 0) - Number(item.auxilio_2 || 0) : Number(item.valor || 0)), 0), [filtered, tipo]);
  const deductions = Math.max(0, gross - totals - (tipo === 'terceiro' ? filtered.reduce((sum, item) => sum + Number(item.saldo_controle || 0), 0) : 0));

  // Repasses realizados (status = pago) no período
  const repassesRealizados = useMemo(() => filtered.filter((item) => item.status_pagamento === 'pago'), [filtered]);
  const totalRealizado = repassesRealizados.reduce((sum, item) => sum + Number(item.valor_liquido || item.valor_repasse_medico || 0), 0);

  const title = tipo === 'socio' ? 'Repasse cirurgia' : 'Repasse a terceiros';
  const socCols = ['Nº', 'Médico', 'Data', 'Paciente', 'Procedimento', 'Forma pagto', 'Qtde', 'Valor total', 'Auxílios', '1,5%', 'Imposto %', 'Imposto R$', 'Descontos', 'Outras ded.', 'Fixo clínica', 'Repasse', 'Status', 'Ações'];
  const tercCols = ['Nº', 'Médico', 'Data', 'Paciente', 'Procedimento', 'Forma pagto', 'Qtde', 'Valor total', 'Desc. paciente', 'Desc. cartão', 'Glosa', 'Global', 'Recebido', 'Repasse %', 'Repasse R$', 'Saldo', 'Status', 'Ações'];

  const printRelatorio = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    const medicoNome = medicos.find((m) => String(m.id) === repasseMedicoId)?.nome || 'Todos';
    const rows = repasseCirurgias.map((c, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${dateLabel(c.data_cirurgia)}</td>
        <td>${c.nome_paciente || '-'}</td>
        <td>${c.tipo_procedimento || '-'}</td>
        <td style="text-align:right">${money(Number(c.valor || 0))}</td>
        <td style="text-align:right">${money(Number(c.auxilio_1 || 0))}</td>
        <td style="text-align:right">${money(Number(c.auxilio_2 || 0))}</td>
        <td style="text-align:right">${money(Number(c.valor || 0) - Number(c.auxilio_1 || 0) - Number(c.auxilio_2 || 0))}</td>
        <td style="text-align:right">${money((Number(c.valor || 0) - Number(c.auxilio_1 || 0) - Number(c.auxilio_2 || 0)) * 0.015)}</td>
        <td style="text-align:right">${money(repasseCalculations.totalDescontos / repasseCirurgias.length)}</td>
        <td style="text-align:right">${money(repasseCalculations.fixoClinica)}</td>
        <td style="text-align:right"><strong>${money(Math.max(0, (Number(c.valor || 0) - Number(c.auxilio_1 || 0) - Number(c.auxilio_2 || 0)) - ((Number(c.valor || 0) - Number(c.auxilio_1 || 0) - Number(c.auxilio_2 || 0)) * 0.015) - ((Number(c.valor || 0) - Number(c.auxilio_1 || 0) - Number(c.auxilio_2 || 0)) * Number(c.imposto_percentual || 0) / 100) - (repasseCalculations.totalDescontos / repasseCirurgias.length) - repasseCalculations.fixoClinica - Number(c.outras_deducoes || 0)))}</strong></td>
      </tr>`).join('');
    win.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Relatório de Repasse - ${medicoNome}</title>
      <style>
        * { font-family: Arial, sans-serif; }
        body { padding: 30px; color: #1a1a1a; }
        h1 { font-size: 22px; margin-bottom: 4px; }
        h2 { font-size: 16px; font-weight: normal; color: #555; margin-top: 0; }
        .info { margin-bottom: 20px; display: flex; gap: 30px; }
        .info div { font-size: 13px; }
        .info strong { display: block; font-size: 15px; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th, td { padding: 8px 10px; border: 1px solid #ddd; font-size: 12px; }
        th { background: #f0f4f8; text-align: left; font-weight: 600; }
        .totals { margin-top: 20px; width: 360px; margin-left: auto; }
        .totals td { border: none; padding: 6px 12px; font-size: 13px; }
        .totals tr:last-child td { border-top: 2px solid #333; font-size: 16px; font-weight: bold; }
        .footer { margin-top: 40px; font-size: 11px; color: #999; text-align: center; }
        @media print { body { padding: 10px; } }
      </style></head><body>
      <h1>Vertebrare - Relatório de Repasse de Cirurgias</h1>
      <h2>Competência: ${monthLabel(month)}</h2>
      <div class="info">
        <div><strong>Médico</strong>${medicoNome}</div>
        <div><strong>Fixo Clínica</strong>${money(repasseCalculations.fixoClinica)}</div>
        <div><strong>Data de emissão</strong>${new Date().toLocaleDateString('pt-BR')}</div>
      </div>
      <table>
        <thead><tr>
          <th>#</th><th>Data</th><th>Paciente</th><th>Procedimento</th>
          <th>Valor Bruto</th><th>Auxílio 1</th><th>Auxílio 2</th><th>Base</th>
          <th>Taxa 1,5%</th><th>Descontos</th><th>Fixo Clínica</th><th>Líquido</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <table class="totals">
        <tr><td>Total Bruto:</td><td style="text-align:right">${money(repasseCalculations.totalBruto)}</td></tr>
        <tr><td>Auxílios (desconto):</td><td style="text-align:right">-${money(repasseCalculations.totalAuxilio1 + repasseCalculations.totalAuxilio2)}</td></tr>
        <tr><td>Base após auxílios:</td><td style="text-align:right">${money(repasseCalculations.totalAposAuxilios)}</td></tr>
        <tr><td>Taxa 1,5%:</td><td style="text-align:right">-${money(repasseCalculations.taxa)}</td></tr>
        <tr><td>Imposto:</td><td style="text-align:right">-${money(repasseCalculations.totalImposto)}</td></tr>
        <tr><td>Descontos:</td><td style="text-align:right">-${money(repasseCalculations.totalDescontos)}</td></tr>
        <tr><td>Fixo Clínica:</td><td style="text-align:right">-${money(repasseCalculations.fixoClinica)}</td></tr>
        <tr><td>Outras deduções:</td><td style="text-align:right">-${money(repasseCalculations.totalOutrasDeducoes)}</td></tr>
        <tr><td>Repasse Líquido:</td><td style="text-align:right">${money(repasseCalculations.liquido)}</td></tr>
      </table>
      <div class="footer">Documento gerado pelo sistema Vertebrare - Controle de Repasse</div>
      <script>window.onload = () => window.print();</script>
      </body></html>`);
    win.document.close();
  };

  const printRepasseRealizado = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    const rows = repassesRealizados.map((c, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${c.medico?.nome || '-'}</td>
        <td>${dateLabel(c.data_cirurgia)}</td>
        <td>${c.nome_paciente || '-'}</td>
        <td>${c.tipo_procedimento || '-'}</td>
        <td style="text-align:right">${money(Number(c.valor || 0))}</td>
        <td style="text-align:right">-${money(Number(c.auxilio_1 || 0) + Number(c.auxilio_2 || 0))}</td>
        <td style="text-align:right">-${money(Number(c.desconto_fixo_clinica || 0))}</td>
        <td style="text-align:right"><strong>${money(Number(c.valor_liquido || c.valor_repasse_medico || 0))}</strong></td>
      </tr>`).join('');
    win.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Repasses Realizados - ${monthLabel(month)}</title>
      <style>
        * { font-family: Arial, sans-serif; }
        body { padding: 30px; color: #1a1a1a; }
        h1 { font-size: 22px; margin-bottom: 4px; }
        h2 { font-size: 16px; font-weight: normal; color: #555; margin-top: 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th, td { padding: 8px 10px; border: 1px solid #ddd; font-size: 12px; }
        th { background: #e8f5e9; text-align: left; font-weight: 600; }
        .totals { margin-top: 20px; width: 300px; margin-left: auto; }
        .totals tr:last-child td { border-top: 2px solid #333; font-size: 16px; font-weight: bold; }
        .footer { margin-top: 40px; font-size: 11px; color: #999; text-align: center; }
        @media print { body { padding: 10px; } }
      </style></head><body>
      <h1>Vertebrare - Repasses Realizados</h1>
      <h2>Competência: ${monthLabel(month)}</h2>
      <table>
        <thead><tr><th>#</th><th>Médico</th><th>Data</th><th>Paciente</th><th>Procedimento</th><th>Bruto</th><th>Auxílios</th><th>Fixo Clínica</th><th>Líquido</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <table class="totals">
        <tr><td>Total de repasses:</td><td style="text-align:right">${repassesRealizados.length}</td></tr>
        <tr><td>Total líquido:</td><td style="text-align:right">${money(totalRealizado)}</td></tr>
      </table>
      <div class="footer">Documento gerado pelo sistema Vertebrare - Controle de Repasse</div>
      <script>window.onload = () => window.print();</script>
      </body></html>`);
    win.document.close();
  };

  return <div className="space-y-6">
    <section className="hero-panel"><div><div className="eyebrow"><ReceiptText size={15} /> Financeiro médico</div><h1>{title}</h1><p>Controle financeiro dos repasses {tipo === 'socio' ? 'de cirurgias' : 'a profissionais terceiros'}.</p></div><div className="hero-actions"><label className="month-picker"><CalendarDays size={16} /><select value={month} onChange={(event) => setMonth(event.target.value)}>{months().map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>{!isReadOnly && <button className="button button-light" onClick={openNew}><Plus size={18} /> Novo lançamento</button>}{!isReadOnly && tipo === 'socio' && <button className="button button-primary" onClick={openRepasseModal}><Check size={18} /> Realizar repasse</button>}</div></section>
    <section className="summary-grid"><div className="summary-card summary-blue"><span>{tipo === 'socio' ? 'Total da produção' : 'Valor total'}</span><strong>{money(gross)}</strong><small>{filtered.length} lançamentos no período</small><ArrowUpRight /></div><div className="summary-card summary-green"><span>{tipo === 'socio' ? 'Valor de repasse' : 'Repasse profissional'}</span><strong>{money(totals)}</strong><small>Calculado pela regra selecionada</small><Check /></div><div className="summary-card summary-amber"><span>{tipo === 'socio' ? 'Descontos' : 'Saldo da clínica'}</span><strong>{money(tipo === 'socio' ? deductions : filtered.reduce((sum, item) => sum + Number(item.saldo_controle || 0), 0))}</strong><small>{tipo === 'socio' ? '1,5%, imposto e deduções' : 'Valor recebido menos repasse'}</small><ArrowDownRight /></div></section>
    <section className="filter-panel"><div className="filter-heading"><Filter size={17} /><strong>Filtrar lançamentos</strong></div><div className="filter-grid"><label className="search-field"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar médico ou paciente" /></label><select value={medico} onChange={(event) => setMedico(event.target.value)}><option value="">Todos os médicos</option>{medicos.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select><select value={status} onChange={(event) => setStatus(event.target.value as 'todos' | StatusPagamento)}><option value="todos">Todos os status</option><option value="pendente">Pendente</option><option value="aprovado">Aprovado</option><option value="pago">Pago</option></select></div></section>
    {error && <div className="alert-error">{error}</div>}
    {showForm && !isReadOnly && <div className="modal-overlay" onClick={() => setShowForm(false)}><div className="modal-content" onClick={(e) => e.stopPropagation()}><div className="modal-header"><div><span className="eyebrow">{editing ? 'Editar lançamento' : 'Novo lançamento'}</span><h2>{title}</h2></div><button className="icon-button" onClick={() => setShowForm(false)}><X size={18} /></button></div><form className="form-grid" onSubmit={save}>
      <label>Mês de referência<select required value={form.month_reference} onChange={(event) => update('month_reference', event.target.value)}>{months().map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label>Médico<select required value={form.medico_id} onChange={(event) => update('medico_id', event.target.value)}><option value="">Selecione</option>{medicos.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></label><label>Hospital / clínica<select required value={form.hospital_id} onChange={(event) => update('hospital_id', event.target.value)}><option value="">Selecione</option>{hospitais.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></label><label>Paciente<input required value={form.nome_paciente} onChange={(event) => update('nome_paciente', event.target.value)} /></label><label>Data do atendimento<input required type="date" value={form.data_cirurgia} onChange={(event) => update('data_cirurgia', event.target.value)} /></label><label>Tipo<select value={form.tipo} onChange={(event) => update('tipo', event.target.value)}><option value="cirurgia">Cirurgia</option></select></label>
      <label>Nº atendimento<input value={form.numero_atendimento} onChange={(event) => update('numero_atendimento', event.target.value)} placeholder="Opcional" /></label><label>Cirurgia<select value={form.cirurgia_id} onChange={(event) => update('cirurgia_id', event.target.value)}><option value="">Selecione</option>{cirurgias.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></label><label>Procedimento<select value={form.tipo_procedimento} onChange={(event) => update('tipo_procedimento', event.target.value)}><option value="">Selecione</option>{procedimentos.map((item) => <option key={item.id} value={item.nome}>{item.nome}</option>)}</select></label><label>Forma de pagamento<select value={form.forma_pagamento} onChange={(event) => update('forma_pagamento', event.target.value)}><option value="convenio">Convênio</option><option value="pix">Pix</option><option value="credito">Crédito</option><option value="debito">Débito</option><option value="especie">Espécie</option></select></label><label>Quantidade<input min="1" type="number" value={form.quantidade} onChange={(event) => update('quantidade', event.target.value)} /></label><label>Valor total<input required min="0" step="0.01" type="number" value={form.valor} onChange={(event) => update('valor', event.target.value)} /></label>{tipo === 'terceiro' && <><label>Desc. paciente<input min="0" step="0.01" type="number" value={form.desconto_paciente} onChange={(event) => update('desconto_paciente', event.target.value)} /></label><label>Desc. cartão<input min="0" step="0.01" type="number" value={form.desconto_cartao} onChange={(event) => update('desconto_cartao', event.target.value)} /></label><label>Glosa<input min="0" step="0.01" type="number" value={form.valor_glosa} onChange={(event) => update('valor_glosa', event.target.value)} /></label></>}
      {tipo === 'socio' ? <><label>1º auxílio (desconto)<input min="0" step="0.01" type="number" value={form.auxilio_1} onChange={(event) => update('auxilio_1', event.target.value)} /></label><label>2º auxílio (desconto)<input min="0" step="0.01" type="number" value={form.auxilio_2} onChange={(event) => update('auxilio_2', event.target.value)} /></label><label>Imposto (%)<input min="0" step="0.01" type="number" value={form.imposto_percentual} onChange={(event) => update('imposto_percentual', event.target.value)} /></label><label>Outras deduções<input min="0" step="0.01" type="number" value={form.outras_deducoes} onChange={(event) => update('outras_deducoes', event.target.value)} /></label><fieldset className="checkbox-group wide"><legend>Aplicar descontos</legend><label className="checkbox-label"><input type="checkbox" checked={form.desc_adm} onChange={(event) => update('desc_adm', event.target.checked)} /> Adm (1%)</label><label className="checkbox-label"><input type="checkbox" checked={form.desc_chefe_faturamento} onChange={(event) => update('desc_chefe_faturamento', event.target.checked)} /> Chefe faturamento (0,75%)</label><label className="checkbox-label"><input type="checkbox" checked={form.desc_faturista} onChange={(event) => update('desc_faturista', event.target.checked)} /> Faturista (0,5%)</label><label className="checkbox-label"><input type="checkbox" checked={form.desc_autorizacao} onChange={(event) => update('desc_autorizacao', event.target.checked)} /> Autorização (0,25%)</label></fieldset><div className="checkbox-values wide"><div className="checkbox-value-item"><span>Adm (1%)</span><strong>{form.desc_adm ? money(calculations.descAdm || 0) : '—'}</strong></div><div className="checkbox-value-item"><span>Chefe fat. (0,75%)</span><strong>{form.desc_chefe_faturamento ? money(calculations.descChefe || 0) : '—'}</strong></div><div className="checkbox-value-item"><span>Faturista (0,5%)</span><strong>{form.desc_faturista ? money(calculations.descFaturista || 0) : '—'}</strong></div><div className="checkbox-value-item"><span>Autorização (0,25%)</span><strong>{form.desc_autorizacao ? money(calculations.descAutorizacao || 0) : '—'}</strong></div></div></> : <><label>Valor recebido<input min="0" step="0.01" type="number" value={form.valor_recebido} placeholder="Calculado pelo global" onChange={(event) => update('valor_recebido', event.target.value)} /></label><label>Repasse (%)<input required min="0" max="100" step="0.01" type="number" value={form.percentual_terceiro} onChange={(event) => update('percentual_terceiro', event.target.value)} /></label></>}
      <label>Status<select value={form.status_pagamento} onChange={(event) => update('status_pagamento', event.target.value)}><option value="pendente">Pendente</option><option value="aprovado">Aprovado</option><option value="pago">Pago</option></select></label><label className="wide">Observação<textarea rows={3} value={form.observacao} onChange={(event) => update('observacao', event.target.value)} placeholder="Referência ou observação do relatório" /></label><div className="calculation-card wide"><div><span>{tipo === 'socio' ? 'Valor de repasse calculado' : 'Repasse profissional calculado'}</span><strong>{money(calculations.repasse)}</strong></div><small>{tipo === 'socio' ? `Total ${money(calculations.total)}${calculations.auxilioTotal > 0 ? ` (após auxílios: -${money(calculations.auxilioTotal)})` : ''} - taxa 1,5% ${money(calculations.taxa)} - imposto ${money(calculations.imposto)} - descontos ${money(calculations.descontos || 0)}` : `Global ${money(calculations.global)} - recebido ${money(calculations.recebido)} - saldo ${money(calculations.saldo)}`}</small></div><div className="form-actions wide"><button type="button" className="button button-muted" onClick={() => setShowForm(false)}>Cancelar</button><button className="button button-primary" disabled={saving}>{saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Salvar lançamento'}</button></div>
    </form></div></div>}

    {/* === Modal Realizar Repasse === */}
    {showRepasseModal && (
      <div className="modal-overlay" onClick={() => setShowRepasseModal(false)}>
        <div className="modal-content" style={{ maxWidth: 900 }} onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <div><span className="eyebrow">Processamento de repasse</span><h2>Realizar repasse - {monthLabel(month)}</h2></div>
            <button className="icon-button" onClick={() => setShowRepasseModal(false)}><X size={18} /></button>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Médico *</span>
                <select value={repasseMedicoId} onChange={(e) => setRepasseMedicoId(e.target.value)} className="w-full mt-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                  <option value="">Selecione o médico</option>
                  {medicos.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Fixo Clínica (R$) *</span>
                <input type="number" min="0" step="0.01" value={repasseFixoClinica} onChange={(e) => setRepasseFixoClinica(e.target.value)} className="w-full mt-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
              </label>
              <div className="flex items-end">
                <button className="button button-primary w-full" disabled={repasseLoading || !repasseMedicoId} onClick={buscarCirurgias}>
                  {repasseLoading ? 'Buscando...' : 'Buscar cirurgias'}
                </button>
              </div>
            </div>

            {repasseCirurgias.length > 0 && (
              <>
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700">#</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700">Data</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700">Paciente</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700">Procedimento</th>
                          <th className="px-3 py-2 text-right font-semibold text-gray-700">Valor Bruto</th>
                          <th className="px-3 py-2 text-right font-semibold text-gray-700">Auxílio 1</th>
                          <th className="px-3 py-2 text-right font-semibold text-gray-700">Auxílio 2</th>
                          <th className="px-3 py-2 text-right font-semibold text-gray-700">Base</th>
                          <th className="px-3 py-2 text-right font-semibold text-gray-700">Líquido</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {repasseCirurgias.map((c, i) => {
                          const base = Number(c.valor || 0) - Number(c.auxilio_1 || 0) - Number(c.auxilio_2 || 0);
                          const taxa = base * 0.015;
                          const imposto = base * Number(c.imposto_percentual || 0) / 100;
                          const descAdm = (c as any).desc_adm === false ? 0 : base * 0.01;
                          const descChefe = (c as any).desc_chefe_faturamento === false ? 0 : base * 0.0075;
                          const descFaturista = (c as any).desc_faturista === false ? 0 : base * 0.005;
                          const descAutorizacao = (c as any).desc_autorizacao === false ? 0 : base * 0.0025;
                          const descontos = descAdm + descChefe + descFaturista + descAutorizacao;
                          const liquido = Math.max(0, base - taxa - imposto - descontos - numberValue(repasseFixoClinica) - Number(c.outras_deducoes || 0));
                          return (
                            <tr key={c.id} className="hover:bg-blue-50">
                              <td className="px-3 py-2">{i + 1}</td>
                              <td className="px-3 py-2">{dateLabel(c.data_cirurgia)}</td>
                              <td className="px-3 py-2">{c.nome_paciente || '-'}</td>
                              <td className="px-3 py-2">{c.tipo_procedimento || '-'}</td>
                              <td className="px-3 py-2 text-right">{money(Number(c.valor || 0))}</td>
                              <td className="px-3 py-2 text-right text-red-600">-{money(Number(c.auxilio_1 || 0))}</td>
                              <td className="px-3 py-2 text-right text-red-600">-{money(Number(c.auxilio_2 || 0))}</td>
                              <td className="px-3 py-2 text-right font-medium">{money(base)}</td>
                              <td className="px-3 py-2 text-right font-bold text-green-700">{money(liquido)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-blue-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm"><span>Total Bruto:</span><strong>{money(repasseCalculations.totalBruto)}</strong></div>
                  <div className="flex justify-between text-sm text-red-600"><span>Auxílios (desconto):</span><strong>-{money(repasseCalculations.totalAuxilio1 + repasseCalculations.totalAuxilio2)}</strong></div>
                  <div className="flex justify-between text-sm"><span>Base após auxílios:</span><strong>{money(repasseCalculations.totalAposAuxilios)}</strong></div>
                  <div className="flex justify-between text-sm text-red-600"><span>Taxa 1,5%:</span><strong>-{money(repasseCalculations.taxa)}</strong></div>
                  <div className="flex justify-between text-sm text-red-600"><span>Imposto:</span><strong>-{money(repasseCalculations.totalImposto)}</strong></div>
                  <div className="flex justify-between text-sm text-red-600"><span>Descontos:</span><strong>-{money(repasseCalculations.totalDescontos)}</strong></div>
                  <div className="flex justify-between text-sm text-red-600"><span>Fixo Clínica:</span><strong>-{money(repasseCalculations.fixoClinica)}</strong></div>
                  <div className="flex justify-between text-sm text-red-600"><span>Outras deduções:</span><strong>-{money(repasseCalculations.totalOutrasDeducoes)}</strong></div>
                  <div className="flex justify-between text-lg border-t border-blue-200 pt-2"><span className="font-bold">Repasse Líquido Total:</span><strong className="text-green-700">{money(repasseCalculations.liquido)}</strong></div>
                </div>

                <div className="flex gap-3 justify-end">
                  <button className="button button-muted" onClick={printRelatorio}><Printer size={16} /> Imprimir relatório</button>
                  {!repasseRealizado ? (
                    <button className="button button-primary" disabled={repasseLoading} onClick={confirmarRepasse}>
                      {repasseLoading ? 'Processando...' : 'Confirmar repasse'}
                    </button>
                  ) : (
                    <span className="flex items-center gap-2 text-green-700 font-semibold"><Check size={18} /> Repasse realizado!</span>
                  )}
                </div>
              </>
            )}

            {repasseCirurgias.length === 0 && repasseMedicoId && !repasseLoading && (
              <div className="text-center text-gray-500 py-8">Nenhuma cirurgia encontrada para este médico no período.</div>
            )}
          </div>
        </div>
      </div>
    )}

    <section className="table-panel"><div className="section-title"><div><span className="eyebrow">Competência selecionada</span><h2>{monthLabel(month)}</h2></div><button className="button button-muted" onClick={() => window.print()}><FileDown size={17} /> Imprimir</button></div><div className="table-wrap"><table className={tipo === 'socio' ? 'tbl-socio' : 'tbl-terc'}><thead><tr>{(tipo === 'socio' ? socCols : tercCols).map((col) => <th key={col}>{col}</th>)}</tr></thead><tbody>{loading ? <tr><td colSpan={tipo === 'socio' ? socCols.length : tercCols.length} className="empty-state">Carregando lançamentos...</td></tr> : filtered.length === 0 ? <tr><td colSpan={tipo === 'socio' ? socCols.length : tercCols.length} className="empty-state"><ClipboardList size={32} /><strong>Nenhum lançamento encontrado</strong><span>Cadastre um lançamento para esta competência.</span></td></tr> : filtered.map((item) => {
      const global = Number(item.valor || 0) - Number(item.desconto_paciente || 0) - Number(item.desconto_cartao || 0) - Number(item.valor_glosa || 0);
      const baseItem = Number(item.valor || 0) - Number(item.auxilio_1 || 0) - Number(item.auxilio_2 || 0);
      const auxilioTotal = Number(item.auxilio_1 || 0) + Number(item.auxilio_2 || 0);
      const impostoValor = tipo === 'socio' ? baseItem * Number(item.imposto_percentual || 0) / 100 : 0;
      const descontosValor = tipo === 'socio' ? (() => {
        return (item as any).desc_adm === false ? 0 : baseItem * 0.01 + ((item as any).desc_chefe_faturamento === false ? 0 : baseItem * 0.0075) + ((item as any).desc_faturista === false ? 0 : baseItem * 0.005) + ((item as any).desc_autorizacao === false ? 0 : baseItem * 0.0025);
      })() : 0;
      const statusLabel = item.status_pagamento === 'pago' ? 'Pago' : item.status_pagamento === 'aprovado' ? 'Aprovado' : 'Pendente';
      const actions = isReadOnly ? <td></td> : <td><div className="row-actions"><button className="icon-button" onClick={() => openEdit(item)}><Pencil size={16} /></button><button className="icon-button danger" onClick={() => void remove(item.id)}><Trash2 size={16} /></button></div></td>;
      const statusCell = <td><span className={`status-pill status-${item.status_pagamento || 'pendente'}`}>{statusLabel}</span></td>;
      if (tipo === 'terceiro') return <tr key={item.id}><td>{item.numero_atendimento || '-'}</td><td><strong>{item.medico?.nome || '-'}</strong></td><td>{dateLabel(item.data_cirurgia)}</td><td>{item.nome_paciente}</td><td>{item.tipo_procedimento || 'Consulta'}</td><td>{item.forma_pagamento || '-'}</td><td>{item.quantidade || 1}</td><td>{money(item.valor)}</td><td className="negative">{money(item.desconto_paciente)}</td><td className="negative">{money(item.desconto_cartao)}</td><td className="negative">{money(item.valor_glosa)}</td><td>{money(global)}</td><td>{money(item.valor_recebido)}</td><td>{Number(item.percentual_terceiro || 0).toFixed(0)}%</td><td className="positive strong">{money(item.valor_terceiro || item.valor_liquido)}</td><td className="positive strong">{money(item.saldo_controle)}</td>{statusCell}{actions}</tr>;
      return <tr key={item.id}><td>{item.numero_atendimento || '-'}</td><td><strong>{item.medico?.nome || '-'}</strong></td><td>{dateLabel(item.data_cirurgia)}</td><td>{item.nome_paciente}</td><td>{item.tipo_procedimento || '-'}</td><td>{item.forma_pagamento || '-'}</td><td>{item.quantidade || 1}</td><td>{money(item.valor)}</td><td className="negative">-{money(auxilioTotal)}</td><td className="negative">{money(item.taxa_1_5)}</td><td>{Number(item.imposto_percentual || 0).toFixed(2)}%</td><td className="negative">{money(impostoValor)}</td><td className="negative">{money(descontosValor)}</td><td className="negative">{money(item.outras_deducoes)}</td><td className="negative">{money(item.desconto_fixo_clinica || 0)}</td><td className="positive strong">{money(item.valor_liquido || item.valor_repasse_medico)}</td>{statusCell}{actions}</tr>;
    })}</tbody></table></div></section>

    {/* === Repasses Realizados no período === */}
    {tipo === 'socio' && repassesRealizados.length > 0 && (
      <section className="table-panel">
        <div className="section-title">
          <div><span className="eyebrow">Repasses processados</span><h2>Repasses realizados - {monthLabel(month)}</h2></div>
          <button className="button button-muted" onClick={printRepasseRealizado}><Printer size={17} /> Imprimir relatório</button>
        </div>
        <div className="table-wrap">
          <table className="tbl-socio">
            <thead>
              <tr>
                <th>#</th><th>Médico</th><th>Data</th><th>Paciente</th><th>Procedimento</th>
                <th>Valor Bruto</th><th>Auxílios</th><th>Fixo Clínica</th><th>Repasse Líquido</th><th>Data Pagto</th>
              </tr>
            </thead>
            <tbody>
              {repassesRealizados.map((item, i) => (
                <tr key={item.id}>
                  <td>{i + 1}</td>
                  <td><strong>{item.medico?.nome || '-'}</strong></td>
                  <td>{dateLabel(item.data_cirurgia)}</td>
                  <td>{item.nome_paciente}</td>
                  <td>{item.tipo_procedimento || '-'}</td>
                  <td>{money(Number(item.valor || 0))}</td>
                  <td className="negative">-{money(Number(item.auxilio_1 || 0) + Number(item.auxilio_2 || 0))}</td>
                  <td className="negative">{money(Number(item.desconto_fixo_clinica || 0))}</td>
                  <td className="positive strong">{money(Number(item.valor_liquido || item.valor_repasse_medico || 0))}</td>
                  <td>{item.data_pagamento ? dateLabel(item.data_pagamento) : '-'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t border-gray-200">
              <tr>
                <td colSpan={8} className="px-4 py-3 text-sm font-bold text-gray-700 text-right">Total líquido realizado:</td>
                <td className="px-4 py-3 text-sm font-bold text-green-700">{money(totalRealizado)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    )}
  </div>;
}
