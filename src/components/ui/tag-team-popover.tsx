import { useState, useEffect, ReactNode } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronsUpDown, Users, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Team {
  id: string;
  nome: string;
}

interface TagTeamPopoverProps {
  tagId: string;
  tagName: string;
  currentTeamId?: string | null;
  currentTeamName?: string | null;
  onTeamUpdated: (teamId: string | null, teamName: string | null) => void;
  children: ReactNode;
}

export function TagTeamPopover({
  tagId,
  tagName,
  currentTeamId,
  currentTeamName,
  onTeamUpdated,
  children,
}: TagTeamPopoverProps) {
  const [open, setOpen] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadTeams();
      setSearchQuery("");
    }
  }, [open]);

  const loadTeams = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('setores')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      setTeams(data || []);
    } catch (error) {
      console.error('Erro ao carregar times:', error);
      toast({
        title: "Erro ao carregar times",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredTeams = teams.filter(team => 
    team.nome.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleTeamSelect = async (teamId: string | null) => {
    setSaving(true);
    try {
      // Por enquanto, apenas simular a atribuição localmente
      // Em um cenário real, seria necessário ter uma estrutura de dados para mapear tags para teams
      const selectedTeam = teamId ? teams.find(t => t.id === teamId) : null;
      onTeamUpdated(teamId, selectedTeam?.nome || null);
      
      toast({
        title: teamId ? "Time atribuído" : "Time removido",
        description: teamId 
          ? `Tag "${tagName}" atribuída ao time ${selectedTeam?.nome}`
          : `Time removido da tag "${tagName}"`,
      });
      
      setOpen(false);
    } catch (error) {
      console.error('Erro ao atualizar time da tag:', error);
      toast({
        title: "Erro ao atualizar time",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0">
        <div className="flex flex-col">
          {/* Header with search */}
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Input
              placeholder="Buscar time..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>

          {/* Content */}
          <div className="max-h-[300px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="ml-2 text-sm">Carregando times...</span>
              </div>
            ) : (
              <div className="p-1">
                {/* Sem time option */}
                <Button
                  variant="ghost"
                  className="w-full justify-start h-auto p-2"
                  onClick={() => handleTeamSelect(null)}
                  disabled={saving}
                >
                  <div className="flex items-center">
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        !currentTeamId ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span>Sem time</span>
                  </div>
                </Button>

                {/* Teams list */}
                {filteredTeams.length === 0 && searchQuery ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    Nenhum time encontrado.
                  </div>
                ) : (
                  filteredTeams.map((team) => (
                    <Button
                      key={team.id}
                      variant="ghost"
                      className="w-full justify-start h-auto p-2"
                      onClick={() => handleTeamSelect(team.id)}
                      disabled={saving}
                    >
                      <div className="flex items-center">
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            currentTeamId === team.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <Users className="mr-2 h-4 w-4" />
                        <span>{team.nome}</span>
                      </div>
                    </Button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          {saving && (
            <div className="border-t p-2">
              <div className="flex items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                Salvando...
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}