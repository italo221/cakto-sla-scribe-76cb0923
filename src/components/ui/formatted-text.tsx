import React from 'react';

interface FormattedTextProps {
  text: string;
  className?: string;
}

export const FormattedText: React.FC<FormattedTextProps> = ({ text, className = '' }) => {
  // Renderizar apenas menções válidas com metadata (data-user-id)
  // Não aplicar destaque em emails ou texto que comece com @ sem metadata
  const processText = (content: string): string => {
    // Se não contém HTML ou spans com data-user-id, retornar texto simples
    if (!content.includes('<span') || !content.includes('data-user-id')) {
      return content;
    }
    
    // Processar HTML preservando menções válidas e removendo destaques indevidos
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    
    // Manter apenas spans com data-user-id como menções válidas
    const allSpans = tempDiv.querySelectorAll('span');
    allSpans.forEach(span => {
      const userId = span.getAttribute('data-user-id');
      const userName = span.getAttribute('data-user-name');
      
      if (userId && userName) {
        // Menção válida - manter formatação
        span.className = 'mention-highlight';
      } else if (span.classList.contains('mention-highlight') || 
                 span.style.backgroundColor || 
                 span.textContent?.startsWith('@')) {
        // Remover destaque indevido - deixar apenas texto
        span.outerHTML = span.textContent || span.innerHTML;
      }
    });
    
    return tempDiv.innerHTML;
  };
  
  return (
    <div 
      className={`prose prose-sm max-w-none dark:prose-invert ${className}`}
      dangerouslySetInnerHTML={{ __html: processText(text) }}
    />
  );
};