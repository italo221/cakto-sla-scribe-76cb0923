import React from 'react';
import { Badge } from '@/components/ui/badge';

interface HighlightedTextProps {
  text: string;
  className?: string;
}

export default function HighlightedText({ text, className = "" }: HighlightedTextProps) {
  // Regex para detectar menções @usuario
  const mentionRegex = /@([a-zA-ZÀ-ÿ0-9_.-]+(?:\s+[a-zA-ZÀ-ÿ0-9_.-]+)*)/g;
  
  const parts = text.split(mentionRegex);
  
  return (
    <span className={className}>
      {parts.map((part, index) => {
        // Se é uma posição ímpar, é uma menção (capturada pelo regex)
        if (index % 2 === 1) {
          return (
            <Badge 
              key={index} 
              variant="secondary" 
              className="inline-flex items-center px-2 py-0.5 mx-1 text-xs font-medium bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
            >
              @{part}
            </Badge>
          );
        }
        
        // Texto normal
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
}