import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, Search, RefreshCw, Loader2, Filter } from 'lucide-react';

const ACTION_LABELS: Record<string, string> = {
  USER_SIGNUP: 'Novo usuário cadastrado',
  USER_DEACTIVATED: 'Usuário desativado',
  USER_REACTIVATED: 'Usuário reativado',
  ALLOWLIST_APPROVED: 'Email aprovado no allowlist',
  ALLOWLIST_REJECTED: 'Email rejeitado no allowlist',
  ALLOWLIST_REVOKED: 'Email revogado no allowlist',
  USER_ASSIGNED_TO_SETOR: 'Usuário atribuído ao setor',
  USER_REMOVED_FROM_SETOR: 'Usuário removido do setor',
  ROLE_CHANGED: 'Role alterada',
  PERMISSION_CHANGED: 'Permissão alterada',
};

const ACTION_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  USER_SIGNUP: 'default',
  USER_DEACTIVATED: 'destructive',
  USER_REACTIVATED: 'default',
  ALLOWLIST_APPROVED: 'default',
  ALLOWLIST_REJECTED: 'destructive',
  ALLOWLIST_REVOKED: 'secondary',
  USER_ASSIGNED_TO_SETOR: 'outline',
  USER_REMOVED_FROM_SETOR: 'secondary',
  ROLE_CHANGED: 'secondary',
  PERMISSION_CHANGED: 'outline',
};

interface AdminLog {
  id: string;
  action: string;
  actor_id: string | null;
  actor_email: string | null;
  target_user_id: string | null;
  target_email: string | null;
  setor_id: string | null;
  setor_name: string | null;
  old_value: string | null;
  new_value: string | null;
  details: Record<string, any> | null;
  created_at: string;
}

export default function AdminLogsPanel() {
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');

  const { data: logs, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['admin-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      return data as AdminLog[];
    }
  });

  const filteredLogs = logs?.filter(log => {
    const matchesSearch = 
      !searchQuery ||
      log.actor_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.target_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.setor_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ACTION_LABELS[log.action]?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    
    return matchesSearch && matchesAction;
  });

  const getActionBadge = (action: string) => {
    return (
      <Badge variant={ACTION_VARIANTS[action] || 'outline'}>
        {ACTION_LABELS[action] || action}
      </Badge>
    );
  };

  const getDetails = (log: AdminLog) => {
    const parts: string[] = [];
    
    if (log.setor_name) {
      parts.push(`Setor: ${log.setor_name}`);
    }
    
    if (log.old_value && log.new_value) {
      parts.push(`${log.old_value} → ${log.new_value}`);
    }
    
    if (log.details) {
      if (log.details.reason) parts.push(`Motivo: ${log.details.reason}`);
      if (log.details.nome) parts.push(`Nome: ${log.details.nome}`);
    }
    
    return parts.join(' • ') || '-';
  };

  const uniqueActions = [...new Set(logs?.map(l => l.action) || [])];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Logs administrativos
            </CardTitle>
            <CardDescription>
              Histórico de ações administrativas no sistema
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por email, setor ou ação..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-[200px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filtrar por ação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as ações</SelectItem>
              {uniqueActions.map(action => (
                <SelectItem key={action} value={action}>
                  {ACTION_LABELS[action] || action}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="border rounded-lg overflow-x-auto">
          <div className="max-h-[500px] overflow-y-auto">
            <Table className="min-w-[1100px] w-max">
              <TableHeader className="sticky top-0 z-10 bg-background">
                <TableRow>
                  <TableHead className="w-[170px] min-w-[170px]">Data/Hora</TableHead>
                  <TableHead className="w-[210px] min-w-[210px]">Ação</TableHead>
                  <TableHead className="w-[220px] min-w-[220px]">Executado por</TableHead>
                  <TableHead className="w-[220px] min-w-[220px]">Usuário alvo</TableHead>
                  <TableHead className="w-[350px] min-w-[350px]">Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : filteredLogs?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Nenhum log encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs?.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">
                        {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell>{getActionBadge(log.action)}</TableCell>
                      <TableCell className="text-sm">
                        {log.actor_email || 'Sistema'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.target_email || '-'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground w-[350px] min-w-[350px] whitespace-normal">
                        {getDetails(log)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-4 text-sm text-muted-foreground flex-wrap">
          <span>Total: {logs?.length || 0}</span>
          <span>Exibindo: {filteredLogs?.length || 0}</span>
        </div>
      </CardContent>
    </Card>
  );
}
