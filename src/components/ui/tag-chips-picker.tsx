import { useMemo, useState, useCallback, KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTags } from "@/hooks/useTags";
import { cn } from "@/lib/utils";
import { X, Loader2, Settings, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { formatTagLabel, TagWithTeam } from "@/utils/tagFormatting";
import { TagTeamPopover } from "@/components/ui/tag-team-popover";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
interface TagChipsPickerProps {
  selected: string[];
  onChange: (tags: string[]) => void;
  maxVisible?: number; // número máximo de chips exibidos por padrão
  maxSelected?: number; // limite de seleção (preserva comportamento anterior de até 5)
  placeholder?: string;
  className?: string;
}

export function TagChipsPicker({
  selected,
  onChange,
  maxVisible = 50,
  maxSelected = 5,
  placeholder = "Buscar tags...",
  className,
}: TagChipsPickerProps) {
  const { allTags, organizedTags, addTagToHistory, loading, fetchAllTags, fetchOrganizedTags } = useTags();
  const [query, setQuery] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmTag, setConfirmTag] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [tagTeamMap, setTagTeamMap] = useState<Map<string, { teamId: string | null; teamName: string | null }>>(new Map());
  const { toast } = useToast();
  const { isSuperAdmin } = useAuth();
  const normalizedSelected = useMemo(
    () => selected.map((s) => s.trim().toLowerCase()),
    [selected]
  );

  const filteredTags = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = Array.isArray(organizedTags) ? organizedTags : [];
    const list = q ? base.filter((t) => t && t.name && t.name.includes(q)) : base;
    // Remover tags já selecionadas da lista sugerida (toggle UX)
    const withoutSelected = list.filter(
      (t) => t && t.name && !normalizedSelected.includes((t.name || "").trim().toLowerCase())
    );
    return withoutSelected.slice(0, maxVisible);
  }, [organizedTags, query, maxVisible, normalizedSelected]);

  const addViaInput = useCallback(
    (tag: string) => {
      const raw = tag.trim().toLowerCase();
      if (!raw) return;
      if (!allTags.includes(raw)) {
        addTagToHistory(raw);
      }
      if (!normalizedSelected.includes(raw)) {
        if (!maxSelected || selected.length < maxSelected) {
          onChange([...selected, raw]);
        }
      }
      setQuery("");
    },
    [allTags, addTagToHistory, normalizedSelected, selected, onChange, maxSelected]
  );

  const toggleTag = useCallback(
    (tagName: string) => {
      const t = tagName.trim().toLowerCase();
      const isSelected = normalizedSelected.includes(t);
      if (isSelected) {
        onChange(selected.filter((s) => s.trim().toLowerCase() !== t));
      } else {
        addViaInput(t);
      }
    },
    [normalizedSelected, onChange, selected, addViaInput]
  );

  const handleTagTeamUpdate = useCallback((tagName: string, teamId: string | null, teamName: string | null) => {
    setTagTeamMap(prev => new Map(prev).set(tagName, { teamId, teamName }));
  }, []);

  const getTagWithTeam = useCallback((tagName: string): TagWithTeam => {
    const teamInfo = tagTeamMap.get(tagName);
    return {
      name: tagName,
      teamName: teamInfo?.teamName || null,
      team_id: teamInfo?.teamId || null,
    };
  }, [tagTeamMap]);

  const requestDeleteTag = useCallback(
    (tag: string) => {
      const t = tag.trim().toLowerCase();
      if (!t) return;
      if (!isSuperAdmin) {
        toast({ title: "Você não tem permissão para excluir tags.", variant: "destructive" });
        return;
      }
      setConfirmTag(t);
    },
    [isSuperAdmin, toast]
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!confirmTag) return;
    setDeleting(confirmTag);
    setIsDeleting(true);
    try {
      const { error } = await supabase.rpc('add_hidden_tag', { p_tag: confirmTag });
      if (error) throw error;

      // Se estava selecionada no ticket, remover
      if (normalizedSelected.includes(confirmTag)) {
        onChange(selected.filter((s) => s.trim().toLowerCase() !== confirmTag));
      }

      await fetchAllTags();
      toast({ title: 'Tag excluída.' });
    } catch (err) {
      console.error('Erro ao excluir (ocultar) tag', err);
      toast({ title: 'Não foi possível excluir a tag. Tente novamente.', variant: 'destructive' });
    } finally {
      setIsDeleting(false);
      setDeleting(null);
      setConfirmTag(null);
    }
  }, [confirmTag, fetchAllTags, normalizedSelected, onChange, selected, toast]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addViaInput(query);
      }
    },
    [addViaInput, query]
  );

  return (
    <div className={cn("space-y-2", className)}>
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
      />

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((tag) => {
            const tagWithTeam = getTagWithTeam(tag);
            const hasTeam = !!tagWithTeam.teamName;
            
            return (
              <div key={`selected-${tag}`} className="relative group">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className={cn(
                    "rounded-full h-8 px-3 pr-8",
                    !hasTeam && "border-dashed border-muted-foreground/50"
                  )}
                  onClick={() => toggleTag(tag)}
                  aria-pressed
                >
                  <span className="flex items-center gap-1">
                    {formatTagLabel(tagWithTeam)}
                    {!hasTeam && <AlertTriangle className="h-3 w-3 opacity-50" />}
                  </span>
                </Button>
                <TagTeamPopover
                  tagId={tag}
                  tagName={tag}
                  currentTeamId={tagWithTeam.team_id}
                  currentTeamName={tagWithTeam.teamName}
                  onTeamUpdated={(teamId, teamName) => handleTagTeamUpdate(tag, teamId, teamName)}
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="absolute top-1/2 -translate-y-1/2 right-1 h-5 w-5 rounded-full text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Atribuir time à tag ${tag}`}
                    title={`Atribuir time à tag ${tag}`}
                  >
                    <Settings className="h-3 w-3" />
                  </Button>
                </TagTeamPopover>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap gap-2 max-h-44 overflow-auto">
        {loading ? (
          <span className="text-sm text-muted-foreground">Carregando tags…</span>
        ) : Array.isArray(filteredTags) && filteredTags.length > 0 ? (
          filteredTags.map((tagData) => {
            if (!tagData || !tagData.name) return null;
            
            const isActive = normalizedSelected.includes(tagData.name);
            const tagWithTeam = { ...tagData, ...getTagWithTeam(tagData.name) };
            const hasTeam = !!tagWithTeam.teamName;
            
            return (
              <div key={tagData.name} className="relative inline-block group">
                <Button
                  type="button"
                  variant={isActive ? "secondary" : "outline"}
                  size="sm"
                  className={cn(
                    "rounded-full h-8 px-3 pr-8",
                    !hasTeam && "border-dashed border-muted-foreground/50"
                  )}
                  onClick={() => toggleTag(tagData.name)}
                  aria-pressed={isActive}
                >
                  <span className="flex items-center gap-1">
                    {formatTagLabel(tagWithTeam)}
                    {!hasTeam && <AlertTriangle className="h-3 w-3 opacity-50" />}
                  </span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="absolute top-1/2 -translate-y-1/2 right-1 h-5 w-5 rounded-full text-muted-foreground hover:text-foreground"
                  onClick={(e) => { e.stopPropagation(); requestDeleteTag(tagData.name); }}
                  disabled={deleting === tagData.name}
                  aria-label={`Excluir tag ${tagData.name}`}
                  title={`Excluir tag ${tagData.name}`}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            );
          }).filter(Boolean)
        ) : (
          <span className="text-sm text-muted-foreground">Nenhuma tag encontrada.</span>
        )}
      </div>

      <AlertDialog open={!!confirmTag} onOpenChange={(open) => { if (!open) setConfirmTag(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tag?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a tag "{confirmTag}"? Ela será removida da lista para todos os usuários. (Os tickets já criados mantêm a tag existente.)
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Excluindo...
                </>
              ) : (
                "Excluir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
