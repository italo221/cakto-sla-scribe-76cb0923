import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Shield, 
  Plus, 
  Edit,
  Trash2,
  Copy,
  Download,
  Filter,
  Calendar,
  User,
  Settings,
  Save,
  Loader2,
  AlertTriangle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
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

const PermissionsPanel = () => {
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
  
  // Filter states
  const [filterUsuario, setFilterUsuario] = useState("");
  const [filterCargo, setFilterCargo] = useState("");
  const [filterDataInicio, setFilterDataInicio] = useState("");
  const [filterDataFim, setFilterDataFim] = useState("");
  
  const { toast } = useToast();
  const { user, isSuperAdmin } = useAuth();

  const fetchData = async () => {
    try {
      const [cargosResponse, permissoesResponse, logsResponse] = await Promise.all([
        supabase.from('cargos').select('*').order('nome'),
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

  const handleUpdateCargo = async () => {
    if (!editingCargo || !newCargoNome.trim()) return;

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

      await logAction('editou_cargo', editingCargo.id, editingCargo.nome, {
        nome_anterior: editingCargo.nome,
        nome_novo: newCargoNome.trim(),
        descricao_anterior: editingCargo.descricao,
        descricao_nova: newCargoDesc.trim()
      });

      toast({
        title: "Cargo atualizado!",
        description: "Informações do cargo foram atualizadas.",
      });

      setEditingCargo(null);
      setNewCargoNome("");
      setNewCargoDesc("");
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
    if (!confirm(`Tem certeza que deseja excluir o cargo "${cargo.nome}"?`)) return;

    try {
      const { error } = await supabase
        .from('cargos')
        .delete()
        .eq('id', cargo.id);

      if (error) throw error;

      await logAction('deletou_cargo', cargo.id, cargo.nome);

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
        description: `Permissão "${permissao}" ${valor ? 'habilitada' : 'desabilitada'} para ${cargo.nome}.`,
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

  const exportToCSV = () => {
    const filteredLogs = getFilteredLogs();
    const csvData = filteredLogs.map(log => ({
      'Usuário': log.usuario_nome,
      'Cargo Alterado': log.cargo_alterado_nome,
      'Ação': log.acao,
      'Alterações': JSON.stringify(log.alteracoes),
      'Data/Hora': new Date(log.criado_em).toLocaleString('pt-BR')
    }));

    const ws = XLSX.utils.json_to_sheet(csvData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Logs de Permissões");
    XLSX.writeFile(wb, `logs_permissoes_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const exportToXLS = () => {
    const filteredLogs = getFilteredLogs();
    const xlsData = filteredLogs.map(log => ({
      'Usuário': log.usuario_nome,
      'Cargo Alterado': log.cargo_alterado_nome,
      'Ação': log.acao,
      'Alterações': JSON.stringify(log.alteracoes),
      'Data/Hora': new Date(log.criado_em).toLocaleString('pt-BR')
    }));

    const ws = XLSX.utils.json_to_sheet(xlsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Logs de Permissões");
    XLSX.writeFile(wb, `logs_permissoes_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const getFilteredLogs = () => {
    return logs.filter(log => {
      const matchUsuario = !filterUsuario || log.usuario_nome.toLowerCase().includes(filterUsuario.toLowerCase());
      const matchCargo = !filterCargo || log.cargo_alterado_nome.toLowerCase().includes(filterCargo.toLowerCase());
      const logDate = new Date(log.criado_em);
      const matchDataInicio = !filterDataInicio || logDate >= new Date(filterDataInicio);
      const matchDataFim = !filterDataFim || logDate <= new Date(filterDataFim + 'T23:59:59');
      
      return matchUsuario && matchCargo && matchDataInicio && matchDataFim;
    });
  };

  const getPermissaoForCargo = (cargoId: string) => {
    return permissoes.find(p => p.cargo_id === cargoId);
  };

  if (!isSuperAdmin) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Permissões por Cargo</h2>
          <p className="text-muted-foreground">Gerencie cargos e suas permissões no sistema</p>
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
                <DialogDescription>
                  {editingCargo ? 'Edite as informações do cargo.' : 'Preencha as informações para criar um novo cargo.'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="nome">Nome do Cargo</Label>
                  <Input
                    id="nome"
                    value={newCargoNome}
                    onChange={(e) => setNewCargoNome(e.target.value)}
                    placeholder="Ex: Analista"
                  />
                </div>
                <div>
                  <Label htmlFor="descricao">Descrição</Label>
                  <Input
                    id="descricao"
                    value={newCargoDesc}
                    onChange={(e) => setNewCargoDesc(e.target.value)}
                    placeholder="Descrição do cargo"
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={editingCargo ? handleUpdateCargo : handleCreateCargo}
                    disabled={saving}
                  >
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {editingCargo ? 'Atualizar' : 'Criar'}
                  </Button>
                  <Button variant="outline" onClick={() => setCargoDialogOpen(false)}>
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
                <DialogDescription>
                  Copie todas as permissões de um cargo para outro.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Cargo de Origem</Label>
                  <Select value={sourceCargoId} onValueChange={setSourceCargoId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cargo origem" />
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
                      <SelectValue placeholder="Selecione o cargo destino" />
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

      {/* Grid de Permissões */}
      <Card>
        <CardHeader>
          <CardTitle>Permissões por Cargo</CardTitle>
          <CardDescription>
            Configure as permissões específicas para cada cargo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {cargos.map(cargo => {
              const permissao = getPermissaoForCargo(cargo.id);
              if (!permissao) return null;

              return (
                <div key={cargo.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold flex items-center gap-2">
                        {cargo.nome}
                        {cargo.ativo ? (
                          <Badge variant="outline" className="text-green-600">Ativo</Badge>
                        ) : (
                          <Badge variant="outline" className="text-red-600">Inativo</Badge>
                        )}
                      </h3>
                      {cargo.descricao && (
                        <p className="text-sm text-muted-foreground">{cargo.descricao}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingCargo(cargo);
                          setNewCargoNome(cargo.nome);
                          setNewCargoDesc(cargo.descricao || "");
                          setCargoDialogOpen(true);
                        }}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteCargo(cargo)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={`criar-${cargo.id}`} className="text-sm">Criar Ticket</Label>
                      <Switch
                        id={`criar-${cargo.id}`}
                        checked={permissao.pode_criar_ticket}
                        onCheckedChange={(checked) => handlePermissionChange(cargo.id, 'pode_criar_ticket', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor={`editar-${cargo.id}`} className="text-sm">Editar Ticket</Label>
                      <Switch
                        id={`editar-${cargo.id}`}
                        checked={permissao.pode_editar_ticket}
                        onCheckedChange={(checked) => handlePermissionChange(cargo.id, 'pode_editar_ticket', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor={`excluir-${cargo.id}`} className="text-sm">Excluir Ticket</Label>
                      <Switch
                        id={`excluir-${cargo.id}`}
                        checked={permissao.pode_excluir_ticket}
                        onCheckedChange={(checked) => handlePermissionChange(cargo.id, 'pode_excluir_ticket', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor={`comentar-${cargo.id}`} className="text-sm">Comentar</Label>
                      <Switch
                        id={`comentar-${cargo.id}`}
                        checked={permissao.pode_comentar}
                        onCheckedChange={(checked) => handlePermissionChange(cargo.id, 'pode_comentar', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor={`editar-com-${cargo.id}`} className="text-sm">Editar Qualquer Comentário</Label>
                      <Switch
                        id={`editar-com-${cargo.id}`}
                        checked={permissao.pode_editar_comentario}
                        onCheckedChange={(checked) => handlePermissionChange(cargo.id, 'pode_editar_comentario', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor={`excluir-com-${cargo.id}`} className="text-sm">Excluir Qualquer Comentário</Label>
                      <Switch
                        id={`excluir-com-${cargo.id}`}
                        checked={permissao.pode_excluir_comentario}
                        onCheckedChange={(checked) => handlePermissionChange(cargo.id, 'pode_excluir_comentario', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor={`editar-proprio-${cargo.id}`} className="text-sm">Editar Próprio Comentário</Label>
                      <Switch
                        id={`editar-proprio-${cargo.id}`}
                        checked={permissao.pode_editar_comentario_proprio}
                        onCheckedChange={(checked) => handlePermissionChange(cargo.id, 'pode_editar_comentario_proprio', checked)}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Logs Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Logs de Alterações
          </CardTitle>
          <CardDescription>
            Histórico completo de alterações nas permissões
          </CardDescription>
          
          {/* Filtros */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
            <div>
              <Label htmlFor="filter-usuario">Filtrar por Usuário</Label>
              <Input
                id="filter-usuario"
                placeholder="Nome do usuário"
                value={filterUsuario}
                onChange={(e) => setFilterUsuario(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="filter-cargo">Filtrar por Cargo</Label>
              <Input
                id="filter-cargo"
                placeholder="Nome do cargo"
                value={filterCargo}
                onChange={(e) => setFilterCargo(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="filter-data-inicio">Data Início</Label>
              <Input
                id="filter-data-inicio"
                type="date"
                value={filterDataInicio}
                onChange={(e) => setFilterDataInicio(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="filter-data-fim">Data Fim</Label>
              <Input
                id="filter-data-fim"
                type="date"
                value={filterDataFim}
                onChange={(e) => setFilterDataFim(e.target.value)}
              />
            </div>
          </div>
          
          {/* Botões de Exportação */}
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
            <Button variant="outline" onClick={exportToXLS}>
              <Download className="h-4 w-4 mr-2" />
              Exportar XLS
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Cargo Alterado</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Alterações</TableHead>
                <TableHead>Data/Hora</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {getFilteredLogs().map(log => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium">{log.usuario_nome}</TableCell>
                  <TableCell>{log.cargo_alterado_nome}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{log.acao}</Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {log.alteracoes ? JSON.stringify(log.alteracoes) : '-'}
                  </TableCell>
                  <TableCell>
                    {new Date(log.criado_em).toLocaleString('pt-BR')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {getFilteredLogs().length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum log encontrado com os filtros aplicados.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PermissionsPanel;