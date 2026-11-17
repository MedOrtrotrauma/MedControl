import React, { useState, useEffect } from 'react';
import { X, Save, CreditCard as Edit2, Stethoscope, Scissors, Calendar } from 'lucide-react';
import { dbHelpers } from '../../lib/supabase';
import { MoneyInput, parseMoney } from '../Ui/MoneyInput';
import { ProducaoConvenio, Medico, Convenio } from '../../types';

interface EditProducaoModalProps {
  producao: ProducaoConvenio | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export const EditProducaoModal: React.FC<EditProducaoModalProps> = ({
  producao, isOpen, onClose, onSave,
}) => {
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    medico_id: '',
    convenio_id: '',
    nome_paciente: '',
    data_atendimento: '',
    valor: '',
    valor_glosa: '',
    valor_recebido: '',
    tipo: 'consulta' as 'consulta' | 'cirurgia',
    month_reference: '',
  });

  useEffect(() => {
    if (!isOpen) return;
    void loadData();
    if (producao) {
      const norm = (d?: string) => (d ? d.split('T')[0] : '');
      setFormData({
        medico_id: String(producao.medico_id),
        convenio_id: String(producao.convenio_id),
        nome_paciente: producao.nome_paciente,
        data_atendimento: norm(producao.data_atendimento),
        valor: String(producao.valor),
        valor_glosa: String(producao.valor_glosa ?? 0),
        valor_recebido: String(producao.valor_recebido ?? producao.valor),
        tipo: producao.tipo,
        month_reference: producao.month_reference || new Date().toISOString().slice(0, 7),
      });
    }
  }, [isOpen, producao]);

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
    const [m, c] = await Promise.all([dbHelpers.getMedicos(), dbHelpers.getConvenios()]);
    if (m.data) setMedicos(m.data);
    if (c.data) setConvenios(c.data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!producao) return;
    setLoading(true);
    const r = await dbHelpers.updateProducaoConvenio(producao.id, {
      medico_id: Number(formData.medico_id),
      convenio_id: Number(formData.convenio_id),
      nome_paciente: formData.nome_paciente.trim(),
      data_atendimento: formData.data_atendimento,
      tipo: formData.tipo,
      valor: parseMoney(formData.valor),
      valor_glosa: parseMoney(formData.valor_glosa) || 0,
      valor_recebido: parseMoney(formData.valor_recebido) || parseMoney(formData.valor),
      month_reference: formData.month_reference,
      observacao: producao.observacao ?? null,
    });
    if (!r.error) { onSave(); onClose(); }
    else alert('Erro: ' + r.error.message);
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500 p-2 rounded-lg"><Edit2 className="h-5 w-5 text-white" /></div>
            <h3 className="text-xl font-semibold text-gray-900">Editar Produção</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-gray-500" />Mês de Referência</div>
              </label>
              <select value={formData.month_reference}
                onChange={(e) => setFormData((p) => ({ ...p, month_reference: e.target.value }))}
                className="w-full p-3 border rounded-lg" required>
                {generateMonthOptions().map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Médico</label>
              <select value={formData.medico_id}
                onChange={(e) => setFormData((p) => ({ ...p, medico_id: e.target.value }))}
                className="w-full p-3 border rounded-lg" required>
                <option value="">Selecione</option>
                {medicos.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Convênio</label>
              <select value={formData.convenio_id}
                onChange={(e) => setFormData((p) => ({ ...p, convenio_id: e.target.value }))}
                className="w-full p-3 border rounded-lg" required>
                <option value="">Selecione</option>
                {convenios.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
              <select value={formData.tipo}
                onChange={(e) => setFormData((p) => ({ ...p, tipo: e.target.value as 'consulta' | 'cirurgia' }))}
                className="w-full p-3 border rounded-lg" required>
                <option value="consulta">Consulta</option>
                <option value="cirurgia">Cirurgia</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Paciente</label>
              <input type="text" value={formData.nome_paciente}
                onChange={(e) => setFormData((p) => ({ ...p, nome_paciente: e.target.value }))}
                className="w-full p-3 border rounded-lg" required />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Data do Atendimento</label>
              <input type="date" value={formData.data_atendimento}
                onChange={(e) => setFormData((p) => ({ ...p, data_atendimento: e.target.value }))}
                className="w-full p-3 border rounded-lg" required />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Valor (R$)</label>
              <MoneyInput value={formData.valor}
                onChange={(v) => setFormData((p) => ({ ...p, valor: v }))}
                className="w-full p-3 border rounded-lg" required />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Glosa (R$)</label>
              <MoneyInput value={formData.valor_glosa}
                onChange={(v) => setFormData((p) => ({ ...p, valor_glosa: v }))}
                className="w-full p-3 border rounded-lg" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Valor Recebido (R$)</label>
              <MoneyInput value={formData.valor_recebido}
                onChange={(v) => setFormData((p) => ({ ...p, valor_recebido: v }))}
                className="w-full p-3 border rounded-lg" />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="submit" disabled={loading}
              className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2">
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
