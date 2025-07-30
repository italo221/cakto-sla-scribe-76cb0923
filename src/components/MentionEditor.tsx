import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface User {
  id: string;
  user_id: string;
  nome_completo: string;
  email: string;
}

interface MentionEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

export default function MentionEditor({ 
  value, 
  onChange, 
  placeholder = "Escreva um comentário...",
  className = "",
  onKeyDown
}: MentionEditorProps) {
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionUsers, setMentionUsers] = useState<User[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [lastAtPosition, setLastAtPosition] = useState(-1);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mentionListRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  // Buscar usuários para mentions
  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim()) {
      setMentionUsers([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, nome_completo, email')
        .or(`nome_completo.ilike.%${query}%,email.ilike.%${query}%`)
        .neq('user_id', user?.id) // Não incluir o próprio usuário
        .limit(8);

      if (error) throw error;
      setMentionUsers(data || []);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      setMentionUsers([]);
    }
  }, [user?.id]);

  // Detectar @ e mostrar lista de usuários
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPosition = e.target.selectionStart;
    
    onChange(newValue);
    
    // Encontrar a última posição do @
    const textBeforeCursor = newValue.substring(0, cursorPosition);
    const atIndex = textBeforeCursor.lastIndexOf('@');
    
    if (atIndex !== -1) {
      const afterAt = textBeforeCursor.substring(atIndex + 1);
      // Verificar se não há espaços após @ (mention ainda está sendo digitada)
      if (!afterAt.includes(' ') && !afterAt.includes('\n')) {
        setLastAtPosition(atIndex);
        setMentionQuery(afterAt);
        setShowMentions(true);
        setSelectedIndex(0);
        
        // Calcular posição do dropdown
        if (textareaRef.current) {
          const textarea = textareaRef.current;
          const rect = textarea.getBoundingClientRect();
          const lineHeight = 20; // altura aproximada da linha
          const lines = textBeforeCursor.split('\n').length;
          
          setMentionPosition({
            top: rect.top + (lines * lineHeight) + 25,
            left: rect.left + 10
          });
        }
        
        searchUsers(afterAt);
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  };

  // Selecionar usuário da lista
  const selectUser = (selectedUser: User) => {
    if (!textareaRef.current || lastAtPosition === -1) return;
    
    const textarea = textareaRef.current;
    const currentValue = textarea.value;
    const cursorPosition = textarea.selectionStart;
    
    // Substituir @query pelo @nome_usuario
    const beforeAt = currentValue.substring(0, lastAtPosition);
    const afterCursor = currentValue.substring(cursorPosition);
    const mentionText = `@${selectedUser.nome_completo}`;
    
    const newValue = beforeAt + mentionText + ' ' + afterCursor;
    onChange(newValue);
    
    // Reposicionar cursor
    const newCursorPosition = beforeAt.length + mentionText.length + 1;
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPosition, newCursorPosition);
    }, 0);
    
    setShowMentions(false);
    setMentionQuery('');
    setLastAtPosition(-1);
  };

  // Navegação por teclado na lista de mentions
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentions && mentionUsers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % mentionUsers.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => prev === 0 ? mentionUsers.length - 1 : prev - 1);
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (mentionUsers[selectedIndex]) {
          selectUser(mentionUsers[selectedIndex]);
        }
        return;
      } else if (e.key === 'Escape') {
        setShowMentions(false);
      }
    }
    
    onKeyDown?.(e);
  };

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mentionListRef.current && !mentionListRef.current.contains(event.target as Node) &&
          textareaRef.current && !textareaRef.current.contains(event.target as Node)) {
        setShowMentions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
      />
      
      {/* Dropdown de mentions */}
      {showMentions && mentionUsers.length > 0 && (
        <div
          ref={mentionListRef}
          className="fixed z-50 bg-popover border border-border rounded-md shadow-lg max-w-sm"
          style={{
            top: mentionPosition.top,
            left: mentionPosition.left
          }}
        >
          <ScrollArea className="max-h-48">
            <div className="p-1">
              {mentionUsers.map((mentionUser, index) => (
                <div
                  key={mentionUser.id}
                  className={`flex items-center gap-3 p-2 rounded-sm cursor-pointer transition-colors ${
                    index === selectedIndex ? 'bg-accent' : 'hover:bg-accent/50'
                  }`}
                  onClick={() => selectUser(mentionUser)}
                >
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {mentionUser.nome_completo.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {mentionUser.nome_completo}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {mentionUser.email}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}