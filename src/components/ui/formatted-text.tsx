import React from 'react';

interface FormattedTextProps {
  text: string;
  className?: string;
}

export const FormattedText: React.FC<FormattedTextProps> = ({ text, className = '' }) => {
  // Processar menções - destacar @usuario tanto em texto simples quanto formatado
  const processedText = text.replace(
    /@([a-zA-ZÀ-ÿ0-9_.-]+(?:\s+[a-zA-ZÀ-ÿ0-9_.-]+)*)/g,
    '<span class="mention-highlight">@$1</span>'
  );
  
  return (
    <div 
      className={`prose prose-sm max-w-none dark:prose-invert ${className}`}
      dangerouslySetInnerHTML={{ __html: processedText }}
    />
  );
};