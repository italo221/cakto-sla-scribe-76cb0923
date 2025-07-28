import React, { useState, useRef, useEffect } from 'react';
import { Button } from './button';
import { Bold, Italic, List, Link, Code, FileCode, Type, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const [isMobile, setIsMobile] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  const insertLink = () => {
    const url = prompt('Digite a URL:');
    if (url) {
      execCommand('createLink', url);
    }
  };

  const insertList = () => {
    execCommand('insertUnorderedList');
  };

  const changeFontSize = (increase: boolean) => {
    if (increase) {
      execCommand('fontSize', '4');
    } else {
      execCommand('fontSize', '2');
    }
  };

  const insertCodeBlock = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const selectedText = range.toString();
      
      const codeElement = document.createElement('pre');
      codeElement.style.backgroundColor = 'var(--muted)';
      codeElement.style.padding = '0.75rem';
      codeElement.style.borderRadius = '0.5rem';
      codeElement.style.fontFamily = 'monospace';
      codeElement.style.fontSize = '0.875rem';
      codeElement.style.margin = '0.5rem 0';
      codeElement.style.overflow = 'auto';
      
      const code = document.createElement('code');
      code.textContent = selectedText || 'código aqui';
      codeElement.appendChild(code);
      
      range.deleteContents();
      range.insertNode(codeElement);
      
      selection.removeAllRanges();
      handleInput();
    }
  };

  const insertInlineCode = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const selectedText = range.toString();
      
      const codeElement = document.createElement('code');
      codeElement.style.backgroundColor = 'var(--muted)';
      codeElement.style.padding = '0.125rem 0.25rem';
      codeElement.style.borderRadius = '0.25rem';
      codeElement.style.fontFamily = 'monospace';
      codeElement.style.fontSize = '0.875rem';
      codeElement.textContent = selectedText || 'código';
      
      range.deleteContents();
      range.insertNode(codeElement);
      
      selection.removeAllRanges();
      handleInput();
    }
  };

  const formatButtons = [
    { icon: Bold, label: 'Negrito', action: () => execCommand('bold') },
    { icon: Italic, label: 'Itálico', action: () => execCommand('italic') },
    { icon: List, label: 'Lista', action: insertList },
    { icon: Link, label: 'Link', action: insertLink },
    { icon: Code, label: 'Código inline', action: insertInlineCode },
    { icon: FileCode, label: 'Bloco de código', action: insertCodeBlock },
  ];

  const textSizeButtons = [
    { label: 'A↑', action: () => changeFontSize(true) },
    { label: 'A↓', action: () => changeFontSize(false) },
  ];

  return (
    <div className="relative">
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onFocus={() => setShowFormatMenu(true)}
        onBlur={(e) => {
          const relatedTarget = e.relatedTarget as HTMLElement;
          if (!relatedTarget || !relatedTarget.closest('[data-format-menu]')) {
            setShowFormatMenu(false);
          }
        }}
        className={cn(
          "min-h-[60px] max-h-[100px] overflow-y-auto p-3 border-0 bg-background shadow-sm focus:ring-2 focus:ring-primary/20 focus:outline-none rounded-md resize-none",
          "prose prose-sm max-w-none dark:prose-invert",
          className
        )}
        style={{
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word'
        }}
        data-placeholder={placeholder}
        suppressContentEditableWarning={true}
      />
      
      {/* Placeholder customizado */}
      {!value && (
        <div className="absolute top-3 left-3 text-muted-foreground pointer-events-none text-sm">
          {placeholder}
        </div>
      )}
      
      {showFormatMenu && (
        <div 
          data-format-menu
          className={cn(
            "absolute top-full left-0 mt-1 p-2 bg-background border rounded-lg shadow-lg z-50",
            isMobile ? "flex flex-col gap-1 w-full" : "flex flex-wrap gap-1"
          )}
        >
          <div className={cn(isMobile ? "flex gap-1 justify-center" : "flex gap-1")}>
            {formatButtons.map((button, index) => (
              <Button
                key={index}
                variant="ghost"
                size="sm"
                className={cn(
                  "p-0",
                  isMobile ? "h-10 w-10" : "h-8 w-8"
                )}
                onMouseDown={(e) => e.preventDefault()}
                onClick={button.action}
                title={button.label}
              >
                <button.icon className={cn(isMobile ? "h-5 w-5" : "h-4 w-4")} />
              </Button>
            ))}
          </div>
          
          {!isMobile && <div className="w-px h-6 bg-border mx-1" />}
          
          <div className={cn(isMobile ? "flex gap-1 justify-center mt-1" : "flex gap-1")}>
            {textSizeButtons.map((button, index) => (
              <Button
                key={index}
                variant="ghost"
                size="sm"
                className={cn(
                  "text-xs font-bold",
                  isMobile ? "h-10 px-3" : "h-8 px-2"
                )}
                onMouseDown={(e) => e.preventDefault()}
                onClick={button.action}
                title={button.label === 'A↑' ? 'Aumentar texto' : 'Diminuir texto'}
              >
                {button.label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};