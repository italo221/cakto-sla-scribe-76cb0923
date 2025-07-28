import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  Plus, Edit, Trash2, Copy, Download, FileText, Filter, Calendar as CalendarIcon,
  Shield, MessageSquare, Settings, Users, Info, HelpCircle, AlertCircle,
  CheckCircle, X, Search, FileX, FileSpreadsheet, Ticket, Eye, UserCheck,
  MoreHorizontal, Loader2
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as XLSX from 'xlsx';

interface Cargo {
  id: string;
  nome: string;
  descricao: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
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
  created_at: string;
  updated_at: string;
}

interface LogPermissao {
  id: string;
  usuario_nome: string;
  cargo_alterado_nome: string;
  acao: string;
  alteracoes: any;
  criado_em: string;
}

const permissionsConfig = {
  tickets: {
    icon: Ticket,
    color: "hsl(221 83% 53%)",
    permissions: [
      {
        key: 'pode_criar_ticket',
        label: 'Criar Tickets',
        description: 'Permite criar novos tickets no sistema',
        icon: Plus
      },
      {
        key: 'pode_editar_ticket',
        label: 'Editar Tickets',
        description: 'Permite editar tickets existentes',
        icon: Edit
      },
      {
        key: 'pode_excluir_ticket',
        label: 'Excluir Tickets',
        description: 'Permite excluir tickets permanentemente',
        icon: Trash2
      }
    ]
  },
  comments: {
    icon: MessageSquare,
    color: "hsl(142 76% 36%)",
    permissions: [
      {
        key: 'pode_comentar',
        label: 'Comentar',
        description: 'Permite adicionar comentários aos tickets',
        icon: MessageSquare
      },
      {
        key: 'pode_editar_comentario',
        label: 'Editar Qualquer Comentário',
        description: 'Permite editar comentários de outros usuários',
        icon: Edit
      },
      {
        key: 'pode_excluir_comentario',
        label: 'Excluir Qualquer Comentário',
        description: 'Permite excluir comentários de outros usuários',
        icon: Trash2
      },
      {
        key: 'pode_editar_comentario_proprio',
        label: 'Editar Próprios Comentários',
        description: 'Permite editar apenas os próprios comentários',
        icon: UserCheck
      }
    ]
  }
};

export default function ImprovedPermissionsPanel() {
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [permissoes, setPermissoes] = useState<PermissaoCargo[]>([]);
  const [logs, setLogs] = useState<LogPermissao[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Dialog states
  const [cargoDialogOpen, setCargoDialogOpen] = useState(false);
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
  const [editingCargo, setEditingCargo] = useState<Cargo | null>(null);
  
  // Form states
  const [newCargoNome, setNewCargoNome] = useState("");
  const [newCargoDesc, setNewCargoDesc] = useState("");
  const [sourceCargoId, setSourceCargoId] = useState("");
  const [targetCargoId, setTargetCargoId] = useState("");
  
  // Filter states for logs
  const [filterUsuario, setFilterUsuario] = useState("");
  const [filterCargo, setFilterCargo] = useState("");
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  
  const { toast } = useToast();
  const { user, isSuperAdmin } = useAuth();

  const fetchData = async () => {
    try {
      const [cargosResponse, permissoesResponse, logsResponse] = await Promise.all([
        supabase.from('cargos').select('*').eq('ativo', true).order('nome'),
        supabase.from('permissoes_cargo').select('*'),
        supabase.from('logs_permissoes').select('*').order('criado_em', { ascending: false }).limit(100)
      ]);

      if (cargosResponse.error) throw cargosResponse.error;
      if (permissoesResponse.error) throw permissoesResponse.error;
      if (logsResponse.error) throw logsResponse.error;

      setCargos(cargosResponse.data || []);
      setPermissoes(permissoesResponse.data || []);
      setLogs(logsResponse.data || []);
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

  const handleEditCargo = async () => {
    if (!editingCargo || !newCargoNome.trim()) {
      toast({
        title: "Erro",
        description: "Nome do cargo é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('cargos')
        .update({
          nome: newCargoNome.trim(),
          descricao: newCargoDesc.trim(),
        })
        .eq('id', editingCargo.id);

      if (error) throw error;

      await logAction('editou_cargo', editingCargo.id, newCargoNome.trim());

      toast({
        title: "Cargo atualizado!",
        description: `O cargo "${newCargoNome}" foi atualizado.`,
      });

      setNewCargoNome("");
      setNewCargoDesc("");
      setEditingCargo(null);
      setCargoDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar cargo",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
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

  const handleCreateCargo = async () => {
    if (!newCargoNome.trim()) {
      toast({
        title: "Erro",
        description: "Nome do cargo é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { data: cargoData, error: cargoError } = await supabase
        .from('cargos')
        .insert({
          nome: newCargoNome.trim(),
          descricao: newCargoDesc.trim(),
        })
        .select()
        .single();

      if (cargoError) throw cargoError;

      // Criar permissões padrão
      const { error: permissaoError } = await supabase
        .from('permissoes_cargo')
        .insert({
          cargo_id: cargoData.id,
          pode_criar_ticket: false,
          pode_editar_ticket: false,
          pode_excluir_ticket: false,
          pode_comentar: false,
          pode_editar_comentario: false,
          pode_excluir_comentario: false,
          pode_editar_comentario_proprio: true,
        });

      if (permissaoError) throw permissaoError;

      await logAction('criou_cargo', cargoData.id, cargoData.nome);

      toast({
        title: "Cargo criado com sucesso!",
        description: `O cargo "${newCargoNome}" foi criado.`,
      });

      setNewCargoNome("");
      setNewCargoDesc("");
      setCargoDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erro ao criar cargo",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleClonePermissions = async () => {
    if (!sourceCargoId || !targetCargoId) {
      toast({
        title: "Erro",
        description: "Selecione os cargos de origem e destino.",
        variant: "destructive",
      });
      return;
    }

    const sourceCargo = cargos.find(c => c.id === sourceCargoId);
    const targetCargo = cargos.find(c => c.id === targetCargoId);
    if (!sourceCargo || !targetCargo) return;

    setSaving(true);
    try {
      const sourcePermissions = permissoes.find(p => p.cargo_id === sourceCargoId);
      if (!sourcePermissions) throw new Error("Permissões de origem não encontradas");

      const { error } = await supabase
        .from('permissoes_cargo')
        .update({
          pode_criar_ticket: sourcePermissions.pode_criar_ticket,
          pode_editar_ticket: sourcePermissions.pode_editar_ticket,
          pode_excluir_ticket: sourcePermissions.pode_excluir_ticket,
          pode_comentar: sourcePermissions.pode_comentar,
          pode_editar_comentario: sourcePermissions.pode_editar_comentario,
          pode_excluir_comentario: sourcePermissions.pode_excluir_comentario,
          pode_editar_comentario_proprio: sourcePermissions.pode_editar_comentario_proprio,
        })
        .eq('cargo_id', targetCargoId);

      if (error) throw error;

      await logAction('clonou_permissoes', targetCargoId, targetCargo.nome, {
        cargo_origem: sourceCargo.nome,
        permissoes_clonadas: sourcePermissions
      });

      toast({
        title: "Permissões clonadas!",
        description: `Permissões de "${sourceCargo.nome}" foram copiadas para "${targetCargo.nome}".`,
      });

      setSourceCargoId("");
      setTargetCargoId("");
      setCloneDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erro ao clonar permissões",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const exportToExcel = (format: 'xlsx' | 'csv') => {
    const filteredLogs = getFilteredLogs();
    const exportData = filteredLogs.map(log => ({
      'Usuário': log.usuario_nome,
      'Cargo Alterado': log.cargo_alterado_nome,
      'Ação': log.acao,
      'Alterações': JSON.stringify(log.alteracoes),
      'Data/Hora': format === 'xlsx' ? new Date(log.criado_em) : new Date(log.criado_em).toLocaleString('pt-BR')
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Logs de Permissões");
    const fileName = `logs_permissoes_${new Date().toISOString().split('T')[0]}.${format}`;
    XLSX.writeFile(wb, fileName);
    
    toast({
      title: "Arquivo exportado!",
      description: `Logs exportados para ${fileName}`,
    });
  };

  const getFilteredLogs = () => {
    return logs.filter(log => {
      const matchUsuario = !filterUsuario || log.usuario_nome.toLowerCase().includes(filterUsuario.toLowerCase());
      const matchCargo = !filterCargo || log.cargo_alterado_nome.toLowerCase().includes(filterCargo.toLowerCase());
      const logDate = new Date(log.criado_em);
      const matchDateFrom = !dateFrom || logDate >= dateFrom;
      const matchDateTo = !dateTo || logDate <= dateTo;
      
      return matchUsuario && matchCargo && matchDateFrom && matchDateTo;
    });
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
        {/* Header com ações */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Permissões por Cargo</h2>
            <p className="text-muted-foreground mt-2">
              Controle granular de permissões com auditoria completa
            </p>
          </div>
          <div className="flex gap-2">
            <Dialog open={cargoDialogOpen} onOpenChange={setCargoDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingCargo(null);
                  setNewCargoNome("");
                  setNewCargoDesc("");
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Cargo
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingCargo ? 'Editar Cargo' : 'Criar Novo Cargo'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="nome">Nome do Cargo</Label>
                    <Input
                      id="nome"
                      value={newCargoNome}
                      onChange={(e) => setNewCargoNome(e.target.value)}
                      placeholder="Ex: Analista, Supervisor, Gerente..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="descricao">Descrição</Label>
                    <Textarea
                      id="descricao"
                      value={newCargoDesc}
                      onChange={(e) => setNewCargoDesc(e.target.value)}
                      placeholder="Descrição detalhada do cargo e suas responsabilidades"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={editingCargo ? handleEditCargo : handleCreateCargo} disabled={saving}>
                      {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      {editingCargo ? 'Atualizar' : 'Criar'}
                    </Button>
                    <Button variant="outline" onClick={() => {
                      setCargoDialogOpen(false);
                      setEditingCargo(null);
                      setNewCargoNome("");
                      setNewCargoDesc("");
                    }}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={cloneDialogOpen} onOpenChange={setCloneDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Copy className="h-4 w-4 mr-2" />
                  Clonar Permissões
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Clonar Permissões</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Cargo de Origem</Label>
                    <Select value={sourceCargoId} onValueChange={setSourceCargoId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar cargo origem" />
                      </SelectTrigger>
                      <SelectContent>
                        {cargos.map(cargo => (
                          <SelectItem key={cargo.id} value={cargo.id}>
                            {cargo.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Cargo de Destino</Label>
                    <Select value={targetCargoId} onValueChange={setTargetCargoId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar cargo destino" />
                      </SelectTrigger>
                      <SelectContent>
                        {cargos.filter(c => c.id !== sourceCargoId).map(cargo => (
                          <SelectItem key={cargo.id} value={cargo.id}>
                            {cargo.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleClonePermissions} disabled={saving}>
                      {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Clonar
                    </Button>
                    <Button variant="outline" onClick={() => setCloneDialogOpen(false)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Tabs defaultValue="permissions" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="permissions" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Permissões
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Logs de Auditoria
            </TabsTrigger>
          </TabsList>

          <TabsContent value="permissions" className="space-y-6">
            {/* Matriz de Permissões */}
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
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left p-3 font-medium">Permissão</th>
                              {cargos.map(cargo => (
                                <th key={cargo.id} className="text-center p-3 font-medium min-w-[120px]">
                                  <div className="space-y-1">
                                    <div className="font-semibold">{cargo.nome}</div>
                                    {cargo.descricao && (
                                      <div className="text-xs text-muted-foreground">
                                        {cargo.descricao}
                                      </div>
                                    )}
                                  </div>
                                </th>
                              ))}
                            </tr>
                          </thead>
                           <tbody>
                            {category.permissions.map(permission => {
                              const PermissionIcon = permission.icon;
                              return (
                                <tr key={permission.key} className="border-b hover:bg-muted/50">
                                  <td className="p-3">
                                    <div className="flex items-center gap-3">
                                      <PermissionIcon className="h-4 w-4 text-muted-foreground" />
                                      <div>
                                        <div className="font-medium">{permission.label}</div>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <div className="text-sm text-muted-foreground cursor-help flex items-center gap-1">
                                              {permission.description}
                                              <HelpCircle className="h-3 w-3" />
                                            </div>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p className="max-w-xs">{permission.description}</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </div>
                                    </div>
                                  </td>
                                  {cargos.map(cargo => {
                                    const cargoPermissions = getPermissaoForCargo(cargo.id);
                                    const isEnabled = Boolean(cargoPermissions?.[permission.key as keyof PermissaoCargo]) || false;
                                    
                                    return (
                                      <td key={cargo.id} className="p-3 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                          <Switch
                                            checked={isEnabled}
                                            onCheckedChange={(value) => 
                                              handlePermissionChange(cargo.id, permission.key, value)
                                            }
                                          />
                                          <div className="flex gap-1">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => {
                                                setEditingCargo(cargo);
                                                setNewCargoNome(cargo.nome);
                                                setNewCargoDesc(cargo.descricao);
                                                setCargoDialogOpen(true);
                                              }}
                                            >
                                              <Edit className="h-3 w-3" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => handleDeleteCargo(cargo)}
                                            >
                                              <Trash2 className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        </div>
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="logs" className="space-y-6">
            {/* Filtros de Logs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filtros de Auditoria
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="filterUsuario">Usuário</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="filterUsuario"
                        placeholder="Filtrar por usuário..."
                        value={filterUsuario}
                        onChange={(e) => setFilterUsuario(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="filterCargo">Cargo</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="filterCargo"
                        placeholder="Filtrar por cargo..."
                        value={filterCargo}
                        onChange={(e) => setFilterCargo(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Data Inicial</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateFrom ? format(dateFrom, "PPP", { locale: ptBR }) : "Selecionar..."}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={dateFrom}
                          onSelect={setDateFrom}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label>Data Final</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateTo ? format(dateTo, "PPP", { locale: ptBR }) : "Selecionar..."}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={dateTo}
                          onSelect={setDateTo}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => exportToExcel('csv')}
                    className="flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    Exportar CSV
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => exportToExcel('xlsx')}
                    className="flex items-center gap-2"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    Exportar Excel
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setFilterUsuario("");
                      setFilterCargo("");
                      setDateFrom(undefined);
                      setDateTo(undefined);
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Limpar Filtros
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Tabela de Logs */}
            <Card>
              <CardHeader>
                <CardTitle>Logs de Alterações</CardTitle>
                <div className="text-sm text-muted-foreground">
                  Mostrando {getFilteredLogs().length} de {logs.length} registros
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Ação</TableHead>
                        <TableHead>Cargo Afetado</TableHead>
                        <TableHead>Alterações</TableHead>
                        <TableHead>Data/Hora</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getFilteredLogs().map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              {log.usuario_nome}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {log.acao.replace(/_/g, ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>{log.cargo_alterado_nome}</TableCell>
                          <TableCell>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <pre className="text-xs max-w-xs overflow-auto">
                                  {JSON.stringify(log.alteracoes, null, 2)}
                                </pre>
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            {format(new Date(log.criado_em), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}