import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  user_id: string;
  email: string;
  nome_completo: string;
  user_type: 'administrador_master' | 'colaborador_setor';
  role: 'super_admin' | 'operador' | 'viewer' | 'pendente_aprovacao';
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
  isRevoked: boolean;
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
  const [isRevoked, setIsRevoked] = useState(false);

  // Debounce para evitar múltiplas chamadas consecutivas
  const [fetchProfileTimer, setFetchProfileTimer] = useState<NodeJS.Timeout | null>(null);

  const fetchProfile = async (userId: string, userEmail?: string) => {
    try {
      // Buscar perfil, setores e status do allowlist em paralelo
      const [profileResponse, setoresResponse, allowlistResponse] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .single(),
        supabase
          .from('user_setores')
          .select(`
            id,
            user_id,
            setor_id,
            setor:setores(id, nome, descricao)
          `)
          .eq('user_id', userId),
        userEmail ? supabase
          .from('email_allowlist')
          .select('status')
          .eq('email', userEmail.toLowerCase())
          .maybeSingle() : Promise.resolve({ data: null, error: null })
      ]);

      const { data: profileData, error: profileError } = profileResponse;
      const { data: setoresData, error: setoresError } = setoresResponse;
      const { data: allowlistData } = allowlistResponse;

      if (profileError) {
        console.error('Erro ao buscar perfil:', profileError);
        return;
      }

      if (setoresError) {
        console.error('Erro ao buscar setores do usuário:', setoresError);
      }

      // Verificar se o usuário está revogado
      const userIsRevoked = allowlistData?.status === 'revoked';
      setIsRevoked(userIsRevoked);

      setProfile(profileData);
      setSetores(setoresData || []);
    } catch (error) {
      console.error('Erro ao buscar dados do usuário:', error);
    }
  };

  // Função com debounce para evitar chamadas excessivas
  const debouncedFetchProfile = (userId: string, userEmail?: string) => {
    if (fetchProfileTimer) {
      clearTimeout(fetchProfileTimer);
    }
    
    const timer = setTimeout(() => {
      fetchProfile(userId, userEmail);
    }, 100);
    
    setFetchProfileTimer(timer);
  };

  useEffect(() => {
    // Configurar listener de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Usar debounce para evitar múltiplas chamadas
          debouncedFetchProfile(session.user.id, session.user.email);
        } else {
          setProfile(null);
          setSetores([]);
          setIsRevoked(false);
        }
        setLoading(false);
      }
    );

    // Verificar sessão atual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        debouncedFetchProfile(session.user.id, session.user.email);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id, user.email);
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
    isRevoked,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};