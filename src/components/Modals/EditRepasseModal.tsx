import React, { useState, useEffect } from 'react';
import { X, Save, CreditCard, Stethoscope, Scissors, Calendar } from 'lucide-react';
import { dbHelpers } from '../../lib/supabase';
import { Repasse, Medico, Convenio, Hospital } from '../../types';

interface EditRepasseModalProps {
  repasse: Repasse | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export const EditRepasseModal: React.FC<EditRepasseModalProps> = ({
  repasse,
  isOpen,
  onClose,
  onSave
}) => {
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [hospitais, setHospitais] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    medico_id: '',
    convenio_id: '',
    nome_paciente: '',
    hospital_id: '',
    data_cirurgia: '',
    valor: '',
    tipo: 'consulta' as 'consulta' | 'cirurgia',
    is_particular: false,
    month_reference: '' // NOVO CAMPO
  });

  useEffect(() => {
    if (isOpen) {
      loadData();
      if (repasse) {
        setFormData({
          medico_id: repasse.medico_id.toString(),
          convenio_id: repasse.convenio_id?.toString() || '',
          nome_paciente: repasse.nome_paciente,
          hospital_id: repasse.hospital_id.toString(),
          data_cirurgia: repasse.data_cirurgia,
          valor: repasse.valor.toString(),
          tipo: repasse.tipo,
          is_particular: repasse.is_particular,
          month_reference: repasse.month_reference || getDefaultMonthReference() // NOVO
        });
      }
    }
  }, [isOpen, repasse]);

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
      const [medicosRes, conveniosRes, hospitaisRes] = await Promise.all([
        dbHelpers.getMedicos(),
        dbHelpers.getConvenios(),
        dbHelpers.getHospitais()
      ]);

      if (medicosRes.data) setMedicos(medicosRes.data);
      if (conveniosRes.data) setConvenios(conveniosRes.data);
      if (hospitaisRes.data) setHospitais(hospitaisRes.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repasse) return;

    setLoading(true);
    try {
      const result = await dbHelpers.updateRepasse(repasse.id, {
        medico_id: parseInt(formData.medico_id),
        convenio_id: formData.is_particular ? null : parseInt(formData.convenio_id),
        nome_paciente: formData.nome_paciente,
        hospital_id: parseInt(formData.hospital_id),
        data_cirurgia: formData.data_cirurgia,
        valor: parseFloat(formData.valor),
        tipo: formData.tipo,
        is_particular: formData.is_particular,
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
            <div className="bg-purple-500 p-2 rounded-lg">
              <CreditCard className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">Editar Repasse</h3>
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
                Mês ao qual este repasse será contabilizado
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
                Tipo de Atendimento
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="is_particular"
                    checked={!formData.is_particular}
                    onChange={() => setFormData(prev => ({ ...prev, is_particular: false }))}
                    className="mr-2"
                  />
                  Convênio
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="is_particular"
                    checked={formData.is_particular}
                    onChange={() => setFormData(prev => ({ ...prev, is_particular: true }))}
                    className="mr-2"
                  />
                  Particular
                </label>
              </div>
            </div>

            {!formData.is_particular && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Convênio
                </label>
                <select
                  value={formData.convenio_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, convenio_id: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required={!formData.is_particular}
                >
                  <option value="">Selecione o convênio</option>
                  {convenios.map(convenio => (
                    <option key={convenio.id} value={convenio.id}>{convenio.nome}</option>
                  ))}
                </select>
              </div>
            )}

            {formData.is_particular && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center gap-2">
                    <Stethoscope size={16} />
                    Tipo de Procedimento
                  </div>
                </label>
                <select
                  value={formData.tipo}
                  onChange={(e) => setFormData(prev => ({ ...prev, tipo: e.target.value as 'consulta' | 'cirurgia' }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="consulta">🩺 Consulta</option>
                  <option value="cirurgia">✂️ Cirurgia</option>
                </select>
              </div>
            )}

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
                Hospital
              </label>
              <select
                value={formData.hospital_id}
                onChange={(e) => setFormData(prev => ({ ...prev, hospital_id: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Selecione o hospital</option>
                {hospitais.map(hospital => (
                  <option key={hospital.id} value={hospital.id}>{hospital.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data do Atendimento
              </label>
              <input
                type="date"
                value={formData.data_cirurgia}
                onChange={(e) => setFormData(prev => ({ ...prev, data_cirurgia: e.target.value }))}
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
