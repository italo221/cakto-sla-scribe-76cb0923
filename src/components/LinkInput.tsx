import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ExternalLink, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LinkInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function LinkInput({ 
  value, 
  onChange, 
  placeholder = "https://exemplo.com",
  className 
}: LinkInputProps) {
  const [isValid, setIsValid] = useState(true);

  const validateUrl = (url: string): boolean => {
    if (!url) return true; // URL vazia é válida (campo opcional)
    
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleChange = (newValue: string) => {
    onChange(newValue);
    setIsValid(validateUrl(newValue));
  };

  const clearLink = () => {
    onChange('');
    setIsValid(true);
  };

  const openLink = () => {
    if (value && isValid) {
      window.open(value, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="relative">
        <Input
          type="url"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "pr-20",
            !isValid && value && "border-destructive"
          )}
        />
        
        {/* Botões de ação */}
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {value && isValid && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={openLink}
              className="h-7 w-7 p-0"
              title="Abrir link"
            >
              <ExternalLink className="w-3 h-3" />
            </Button>
          )}
          
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearLink}
              className="h-7 w-7 p-0"
              title="Limpar link"
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>
      
      {/* Mensagem de erro */}
      {!isValid && value && (
        <p className="text-xs text-destructive">
          Por favor, insira uma URL válida (ex: https://exemplo.com)
        </p>
      )}
      
      {/* Prévia do link */}
      {value && isValid && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ExternalLink className="w-3 h-3" />
          <span className="truncate">{value}</span>
        </div>
      )}
    </div>
  );
}