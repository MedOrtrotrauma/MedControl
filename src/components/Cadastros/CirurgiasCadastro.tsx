import React, { useState, useEffect } from 'react';
import { Scissors, Plus, CreditCard as Edit, Trash2, Save, X } from 'lucide-react';
import { dbHelpers } from '../../lib/supabase';
import { Cirurgia } from '../../types';

export const CirurgiasCadastro: React.FC = () => {
  const [cirurgias, setCirurgias] = useState<Cirurgia[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingCirurgia, setEditingCirurgia] = useState<Cirurgia | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null);
  const [formData, setFormData] = useState({ nome: '' });

  useEffect(() => {
    loadCirurgias();
  }, []);

  const loadCirurgias = async () => {
    setLoading(true);
    try {
      const { data } = await dbHelpers.getCirurgias();
      if (data) setCirurgias(data);
    } catch (error) {
      console.error('Erro ao carregar cirurgias:', error);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingCirurgia) {
        await dbHelpers.updateCirurgia(editingCirurgia.id, formData);
      } else {
        await dbHelpers.createCirurgia(formData);
      }
      setFormData({ nome: '' });
      setShowForm(false);
      setEditingCirurgia(null);
      loadCirurgias();
    } catch (error) {
      console.error('Erro ao salvar cirurgia:', error);
    }
    setLoading(false);
  };

  const handleEdit = (cirurgia: Cirurgia) => {
    setEditingCirurgia(cirurgia);
    setFormData({ nome: cirurgia.nome });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    setDeleteLoading(id);
    try {
      await dbHelpers.deleteCirurgia(id);
      loadCirurgias();
    } catch (error) {
      console.error('Erro ao excluir cirurgia:', error);
    }
    setDeleteLoading(null);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingCirurgia(null);
    setFormData({ nome: '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-r from-rose-500 to-rose-600 p-2 rounded-lg">
            <Scissors className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Cadastro de Cirurgias</h3>
            <p className="text-gray-600">Gerencie as cirurgias do sistema</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-lg"
        >
          <Plus size={16} />
          Nova Cirurgia
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-lg font-semibold text-gray-900">
              {editingCirurgia ? 'Editar Cirurgia' : 'Nova Cirurgia'}
            </h4>
            <button onClick={handleCancel} className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200">
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nome da Cirurgia</label>
              <input
                type="text"
                value={formData.nome}
                onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                required
                placeholder="Artrodese, Discectomia, Laminectomia..."
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="bg-gradient-to-r from-rose-600 to-rose-700 text-white px-6 py-3 rounded-lg hover:from-rose-700 hover:to-rose-800 transition-all duration-200 disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Save size={16} />
                    {editingCirurgia ? 'Atualizar' : 'Salvar'}
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

      <div className="bg-white rounded-xl shadow-lg border border-gray-100">
        <div className="p-6 border-b border-gray-200">
          <h4 className="text-lg font-semibold text-gray-900">Cirurgias Cadastradas</h4>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Nome</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cirurgias.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-6 py-8 text-center text-gray-500">
                    Nenhuma cirurgia cadastrada
                  </td>
                </tr>
              ) : (
                cirurgias.map((cirurgia, index) => (
                  <tr key={cirurgia.id} className={`transition-colors duration-150 hover:bg-rose-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-rose-100 p-1.5 rounded-full">
                          <Scissors size={14} className="text-rose-600" />
                        </div>
                        <span className="font-medium text-gray-900">{cirurgia.nome}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(cirurgia)}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors duration-200"
                          title="Editar"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(cirurgia.id)}
                          disabled={deleteLoading === cirurgia.id}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors duration-200 disabled:opacity-50"
                          title="Excluir"
                        >
                          {deleteLoading === cirurgia.id ? (
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
