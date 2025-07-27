import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  History, 
  User, 
  Calendar, 
  Filter, 
  Download, 
  FileText, 
  Search,
  ChevronRight,
  Shield,
  AlertCircle,
  Info,
  Settings
} from "lucide-react";
import * as XLSX from 'xlsx';

interface LogPermissao {
  id: string;
  usuario_id: string;
  usuario_nome: string;
  acao: string;
  cargo_alterado_id: string;
  cargo_alterado_nome: string;
  alteracoes: any;
  criado_em: string;
}

interface Cargo {
  id: string;
  nome: string;
  descricao: string;
}

export default function EnhancedPermissionsLogs() {
  const [logs, setLogs] = useState<LogPermissao[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogPermissao[]>([]);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCargo, setSelectedCargo] = useState('all');
  const [selectedAction, setSelectedAction] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { isSuperAdmin } = useAuth();

  useEffect(() => {
    if (isSuperAdmin) {
      fetchLogs();
      fetchCargos();
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    applyFilters();
  }, [logs, searchTerm, selectedCargo, selectedAction, dateFrom, dateTo]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('logs_permissoes')
        .select('*')
        .order('criado_em', { ascending: false });

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
      toast({
        title: "Erro ao carregar logs",
        description: "Não foi possível carregar o histórico de permissões.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCargos = async () => {
    try {
      const { data, error } = await supabase
        .from('cargos')
        .select('id, nome, descricao')
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      setCargos(data || []);
    } catch (error) {
      console.error('Erro ao carregar cargos:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...logs];

    // Filtro por termo de busca
    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.usuario_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.cargo_alterado_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.acao.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por cargo
    if (selectedCargo !== 'all') {
      filtered = filtered.filter(log => log.cargo_alterado_id === selectedCargo);
    }

    // Filtro por ação
    if (selectedAction !== 'all') {
      filtered = filtered.filter(log => log.acao === selectedAction);
    }

    // Filtro por data
    if (dateFrom) {
      filtered = filtered.filter(log => 
        new Date(log.criado_em) >= new Date(dateFrom)
      );
    }

    if (dateTo) {
      filtered = filtered.filter(log => 
        new Date(log.criado_em) <= new Date(dateTo + 'T23:59:59')
      );
    }

    setFilteredLogs(filtered);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCargo('all');
    setSelectedAction('all');
    setDateFrom('');
    setDateTo('');
  };

  const exportToExcel = () => {
    const exportData = filteredLogs.map(log => ({
      'Data/Hora': format(new Date(log.criado_em), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR }),
      'Usuário': log.usuario_nome,
      'Ação': getActionLabel(log.acao),
      'Cargo Afetado': log.cargo_alterado_nome,
      'Alterações': formatChanges(log.alteracoes),
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Logs Permissões');
    XLSX.writeFile(wb, `logs_permissoes_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);

    toast({
      title: "Exportação concluída",
      description: "O arquivo Excel foi baixado com sucesso.",
    });
  };

  const getActionLabel = (action: string): string => {
    const labels: Record<string, string> = {
      'criar_cargo': 'Criar Cargo',
      'editar_cargo': 'Editar Cargo',
      'excluir_cargo': 'Excluir Cargo',
      'alterar_permissao': 'Alterar Permissão',
      'clonar_permissoes': 'Clonar Permissões'
    };
    return labels[action] || action;
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'criar_cargo':
        return <Shield className="h-4 w-4 text-green-500" />;
      case 'editar_cargo':
        return <Settings className="h-4 w-4 text-blue-500" />;
      case 'excluir_cargo':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'alterar_permissao':
        return <Info className="h-4 w-4 text-yellow-500" />;
      case 'clonar_permissoes':
        return <FileText className="h-4 w-4 text-purple-500" />;
      default:
        return <History className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActionBadgeVariant = (action: string) => {
    switch (action) {
      case 'criar_cargo': return 'default';
      case 'editar_cargo': return 'secondary';
      case 'excluir_cargo': return 'destructive';
      case 'alterar_permissao': return 'outline';
      case 'clonar_permissoes': return 'secondary';
      default: return 'outline';
    }
  };

  const formatChanges = (changes: any): string => {
    if (!changes || typeof changes !== 'object') return 'N/A';
    
    try {
      const changeEntries = Object.entries(changes);
      if (changeEntries.length === 0) return 'Nenhuma alteração específica';

      return changeEntries.map(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          const { anterior, novo } = value as { anterior?: any; novo?: any };
          if (anterior !== undefined && novo !== undefined) {
            return `${key}: "${anterior}" → "${novo}"`;
          }
        }
        return `${key}: ${value}`;
      }).join(', ');
    } catch (error) {
      return 'Erro ao processar alterações';
    }
  };

  const renderChangesDetails = (changes: any) => {
    if (!changes || typeof changes !== 'object') {
      return <span className="text-muted-foreground">Nenhuma alteração registrada</span>;
    }

    const changeEntries = Object.entries(changes);
    if (changeEntries.length === 0) {
      return <span className="text-muted-foreground">Nenhuma alteração específica</span>;
    }

    return (
      <div className="space-y-1">
        {changeEntries.map(([key, value], index) => {
          if (typeof value === 'object' && value !== null) {
            const { anterior, novo } = value as { anterior?: any; novo?: any };
            if (anterior !== undefined && novo !== undefined) {
              return (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-foreground">{key}:</span>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-red-600 dark:text-red-400">
                      {String(anterior)}
                    </Badge>
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    <Badge variant="outline" className="text-green-600 dark:text-green-400">
                      {String(novo)}
                    </Badge>
                  </div>
                </div>
              );
            }
          }
          return (
            <div key={index} className="flex items-center gap-2 text-sm">
              <span className="font-medium text-foreground">{key}:</span>
              <span className="text-muted-foreground">{String(value)}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const uniqueActions = [...new Set(logs.map(log => log.acao))];

  if (!isSuperAdmin) {
    return (
      <Card className="bg-card">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <div>
              <h3 className="text-lg font-semibold text-foreground">Acesso Negado</h3>
              <p className="text-muted-foreground">
                Apenas super administradores podem visualizar logs de permissões.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Logs de Permissões
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Histórico completo de alterações em cargos e permissões
          </p>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="space-y-2">
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Usuário, cargo, ação..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cargo">Cargo</Label>
              <Select value={selectedCargo} onValueChange={setSelectedCargo}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os cargos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os cargos</SelectItem>
                  {cargos.map((cargo) => (
                    <SelectItem key={cargo.id} value={cargo.id}>
                      {cargo.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="action">Ação</Label>
              <Select value={selectedAction} onValueChange={setSelectedAction}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as ações" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as ações</SelectItem>
                  {uniqueActions.map((action) => (
                    <SelectItem key={action} value={action}>
                      {getActionLabel(action)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateFrom">Data Inicial</Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateTo">Data Final</Label>
              <Input
                id="dateTo"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Limpar Filtros
              </Button>
              <Badge variant="secondary">
                {filteredLogs.length} registro(s) encontrado(s)
              </Badge>
            </div>

            <Button
              onClick={exportToExcel}
              size="sm"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Exportar Excel
            </Button>
          </div>

          <Separator className="mb-4" />

          {/* Tabela de Logs */}
          <div className="rounded-md border bg-card">
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[150px]">Data/Hora</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Cargo Afetado</TableHead>
                    <TableHead className="w-[300px]">Alterações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6">
                        <div className="flex items-center justify-center gap-2">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                          Carregando logs...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6">
                        <div className="space-y-2">
                          <History className="h-8 w-8 text-muted-foreground mx-auto" />
                          <p className="text-muted-foreground">Nenhum log encontrado</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLogs.map((log) => (
                      <TableRow key={log.id} className="hover:bg-muted/50">
                        <TableCell className="font-mono text-sm">
                          {format(new Date(log.criado_em), 'dd/MM/yy HH:mm', { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-foreground">{log.usuario_nome}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={getActionBadgeVariant(log.acao)}
                            className="flex items-center gap-1 w-fit"
                          >
                            {getActionIcon(log.acao)}
                            {getActionLabel(log.acao)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-foreground">{log.cargo_alterado_nome}</span>
                        </TableCell>
                        <TableCell>
                          {renderChangesDetails(log.alteracoes)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}