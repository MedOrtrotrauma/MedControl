import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';

export type TipoUsuario = 'administrativo' | 'recepcao' | 'medico';

export interface PerfilUsuario {
  id: string;
  nome: string;
  email: string;
  tipo: TipoUsuario;
  medico_id: number | null;
  ativo: boolean;
}

interface AuthContextType {
  user: User | null;
  perfil: PerfilUsuario | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, nome?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  const [loading, setLoading] = useState(true);

  const carregarPerfil = async (uid: string) => {
    const { data } = await supabase.from('perfis_usuario').select('*').eq('id', uid).maybeSingle();
    setPerfil(data as PerfilUsuario | null);
  };

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      if (!mounted) return;
      setUser(u);
      if (u) void carregarPerfil(u.id).finally(() => setLoading(false));
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        const u = session?.user ?? null;
        setUser(u);
        if (u) await carregarPerfil(u.id);
        else setPerfil(null);
        setLoading(false);
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, nome?: string) => {
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { nome } } });
    return { error };
  };

  const signOut = async () => { await supabase.auth.signOut(); };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return { error };
  };

  return (
    <AuthContext.Provider value={{ user, perfil, loading, signIn, signUp, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
};
