import React from 'react';

interface FormattedTextProps {
  text: string;
  className?: string;
}

export const FormattedText: React.FC<FormattedTextProps> = ({ text, className = '' }) => {
  // Preservar formatação das menções que já estão formatadas 
  const processedText = text.replace(
    /<span[^>]*data-user-id="[^"]*"[^>]*>(@[^<]+)<\/span>/g,
    (match) => match // Manter spans com data-user-id como estão
  ).replace(
    /<span style="[^"]*">(@[^<]+)<\/span>/g,
    '<span class="mention-highlight">$1</span>'
  );
  
  return (
    <div 
      className={`prose prose-sm max-w-none dark:prose-invert ${className} [&_.mention-highlight]:bg-primary/10 [&_.mention-highlight]:text-primary [&_.mention-highlight]:px-2 [&_.mention-highlight]:py-1 [&_.mention-highlight]:rounded [&_.mention-highlight]:font-medium [&_.mention-highlight]:not-prose`}
      dangerouslySetInnerHTML={{ __html: processedText }}
    />
  );
};