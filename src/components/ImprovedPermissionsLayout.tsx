import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  Plus, Edit, Trash2, Shield, MessageSquare, Ticket, UserCheck,
  HelpCircle, Loader2, AlertCircle
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Cargo {
  id: string;
  nome: string;
  descricao: string;
  ativo: boolean;
}

interface PermissaoCargo {
  id: string;
  cargo_id: string;
  pode_criar_ticket: boolean;
  pode_editar_ticket: boolean;
  pode_excluir_ticket: boolean;
  pode_comentar: boolean;
  pode_editar_comentario: boolean;
  pode_excluir_comentario: boolean;
  pode_editar_comentario_proprio: boolean;
}

const permissionsConfig = {
  tickets: {
    icon: Ticket,
    color: "hsl(221 83% 53%)",
    permissions: [
      { key: 'pode_criar_ticket', label: 'Criar Tickets', icon: Plus },
      { key: 'pode_editar_ticket', label: 'Editar Tickets', icon: Edit },
      { key: 'pode_excluir_ticket', label: 'Excluir Tickets', icon: Trash2 }
    ]
  },
  comments: {
    icon: MessageSquare,
    color: "hsl(142 76% 36%)",
    permissions: [
      { key: 'pode_comentar', label: 'Comentar', icon: MessageSquare },
      { key: 'pode_editar_comentario', label: 'Editar Qualquer Comentário', icon: Edit },
      { key: 'pode_excluir_comentario', label: 'Excluir Qualquer Comentário', icon: Trash2 },
      { key: 'pode_editar_comentario_proprio', label: 'Editar Próprios Comentários', icon: UserCheck }
    ]
  }
};

export default function ImprovedPermissionsLayout() {
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [permissoes, setPermissoes] = useState<PermissaoCargo[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { toast } = useToast();
  const { user, isSuperAdmin } = useAuth();

  const fetchData = async () => {
    try {
      const [cargosResponse, permissoesResponse] = await Promise.all([
        supabase.from('cargos').select('*').eq('ativo', true).order('nome'),
        supabase.from('permissoes_cargo').select('*')
      ]);

      if (cargosResponse.error) throw cargosResponse.error;
      if (permissoesResponse.error) throw permissoesResponse.error;

      setCargos(cargosResponse.data || []);
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

  const logAction = async (acao: string, cargoId: string, cargoNome: string, alteracoes?: any) => {
    if (!user) return;
    
    try {
      await supabase.from('logs_permissoes').insert({
        usuario_id: user.id,
        usuario_nome: user.email || 'Usuário',
        cargo_alterado_id: cargoId,
        cargo_alterado_nome: cargoNome,
        acao,
        alteracoes
      });
    } catch (error) {
      console.error('Erro ao registrar log:', error);
    }
  };

  const handlePermissionChange = async (cargoId: string, permissao: string, valor: boolean) => {
    const cargo = cargos.find(c => c.id === cargoId);
    if (!cargo) return;

    try {
      const { error } = await supabase
        .from('permissoes_cargo')
        .update({ [permissao]: valor })
        .eq('cargo_id', cargoId);

      if (error) throw error;

      await logAction('alterou_permissoes', cargoId, cargo.nome, {
        permissao,
        valor_anterior: !valor,
        valor_novo: valor
      });

      toast({
        title: "Permissão atualizada!",
        description: `${valor ? 'Habilitada' : 'Desabilitada'} para ${cargo.nome}.`,
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

  const handleEditCargo = async (cargo: Cargo) => {
    // Implementar navegação para edição
    console.log('Editar cargo:', cargo);
  };

  const handleDeleteCargo = async (cargo: Cargo) => {
    if (!confirm(`Tem certeza que deseja excluir o cargo "${cargo.nome}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('cargos')
        .update({ ativo: false })
        .eq('id', cargo.id);

      if (error) throw error;

      await logAction('excluiu_cargo', cargo.id, cargo.nome);

      toast({
        title: "Cargo excluído!",
        description: `O cargo "${cargo.nome}" foi excluído.`,
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir cargo",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getPermissaoForCargo = (cargoId: string) => {
    return permissoes.find(p => p.cargo_id === cargoId);
  };

  if (!isSuperAdmin) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Apenas Super Administradores podem acessar o painel de permissões.
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

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Permissões por Cargo</h2>
            <p className="text-muted-foreground mt-2">
              Layout melhorado com botões de edição/exclusão organizados
            </p>
          </div>
        </div>

        {/* Matriz de Permissões com layout melhorado */}
        <div className="grid gap-6">
          {Object.entries(permissionsConfig).map(([categoryKey, category]) => {
            const CategoryIcon = category.icon;
            return (
              <Card key={categoryKey} className="overflow-hidden">
                <CardHeader className="pb-3" style={{ borderLeft: `4px solid ${category.color}` }}>
                  <CardTitle className="flex items-center gap-3">
                    <div 
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: `${category.color}20` }}
                    >
                      <CategoryIcon 
                        className="h-5 w-5" 
                        style={{ color: category.color }}
                      />
                    </div>
                    <span>
                      {categoryKey === 'tickets' ? 'Gestão de Tickets' : 'Gestão de Comentários'}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Cabeçalho dos cargos com botões de ação */}
                    <div className="grid gap-4" style={{ gridTemplateColumns: '300px ' + 'repeat(' + cargos.length + ', 1fr)' }}>
                      <div></div> {/* Espaço para as permissões */}
                      {cargos.map(cargo => (
                        <div key={cargo.id} className="text-center space-y-2">
                          <div className="font-semibold flex items-center justify-center gap-2">
                            {cargo.nome}
                            <div className="flex gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditCargo(cargo)}
                                    className="h-6 w-6 p-0"
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Editar cargo</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteCargo(cargo)}
                                    className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Excluir cargo</TooltipContent>
                              </Tooltip>
                            </div>
                          </div>
                          {cargo.descricao && (
                            <div className="text-xs text-muted-foreground">
                              {cargo.descricao}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Permissões */}
                    <div className="space-y-3">
                      {category.permissions.map(permission => {
                        const PermissionIcon = permission.icon;
                        return (
                          <div key={permission.key} className="grid gap-4" style={{ gridTemplateColumns: '300px ' + 'repeat(' + cargos.length + ', 1fr)' }}>
                            <div className="flex items-center gap-3">
                              <PermissionIcon className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="font-medium">{permission.label}</div>
                              </div>
                            </div>
                            {cargos.map(cargo => {
                              const cargoPermissions = getPermissaoForCargo(cargo.id);
                              const isEnabled = Boolean(cargoPermissions?.[permission.key as keyof PermissaoCargo]) || false;
                              
                              return (
                                <div key={cargo.id} className="flex items-center justify-center">
                                  <Switch
                                    checked={isEnabled}
                                    onCheckedChange={(value) => 
                                      handlePermissionChange(cargo.id, permission.key, value)
                                    }
                                  />
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}