import React, { useState, useEffect } from 'react';
import { X, Save, CreditCard, Calendar } from 'lucide-react';
import { dbHelpers } from '../../lib/supabase';
import { MoneyInput, parseMoney } from '../Ui/MoneyInput';
import { RepasseCirurgia, Medico, Convenio, Hospital, Cirurgia } from '../../types';

interface EditRepasseModalProps {
  repasse: RepasseCirurgia | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export const EditRepasseModal: React.FC<EditRepasseModalProps> = ({
  repasse, isOpen, onClose, onSave,
}) => {
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [hospitais, setHospitais] = useState<Hospital[]>([]);
  const [cirurgias, setCirurgias] = useState<Cirurgia[]>([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    medico_id: '',
    convenio_id: '',
    hospital_id: '',
    cirurgia_id: '',
    nome_paciente: '',
    data_cirurgia: '',
    is_particular: false,
    tipo_procedimento: '',
    quantidade: '1',
    valor: '',
    valor_recebido: '',
    auxilio_1: '0',
    auxilio_2: '0',
    taxa_1_5: '0',
    imposto_percentual: '12',
    outras_deducoes: '0',
    valor_repasse_medico: '0',
    destinatario_tipo: 'socio' as 'socio' | 'terceiro',
    status_pagamento: 'pendente' as 'pendente' | 'aprovado' | 'pago',
    data_pagamento: '',
    month_reference: '',
    observacao: '',
  });

  useEffect(() => {
    if (!isOpen) return;
    void loadData();
    if (repasse) {
      const norm = (d?: string | null) => (d ? d.split('T')[0] : '');
      setForm({
        medico_id: String(repasse.medico_id),
        convenio_id: repasse.convenio_id ? String(repasse.convenio_id) : '',
        hospital_id: repasse.hospital_id ? String(repasse.hospital_id) : '',
        cirurgia_id: repasse.cirurgia_id ? String(repasse.cirurgia_id) : '',
        nome_paciente: repasse.nome_paciente,
        data_cirurgia: norm(repasse.data_cirurgia),
        is_particular: repasse.is_particular,
        tipo_procedimento: repasse.tipo_procedimento || '',
        quantidade: String(repasse.quantidade ?? 1),
        valor: String(repasse.valor ?? ''),
        valor_recebido: String(repasse.valor_recebido ?? ''),
        auxilio_1: String(repasse.auxilio_1 ?? 0),
        auxilio_2: String(repasse.auxilio_2 ?? 0),
        taxa_1_5: String(repasse.taxa_1_5 ?? 0),
        imposto_percentual: String(repasse.imposto_percentual ?? 12),
        outras_deducoes: String(repasse.outras_deducoes ?? 0),
        valor_repasse_medico: String(repasse.valor_repasse_medico ?? 0),
        destinatario_tipo: repasse.destinatario_tipo,
        status_pagamento: repasse.status_pagamento,
        data_pagamento: norm(repasse.data_pagamento),
        month_reference: repasse.month_reference,
        observacao: repasse.observacao || '',
      });
    }
  }, [isOpen, repasse]);

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

  const loadData = async () => {
    const [m, c, h, ci] = await Promise.all([
      dbHelpers.getMedicos(),
      dbHelpers.getConvenios(),
      dbHelpers.getHospitais(),
      dbHelpers.getCirurgias(),
    ]);
    if (m.data) setMedicos(m.data);
    if (c.data) setConvenios(c.data);
    if (h.data) setHospitais(h.data);
    if (ci.data) setCirurgias(ci.data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repasse) return;
    setLoading(true);
    const r = await dbHelpers.updateRepasseCirurgia(repasse.id, {
      medico_id: Number(form.medico_id),
      convenio_id: form.is_particular ? null : (form.convenio_id ? Number(form.convenio_id) : null),
      hospital_id: form.hospital_id ? Number(form.hospital_id) : null,
      cirurgia_id: form.cirurgia_id ? Number(form.cirurgia_id) : null,
      nome_paciente: form.nome_paciente.trim(),
      data_cirurgia: form.data_cirurgia,
      is_particular: form.is_particular,
      tipo_procedimento: form.tipo_procedimento || null,
      quantidade: Number(form.quantidade) || 1,
      valor: parseMoney(form.valor),
      valor_recebido: parseMoney(form.valor_recebido) || parseMoney(form.valor),
      auxilio_1: parseMoney(form.auxilio_1) || 0,
      auxilio_2: parseMoney(form.auxilio_2) || 0,
      taxa_1_5: parseMoney(form.taxa_1_5) || 0,
      imposto_percentual: Number(form.imposto_percentual) || 0,
      outras_deducoes: parseMoney(form.outras_deducoes) || 0,
      valor_repasse_medico: parseMoney(form.valor_repasse_medico) || 0,
      destinatario_tipo: form.destinatario_tipo,
      status_pagamento: form.status_pagamento,
      data_pagamento: form.data_pagamento || null,
      month_reference: form.month_reference,
      observacao: form.observacao || null,
    });
    if (!r.error) { onSave(); onClose(); }
    else alert('Erro: ' + r.error.message);
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="bg-purple-500 p-2 rounded-lg"><CreditCard className="h-5 w-5 text-white" /></div>
            <h3 className="text-xl font-semibold">Editar Repasse de Cirurgia</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">
                <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-gray-500" />Mês de Referência</div>
              </label>
              <select value={form.month_reference}
                onChange={(e) => setForm((p) => ({ ...p, month_reference: e.target.value }))}
                className="w-full p-3 border rounded-lg" required>
                {generateMonthOptions().map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Médico</label>
              <select value={form.medico_id}
                onChange={(e) => setForm((p) => ({ ...p, medico_id: e.target.value }))}
                className="w-full p-3 border rounded-lg" required>
                <option value="">Selecione</option>
                {medicos.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Tipo</label>
              <div className="flex gap-4 p-3">
                <label className="flex items-center">
                  <input type="radio" checked={!form.is_particular}
                    onChange={() => setForm((p) => ({ ...p, is_particular: false }))} className="mr-2" />
                  Convênio
                </label>
                <label className="flex items-center">
                  <input type="radio" checked={form.is_particular}
                    onChange={() => setForm((p) => ({ ...p, is_particular: true }))} className="mr-2" />
                  Particular
                </label>
              </div>
            </div>

            {!form.is_particular && (
              <div>
                <label className="block text-sm font-medium mb-2">Convênio</label>
                <select value={form.convenio_id}
                  onChange={(e) => setForm((p) => ({ ...p, convenio_id: e.target.value }))}
                  className="w-full p-3 border rounded-lg" required>
                  <option value="">Selecione</option>
                  {convenios.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">Hospital</label>
              <select value={form.hospital_id}
                onChange={(e) => setForm((p) => ({ ...p, hospital_id: e.target.value }))}
                className="w-full p-3 border rounded-lg">
                <option value="">Selecione</option>
                {hospitais.map((h) => <option key={h.id} value={h.id}>{h.nome}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Cirurgia</label>
              <select value={form.cirurgia_id}
                onChange={(e) => setForm((p) => ({ ...p, cirurgia_id: e.target.value }))}
                className="w-full p-3 border rounded-lg">
                <option value="">Selecione</option>
                {cirurgias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Paciente</label>
              <input type="text" value={form.nome_paciente}
                onChange={(e) => setForm((p) => ({ ...p, nome_paciente: e.target.value }))}
                className="w-full p-3 border rounded-lg" required />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Data</label>
              <input type="date" value={form.data_cirurgia}
                onChange={(e) => setForm((p) => ({ ...p, data_cirurgia: e.target.value }))}
                className="w-full p-3 border rounded-lg" required />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Procedimento (descrição)</label>
              <input type="text" value={form.tipo_procedimento}
                onChange={(e) => setForm((p) => ({ ...p, tipo_procedimento: e.target.value }))}
                className="w-full p-3 border rounded-lg" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Quantidade</label>
              <input type="number" min="1" value={form.quantidade}
                onChange={(e) => setForm((p) => ({ ...p, quantidade: e.target.value }))}
                className="w-full p-3 border rounded-lg" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Valor (R$)</label>
              <MoneyInput value={form.valor}
                onChange={(v) => setForm((p) => ({ ...p, valor: v }))}
                className="w-full p-3 border rounded-lg" required />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Valor Recebido (R$)</label>
              <MoneyInput value={form.valor_recebido}
                onChange={(v) => setForm((p) => ({ ...p, valor_recebido: v }))}
                className="w-full p-3 border rounded-lg" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Auxílio 1</label>
              <MoneyInput value={form.auxilio_1}
                onChange={(v) => setForm((p) => ({ ...p, auxilio_1: v }))}
                className="w-full p-3 border rounded-lg" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Auxílio 2</label>
              <MoneyInput value={form.auxilio_2}
                onChange={(v) => setForm((p) => ({ ...p, auxilio_2: v }))}
                className="w-full p-3 border rounded-lg" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Taxa 1,5</label>
              <MoneyInput value={form.taxa_1_5}
                onChange={(v) => setForm((p) => ({ ...p, taxa_1_5: v }))}
                className="w-full p-3 border rounded-lg" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Imposto (%)</label>
              <input type="number" step="0.01" value={form.imposto_percentual}
                onChange={(e) => setForm((p) => ({ ...p, imposto_percentual: e.target.value }))}
                className="w-full p-3 border rounded-lg" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Outras Deduções</label>
              <MoneyInput value={form.outras_deducoes}
                onChange={(v) => setForm((p) => ({ ...p, outras_deducoes: v }))}
                className="w-full p-3 border rounded-lg" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Repasse Médico (R$)</label>
              <MoneyInput value={form.valor_repasse_medico}
                onChange={(v) => setForm((p) => ({ ...p, valor_repasse_medico: v }))}
                className="w-full p-3 border rounded-lg" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Destinatário</label>
              <select value={form.destinatario_tipo}
                onChange={(e) => setForm((p) => ({ ...p, destinatario_tipo: e.target.value as 'socio' | 'terceiro' }))}
                className="w-full p-3 border rounded-lg">
                <option value="socio">Sócio</option>
                <option value="terceiro">Terceiro</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Status Pagamento</label>
              <select value={form.status_pagamento}
                onChange={(e) => setForm((p) => ({ ...p, status_pagamento: e.target.value as 'pendente' | 'aprovado' | 'pago' }))}
                className="w-full p-3 border rounded-lg">
                <option value="pendente">Pendente</option>
                <option value="aprovado">Aprovado</option>
                <option value="pago">Pago</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Data Pagamento</label>
              <input type="date" value={form.data_pagamento}
                onChange={(e) => setForm((p) => ({ ...p, data_pagamento: e.target.value }))}
                className="w-full p-3 border rounded-lg" />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Observação</label>
              <textarea value={form.observacao}
                onChange={(e) => setForm((p) => ({ ...p, observacao: e.target.value }))}
                className="w-full p-3 border rounded-lg" rows={2} />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="submit" disabled={loading}
              className="flex-1 bg-purple-600 text-white py-3 px-4 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" /> : <><Save size={16} />Salvar</>}
            </button>
            <button type="button" onClick={onClose}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
};
