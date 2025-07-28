import React, { useState, useRef, useEffect } from 'react';
import { Button } from './button';
import { Textarea } from './textarea';
import { Bold, Italic, List, Link, Code, FileCode, Type, MoreHorizontal } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder,
  className
}) => {
  const [showFormatMenu, setShowFormatMenu] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertFormatting = (before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    const newValue = value.substring(0, start) + before + selectedText + after + value.substring(end);
    onChange(newValue);
    
    // Reposicionar cursor
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + before.length + selectedText.length + after.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const insertLink = () => {
    const url = prompt('Digite a URL:');
    if (url) {
      const textarea = textareaRef.current;
      if (!textarea) return;
      
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = value.substring(start, end);
      const linkText = selectedText || 'link';
      
      insertFormatting(`[${linkText}](`, `${url})`);
    }
  };

  const formatButtons = [
    { icon: Bold, label: 'Negrito', action: () => insertFormatting('**', '**') },
    { icon: Italic, label: 'Itálico', action: () => insertFormatting('*', '*') },
    { icon: List, label: 'Lista', action: () => insertFormatting('\n- ', '') },
    { icon: Link, label: 'Link', action: insertLink },
    { icon: Code, label: 'Código inline', action: () => insertFormatting('`', '`') },
    { icon: FileCode, label: 'Bloco de código', action: () => insertFormatting('\n```\n', '\n```\n') },
  ];

  const textSizeButtons = [
    { label: 'A↑', action: () => insertFormatting('<span style="font-size: 1.25em;">', '</span>') },
    { label: 'A↓', action: () => insertFormatting('<span style="font-size: 0.875em;">', '</span>') },
  ];

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setShowFormatMenu(true)}
        onBlur={(e) => {
          // Verificar se o clique foi em um dos botões do menu
          const relatedTarget = e.relatedTarget as HTMLElement;
          if (!relatedTarget || !relatedTarget.closest('[data-format-menu]')) {
            setShowFormatMenu(false);
          }
        }}
        placeholder={placeholder}
        className={className}
      />
      
      {showFormatMenu && (
        <div 
          data-format-menu
          className="absolute top-full left-0 mt-1 p-2 bg-background border rounded-lg shadow-lg z-50 flex flex-wrap gap-1"
        >
          {formatButtons.map((button, index) => (
            <Button
              key={index}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onMouseDown={(e) => e.preventDefault()} // Previne o blur
              onClick={button.action}
              title={button.label}
            >
              <button.icon className="h-4 w-4" />
            </Button>
          ))}
          
          <div className="w-px h-6 bg-border mx-1" />
          
          {textSizeButtons.map((button, index) => (
            <Button
              key={index}
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs font-bold"
              onMouseDown={(e) => e.preventDefault()}
              onClick={button.action}
              title={button.label === 'A↑' ? 'Aumentar texto' : 'Diminuir texto'}
            >
              {button.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
};