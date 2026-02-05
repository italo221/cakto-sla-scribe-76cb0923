import { sanitizeMentionContent } from '@/lib/sanitize';

interface HighlightedTextProps {
  text: string;
  className?: string;
  mentions?: { user_id: string; display_name: string }[];
}

export default function HighlightedText({ text, className = "", mentions = [] }: HighlightedTextProps) {
  // Use DOMPurify-based sanitization for all HTML content
  const renderText = () => {
    // Check if content contains HTML that needs processing
    if (text.includes('<span') && text.includes('data-user-id')) {
      const sanitizedHtml = sanitizeMentionContent(text);
      
      return (
        <span 
          className={className}
          dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />
      );
    }
    
    // For plain text, return as-is without any HTML processing
    return <span className={className}>{text}</span>;
  };

  return renderText();
}
