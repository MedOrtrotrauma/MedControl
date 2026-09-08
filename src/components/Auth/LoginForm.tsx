import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, LogIn, UserPlus, RotateCcw, Stethoscope } from 'lucide-react';
import { useAuth } from './AuthContext';

export const LoginForm: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const { signIn, signUp, resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) {
          setError('Email ou senha incorretos');
        }
      } else if (mode === 'signup') {
        const { error } = await signUp(email, password);
        if (error) {
          setError('Erro ao criar conta: ' + error.message);
        } else {
          setMessage('Conta criada com sucesso! Você pode fazer login agora.');
          setMode('login');
        }
      } else if (mode === 'reset') {
        const { error } = await resetPassword(email);
        if (error) {
          setError('Erro ao enviar email de recuperação: ' + error.message);
        } else {
          setMessage('Email de recuperação enviado! Verifique sua caixa de entrada.');
        }
      }
    } catch (err) {
      setError('Erro inesperado. Tente novamente.');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 rounded-full w-fit mx-auto mb-4 shadow-lg">
            <Stethoscope className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">MedControl Pro</h1>
          <p className="text-gray-600">Sistema de Controle de Repasse Médico</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {mode === 'login' && 'Entrar na sua conta'}
              {mode === 'signup' && 'Criar nova conta'}
              {mode === 'reset' && 'Recuperar senha'}
            </h2>
            <p className="text-gray-600">
              {mode === 'login' && 'Digite suas credenciais para acessar o sistema'}
              {mode === 'signup' && 'Preencha os dados para criar sua conta'}
              {mode === 'reset' && 'Digite seu email para receber instruções de recuperação'}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {message && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-700 text-sm">{message}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="seu@email.com"
                  required
                />
              </div>
            </div>

            {mode !== 'reset' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 disabled:opacity-50 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  {mode === 'login' && <LogIn size={20} />}
                  {mode === 'signup' && <UserPlus size={20} />}
                  {mode === 'reset' && <RotateCcw size={20} />}
                  {mode === 'login' && 'Entrar'}
                  {mode === 'signup' && 'Criar Conta'}
                  {mode === 'reset' && 'Enviar Email'}
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center space-y-2">
            {mode === 'login' && (
              <>
                <button
                  onClick={() => setMode('reset')}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Esqueceu sua senha?
                </button>
                <div className="text-gray-600 text-sm">
                  Não tem uma conta?{' '}
                  <button
                    onClick={() => setMode('signup')}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Criar conta
                  </button>
                </div>
              </>
            )}

            {mode === 'signup' && (
              <div className="text-gray-600 text-sm">
                Já tem uma conta?{' '}
                <button
                  onClick={() => setMode('login')}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Fazer login
                </button>
              </div>
            )}

            {mode === 'reset' && (
              <button
                onClick={() => setMode('login')}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Voltar ao login
              </button>
            )}
          </div>
        </div>

        {/* Demo credentials */}
        <div className="mt-6 p-4 bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200 rounded-lg">
          <h4 className="font-medium text-yellow-800 mb-2">Use suas Credenciais:</h4>
          <p className="text-sm text-yellow-700">
            <strong>Email:</strong> incom.slz@gmail.com<br />
            <strong>Senha:</strong> incom123
          </p>
          <p className="text-xs text-yellow-600 mt-2">
            Ou clique em "Criar conta" acima para cadastrar-se.
          </p>
        </div>
      </div>
    </div>
  );
};
