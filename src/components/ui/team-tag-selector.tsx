import React, { useState, useEffect, useMemo } from 'react';
import { Check, ChevronsUpDown, Plus, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useOrganizedTags } from '@/hooks/useOrganizedTags';
import { toast } from 'sonner';

interface TeamTagSelectorProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  placeholder?: string;
  className?: string;
  maxTags?: number;
  allowCreateTag?: boolean;
}

export const TeamTagSelector: React.FC<TeamTagSelectorProps> = ({
  selectedTags,
  onTagsChange,
  placeholder = "Selecione tags...",
  className,
  maxTags,
  allowCreateTag = false
}) => {
  const {
    organizedTags,
    teams,
    selectedTeamId,
    loading,
    selectTeam,
    showAllTags,
    createOrganizedTag,
    getAllAvailableTags
  } = useOrganizedTags();

  const [openTeam, setOpenTeam] = useState(false);
  const [searchTag, setSearchTag] = useState('');
  const [creatingTag, setCreatingTag] = useState(false);

  // Inicializar com modo GERAL
  useEffect(() => {
    if (!selectedTeamId && teams.length > 0) {
      showAllTags();
    }
  }, [teams, selectedTeamId, showAllTags]);

  // Determinar tags disponíveis baseado no team selecionado
  const availableTags = useMemo(() => {
    if (selectedTeamId === 'GERAL' || !selectedTeamId) {
      // Modo GERAL: mostrar todas as tags (organizadas + legadas)
      return getAllAvailableTags();
    } else {
      // Modo team específico: mostrar apenas tags deste team + globais
      const teamSpecificTags = organizedTags.filter(tag => 
        tag.team_id === selectedTeamId || tag.is_global
      );
      
      // Deduplificar por nome e retornar apenas os nomes
      const uniqueTagNames = [...new Set(teamSpecificTags.map(tag => tag.name))];
      return uniqueTagNames.sort();
    }
  }, [selectedTeamId, organizedTags, getAllAvailableTags]);

  // Filtrar tags baseado na busca
  const filteredTags = useMemo(() => {
    return availableTags.filter(tag => 
      tag.toLowerCase().includes(searchTag.toLowerCase())
    );
  }, [availableTags, searchTag]);

  // Limpar tags selecionadas que não existem mais no team atual
  useEffect(() => {
    if (selectedTags.length > 0 && availableTags.length > 0) {
      const validTags = selectedTags.filter(tag => availableTags.includes(tag));
      if (validTags.length !== selectedTags.length) {
        onTagsChange(validTags);
        const removedCount = selectedTags.length - validTags.length;
        toast.info(`${removedCount} tag(s) removida(s) - não disponível(is) no time selecionado`);
      }
    }
  }, [availableTags, selectedTags, onTagsChange]);

  // Selecionar team
  const handleSelectTeam = (teamId: string) => {
    selectTeam(teamId);
    setOpenTeam(false);
    setSearchTag(''); // Limpar busca ao trocar team
  };

  // Toggle tag selection
  const handleToggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      // Remover tag
      onTagsChange(selectedTags.filter(t => t !== tag));
    } else {
      // Adicionar tag (verificar limite)
      if (maxTags && selectedTags.length >= maxTags) {
        toast.error(`Máximo de ${maxTags} tags permitidas`);
        return;
      }
      onTagsChange([...selectedTags, tag]);
    }
  };

  // Remover tag das selecionadas
  const handleRemoveTag = (tagToRemove: string) => {
    onTagsChange(selectedTags.filter(tag => tag !== tagToRemove));
  };

  // Criar nova tag
  const handleCreateTag = async () => {
    if (!searchTag.trim()) return;
    
    try {
      setCreatingTag(true);
      
      const newTag = searchTag.trim().toLowerCase();
      
      // Verificar se tag já existe
      if (availableTags.includes(newTag)) {
        handleToggleTag(newTag);
        setSearchTag('');
        return;
      }

      // Criar tag organizada se não estamos no modo GERAL
      if (selectedTeamId && selectedTeamId !== 'GERAL') {
        await createOrganizedTag(newTag, selectedTeamId);
        toast.success('Tag criada com sucesso!');
      }
      
      // Adicionar à seleção
      handleToggleTag(newTag);
      setSearchTag('');
      
    } catch (error) {
      console.error('Erro ao criar tag:', error);
      toast.error('Erro ao criar tag');
    } finally {
      setCreatingTag(false);
    }
  };

  // Manejar tecla Enter no campo de busca
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && allowCreateTag && searchTag.trim()) {
      e.preventDefault();
      handleCreateTag();
    }
  };

  const selectedTeam = teams.find(team => team.id === selectedTeamId);

  // Virtualização para performance (quando > 50 tags)
  const shouldVirtualize = filteredTags.length > 50;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Seletor de Team (único dropdown) */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Time</label>
        <Popover open={openTeam} onOpenChange={setOpenTeam}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={openTeam}
              className="w-full justify-between"
            >
              {selectedTeam ? selectedTeam.name : "Selecione um time..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0 bg-popover border shadow-md z-50" align="start">
            <Command className="bg-popover">
              <CommandInput placeholder="Buscar time..." className="bg-popover" />
              <CommandList className="bg-popover">
                <CommandEmpty>Nenhum time encontrado.</CommandEmpty>
                <CommandGroup>
                  {teams.map((team) => (
                    <CommandItem
                      key={team.id}
                      value={team.name}
                      onSelect={() => handleSelectTeam(team.id)}
                      className="hover:bg-accent hover:text-accent-foreground cursor-pointer"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedTeamId === team.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {team.name}
                      {team.id === 'GERAL' && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          Todas as tags
                        </Badge>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Tags em formato aberto (não dropdown) */}
      {selectedTeamId && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Tags</label>
          
          {/* Tags selecionadas */}
          {selectedTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {selectedTags.map((tag) => (
                <Badge key={tag} variant="secondary" className="pr-1">
                  {tag}
                  <button
                    className="ml-1 hover:text-destructive"
                    onClick={() => handleRemoveTag(tag)}
                    aria-label={`Remover tag ${tag}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {/* Campo de busca + criar tag */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="text"
              placeholder="Buscar tags..."
              value={searchTag}
              onChange={(e) => setSearchTag(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="pl-9"
              disabled={loading}
            />
            {allowCreateTag && searchTag.trim() && !availableTags.includes(searchTag.trim().toLowerCase()) && (
              <Button
                size="sm"
                variant="ghost"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8"
                onClick={handleCreateTag}
                disabled={creatingTag}
              >
                <Plus className="w-3 h-3 mr-1" />
                {creatingTag ? 'Criando...' : 'Criar'}
              </Button>
            )}
          </div>

          {/* Lista de tags (formato aberto com chips) */}
          {loading ? (
            <div className="text-sm text-muted-foreground p-4 text-center">
              Carregando tags...
            </div>
          ) : (
            <div 
              className="space-y-1 max-h-48 overflow-y-auto p-2 border rounded-md bg-muted/20"
              role="listbox"
              aria-label="Lista de tags disponíveis"
            >
              {filteredTags.length === 0 ? (
                <div className="text-sm text-muted-foreground p-2 text-center">
                  {searchTag ? 'Nenhuma tag encontrada para a busca.' : 'Nenhuma tag disponível para este time.'}
                </div>
              ) : (
                filteredTags.map((tag, index) => (
                  <div
                    key={tag}
                    role="option"
                    aria-selected={selectedTags.includes(tag)}
                    className={cn(
                      "flex items-center space-x-2 p-2 rounded cursor-pointer hover:bg-accent",
                      "transition-colors duration-150",
                      selectedTags.includes(tag) && "bg-accent"
                    )}
                    onClick={() => handleToggleTag(tag)}
                  >
                    <Checkbox
                      id={`tag-${index}`}
                      checked={selectedTags.includes(tag)}
                      onChange={() => handleToggleTag(tag)}
                      className="pointer-events-none"
                    />
                    <label 
                      htmlFor={`tag-${index}`}
                      className="text-sm cursor-pointer flex-1"
                    >
                      {tag}
                    </label>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Info do contexto atual */}
          <p className="text-xs text-muted-foreground">
            {selectedTeamId === 'GERAL' 
              ? `Mostrando todas as tags do sistema (${filteredTags.length} encontradas)`
              : `Mostrando tags do time "${selectedTeam?.name}" + tags globais (${filteredTags.length} encontradas)`
            }
            {maxTags && ` • Máximo: ${maxTags} tags`}
          </p>
        </div>
      )}
    </div>
  );
};