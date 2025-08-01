import React from 'react';

interface FormattedTextProps {
  text: string;
  className?: string;
}

export const FormattedText: React.FC<FormattedTextProps> = ({ text, className = '' }) => {
  // Se o texto já contém HTML formatado, usar como está
  if (text.includes('<span') && text.includes('background-color')) {
    return (
      <div 
        className={`prose prose-sm max-w-none dark:prose-invert ${className}`}
        dangerouslySetInnerHTML={{ __html: text }}
      />
    );
  }
  
  // Processar menções em texto simples
  const processedText = text.replace(
    /@([a-zA-ZÀ-ÿ0-9_.-]+(?:\s+[a-zA-ZÀ-ÿ0-9_.-]+)*)/g,
    '<span style="background-color: hsl(var(--primary) / 0.1); color: hsl(var(--primary)); padding: 2px 6px; border-radius: 4px; font-weight: 500; margin: 0 1px; border: 1px solid hsl(var(--primary) / 0.2);">@$1</span>'
  );
  
  return (
    <div 
      className={`prose prose-sm max-w-none dark:prose-invert ${className}`}
      dangerouslySetInnerHTML={{ __html: processedText }}
    />
  );
};