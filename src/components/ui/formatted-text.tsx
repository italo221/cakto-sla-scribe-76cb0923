import React from 'react';

interface FormattedTextProps {
  text: string;
  className?: string;
}

export const FormattedText: React.FC<FormattedTextProps> = ({ text, className = '' }) => {
  const formatText = (input: string): string => {
    let formatted = input;
    
    // Negrito
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Itálico
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Código inline
    formatted = formatted.replace(/`(.*?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-sm font-mono">$1</code>');
    
    // Blocos de código
    formatted = formatted.replace(/```\n([\s\S]*?)\n```/g, '<pre class="bg-muted p-3 rounded-lg overflow-x-auto my-2"><code class="text-sm font-mono">$1</code></pre>');
    
    // Links
    formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">$1</a>');
    
    // Listas
    formatted = formatted.replace(/^- (.+)$/gm, '<li class="ml-4">$1</li>');
    formatted = formatted.replace(/(<li.*<\/li>)/s, '<ul class="list-disc pl-4 my-2">$1</ul>');
    
    // Quebras de linha
    formatted = formatted.replace(/\n/g, '<br>');
    
    return formatted;
  };

  return (
    <div 
      className={`prose prose-sm max-w-none dark:prose-invert ${className}`}
      dangerouslySetInnerHTML={{ __html: formatText(text) }}
    />
  );
};