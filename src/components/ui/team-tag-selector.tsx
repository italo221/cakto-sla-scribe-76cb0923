import React, { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Plus, Search } from 'lucide-react';
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
  const [openTag, setOpenTag] = useState(false);
  const [searchTag, setSearchTag] = useState('');
  const [creatingTag, setCreatingTag] = useState(false);

  // Inicializar com modo GERAL
  useEffect(() => {
    if (!selectedTeamId && teams.length > 0) {
      showAllTags();
    }
  }, [teams, selectedTeamId, showAllTags]);

  // Determinar tags disponíveis baseado no team selecionado
  const availableTags = React.useMemo(() => {
    if (selectedTeamId === 'GERAL' || !selectedTeamId) {
      // Modo GERAL: mostrar todas as tags (organizadas + legadas)
      return getAllAvailableTags();
    } else {
      // Modo team específico: mostrar apenas tags deste team + globais
      return organizedTags.map(tag => tag.name);
    }
  }, [selectedTeamId, organizedTags, getAllAvailableTags]);

  // Filtrar tags baseado na busca
  const filteredTags = React.useMemo(() => {
    return availableTags.filter(tag => 
      tag.toLowerCase().includes(searchTag.toLowerCase()) &&
      !selectedTags.includes(tag)
    );
  }, [availableTags, searchTag, selectedTags]);

  // Selecionar team
  const handleSelectTeam = (teamId: string) => {
    selectTeam(teamId);
    setOpenTeam(false);
  };

  // Adicionar tag
  const handleSelectTag = (tag: string) => {
    if (maxTags && selectedTags.length >= maxTags) {
      toast.error(`Máximo de ${maxTags} tags permitidas`);
      return;
    }

    onTagsChange([...selectedTags, tag]);
    setSearchTag('');
    setOpenTag(false);
  };

  // Remover tag
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
        handleSelectTag(newTag);
        return;
      }

      // Criar tag organizada se não estamos no modo GERAL
      if (selectedTeamId && selectedTeamId !== 'GERAL') {
        await createOrganizedTag(newTag, selectedTeamId);
        toast.success('Tag criada com sucesso!');
      }
      
      // Adicionar à seleção
      handleSelectTag(newTag);
      
    } catch (error) {
      console.error('Erro ao criar tag:', error);
      toast.error('Erro ao criar tag');
    } finally {
      setCreatingTag(false);
    }
  };

  const selectedTeam = teams.find(team => team.id === selectedTeamId);

  return (
    <div className={cn("space-y-2", className)}>
      {/* Seletor de Team (obrigatório) */}
      <div className="space-y-1">
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
          <PopoverContent className="w-full p-0" align="start">
            <Command>
              <CommandInput placeholder="Buscar time..." />
              <CommandList>
                <CommandEmpty>Nenhum time encontrado.</CommandEmpty>
                <CommandGroup>
                  {teams.map((team) => (
                    <CommandItem
                      key={team.id}
                      value={team.name}
                      onSelect={() => handleSelectTeam(team.id)}
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

      {/* Seletor de Tags (dependente do Team) */}
      <div className="space-y-1">
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
                >
                  ×
                </button>
              </Badge>
            ))}
          </div>
        )}

        {/* Seletor de tags */}
        <Popover open={openTag} onOpenChange={setOpenTag}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={openTag}
              className="w-full justify-between"
              disabled={!selectedTeamId || loading}
            >
              {selectedTeamId ? placeholder : "Selecione um time primeiro..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <Command>
              <CommandInput 
                placeholder="Buscar tags..." 
                value={searchTag}
                onValueChange={setSearchTag}
              />
              <CommandList>
                <CommandEmpty>
                  {loading ? (
                    "Carregando tags..."
                  ) : selectedTeamId === 'GERAL' ? (
                    "Nenhuma tag encontrada."
                  ) : (
                    <div className="p-2 text-center text-sm text-muted-foreground">
                      Nenhuma tag disponível para este time.
                      {allowCreateTag && searchTag.trim() && (
                        <div className="mt-2">
                          <Button
                            size="sm"
                            onClick={handleCreateTag}
                            disabled={creatingTag}
                            className="w-full"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            {creatingTag ? 'Criando...' : `Criar "${searchTag}"`}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CommandEmpty>
                
                {!loading && (
                  <CommandGroup>
                    {filteredTags.map((tag) => (
                      <CommandItem
                        key={tag}
                        value={tag}
                        onSelect={() => handleSelectTag(tag)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedTags.includes(tag) ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {tag}
                      </CommandItem>
                    ))}
                    
                    {/* Opção de criar nova tag */}
                    {allowCreateTag && searchTag.trim() && !filteredTags.includes(searchTag.trim().toLowerCase()) && (
                      <CommandItem onSelect={handleCreateTag} disabled={creatingTag}>
                        <Plus className="mr-2 h-4 w-4" />
                        {creatingTag ? 'Criando...' : `Criar "${searchTag}"`}
                      </CommandItem>
                    )}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        
        {selectedTeamId && (
          <p className="text-xs text-muted-foreground">
            {selectedTeamId === 'GERAL' 
              ? 'Mostrando todas as tags do sistema'
              : `Mostrando tags do time "${selectedTeam?.name}" + tags globais`
            }
          </p>
        )}
      </div>
    </div>
  );
};