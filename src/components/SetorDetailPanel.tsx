import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  Building2, 
  Users, 
  UserPlus, 
  UserMinus, 
  Star,
  Crown,
  AlertCircle,
  Loader2
} from "lucide-react";

interface Setor {
  id: string;
  nome: string;
  descricao: string;
  ativo: boolean;
}

interface Profile {
  id: string;
  user_id: string;
  email: string;
  nome_completo: string;
  role: 'super_admin' | 'operador' | 'viewer';
}

interface UserSetor {
  id: string;
  user_id: string;
  setor_id: string;
  is_leader: boolean;
  profile: Profile;
}

interface SetorDetailPanelProps {
  setor: Setor;
  onClose: () => void;
}

export default function SetorDetailPanel({ setor, onClose }: SetorDetailPanelProps) {
  const [userSetores, setUserSetores] = useState<UserSetor[]>([]);
  const [availableUsers, setAvailableUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  
  const { toast } = useToast();
  const { isSuperAdmin } = useAuth();

  const fetchData = async () => {
    try {
      const [userSetoresResponse, profilesResponse] = await Promise.all([
        supabase
          .from('user_setores')
          .select(`
            id,
            user_id,
            setor_id,
            is_leader,
            profiles:user_id (id, user_id, email, nome_completo, role)
          `)
          .eq('setor_id', setor.id),
        supabase
          .from('profiles')
          .select('*')
          .eq('ativo', true)
          .order('nome_completo')
      ]);

      if (userSetoresResponse.error) throw userSetoresResponse.error;
      if (profilesResponse.error) throw profilesResponse.error;

      const transformedUserSetores = (userSetoresResponse.data || [])
        .map((item: any) => ({
          id: item.id,
          user_id: item.user_id,
          setor_id: item.setor_id,
          is_leader: item.is_leader || false,
          profile: item.profiles
        }))
        .filter(item => item.profile !== null); // Filtrar apenas usuários com perfil válido

      setUserSetores(transformedUserSetores);
      
      // Filtrar usuários que não estão no setor
      const usersInSetor = transformedUserSetores.map(us => us.user_id);
      const availableProfiles = (profilesResponse.data || []).filter(
        profile => !usersInSetor.includes(profile.user_id)
      );
      
      setAvailableUsers(availableProfiles);
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
    if (isSuperAdmin) {
      fetchData();
    }
  }, [setor.id, isSuperAdmin]);

  const handleAddUser = async () => {
    if (!selectedUserId) {
      toast({
        title: "Erro",
        description: "Selecione um usuário para adicionar.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('user_setores')
        .insert({
          user_id: selectedUserId,
          setor_id: setor.id,
          is_leader: false
        });

      if (error) throw error;

      toast({
        title: "Usuário adicionado!",
        description: "O usuário foi adicionado ao setor com sucesso.",
      });

      setSelectedUserId("");
      setDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erro ao adicionar usuário",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRemoveUser = async (userSetorId: string, userName: string) => {
    if (!confirm(`Tem certeza que deseja remover ${userName} do setor ${setor.nome}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('user_setores')
        .delete()
        .eq('id', userSetorId);

      if (error) throw error;

      toast({
        title: "Usuário removido!",
        description: `${userName} foi removido do setor.`,
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

  const handleToggleLeader = async (userSetorId: string, currentIsLeader: boolean, userName: string) => {
    try {
      if (!currentIsLeader) {
        // Remover liderança de outros usuários primeiro
        await supabase
          .from('user_setores')
          .update({ is_leader: false })
          .eq('setor_id', setor.id);
      }

      const { error } = await supabase
        .from('user_setores')
        .update({ is_leader: !currentIsLeader })
        .eq('id', userSetorId);

      if (error) throw error;

      toast({
        title: currentIsLeader ? "Liderança removida!" : "Novo líder definido!",
        description: currentIsLeader 
          ? `${userName} não é mais líder do setor.`
          : `${userName} agora é líder do setor ${setor.nome}.`,
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: "Erro ao alterar liderança",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (!isSuperAdmin) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Apenas Super Administradores podem gerenciar setores.
        </AlertDescription>
      </Alert>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const currentLeader = userSetores.find(us => us.is_leader);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Building2 className="h-8 w-8" />
            {setor.nome}
          </h2>
          <p className="text-muted-foreground mt-2">
            {setor.descricao || 'Gerencie os usuários e configurações deste setor'}
          </p>
        </div>
        <Button variant="outline" onClick={onClose}>
          Voltar
        </Button>
      </div>

      {/* Líder atual */}
      {currentLeader && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-500" />
              Líder do Setor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{currentLeader.profile.nome_completo}</p>
                <p className="text-sm text-muted-foreground">{currentLeader.profile.email}</p>
                <Badge variant="secondary" className="mt-1">
                  {currentLeader.profile.role === 'super_admin' ? 'Super Admin' : 
                   currentLeader.profile.role === 'operador' ? 'Operador' : 'Viewer'}
                </Badge>
              </div>
              <Button
                variant="outline"
                onClick={() => handleToggleLeader(currentLeader.id, true, currentLeader.profile.nome_completo)}
              >
                Remover Liderança
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Usuários do setor */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Usuários do Setor ({userSetores.length})
            </CardTitle>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Adicionar Usuário
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Usuário ao Setor</DialogTitle>
                  <DialogDescription>
                    Selecione um usuário para adicionar ao setor {setor.nome}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar usuário" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableUsers.map(user => (
                        <SelectItem key={user.id} value={user.user_id}>
                          {user.nome_completo} - {user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Button onClick={handleAddUser}>
                      Adicionar
                    </Button>
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {userSetores.map(userSetor => {
              // Proteção adicional caso o profile seja null
              if (!userSetor.profile) {
                return null;
              }
              
              return (
                <div key={userSetor.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {userSetor.is_leader && (
                      <Star className="h-4 w-4 text-yellow-500" />
                    )}
                    <div>
                      <p className="font-medium">{userSetor.profile.nome_completo}</p>
                      <p className="text-sm text-muted-foreground">{userSetor.profile.email}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="secondary">
                          {userSetor.profile.role === 'super_admin' ? 'Super Admin' : 
                           userSetor.profile.role === 'operador' ? 'Operador' : 'Viewer'}
                        </Badge>
                        {userSetor.is_leader && (
                          <Badge variant="default">
                            ⭐ Líder
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!userSetor.is_leader && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleLeader(userSetor.id, false, userSetor.profile.nome_completo)}
                      >
                        <Star className="h-3 w-3 mr-1" />
                        Tornar Líder
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRemoveUser(userSetor.id, userSetor.profile.nome_completo)}
                    >
                      <UserMinus className="h-3 w-3 mr-1" />
                      Remover
                    </Button>
                  </div>
                </div>
              );
            })}
            
            {userSetores.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum usuário neste setor</p>
                <p className="text-sm">Clique em "Adicionar Usuário" para começar</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}