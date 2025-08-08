import React, { useMemo, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTags } from "@/hooks/useTags";
import { cn } from "@/lib/utils";
import { X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
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
  const { allTags, addTagToHistory, loading, fetchAllTags } = useTags();
  const [query, setQuery] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmTag, setConfirmTag] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const { isSuperAdmin } = useAuth();
  const normalizedSelected = useMemo(
    () => selected.map((s) => s.trim().toLowerCase()),
    [selected]
  );

  const filteredTags = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = allTags || [];
    const list = q ? base.filter((t) => t.includes(q)) : base;
    // Remover tags já selecionadas da lista sugerida (toggle UX)
    const withoutSelected = list.filter(
      (t) => !normalizedSelected.includes((t || "").trim().toLowerCase())
    );
    return withoutSelected.slice(0, maxVisible);
  }, [allTags, query, maxVisible, normalizedSelected]);

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
    (tag: string) => {
      const t = tag.trim().toLowerCase();
      const isSelected = normalizedSelected.includes(t);
      if (isSelected) {
        onChange(selected.filter((s) => s.trim().toLowerCase() !== t));
      } else {
        addViaInput(t);
      }
    },
    [normalizedSelected, onChange, selected, addViaInput]
  );

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
    (e: React.KeyboardEvent<HTMLInputElement>) => {
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
          {selected.map((tag) => (
            <Button
              key={`selected-${tag}`}
              type="button"
              variant="secondary"
              size="sm"
              className="rounded-full h-8 px-3"
              onClick={() => toggleTag(tag)}
              aria-pressed
            >
              {tag}
            </Button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2 max-h-44 overflow-auto">
        {loading ? (
          <span className="text-sm text-muted-foreground">Carregando tags…</span>
        ) : filteredTags.length > 0 ? (
          filteredTags.map((tag) => {
            const isActive = normalizedSelected.includes(tag);
            return (
              <div key={tag} className="relative inline-block">
                <Button
                  type="button"
                  variant={isActive ? "secondary" : "outline"}
                  size="sm"
                  className="rounded-full h-8 px-3 pr-8"
                  onClick={() => toggleTag(tag)}
                  aria-pressed={isActive}
                >
                  {tag}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="absolute top-1/2 -translate-y-1/2 right-1 h-5 w-5 rounded-full text-muted-foreground hover:text-foreground"
                  onClick={(e) => { e.stopPropagation(); requestDeleteTag(tag); }}
                  disabled={deleting === tag}
                  aria-label={`Excluir tag ${tag}`}
                  title={`Excluir tag ${tag}`}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            );
          })
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
