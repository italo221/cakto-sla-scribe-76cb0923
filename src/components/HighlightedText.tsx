import React from 'react';
import { Badge } from '@/components/ui/badge';

interface HighlightedTextProps {
  text: string;
  className?: string;
  mentions?: { user_id: string; display_name: string }[]; // Array opcional de menções válidas
}

export default function HighlightedText({ text, className = "", mentions = [] }: HighlightedTextProps) {
  // Renderizar apenas menções válidas com metadata
  const renderText = () => {
    // Se não há menções metadata ou texto contém HTML com data-user-id, processar como HTML
    if (text.includes('<span') && text.includes('data-user-id')) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = text;
      
      // Processar spans para manter apenas menções válidas
      const allSpans = tempDiv.querySelectorAll('span');
      allSpans.forEach(span => {
        const userId = span.getAttribute('data-user-id');
        const userName = span.getAttribute('data-user-name');
        
        if (userId && userName) {
          // Substituir por Badge para menção válida
          const badge = document.createElement('span');
          badge.className = 'inline-flex items-center px-2 py-0.5 mx-1 text-xs font-medium bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors rounded-md';
          badge.textContent = span.textContent || '';
          span.parentNode?.replaceChild(badge, span);
        } else if (span.classList.contains('mention-highlight') || 
                   span.style.backgroundColor || 
                   span.textContent?.startsWith('@')) {
          // Remover destaque indevido
          span.outerHTML = span.textContent || span.innerHTML;
        }
      });
      
      return (
        <span 
          className={className}
          dangerouslySetInnerHTML={{ __html: tempDiv.innerHTML }}
        />
      );
    }
    
    // Para texto simples, não aplicar nenhum destaque automático por regex
    // Apenas retornar o texto como está
    return <span className={className}>{text}</span>;
  };

  return renderText();
}