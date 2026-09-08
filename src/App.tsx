import React, { useState, useEffect } from 'react';
import { Activity, FileText, Database, Stethoscope, LogOut, User, UserCheck, Building, Building2 } from 'lucide-react';
import { ProducaoMensalComponent } from './components/ProducaoMensal';
import { RepasseComponent } from './components/Repasse';
import { MedicosCadastro } from './components/Cadastros/MedicosCadastro';
import { ConveniosCadastro } from './components/Cadastros/ConveniosCadastro';
import { HospitaisCadastro } from './components/Cadastros/HospitaisCadastro';
import { DatabaseSetup } from './components/DatabaseSetup';
import { AuthProvider, useAuth } from './components/Auth/AuthContext';
import { LoginForm } from './components/Auth/LoginForm';
import { supabase } from './lib/supabase';

function AppContent() {
  const [activeTab, setActiveTab] = useState<'producao' | 'repasse' | 'medicos' | 'convenios' | 'hospitais'>('producao');
  const [supabaseConnected, setSupabaseConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user, signOut } = useAuth();

  useEffect(() => {
    checkSupabaseConnection();
  }, []);

  const checkSupabaseConnection = async () => {
    try {
      const { data, error } = await supabase.from('medicos').select('count').single();
      setSupabaseConnected(!error);
    } catch (error) {
      setSupabaseConnected(false);
    }
    setLoading(false);
  };

  const handleSignOut = async () => {
    await signOut();
  };

  if (!user) {
    return <LoginForm />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!supabaseConnected) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-2 rounded-lg shadow-lg">
                  <Stethoscope className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">MedControl Pro</h1>
                  <p className="text-sm text-gray-600">Sistema de Controle de Repasse Médico</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <User size={16} />
                  {user.email}
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                >
                  <LogOut size={16} />
                  Sair
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <DatabaseSetup />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-2 rounded-lg shadow-lg">
                <Stethoscope className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">MedControl Pro</h1>
                <p className="text-sm text-gray-600">Sistema de Controle de Repasse Médico</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <User size={16} />
                {user.email}
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                <LogOut size={16} />
                Sair
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('producao')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-all duration-200 ${
                activeTab === 'producao'
                  ? 'border-blue-500 text-blue-600 bg-blue-50 rounded-t-lg px-4'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FileText size={20} />
              Produção Mensal
            </button>
            <button
              onClick={() => setActiveTab('repasse')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-all duration-200 ${
                activeTab === 'repasse'
                  ? 'border-blue-500 text-blue-600 bg-blue-50 rounded-t-lg px-4'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Database size={20} />
              Repasse
            </button>
            <button
              onClick={() => setActiveTab('medicos')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-all duration-200 ${
                activeTab === 'medicos'
                  ? 'border-blue-500 text-blue-600 bg-blue-50 rounded-t-lg px-4'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <UserCheck size={20} />
              Médicos
            </button>
            <button
              onClick={() => setActiveTab('convenios')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-all duration-200 ${
                activeTab === 'convenios'
                  ? 'border-blue-500 text-blue-600 bg-blue-50 rounded-t-lg px-4'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Building size={20} />
              Convênios
            </button>
            <button
              onClick={() => setActiveTab('hospitais')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-all duration-200 ${
                activeTab === 'hospitais'
                  ? 'border-blue-500 text-blue-600 bg-blue-50 rounded-t-lg px-4'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Building2 size={20} />
              Hospitais
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'producao' && <ProducaoMensalComponent />}
        {activeTab === 'repasse' && <RepasseComponent />}
        {activeTab === 'medicos' && <MedicosCadastro />}
        {activeTab === 'convenios' && <ConveniosCadastro />}
        {activeTab === 'hospitais' && <HospitaisCadastro />}
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;