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
  // Simulando usuário admin sempre logado
  const mockUser = {
    id: '00000000-0000-0000-0000-000000000000',
    email: 'admin@sistema.com'
  } as User;
  
  const mockProfile = {
    id: '00000000-0000-0000-0000-000000000000',
    user_id: '00000000-0000-0000-0000-000000000000',
    email: 'admin@sistema.com',
    nome_completo: 'Super Administrador',
    user_type: 'administrador_master' as const,
    ativo: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const [user] = useState<User | null>(mockUser);
  const [session] = useState<Session | null>(null);
  const [profile] = useState<Profile | null>(mockProfile);
  const [setores] = useState<UserSetor[]>([]);
  const [loading] = useState(false);

  const isAdmin = true; // Todos são admin agora

  const refreshProfile = async () => {
    // Não faz nada - sistema aberto
  };

  const signOut = async () => {
    // Não faz nada - não há logout em sistema aberto
    alert('Sistema aberto - não é necessário logout');
  };

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