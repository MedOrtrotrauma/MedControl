import React, { useState, useEffect } from 'react';
import { User, Plus, Edit, Trash2, Save, X, UserCheck } from 'lucide-react';
import { dbHelpers } from '../../lib/supabase';
import { Medico } from '../../types';

export const MedicosCadastro: React.FC = () => {
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingMedico, setEditingMedico] = useState<Medico | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    crm: ''
  });

  useEffect(() => {
    loadMedicos();
  }, []);

  const loadMedicos = async () => {
    setLoading(true);
    try {
      const { data } = await dbHelpers.getMedicos();
      if (data) setMedicos(data);
    } catch (error) {
      console.error('Erro ao carregar médicos:', error);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingMedico) {
        await dbHelpers.updateMedico(editingMedico.id, formData);
      } else {
        await dbHelpers.createMedico(formData);
      }
      
      setFormData({ nome: '', crm: '' });
      setShowForm(false);
      setEditingMedico(null);
      loadMedicos();
    } catch (error) {
      console.error('Erro ao salvar médico:', error);
    }
    setLoading(false);
  };

  const handleEdit = (medico: Medico) => {
    setEditingMedico(medico);
    setFormData({
      nome: medico.nome,
      crm: medico.crm || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    setDeleteLoading(id);
    try {
      await dbHelpers.deleteMedico(id);
      loadMedicos();
    } catch (error) {
      console.error('Erro ao excluir médico:', error);
    }
    setDeleteLoading(null);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingMedico(null);
    setFormData({ nome: '', crm: '' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-2 rounded-lg">
            <UserCheck className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Cadastro de Médicos</h3>
            <p className="text-gray-600">Gerencie os médicos do sistema</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-lg"
        >
          <Plus size={16} />
          Novo Médico
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-lg font-semibold text-gray-900">
              {editingMedico ? 'Editar Médico' : 'Novo Médico'}
            </h4>
            <button
              onClick={handleCancel}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome Completo
              </label>
              <input
                type="text"
                value={formData.nome}
                onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                placeholder="Dr. João Silva"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CRM
              </label>
              <input
                type="text"
                value={formData.crm}
                onChange={(e) => setFormData(prev => ({ ...prev, crm: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="123456/SP"
              />
            </div>

            <div className="md:col-span-2 flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Save size={16} />
                    {editingMedico ? 'Atualizar' : 'Salvar'}
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100">
        <div className="p-6 border-b border-gray-200">
          <h4 className="text-lg font-semibold text-gray-900">Médicos Cadastrados</h4>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Nome</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">CRM</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {medicos.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                    Nenhum médico cadastrado
                  </td>
                </tr>
              ) : (
                medicos.map((medico, index) => (
                  <tr key={medico.id} className={`transition-colors duration-150 hover:bg-blue-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-1.5 rounded-full">
                          <User size={14} className="text-blue-600" />
                        </div>
                        <span className="font-medium text-gray-900">{medico.nome}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-700">{medico.crm || '-'}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(medico)}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors duration-200"
                          title="Editar"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(medico.id)}
                          disabled={deleteLoading === medico.id}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors duration-200 disabled:opacity-50"
                          title="Excluir"
                        >
                          {deleteLoading === medico.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};