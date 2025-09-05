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
      // Timeout para queries do perfil
      const profilePromise = supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 10000);
      });

      const { data: profileData, error: profileError } = await Promise.race([
        profilePromise,
        timeoutPromise
      ]) as any;

      if (profileError) {
        console.error('Erro ao buscar perfil:', profileError);
        // Para casos de timeout, usar dados mínimos
        if (profileError.message === 'Timeout') {
          console.log('Timeout no perfil, usando dados mínimos');
          return;
        }
        return;
      }

      setProfile(profileData);

      // Buscar setores com timeout menor (dados menos críticos)
      try {
        const setoresPromise = supabase
          .from('user_setores')
          .select(`
            id,
            user_id,
            setor_id,
            setor:setores(id, nome, descricao)
          `)
          .eq('user_id', userId);

        const setoresTimeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), 5000);
        });

        const { data: setoresData, error: setoresError } = await Promise.race([
          setoresPromise,
          setoresTimeoutPromise
        ]) as any;

        if (setoresError) {
          console.error('Erro ao buscar setores do usuário:', setoresError);
          return;
        }

        setSetores(setoresData || []);
      } catch (error) {
        console.error('Timeout ao buscar setores, continuando sem eles');
        setSetores([]);
      }
    } catch (error) {
      console.error('Erro ao buscar dados do usuário:', error);
    }
  };

  useEffect(() => {
    // Configurar listener de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
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

    // Verificar sessão atual
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