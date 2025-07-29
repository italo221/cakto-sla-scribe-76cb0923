import React, { useState, useEffect, useMemo } from 'react';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FormattedText } from "@/components/ui/formatted-text";
import { MoreHorizontal, Download, Trash2, Edit3 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Comment {
  id: string;
  comentario: string;
  autor_nome: string;
  autor_id: string;
  setor_id: string;
  created_at: string;
  anexos?: Array<{
    nome: string;
    url: string;
    tamanho: number;
    tipo: string;
  }>;
}

interface LazyCommentsListProps {
  comments: Comment[];
  commentRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  onEdit: (comment: Comment) => void;
  onDelete: (comment: Comment) => void;
  onDownload: (filePath: string, fileName: string) => void;
  formatFileSize: (bytes: number) => string;
  canEdit: boolean;
  userId?: string;
}

const COMMENTS_PER_BATCH = 5;

export default function LazyCommentsList({
  comments,
  commentRefs,
  onEdit,
  onDelete,
  onDownload,
  formatFileSize,
  canEdit,
  userId
}: LazyCommentsListProps) {
  const [visibleCount, setVisibleCount] = useState(COMMENTS_PER_BATCH);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Otimização: memoizar comentários visíveis
  const visibleComments = useMemo(() => {
    return comments.slice(0, visibleCount);
  }, [comments, visibleCount]);

  const hasMoreComments = visibleCount < comments.length;

  const loadMoreComments = async () => {
    setIsLoadingMore(true);
    // Simular delay para smooth loading
    await new Promise(resolve => setTimeout(resolve, 200));
    setVisibleCount(prev => Math.min(prev + COMMENTS_PER_BATCH, comments.length));
    setIsLoadingMore(false);
  };

  // Reset quando comentários mudam
  useEffect(() => {
    setVisibleCount(COMMENTS_PER_BATCH);
  }, [comments.length]);

  if (comments.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-6">
        <div className="h-6 w-6 mx-auto mb-2 opacity-30" />
        <p className="text-sm">Seja o primeiro a comentar neste SLA</p>
      </div>
    );
  }

  return (
    <>
      {visibleComments.map((comment, index) => (
        <div
          key={comment.id}
          ref={el => commentRefs.current[index] = el}
          className="flex gap-3 group animate-fade-in"
        >
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarFallback className="text-xs">
              {comment.autor_nome?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-medium text-sm text-foreground truncate">
                  {comment.autor_nome}
                </span>
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {format(new Date(comment.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </span>
              </div>
              
              {/* Ações do comentário */}
              {canEdit && userId === comment.autor_id && (
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => onEdit(comment)}
                  >
                    <Edit3 className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                    onClick={() => onDelete(comment)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
            
            <div className="text-sm text-foreground leading-relaxed bg-muted/30 rounded-lg p-3">
              <FormattedText text={comment.comentario} />
            </div>
            
            {/* Anexos */}
            {comment.anexos && comment.anexos.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {comment.anexos.map((anexo, anexoIndex) => (
                  <Badge
                    key={anexoIndex}
                    variant="secondary"
                    className="cursor-pointer hover:bg-secondary/80 transition-colors flex items-center gap-1 max-w-48"
                    onClick={() => onDownload(anexo.url, anexo.nome)}
                  >
                    <Download className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate text-xs">
                      {anexo.nome}
                    </span>
                    <span className="text-xs opacity-70 flex-shrink-0">
                      ({formatFileSize(anexo.tamanho)})
                    </span>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Botão para carregar mais comentários */}
      {hasMoreComments && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={loadMoreComments}
            disabled={isLoadingMore}
            className="text-sm"
          >
            {isLoadingMore ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-2" />
                Carregando...
              </>
            ) : (
              `Carregar mais comentários (${comments.length - visibleCount} restantes)`
            )}
          </Button>
        </div>
      )}
    </>
  );
}