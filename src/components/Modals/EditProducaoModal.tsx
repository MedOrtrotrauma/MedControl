import React, { useState, useEffect } from 'react';
import { X, Save, CreditCard as Edit2, Stethoscope, Scissors, Calendar } from 'lucide-react';
import { dbHelpers } from '../../lib/supabase';
import { ProducaoMensal, Medico, Convenio } from '../../types';

interface EditProducaoModalProps {
  producao: ProducaoMensal | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export const EditProducaoModal: React.FC<EditProducaoModalProps> = ({
  producao,
  isOpen,
  onClose,
  onSave
}) => {
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    medico_id: '',
    convenio_id: '',
    nome_paciente: '',
    data_consulta: '',
    valor: '',
    tipo: 'consulta' as 'consulta' | 'cirurgia',
    month_reference: '' // NOVO CAMPO
  });

  useEffect(() => {
    if (isOpen) {
      loadData();
      if (producao) {
        const normalizeDate = (dateString: string) => {
          if (!dateString) return '';
          const dateOnly = dateString.split('T')[0];
          return dateOnly;
        };

        setFormData({
          medico_id: producao.medico_id.toString(),
          convenio_id: producao.convenio_id.toString(),
          nome_paciente: producao.nome_paciente,
          data_consulta: normalizeDate(producao.data_consulta),
          valor: producao.valor.toString(),
          tipo: producao.tipo,
          month_reference: producao.month_reference || getDefaultMonthReference() // NOVO
        });
      }
    }
  }, [isOpen, producao]);

  // FUNÇÃO NOVA: Gerar mês padrão
  const getDefaultMonthReference = () => {
    const today = new Date();
    return today.toISOString().slice(0, 7); // 'YYYY-MM'
  };

  // FUNÇÃO NOVA: Gerar opções de meses
  const generateMonthOptions = () => {
    const months = [];
    const today = new Date();
    
    // Últimos 6 meses e próximos 3 meses
    for (let i = -6; i <= 3; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const value = date.toISOString().slice(0, 7);
      const label = date.toLocaleDateString('pt-BR', { 
        month: 'long', 
        year: 'numeric' 
      });
      
      months.push({ 
        value, 
        label: label.charAt(0).toUpperCase() + label.slice(1) 
      });
    }
    
    return months;
  };

  const loadData = async () => {
    try {
      const [medicosRes, conveniosRes] = await Promise.all([
        dbHelpers.getMedicos(),
        dbHelpers.getConvenios()
      ]);

      if (medicosRes.data) setMedicos(medicosRes.data);
      if (conveniosRes.data) setConvenios(conveniosRes.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!producao) return;

    setLoading(true);
    try {
      const result = await dbHelpers.updateProducaoMensal(producao.id, {
        medico_id: parseInt(formData.medico_id),
        convenio_id: parseInt(formData.convenio_id),
        nome_paciente: formData.nome_paciente,
        data_consulta: formData.data_consulta,
        valor: parseFloat(formData.valor),
        tipo: formData.tipo,
        month_reference: formData.month_reference // NOVO CAMPO
      });

      if (!result.error) {
        onSave();
        onClose();
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500 p-2 rounded-lg">
              <Edit2 className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">Editar Produção</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* NOVO CAMPO: Mês de Referência */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  Mês de Referência
                </div>
              </label>
              <select
                value={formData.month_reference}
                onChange={(e) => setFormData(prev => ({ ...prev, month_reference: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Selecione o mês de referência</option>
                {generateMonthOptions().map(month => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Mês ao qual esta produção será contabilizada
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Médico
              </label>
              <select
                value={formData.medico_id}
                onChange={(e) => setFormData(prev => ({ ...prev, medico_id: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Selecione o médico</option>
                {medicos.map(medico => (
                  <option key={medico.id} value={medico.id}>{medico.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Convênio
              </label>
              <select
                value={formData.convenio_id}
                onChange={(e) => setFormData(prev => ({ ...prev, convenio_id: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Selecione o convênio</option>
                {convenios.map(convenio => (
                  <option key={convenio.id} value={convenio.id}>{convenio.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Atendimento
              </label>
              <select
                value={formData.tipo}
                onChange={(e) => setFormData(prev => ({ ...prev, tipo: e.target.value as 'consulta' | 'cirurgia' }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="consulta">
                  <span className="flex items-center gap-2">
                    <Stethoscope size={14} />
                    Consulta
                  </span>
                </option>
                <option value="cirurgia">
                  <span className="flex items-center gap-2">
                    <Scissors size={14} />
                    Cirurgia
                  </span>
                </option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome do Paciente
              </label>
              <input
                type="text"
                value={formData.nome_paciente}
                onChange={(e) => setFormData(prev => ({ ...prev, nome_paciente: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data da Consulta
              </label>
              <input
                type="date"
                value={formData.data_consulta}
                onChange={(e) => setFormData(prev => ({ ...prev, data_consulta: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Valor (R$)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.valor}
                onChange={(e) => setFormData(prev => ({ ...prev, valor: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <Save size={16} />
                  Salvar Alterações
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
