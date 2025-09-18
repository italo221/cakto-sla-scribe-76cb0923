import React, { useEffect } from 'react';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface SmartPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export const SmartPagination: React.FC<SmartPaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  className
}) => {
  // Navegação por teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && currentPage > 1) {
        onPageChange(currentPage - 1);
      } else if (e.key === 'ArrowRight' && currentPage < totalPages) {
        onPageChange(currentPage + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, totalPages, onPageChange]);

  // Função para gerar os números das páginas conforme as regras
  const generatePageNumbers = (): (number | 'ellipsis')[] => {
    if (totalPages <= 7) {
      // Listas pequenas: mostrar todas as páginas
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (currentPage <= 5) {
      // Início da lista: 1 2 3 4 5 … totalPages
      return [1, 2, 3, 4, 5, 'ellipsis', totalPages];
    }

    if (currentPage >= totalPages - 4) {
      // Fim da lista: 1 … (totalPages-4) ... totalPages
      return [
        1,
        'ellipsis',
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages
      ];
    }

    // Meio da lista: 1 … (currentPage-2) (currentPage-1) currentPage (currentPage+1) (currentPage+2) … totalPages
    return [
      1,
      'ellipsis',
      currentPage - 2,
      currentPage - 1,
      currentPage,
      currentPage + 1,
      currentPage + 2,
      'ellipsis',
      totalPages
    ];
  };

  const pageNumbers = generatePageNumbers();

  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav
      role="navigation"
      aria-label="Paginação"
      className={cn("flex items-center justify-center space-x-1", className)}
    >
      {/* Botão Anterior */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="gap-1"
        aria-label="Página anterior"
      >
        <ChevronLeft className="h-4 w-4" />
        Anterior
      </Button>

      {/* Números das páginas */}
      <div className="flex items-center space-x-1">
        {pageNumbers.map((pageNum, index) => {
          if (pageNum === 'ellipsis') {
            return (
              <span
                key={`ellipsis-${index}`}
                className="flex h-9 w-9 items-center justify-center text-muted-foreground"
                aria-hidden="true"
              >
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Mais páginas</span>
              </span>
            );
          }

          const isActive = pageNum === currentPage;
          
          return (
            <Button
              key={pageNum}
              variant={isActive ? "default" : "ghost"}
              size="sm"
              onClick={() => onPageChange(pageNum)}
              aria-current={isActive ? "page" : undefined}
              aria-label={`Ir para página ${pageNum}`}
              className={cn(
                "h-9 w-9",
                isActive && "pointer-events-none"
              )}
            >
              {pageNum}
            </Button>
          );
        })}
      </div>

      {/* Botão Próxima */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="gap-1"
        aria-label="Próxima página"
      >
        Próxima
        <ChevronRight className="h-4 w-4" />
      </Button>
    </nav>
  );
};