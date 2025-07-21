import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Users, 
  Building2, 
  UserPlus, 
  Building, 
  Shield, 
  Trash2, 
  Edit,
  Check,
  X,
  AlertCircle,
  Plus
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import Navigation from "@/components/Navigation";

interface Profile {
  id: string;
  user_id: string;
  email: string;
  nome_completo: string;
  user_type: 'administrador_master' | 'colaborador_setor';
  ativo: boolean;
  created_at: string;
}

interface Setor {
  id: string;
  nome: string;
  descricao: string;
  ativo: boolean;
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
  
  // Form states
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedSetor, setSelectedSetor] = useState("");
  const [newSetorName, setNewSetorName] = useState("");
  const [newSetorDesc, setNewSetorDesc] = useState("");
  
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  // Fetch data
  const fetchData = async () => {
    try {
      const [usersResponse, setoresResponse, userSetoresResponse] = await Promise.all([
        supabase.from('profiles').select('*').order('nome_completo'),
        supabase.from('setores').select('*').eq('ativo', true).order('nome'),
        supabase
          .from('user_setores')
          .select(`
            id,
            user_id,
            setor_id,
            setores:setor_id (id, nome, descricao, ativo),
            profiles:user_id (nome_completo, email)
          `)
      ]);

      if (usersResponse.error) throw usersResponse.error;
      if (setoresResponse.error) throw setoresResponse.error;
      if (userSetoresResponse.error) throw userSetoresResponse.error;

      setUsers(usersResponse.data || []);
      setSetores(setoresResponse.data || []);
      
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
        variant: "destructive",
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
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('setores')
        .insert({
          nome: newSetorName.trim(),
          descricao: newSetorDesc.trim(),
        });

      if (error) throw error;

      toast({
        title: "Setor criado com sucesso!",
        description: `O setor "${newSetorName}" foi criado.`,
      });

      setNewSetorName("");
      setNewSetorDesc("");
      setSetorDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erro ao criar setor",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Assign user to sector
  const handleAssignUserToSetor = async () => {
    if (!selectedUser || !selectedSetor) {
      toast({
        title: "Erro",
        description: "Selecione um usuário e um setor.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('user_setores')
        .insert({
          user_id: selectedUser,
          setor_id: selectedSetor,
        });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: "Erro",
            description: "Este usuário já está atribuído a este setor.",
            variant: "destructive",
          });
          return;
        }
        throw error;
      }

      toast({
        title: "Usuário atribuído com sucesso!",
        description: "O usuário foi adicionado ao setor.",
      });

      setSelectedUser("");
      setSelectedSetor("");
      setDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erro ao atribuir usuário",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Remove user from sector
  const handleRemoveUserFromSetor = async (userSetorId: string) => {
    try {
      const { error } = await supabase
        .from('user_setores')
        .delete()
        .eq('id', userSetorId);

      if (error) throw error;

      toast({
        title: "Usuário removido do setor",
        description: "A atribuição foi removida com sucesso.",
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: "Erro ao remover usuário",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              🔒 Acesso negado. Esta área é restrita para administradores master.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto py-8">
          <div className="text-center">Carregando...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Administração do Sistema</h1>
          <p className="text-muted-foreground">
            Gerencie usuários, setores e permissões do sistema SLA
          </p>
        </div>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="users">Usuários</TabsTrigger>
            <TabsTrigger value="setores">Setores</TabsTrigger>
            <TabsTrigger value="assignments">Atribuições</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-6">
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
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <p className="font-medium">{user.nome_completo}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {user.user_type === 'administrador_master' ? (
                          <Badge variant="destructive">
                            <Shield className="h-3 w-3 mr-1" />
                            Admin Master
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <Users className="h-3 w-3 mr-1" />
                            Colaborador
                          </Badge>
                        )}
                        {user.ativo ? (
                          <Badge variant="outline" className="text-green-600">
                            <Check className="h-3 w-3 mr-1" />
                            Ativo
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-red-600">
                            <X className="h-3 w-3 mr-1" />
                            Inativo
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
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
                          <Input
                            id="setor-name"
                            value={newSetorName}
                            onChange={(e) => setNewSetorName(e.target.value)}
                            placeholder="Ex: Marketing"
                          />
                        </div>
                        <div>
                          <Label htmlFor="setor-desc">Descrição</Label>
                          <Input
                            id="setor-desc"
                            value={newSetorDesc}
                            onChange={(e) => setNewSetorDesc(e.target.value)}
                            placeholder="Ex: Setor de Marketing e Comunicação"
                          />
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

                  {setores.map((setor) => (
                    <div key={setor.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <p className="font-medium">{setor.nome}</p>
                        <p className="text-sm text-muted-foreground">{setor.descricao}</p>
                      </div>
                      <Badge variant="outline">
                        <Building className="h-3 w-3 mr-1" />
                        Ativo
                      </Badge>
                    </div>
                  ))}
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
                              {users.filter(u => u.user_type === 'colaborador_setor').map((user) => (
                                <SelectItem key={user.user_id} value={user.user_id}>
                                  {user.nome_completo} ({user.email})
                                </SelectItem>
                              ))}
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
                              {setores.map((setor) => (
                                <SelectItem key={setor.id} value={setor.id}>
                                  {setor.nome}
                                </SelectItem>
                              ))}
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
                    {userSetores.map((userSetor) => (
                      <div key={userSetor.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                          <p className="font-medium">{userSetor.profile?.nome_completo}</p>
                          <p className="text-sm text-muted-foreground">{userSetor.profile?.email}</p>
                          <Badge variant="outline">{userSetor.setor?.nome}</Badge>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveUserFromSetor(userSetor.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remover
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;