import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  user_id: string;
  email: string;
  nome_completo: string;
  user_type: 'administrador_master' | 'colaborador_setor';
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

interface UserSetor {
  id: string;
  user_id: string;
  setor_id: string;
  setor: {
    id: string;
    nome: string;
    descricao: string;
  };
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  setores: UserSetor[];
  loading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [setores, setSetores] = useState<UserSetor[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = profile?.user_type === 'administrador_master';

  const fetchProfile = async (userId: string) => {
    try {
      // Buscar perfil do usuário
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) {
        console.error('Erro ao buscar perfil:', profileError);
        return;
      }

      setProfile(profileData);

      // Buscar setores do usuário
      const { data: setoresData, error: setoresError } = await supabase
        .from('user_setores')
        .select(`
          id,
          user_id,
          setor_id,
          setores:setor_id (
            id,
            nome,
            descricao
          )
        `)
        .eq('user_id', userId);

      if (setoresError) {
        console.error('Erro ao buscar setores:', setoresError);
        return;
      }

      // Transform data to match UserSetor interface
      const transformedSetores = (setoresData || []).map((item: any) => ({
        id: item.id,
        user_id: item.user_id,
        setor_id: item.setor_id,
        setor: item.setores
      }));

      setSetores(transformedSetores);
    } catch (error) {
      console.error('Erro ao buscar dados do usuário:', error);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const signOut = async () => {
    try {
      // Limpar estados locais
      setUser(null);
      setSession(null);
      setProfile(null);
      setSetores([]);

      // Limpar storage
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          localStorage.removeItem(key);
        }
      });

      // SignOut do Supabase
      await supabase.auth.signOut({ scope: 'global' });

      // Redirecionar para auth
      window.location.href = '/auth';
    } catch (error) {
      console.error('Erro no logout:', error);
      // Force redirect mesmo com erro
      window.location.href = '/auth';
    }
  };

  useEffect(() => {
    // Configurar listener de auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        setSession(session);
        setUser(session?.user ?? null);

        if (event === 'SIGNED_IN' && session?.user) {
          // Defer profile fetching to prevent deadlocks
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
        } else if (event === 'SIGNED_OUT') {
          setProfile(null);
          setSetores([]);
        }

        setLoading(false);
      }
    );

    // Verificar sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = {
    user,
    session,
    profile,
    setores,
    loading,
    isAdmin,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};