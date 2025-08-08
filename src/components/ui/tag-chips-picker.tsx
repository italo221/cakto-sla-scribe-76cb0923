import React, { useMemo, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTags } from "@/hooks/useTags";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
  const { toast } = useToast();
  const normalizedSelected = useMemo(
    () => selected.map((s) => s.trim().toLowerCase()),
    [selected]
  );

  const filteredTags = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = allTags || [];
    const list = q ? base.filter((t) => t.includes(q)) : base;
    return list.slice(0, maxVisible);
  }, [allTags, query, maxVisible]);

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

  const deleteTagGlobally = useCallback(
    async (tag: string) => {
      const t = tag.trim().toLowerCase();
      if (!t) return;
      const ok = window.confirm(`Remover a tag "${t}" de todos os tickets?`);
      if (!ok) return;
      setDeleting(t);
      try {
        const { data, error } = await supabase
          .from('sla_demandas')
          .select('id, tags')
          .contains('tags', [t]);
        if (error) throw error;
        let success = 0, fail = 0;
        for (const row of data || []) {
          const current: string[] = Array.isArray(row.tags) ? row.tags : [];
          const newTags = current.filter((x) => (x || '').trim().toLowerCase() !== t);
          const { error: upErr } = await supabase
            .from('sla_demandas')
            .update({ tags: newTags.length ? newTags : null })
            .eq('id', row.id);
          if (upErr) fail++; else success++;
        }
        // Atualizar UI
        if (normalizedSelected.includes(t)) {
          onChange(selected.filter((s) => s.trim().toLowerCase() !== t));
        }
        await fetchAllTags();
        toast({ title: 'Tags atualizadas', description: `Removida "${t}" de ${success} tickets${fail ? ` (falhas: ${fail})` : ''}.` });
      } catch (err) {
        console.error('Erro ao excluir tag globalmente', err);
        toast({ title: 'Erro ao excluir tag', description: 'Não foi possível remover a tag.', variant: 'destructive' });
      } finally {
        setDeleting(null);
      }
    },
    [fetchAllTags, normalizedSelected, onChange, selected, toast]
  );

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

      <div className="flex flex-wrap gap-2 max-h-44 overflow-auto">
        {loading ? (
          <span className="text-sm text-muted-foreground">Carregando tags…</span>
        ) : (
          filteredTags.map((tag) => {
            const isActive = normalizedSelected.includes(tag);
            return (
              <div key={tag} className="relative inline-block">
                <Button
                  type="button"
                  variant={isActive ? "secondary" : "outline"}
                  size="sm"
                  className="rounded-full h-8 px-3 pr-7"
                  onClick={() => toggleTag(tag)}
                  aria-pressed={isActive}
                >
                  {tag}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-background/90 border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  onClick={(e) => { e.stopPropagation(); deleteTagGlobally(tag); }}
                  disabled={deleting === tag}
                  aria-label={`Excluir tag ${tag}`}
                  title={`Excluir tag ${tag}`}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
