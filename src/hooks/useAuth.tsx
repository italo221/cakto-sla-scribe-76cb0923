import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  user_id: string;
  email: string;
  nome_completo: string;
  user_type: 'administrador_master' | 'colaborador_setor';
  role: 'super_admin' | 'operador' | 'viewer';
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
  isSuperAdmin: boolean;
  canEdit: boolean;
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

  const fetchProfile = async (userId: string) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) {
        console.error('Erro ao buscar perfil:', profileError);
        // Se há erro de autenticação, fazer logout
        if (profileError.code === 'PGRST301' || profileError.message?.includes('JWT')) {
          console.log('Token expirado, fazendo logout...');
          await signOut();
        }
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
          setor:setores(id, nome, descricao)
        `)
        .eq('user_id', userId);

      if (setoresError) {
        console.error('Erro ao buscar setores:', setoresError);
        return;
      }

      setSetores(setoresData || []);
    } catch (error) {
      console.error('Erro ao buscar dados do usuário:', error);
      // Se há erro de rede ou autenticação, fazer logout
      if (error instanceof Error && error.message?.includes('auth')) {
        await signOut();
      }
    }
  };

  useEffect(() => {
    // Configurar listener de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.id);
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Aguardar um pouco e então buscar perfil
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 100);
        } else {
          setProfile(null);
          setSetores([]);
        }
        setLoading(false);
      }
    );

    // Verificar sessão atual com retry em caso de erro
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Erro ao obter sessão:', error);
          // Se há erro de token, tentar refresh
          if (error.message?.includes('refresh_token_not_found') || error.message?.includes('Invalid Refresh Token')) {
            console.log('Token inválido, redirecionando para login...');
            await supabase.auth.signOut();
          }
          setLoading(false);
          return;
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          fetchProfile(session.user.id);
        }
        setLoading(false);
      } catch (error) {
        console.error('Erro inesperado na inicialização:', error);
        setLoading(false);
      }
    };

    initializeAuth();

    return () => subscription.unsubscribe();
  }, []);

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Erro no logout:', error);
      }
    } catch (error) {
      console.error('Erro inesperado no logout:', error);
    }
  };

  // Verificações de role
  const isSuperAdmin = profile?.role === 'super_admin' || profile?.user_type === 'administrador_master';
  const canEdit = isSuperAdmin || profile?.role === 'operador';
  const isAdmin = isSuperAdmin; // Compatibilidade com código existente

  const value = {
    user,
    session,
    profile,
    setores,
    loading,
    isAdmin,
    isSuperAdmin,
    canEdit,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};