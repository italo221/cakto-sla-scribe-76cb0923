import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  Building2, 
  Shield, 
  AlertCircle,
  Loader2,
  Settings,
  Users
} from "lucide-react";

interface Setor {
  id: string;
  nome: string;
  descricao: string;
  ativo: boolean;
}

interface SetorPermissao {
  id: string;
  setor_id: string;
  pode_criar_ticket: boolean;
  pode_editar_ticket: boolean;
  pode_excluir_ticket: boolean;
  pode_comentar: boolean;
  pode_resolver_ticket: boolean;
}

export default function SetorPermissionsPanel() {
  const [setores, setSetores] = useState<Setor[]>([]);
  const [permissoes, setPermissoes] = useState<SetorPermissao[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { toast } = useToast();
  const { isSuperAdmin } = useAuth();

  const fetchData = async () => {
    try {
      const [setoresResponse, permissoesResponse] = await Promise.all([
        supabase.from('setores').select('*').eq('ativo', true).order('nome'),
        supabase.from('setor_permissoes').select('*')
      ]);

      if (setoresResponse.error) throw setoresResponse.error;
      if (permissoesResponse.error) throw permissoesResponse.error;

      setSetores(setoresResponse.data || []);
      setPermissoes(permissoesResponse.data || []);
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
  }, [isSuperAdmin]);

  const handlePermissionChange = async (setorId: string, permissao: string, valor: boolean) => {
    const setor = setores.find(s => s.id === setorId);
    if (!setor) return;

    try {
      // Verificar se já existe permissão para o setor
      const existingPermission = permissoes.find(p => p.setor_id === setorId);
      
      if (existingPermission) {
        const { error } = await supabase
          .from('setor_permissoes')
          .update({ [permissao]: valor })
          .eq('setor_id', setorId);

        if (error) throw error;
      } else {
        // Criar nova permissão
        const { error } = await supabase
          .from('setor_permissoes')
          .insert({
            setor_id: setorId,
            pode_criar_ticket: permissao === 'pode_criar_ticket' ? valor : false,
            pode_editar_ticket: permissao === 'pode_editar_ticket' ? valor : false,
            pode_excluir_ticket: permissao === 'pode_excluir_ticket' ? valor : false,
            pode_comentar: permissao === 'pode_comentar' ? valor : false,
            pode_resolver_ticket: permissao === 'pode_resolver_ticket' ? valor : false,
          });

        if (error) throw error;
      }

      toast({
        title: "Permissão atualizada!",
        description: `${valor ? 'Habilitada' : 'Desabilitada'} para ${setor.nome}.`,
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar permissão",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getPermissaoForSetor = (setorId: string) => {
    return permissoes.find(p => p.setor_id === setorId);
  };

  if (!isSuperAdmin) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Apenas Super Administradores podem acessar as permissões por setor.
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

  const permissionsConfig = [
    {
      key: 'pode_criar_ticket',
      label: 'Criar Tickets',
      description: 'Permite que usuários do setor criem novos tickets'
    },
    {
      key: 'pode_editar_ticket',
      label: 'Editar Tickets',
      description: 'Permite que usuários do setor editem tickets existentes'
    },
    {
      key: 'pode_excluir_ticket',
      label: 'Excluir Tickets',
      description: 'Permite que usuários do setor excluam tickets'
    },
    {
      key: 'pode_comentar',
      label: 'Comentar em Tickets',
      description: 'Permite que usuários do setor adicionem comentários'
    },
    {
      key: 'pode_resolver_ticket',
      label: 'Resolver Tickets',
      description: 'Permite que usuários do setor marquem tickets como resolvidos'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Permissões por Setor</h2>
        <p className="text-muted-foreground mt-2">
          Configure as permissões específicas para cada setor
        </p>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
              <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <span>Matriz de Permissões por Setor</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Permissão</th>
                  {setores.map(setor => (
                    <th key={setor.id} className="text-center p-3 font-medium min-w-[150px]">
                      <div className="space-y-1">
                        <div className="font-semibold">{setor.nome}</div>
                        {setor.descricao && (
                          <div className="text-xs text-muted-foreground">
                            {setor.descricao}
                          </div>
                        )}
                        <Badge variant="secondary" className="text-xs">
                          <Users className="h-3 w-3 mr-1" />
                          Setor
                        </Badge>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {permissionsConfig.map(permission => (
                  <tr key={permission.key} className="border-b hover:bg-muted/50">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <Settings className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{permission.label}</div>
                          <div className="text-sm text-muted-foreground">
                            {permission.description}
                          </div>
                        </div>
                      </div>
                    </td>
                    {setores.map(setor => {
                      const setorPermissions = getPermissaoForSetor(setor.id);
                      const isEnabled = Boolean(setorPermissions?.[permission.key as keyof SetorPermissao]) || false;
                      
                      return (
                        <td key={setor.id} className="p-3 text-center">
                          <Switch
                            checked={isEnabled}
                            onCheckedChange={(value) => 
                              handlePermissionChange(setor.id, permission.key, value)
                            }
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <strong>Importante:</strong> As permissões por setor complementam as permissões por cargo. 
          Um usuário precisa ter permissão tanto no seu cargo quanto no setor para realizar uma ação.
        </AlertDescription>
      </Alert>
    </div>
  );
}