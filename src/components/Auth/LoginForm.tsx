import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, LogIn, RotateCcw } from 'lucide-react';
import { useAuth } from './AuthContext';

export const LoginForm: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const { signIn, resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) setError('Email ou senha incorretos.');
      } else {
        const { error } = await resetPassword(email);
        if (error) setError('Não foi possível enviar o e-mail de recuperação.');
        else setMessage('Se o e-mail estiver cadastrado, você receberá as instruções de recuperação.');
      }
    } catch {
      setError('Erro inesperado. Tente novamente.');
    }
    setLoading(false);
  };

  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="login-brand">
          <img src="/logo_vertebrare-removebg copy 3.png" alt="Vertebrare" className="login-logo" />
          <div className="login-brand-text">
            <h1>Vertebrare</h1>
            <span>Controle de Repasse Médico</span>
          </div>
        </div>

        <div className="login-form-area">
          <div className="login-heading">
            <h2>{mode === 'login' ? 'Acesse sua conta' : 'Recuperar senha'}</h2>
            <p>{mode === 'login' ? 'Use suas credenciais para entrar no sistema.' : 'Informe seu e-mail para receber instruções.'}</p>
          </div>

          {error && <div className="login-alert error">{error}</div>}
          {message && <div className="login-alert success">{message}</div>}

          <form onSubmit={handleSubmit} className="login-form">
            <label className="login-field">
              <Mail size={18} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
              />
            </label>

            {mode === 'login' && (
              <label className="login-field">
                <Lock size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="login-eye">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </label>
            )}

            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? <span className="login-spinner" /> : <>{mode === 'login' ? <LogIn size={18} /> : <RotateCcw size={18} />} {mode === 'login' ? 'Entrar' : 'Enviar e-mail'}</>}
            </button>
          </form>

          <div className="login-footer">
            {mode === 'login' ? (
              <button onClick={() => setMode('reset')} className="login-link">Esqueceu sua senha?</button>
            ) : (
              <button onClick={() => setMode('login')} className="login-link">Voltar ao login</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
