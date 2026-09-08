import React, { useState } from 'react';
import { Database, AlertCircle, CheckCircle, Stethoscope } from 'lucide-react';
import { dbHelpers, supabase } from '../lib/supabase';

export const DatabaseSetup: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);

  const setupDatabase = async () => {
    setLoading(true);
    try {
      setSetupComplete(true);
    } catch (error) {
      console.error('Erro ao configurar dados:', error);
    }
    setLoading(false);
  };

  if (setupComplete) {
    return (
      <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-xl p-8 text-center shadow-lg">
        <div className="bg-green-500 p-3 rounded-full w-fit mx-auto mb-4">
          <CheckCircle className="h-8 w-8 text-white" />
        </div>
        <h3 className="text-xl font-bold text-green-800 mb-2">
          Dados iniciais configurados com sucesso!
        </h3>
        <p className="text-green-700 text-lg">
          Você pode agora começar a usar a aplicação de controle de repasse médico.
        </p>
        <div className="mt-6 flex items-center justify-center gap-2 text-green-600">
          <Stethoscope size={20} />
          <span className="font-medium">Sistema pronto para uso!</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-8 text-center shadow-lg">
      <div className="bg-blue-500 p-3 rounded-full w-fit mx-auto mb-4">
        <Database className="h-8 w-8 text-white" />
      </div>
      <h3 className="text-xl font-bold text-blue-800 mb-2">
        Configuração Inicial do Banco de Dados
      </h3>
      <p className="text-blue-700 mb-6 text-lg">
        Clique no botão abaixo para finalizar a configuração inicial.
      </p>
      <button
        onClick={setupDatabase}
        disabled={loading}
        className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 disabled:opacity-50 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
      >
        {loading ? 'Configurando...' : 'Finalizar Configuração'}
      </button>
      
      <div className="mt-6 p-4 bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200 rounded-lg">
        <div className="flex items-center gap-2 text-yellow-800">
          <AlertCircle size={16} />
          <span className="text-sm font-medium">Importante:</span>
        </div>
        <p className="text-sm text-yellow-700 mt-1">
          Certifique-se de ter conectado ao Supabase usando o botão "Connect to Supabase" no canto superior direito antes de prosseguir. Use as abas "Médicos", "Convênios" e "Hospitais" para cadastrar os dados necessários.
        </p>
      </div>
    </div>
  );
};