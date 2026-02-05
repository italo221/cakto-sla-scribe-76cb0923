import React from 'react';
import { sanitizeMentionContent } from '@/lib/sanitize';

interface FormattedTextProps {
  text: string;
  className?: string;
}

export const FormattedText: React.FC<FormattedTextProps> = ({ text, className = '' }) => {
  // Use DOMPurify-based sanitization
  const sanitizedHtml = sanitizeMentionContent(text);
  
  return (
    <div 
      className={`prose prose-sm max-w-none dark:prose-invert ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
};
