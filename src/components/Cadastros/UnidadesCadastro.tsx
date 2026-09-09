import React, { useState, useEffect } from 'react';
import { Building2, Plus, Edit, Trash2, Save, X, MapPin } from 'lucide-react';
import { dbHelpers } from '../../lib/supabase';
import { Unidade } from '../../types';

export const UnidadesCadastro: React.FC = () => {
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingUnidade, setEditingUnidade] = useState<Unidade | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    cidade: ''
  });

  useEffect(() => {
    loadUnidades();
  }, []);

  const loadUnidades = async () => {
    setLoading(true);
    try {
      const { data } = await dbHelpers.getUnidades();
      if (data) setUnidades(data);
    } catch (error) {
      console.error('Erro ao carregar unidades:', error);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingUnidade) {
        await dbHelpers.updateUnidade(editingUnidade.id, formData);
      } else {
        await dbHelpers.createUnidade(formData);
      }

      setFormData({ nome: '', cidade: '' });
      setShowForm(false);
      setEditingUnidade(null);
      loadUnidades();
    } catch (error) {
      console.error('Erro ao salvar unidade:', error);
    }
    setLoading(false);
  };

  const handleEdit = (unidade: Unidade) => {
    setEditingUnidade(unidade);
    setFormData({
      nome: unidade.nome,
      cidade: unidade.cidade || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    setDeleteLoading(id);
    try {
      await dbHelpers.deleteUnidade(id);
      loadUnidades();
    } catch (error) {
      console.error('Erro ao excluir unidade:', error);
    }
    setDeleteLoading(null);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingUnidade(null);
    setFormData({ nome: '', cidade: '' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-2 rounded-lg">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Cadastro de Unidades</h3>
            <p className="text-gray-600">Gerencie as unidades de atendimento do sistema</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-lg"
        >
          <Plus size={16} />
          Nova Unidade
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-lg font-semibold text-gray-900">
              {editingUnidade ? 'Editar Unidade' : 'Nova Unidade'}
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
                Nome da Unidade
              </label>
              <input
                type="text"
                value={formData.nome}
                onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                required
                placeholder="Unidade Centro, Clínica Norte..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cidade
              </label>
              <input
                type="text"
                value={formData.cidade}
                onChange={(e) => setFormData(prev => ({ ...prev, cidade: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="São Paulo, Rio de Janeiro..."
              />
            </div>

            <div className="md:col-span-2 flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-6 py-3 rounded-lg hover:from-emerald-700 hover:to-emerald-800 transition-all duration-200 disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Save size={16} />
                    {editingUnidade ? 'Atualizar' : 'Salvar'}
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
          <h4 className="text-lg font-semibold text-gray-900">Unidades Cadastradas</h4>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Nome</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Cidade</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {unidades.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                    Nenhuma unidade cadastrada
                  </td>
                </tr>
              ) : (
                unidades.map((unidade, index) => (
                  <tr key={unidade.id} className={`transition-colors duration-150 hover:bg-emerald-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-emerald-100 p-1.5 rounded-full">
                          <Building2 size={14} className="text-emerald-600" />
                        </div>
                        <span className="font-medium text-gray-900">{unidade.nome}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {unidade.cidade ? (
                          <>
                            <MapPin size={14} className="text-gray-400" />
                            <span className="text-gray-700">{unidade.cidade}</span>
                          </>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(unidade)}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors duration-200"
                          title="Editar"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(unidade.id)}
                          disabled={deleteLoading === unidade.id}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors duration-200 disabled:opacity-50"
                          title="Excluir"
                        >
                          {deleteLoading === unidade.id ? (
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
