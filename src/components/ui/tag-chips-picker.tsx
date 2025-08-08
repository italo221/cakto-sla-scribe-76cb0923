import React, { useMemo, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTags } from "@/hooks/useTags";
import { cn } from "@/lib/utils";

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
  const { allTags, addTagToHistory, loading } = useTags();
  const [query, setQuery] = useState("");

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

  const toggleTag = useCallback(
    (tag: string) => {
      const t = tag.trim().toLowerCase();
      const isSelected = normalizedSelected.includes(t);
      if (isSelected) {
        onChange(selected.filter((s) => s.trim().toLowerCase() !== t));
      } else {
        if (maxSelected && selected.length >= maxSelected) return; // mantém limite
        onChange([...selected, t]);
      }
    },
    [normalizedSelected, onChange, selected, maxSelected]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const raw = query.trim().toLowerCase();
        if (!raw) return;
        // criar se não existir e já selecionar
        if (!allTags.includes(raw)) {
          addTagToHistory(raw);
        }
        if (!normalizedSelected.includes(raw)) {
          if (!maxSelected || selected.length < maxSelected) {
            onChange([...selected, raw]);
          }
        }
        setQuery("");
      }
    },
    [query, allTags, addTagToHistory, normalizedSelected, selected, onChange, maxSelected]
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
              <Button
                key={tag}
                type="button"
                variant={isActive ? "secondary" : "outline"}
                size="sm"
                className="rounded-full h-8 px-3"
                onClick={() => toggleTag(tag)}
                aria-pressed={isActive}
              >
                {tag}
              </Button>
            );
          })
        )}
      </div>
    </div>
  );
}
