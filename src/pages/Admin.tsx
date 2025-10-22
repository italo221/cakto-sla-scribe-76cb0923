import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ImprovedPermissionsPanel from "@/components/ImprovedPermissionsPanel";
import EnhancedPermissionsLogs from "@/components/EnhancedPermissionsLogs";

import SetorDetailPanel from "@/components/SetorDetailPanel";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users, Building2, UserPlus, Building, Shield, Trash2, Edit, Check, X, AlertCircle, Plus, UserX, Save, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import AdminUserEditor from "@/components/AdminUserEditor";
import { useIsMobile } from "@/hooks/use-mobile";
import SupabaseStatus from "@/components/SupabaseStatus";
import { isSupabaseConfigured } from "@/integrations/supabase/client";
import { useOptimizedProfiles } from '@/hooks/useOptimizedProfiles';
import { useOptimizedSetores } from '@/hooks/useOptimizedSetores';
interface Profile {
  id: string;
  user_id: string;
  email: string;
  nome_completo: string;
  user_type: string;
  role: string;
  ativo: boolean;
  created_at?: string;
}
interface Setor {
  id: string;
  nome: string;
  descricao?: string;
  ativo?: boolean;
}
interface UserSetor {
  id: string;
  user_id: string;
  setor_id: string;
  setor: Setor;
  profile: Pick<Profile, 'nome_completo' | 'email'>;
}

const Admin = () => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [setores, setSetores] = useState<Setor[]>([]);
  const [userSetores, setUserSetores] = useState<UserSetor[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [setorDialogOpen, setSetorDialogOpen] = useState(false);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [adminUserEditorOpen, setAdminUserEditorOpen] = useState(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<string | null>(null);
  const [creatingUser, setCreatingUser] = useState(false);

  // Form states
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedSetor, setSelectedSetor] = useState("");
  const [newSetorName, setNewSetorName] = useState("");
  const [newSetorDesc, setNewSetorDesc] = useState("");

  // User form states
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserType, setNewUserType] = useState<"administrador_master" | "colaborador_setor">("colaborador_setor");
  const [selectedSetorDetail, setSelectedSetorDetail] = useState<Setor | null>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { fetchProfiles } = useOptimizedProfiles({ 
    includeInactive: true, 
    selectFields: ['user_id', 'id', 'nome_completo', 'email', 'role', 'user_type', 'ativo', 'created_at'] 
  });
  const { fetchSetores: getSetores } = useOptimizedSetores();

  // Sistema aberto - sempre autenticado como admin
  const isAuthenticated = true;
  const isAdmin = true;

  // Componente para cartão de usuário com edição
  const UserCard = ({
    user,
    onUserUpdate
  }: {
    user: Profile;
    onUserUpdate: () => void;
  }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedName, setEditedName] = useState(user.nome_completo);
    const [editedRole, setEditedRole] = useState(user.role);
    
    const handleSave = async () => {
      if (!editedName.trim()) {
        toast({
          title: "Erro",
          description: "Nome não pode estar vazio.",
          variant: "destructive"
        });
        return;
      }
      try {
        const { error } = await supabase.from('profiles').update({
          nome_completo: editedName.trim(),
          role: editedRole as 'super_admin' | 'operador' | 'viewer'
        }).eq('id', user.id);
        if (error) throw error;
        toast({
          title: "Perfil atualizado",
          description: "Nome e role atualizados com sucesso."
        });
        setIsEditing(false);
        onUserUpdate();
      } catch (error: any) {
        toast({
          title: "Erro ao atualizar",
          description: error.message,
          variant: "destructive"
        });
      }
    };
    
    const handleToggleActive = async () => {
      try {
        const { error } = await supabase.from('profiles').update({
          ativo: !user.ativo
        }).eq('id', user.id);
        if (error) throw error;
        toast({
          title: user.ativo ? "Usuário desativado" : "Usuário ativado",
          description: `${user.nome_completo} foi ${user.ativo ? 'desativado' : 'ativado'} com sucesso.`
        });
        onUserUpdate();
      } catch (error: any) {
        toast({
          title: "Erro ao alterar status",
          description: error.message,
          variant: "destructive"
        });
      }
    };
    
    return <div className={`flex ${isMobile ? 'flex-col space-y-3' : 'items-center justify-between'} p-4 border rounded-lg`}>
        <div className={`space-y-1 ${isMobile ? 'w-full' : 'flex-1'}`}>
          {isEditing ? <div className="space-y-2">
              <Input value={editedName} onChange={e => setEditedName(e.target.value)} placeholder="Nome completo" className={isMobile ? 'w-full' : 'max-w-xs'} />
              <Select value={editedRole} onValueChange={value => setEditedRole(value as any)}>
                <SelectTrigger className={isMobile ? 'w-full' : 'max-w-xs'}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="operador">Operador</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
              <div className={`flex gap-2 ${isMobile ? 'flex-col' : ''}`}>
                <Button size="sm" onClick={handleSave} className={isMobile ? 'w-full' : ''}>
                  <Save className="h-3 w-3 mr-1" />
                  Salvar
                </Button>
                <Button size="sm" variant="outline" onClick={() => {
              setIsEditing(false);
              setEditedName(user.nome_completo);
              setEditedRole(user.role);
            }} className={isMobile ? 'w-full' : ''}>
                  Cancelar
                </Button>
              </div>
            </div> : <div>
              <p className="font-medium">{user.nome_completo}</p>
              <Badge variant={user.role === 'super_admin' ? 'default' : user.role === 'operador' ? 'secondary' : 'outline'} className="text-xs mt-1">
                {user.role === 'super_admin' ? 'Super Admin' : user.role === 'operador' ? 'Operador' : 'Viewer'}
              </Badge>
            </div>}
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
        <div className={`flex items-center gap-2 ${isMobile ? 'w-full justify-start flex-wrap' : ''}`}>
          
          {user.ativo ? <Badge variant="outline" className="text-green-600">
              <Check className="h-3 w-3 mr-1" />
              Ativo
            </Badge> : <Badge variant="outline" className="text-red-600">
              <X className="h-3 w-3 mr-1" />
              Inativo
            </Badge>}
          <Button variant="outline" size="sm" onClick={() => setIsEditing(!isEditing)} disabled={isEditing}>
            <Edit className="h-3 w-3" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => {
            console.log('🔍 Abrindo editor para usuário:', user);
            console.log('🔍 user.user_id:', user.user_id);
            if (!user.user_id) {
              toast({
                title: "Erro",
                description: "ID do usuário não encontrado",
                variant: "destructive"
              });
              return;
            }
            setSelectedUserForEdit(user.user_id);
            setAdminUserEditorOpen(true);
          }}>
            <Shield className="h-3 w-3" />
            {isMobile ? '' : 'Admin'}
          </Button>
           <Button variant={user.ativo ? "destructive" : "default"} size="sm" onClick={handleToggleActive}>
             {user.ativo ? <>
                 <UserX className="h-3 w-3 mr-1" />
                 {isMobile ? '' : 'Desativar'}
               </> : <>
                 <Check className="h-3 w-3 mr-1" />
                 {isMobile ? '' : 'Ativar'}
               </>}
           </Button>
           <Button 
             variant="destructive" 
             size="sm" 
             onClick={() => handleDeleteUser(user)}
             title="Excluir usuário permanentemente"
           >
             <Trash2 className="h-3 w-3" />
             {!isMobile && 'Excluir'}
           </Button>
        </div>
      </div>;
  };

  // Fetch data
  const fetchData = async () => {
    try {
      const [usersResponse, setoresResponse, userSetoresResponse] = await Promise.all([
        fetchProfiles(),
        getSetores(),
        supabase.from('user_setores').select(`
            id,
            user_id,
            setor_id,
            setores:setor_id (id, nome, descricao, ativo),
            profiles:user_id (nome_completo, email)
          `)
      ]);
      
      if (userSetoresResponse.error) throw userSetoresResponse.error;
      setUsers(usersResponse || []);
      setSetores(setoresResponse || []);

      // Transform userSetores data to match interface
      const transformedUserSetores = (userSetoresResponse.data || []).map((item: any) => ({
        id: item.id,
        user_id: item.user_id,
        setor_id: item.setor_id,
        setor: item.setores,
        profile: item.profiles
      }));
      setUserSetores(transformedUserSetores);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  // Create sector
  const handleCreateSetor = async () => {
    if (!newSetorName.trim()) {
      toast({
        title: "Erro",
        description: "Nome do setor é obrigatório.",
        variant: "destructive"
      });
      return;
    }
    try {
      const {
        error
      } = await supabase.from('setores').insert({
        nome: newSetorName.trim(),
        descricao: newSetorDesc.trim()
      });
      if (error) throw error;
      toast({
        title: "Setor criado com sucesso!",
        description: `O setor "${newSetorName}" foi criado.`
      });
      setNewSetorName("");
      setNewSetorDesc("");
      setSetorDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erro ao criar setor",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Create user
  const handleCreateUser = async () => {
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword.trim()) {
      toast({
        title: "Erro",
        description: "Todos os campos são obrigatórios.",
        variant: "destructive"
      });
      return;
    }
    if (newUserPassword.length < 6) {
      toast({
        title: "Erro",
        description: "A senha deve ter pelo menos 6 caracteres.",
        variant: "destructive"
      });
      return;
    }
    setCreatingUser(true);
    try {
      const redirectUrl = `${window.location.origin}/`;
      const {
        data,
        error
      } = await supabase.auth.signUp({
        email: newUserEmail.trim(),
        password: newUserPassword,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            nome_completo: newUserName.trim(),
            user_type: newUserType
          }
        }
      });
      if (error) throw error;
      toast({
        title: "Usuário criado com sucesso!",
        description: `O usuário "${newUserName}" foi criado. Um e-mail de confirmação foi enviado.`
      });
      setNewUserName("");
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserType("colaborador_setor");
      setUserDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erro ao criar usuário",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setCreatingUser(false);
    }
  };

  // Delete user function
  const handleDeleteUser = async (user: Profile) => {
    if (!confirm(`Tem certeza de que deseja EXCLUIR PERMANENTEMENTE o usuário ${user.nome_completo}? Esta ação não pode ser desfeita e removerá todos os dados associados.`)) {
      return;
    }

    try {
      // Primeiro, remover todas as associações do usuário
      await supabase
        .from('user_setores')
        .delete()
        .eq('user_id', user.user_id);

      // Remover perfil
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', user.user_id);

      if (profileError) throw profileError;

      // Remover usuário do auth (se possível)
      try {
        await supabase.auth.admin.deleteUser(user.user_id);
      } catch (authError) {
        console.warn('Erro ao remover usuário do auth (pode já estar removido):', authError);
      }

      toast({
        title: "Usuário excluído",
        description: `${user.nome_completo} foi removido permanentemente do sistema.`,
      });
      
      fetchData();
    } catch (error: any) {
      console.error('Erro ao excluir usuário:', error);
      toast({
        title: "Erro ao excluir usuário",
        description: error.message || "Houve um problema ao excluir o usuário.",
        variant: "destructive"
      });
    }
  };

  // Componente para cartão de setor com edição
  const SetorCard = ({
    setor,
    onSetorUpdate,
    setSelectedSetorDetail
  }: {
    setor: Setor;
    onSetorUpdate: () => void;
    setSelectedSetorDetail?: (setor: Setor) => void;
  }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedName, setEditedName] = useState(setor.nome);
    const [editedDesc, setEditedDesc] = useState(setor.descricao || '');
    const {
      toast
    } = useToast();
    const handleSave = async () => {
      if (!editedName.trim()) {
        toast({
          title: "Erro",
          description: "Nome do setor não pode estar vazio.",
          variant: "destructive"
        });
        return;
      }
      try {
        const {
          error
        } = await supabase.from('setores').update({
          nome: editedName.trim(),
          descricao: editedDesc.trim()
        }).eq('id', setor.id);
        if (error) throw error;
        toast({
          title: "Setor atualizado",
          description: "Informações do setor atualizadas com sucesso."
        });
        setIsEditing(false);
        onSetorUpdate();
      } catch (error: any) {
        toast({
          title: "Erro ao atualizar",
          description: error.message,
          variant: "destructive"
        });
      }
    };
    const handleToggleActive = async () => {
      try {
        const {
          error
        } = await supabase.from('setores').update({
          ativo: !setor.ativo
        }).eq('id', setor.id);
        if (error) throw error;
        toast({
          title: setor.ativo ? "Setor desativado" : "Setor ativado",
          description: `${setor.nome} foi ${setor.ativo ? 'desativado' : 'ativado'} com sucesso.`
        });
        onSetorUpdate();
      } catch (error: any) {
        toast({
          title: "Erro ao alterar status",
          description: error.message,
          variant: "destructive"
        });
      }
    };
    return <div className={`flex ${isMobile ? 'flex-col space-y-3' : 'items-center justify-between'} p-4 border rounded-lg`}>
      <div className={`space-y-1 ${isMobile ? 'w-full' : 'flex-1'}`}>
        {isEditing ? <div className="space-y-2">
            <Input value={editedName} onChange={e => setEditedName(e.target.value)} placeholder="Nome do setor" className={isMobile ? 'w-full' : 'max-w-xs'} />
            <Input value={editedDesc} onChange={e => setEditedDesc(e.target.value)} placeholder="Descrição" className={isMobile ? 'w-full' : 'max-w-xs'} />
            <div className={`flex gap-2 ${isMobile ? 'flex-col' : ''}`}>
              <Button size="sm" onClick={handleSave} className={isMobile ? 'w-full' : ''}>
                <Save className="h-3 w-3 mr-1" />
                Salvar
              </Button>
              <Button size="sm" variant="outline" onClick={() => {
              setIsEditing(false);
              setEditedName(setor.nome);
              setEditedDesc(setor.descricao || '');
            }} className={isMobile ? 'w-full' : ''}>
                Cancelar
              </Button>
            </div>
          </div> : <>
            <p className="font-medium">{setor.nome}</p>
            <p className="text-sm text-muted-foreground">{setor.descricao}</p>
          </>}
      </div>
      <div className={`flex items-center gap-2 ${isMobile ? 'w-full justify-start flex-wrap' : ''}`}>
        {setor.ativo ? <Badge variant="outline" className="text-green-600">
            <Check className="h-3 w-3 mr-1" />
            Ativo
          </Badge> : <Badge variant="outline" className="text-red-600">
            <X className="h-3 w-3 mr-1" />
            Inativo
          </Badge>}
        <Button variant="outline" size="sm" onClick={() => setIsEditing(!isEditing)} disabled={isEditing}>
          <Edit className="h-3 w-3" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => setSelectedSetorDetail?.(setor)}>
          <Building className="h-3 w-3 mr-1" />
          {isMobile ? '' : 'Gerenciar'}
        </Button>
        <Button variant={setor.ativo ? "destructive" : "default"} size="sm" onClick={handleToggleActive}>
          {setor.ativo ? <>
              <UserX className="h-3 w-3 mr-1" />
              {isMobile ? '' : 'Desativar'}
            </> : <>
              <Check className="h-3 w-3 mr-1" />
              {isMobile ? '' : 'Ativar'}
            </>}
        </Button>
      </div>
    </div>;
  };

  // Assign user to sector
  const handleAssignUserToSetor = async () => {
    if (!selectedUser || !selectedSetor) {
      toast({
        title: "Erro",
        description: "Selecione um usuário e um setor.",
        variant: "destructive"
      });
      return;
    }
    try {
      const {
        error
      } = await supabase.from('user_setores').insert({
        user_id: selectedUser,
        setor_id: selectedSetor
      });
      if (error) {
        if (error.code === '23505') {
          toast({
            title: "Erro",
            description: "Este usuário já está atribuído a este setor.",
            variant: "destructive"
          });
          return;
        }
        throw error;
      }
      toast({
        title: "Usuário atribuído com sucesso!",
        description: "O usuário foi adicionado ao setor."
      });
      setSelectedUser("");
      setSelectedSetor("");
      setDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erro ao atribuir usuário",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Remove user from sector
  const handleRemoveUserFromSetor = async (userSetorId: string) => {
    try {
      const {
        error
      } = await supabase.from('user_setores').delete().eq('id', userSetorId);
      if (error) throw error;
      toast({
        title: "Usuário removido do setor",
        description: "A atribuição foi removida com sucesso."
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erro ao remover usuário",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  if (!isAdmin) {
    return <div className="min-h-screen bg-background">
        <div className="container mx-auto py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              🔒 Acesso negado. Esta área é restrita para administradores master.
            </AlertDescription>
          </Alert>
        </div>
      </div>;
  }
  if (loading) {
    return <div className="min-h-screen bg-background">
        <div className="container mx-auto py-8">
          <div className="text-center">Carregando...</div>
        </div>
      </div>;
  }
  return <div className="min-h-screen bg-background">
      <div className="container mx-auto py-4 sm:py-6 lg:py-8 px-2 sm:px-4 max-w-6xl">
        {!isSupabaseConfigured && <div className="mb-6">
            <SupabaseStatus />
          </div>}
        
        {/* Sistema aberto - acesso total */}
        <Alert className="mb-6">
          <Check className="h-4 w-4" />
          <AlertDescription>
            🌐 <strong>Sistema Aberto:</strong> Acesso total liberado para administração
          </AlertDescription>
        </Alert>
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Administração do Sistema</h1>
          <p className="text-muted-foreground">
            Gerencie usuários, setores e permissões do sistema SLA
          </p>
        </div>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className={`grid w-full ${isMobile ? 'grid-cols-2' : 'grid-cols-4'} ${isMobile ? 'mb-4' : ''}`}>
            <TabsTrigger value="users" className={isMobile ? 'text-xs' : ''}>Usuários</TabsTrigger>
            <TabsTrigger value="setores" className={isMobile ? 'text-xs' : ''}>Setores</TabsTrigger>
            {!isMobile && <TabsTrigger value="assignments">Atribuições</TabsTrigger>}
            {!isMobile && <TabsTrigger value="permissions">Permissões</TabsTrigger>}
          </TabsList>
          
          {/* Mobile secondary tabs */}
          {isMobile && (
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="assignments" className="text-xs">Atribuições</TabsTrigger>
              <TabsTrigger value="permissions" className="text-xs">Permissões</TabsTrigger>
            </TabsList>
          )}

          <TabsContent value="users" className="space-y-6">
            {/* Card para criar novo usuário */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Criar Novo Usuário
                </CardTitle>
                <CardDescription>
                  Adicione um novo usuário ao sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Usuário
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Criar Novo Usuário</DialogTitle>
                      <DialogDescription>
                        Preencha as informações para criar um novo usuário
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="user-name">Nome Completo</Label>
                        <Input id="user-name" value={newUserName} onChange={e => setNewUserName(e.target.value)} placeholder="Ex: João Silva" />
                      </div>
                      <div>
                        <Label htmlFor="user-email">E-mail</Label>
                        <Input id="user-email" type="email" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} placeholder="Ex: joao@empresa.com" />
                      </div>
                      <div>
                        <Label htmlFor="user-password">Senha</Label>
                        <Input id="user-password" type="password" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
                      </div>
                      <div>
                        <Label htmlFor="user-type">Tipo de Usuário</Label>
                        <Select value={newUserType} onValueChange={value => setNewUserType(value as "administrador_master" | "colaborador_setor")}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="colaborador_setor">
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                Colaborador de Setor
                              </div>
                            </SelectItem>
                            <SelectItem value="administrador_master">
                              <div className="flex items-center gap-2">
                                <Shield className="h-4 w-4" />
                                Administrador Master
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleCreateUser} className="flex-1" disabled={creatingUser}>
                          {creatingUser ? <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Criando...
                            </> : "Criar Usuário"}
                        </Button>
                        <Button variant="outline" onClick={() => setUserDialogOpen(false)}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>

            {/* Card de usuários existentes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Usuários do Sistema
                </CardTitle>
                <CardDescription>
                  Lista de todos os usuários cadastrados no sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                 <div className="space-y-4">
                   {users.map(user => <UserCard key={user.id} user={user} onUserUpdate={fetchData} />)}
                 </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="setores" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Setores
                </CardTitle>
                <CardDescription>
                  Gerencie os setores do sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Dialog open={setorDialogOpen} onOpenChange={setSetorDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Criar Setor
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Criar Novo Setor</DialogTitle>
                        <DialogDescription>
                          Preencha as informações para criar um novo setor
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="setor-name">Nome do Setor</Label>
                          <Input id="setor-name" value={newSetorName} onChange={e => setNewSetorName(e.target.value)} placeholder="Ex: Marketing" />
                        </div>
                        <div>
                          <Label htmlFor="setor-desc">Descrição</Label>
                          <Input id="setor-desc" value={newSetorDesc} onChange={e => setNewSetorDesc(e.target.value)} placeholder="Ex: Setor de Marketing e Comunicação" />
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={handleCreateSetor} className="flex-1">
                            Criar Setor
                          </Button>
                          <Button variant="outline" onClick={() => setSetorDialogOpen(false)}>
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                   {setores.map(setor => <SetorCard key={setor.id} setor={setor} onSetorUpdate={fetchData} setSelectedSetorDetail={setSelectedSetorDetail} />)}
                 </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assignments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Atribuições de Setores
                </CardTitle>
                <CardDescription>
                  Gerencie quais usuários têm acesso a quais setores
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Atribuir Usuário a Setor
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Atribuir Usuário a Setor</DialogTitle>
                        <DialogDescription>
                          Selecione um usuário e um setor para criar a atribuição
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="user-select">Usuário</Label>
                          <Select value={selectedUser} onValueChange={setSelectedUser}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um usuário" />
                            </SelectTrigger>
                            <SelectContent>
                              {users.filter(u => u.user_type === 'colaborador_setor').map(user => <SelectItem key={user.user_id} value={user.user_id}>
                                  {user.nome_completo} ({user.email})
                                </SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="setor-select">Setor</Label>
                          <Select value={selectedSetor} onValueChange={setSelectedSetor}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um setor" />
                            </SelectTrigger>
                            <SelectContent>
                               {setores.filter(s => s.ativo).map(setor => <SelectItem key={setor.id} value={setor.id}>
                                  {setor.nome}
                                </SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={handleAssignUserToSetor} className="flex-1">
                            Atribuir
                          </Button>
                          <Button variant="outline" onClick={() => setDialogOpen(false)}>
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <div className="space-y-4">
                    {userSetores.map(userSetor => <div key={userSetor.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                          <p className="font-medium">{userSetor.profile?.nome_completo}</p>
                          <p className="text-sm text-muted-foreground">{userSetor.profile?.email}</p>
                          <Badge variant="outline">{userSetor.setor?.nome}</Badge>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => handleRemoveUserFromSetor(userSetor.id)}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remover
                        </Button>
                      </div>)}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="permissions" className="space-y-6">
            <ImprovedPermissionsPanel />
          </TabsContent>

        </Tabs>

        {/* Modal de detalhes do setor */}
        {selectedSetorDetail && <Dialog open={!!selectedSetorDetail} onOpenChange={() => setSelectedSetorDetail(null)}>
            <DialogContent className="max-w-[95vw] sm:max-w-2xl lg:max-w-4xl max-h-[80vh] overflow-y-auto">
              <SetorDetailPanel setor={selectedSetorDetail} onClose={() => setSelectedSetorDetail(null)} />
            </DialogContent>
          </Dialog>}

        {/* Admin User Editor Modal */}
        <AdminUserEditor 
          open={adminUserEditorOpen}
          onOpenChange={setAdminUserEditorOpen}
          userId={selectedUserForEdit}
          onUserUpdated={fetchData}
        />
      </div>
    </div>;
};
export default Admin;