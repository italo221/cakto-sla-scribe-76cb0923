import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
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

interface RichTextMentionEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function RichTextMentionEditor({ 
  value, 
  onChange, 
  placeholder = "Escreva um comentário...",
  className = ""
}: RichTextMentionEditorProps) {
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionUsers, setMentionUsers] = useState<User[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [lastAtPosition, setLastAtPosition] = useState(-1);
  
  const editorRef = useRef<HTMLDivElement>(null);
  const mentionListRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  // Buscar usuários para mentions
  const searchUsers = useCallback(async (query: string) => {
    try {
      let queryBuilder = supabase
        .from('profiles')
        .select('id, user_id, nome_completo, email')
        .neq('user_id', user?.id) // Não incluir o próprio usuário
        .eq('ativo', true)
        .order('nome_completo', { ascending: true });

      // Se tem query, filtrar por nome/email. Se não tem query, mostrar todos (até 50)
      if (query.trim()) {
        queryBuilder = queryBuilder.or(`nome_completo.ilike.%${query}%,email.ilike.%${query}%`).limit(20);
      } else {
        queryBuilder = queryBuilder.limit(50); // Mostrar mais usuários quando não há busca
      }

      const { data, error } = await queryBuilder;

      if (error) throw error;
      setMentionUsers(data || []);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      setMentionUsers([]);
    }
  }, [user?.id]);

  // Detectar @ no texto
  const handleTextChange = (newValue: string) => {
    onChange(newValue);
    
    // Trabalhar com o HTML completo para preservar menções anteriores
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = newValue;
    const textContent = tempDiv.textContent || tempDiv.innerText || '';
    
    const lastAtIndex = textContent.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const afterAt = textContent.substring(lastAtIndex + 1);
      
      // Se não há espaços ou quebras de linha após @ e não é uma menção já formatada
      if (!afterAt.includes(' ') && !afterAt.includes('\n') && afterAt.length <= 50) {
        // Verificar se não é uma menção já existente (dentro de um span)
        const beforeAt = textContent.substring(0, lastAtIndex);
        const htmlBeforeAt = newValue.substring(0, newValue.lastIndexOf('@'));
        
        // Se não está dentro de uma tag de menção existente
        if (!htmlBeforeAt.includes('<span class="mention-highlight"') || htmlBeforeAt.lastIndexOf('</span>') > htmlBeforeAt.lastIndexOf('<span class="mention-highlight"')) {
          setLastAtPosition(lastAtIndex);
          setMentionQuery(afterAt);
          setShowMentions(true);
          setSelectedIndex(0);
          
          // Calcular posição aproximada do dropdown
          if (editorRef.current) {
            const rect = editorRef.current.getBoundingClientRect();
            setMentionPosition({
              top: rect.bottom + 5,
              left: rect.left + 10
            });
          }
          
          searchUsers(afterAt);
          return;
        }
      }
    }
    
    // Limpar estado de menções quando não há @ ou quando a busca foi cancelada
    setShowMentions(false);
    setMentionQuery('');
    setLastAtPosition(-1);
    setSelectedIndex(0);
  };

  // Selecionar usuário da lista
  const selectUser = (selectedUser: User) => {
    if (lastAtPosition === -1) return;
    
    // Trabalhar com o HTML original para preservar formatação e menções anteriores
    const htmlContent = value;
    
    // Encontrar a posição do @ no HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    const textContent = tempDiv.textContent || tempDiv.innerText || '';
    
    // Encontrar onde está o @ no HTML original
    let htmlPosition = 0;
    let textPosition = 0;
    let foundAtPosition = -1;
    
    for (let i = 0; i < htmlContent.length && textPosition <= lastAtPosition; i++) {
      if (htmlContent[i] === '<') {
        // Pular tag HTML
        while (i < htmlContent.length && htmlContent[i] !== '>') {
          i++;
        }
      } else {
        if (textPosition === lastAtPosition) {
          foundAtPosition = i;
          break;
        }
        textPosition++;
      }
    }
    
    if (foundAtPosition === -1) {
      // Fallback: usar posição aproximada
      foundAtPosition = htmlContent.lastIndexOf('@');
    }
    
    // Substituir @query pela menção formatada
    const beforeAt = htmlContent.substring(0, foundAtPosition);
    const afterAt = htmlContent.substring(foundAtPosition);
    const queryEndIndex = afterAt.indexOf('@') === 0 ? 1 + mentionQuery.length : mentionQuery.length;
    const afterQuery = afterAt.substring(queryEndIndex);
    
    // Criar menção com dados estruturados para trigger detectar
    const mentionSpan = `<span class="mention-highlight" data-user-id="${selectedUser.user_id}" data-user-name="${selectedUser.nome_completo}">@${selectedUser.nome_completo}</span>`;
    
    const newValue = beforeAt + mentionSpan + ' ' + afterQuery;
    onChange(newValue);
    
    setShowMentions(false);
    setMentionQuery('');
    setLastAtPosition(-1);
  };

  // Navegação por teclado
  const handleKeyDown = (e: KeyboardEvent) => {
    if (showMentions && mentionUsers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % mentionUsers.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => prev === 0 ? mentionUsers.length - 1 : prev - 1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (mentionUsers[selectedIndex]) {
          selectUser(mentionUsers[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        setShowMentions(false);
        setMentionQuery('');
        setLastAtPosition(-1);
        setSelectedIndex(0);
      }
    }
  };

  // Event listeners
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mentionListRef.current && !mentionListRef.current.contains(event.target as Node) &&
          editorRef.current && !editorRef.current.contains(event.target as Node)) {
        setShowMentions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showMentions, mentionUsers, selectedIndex, lastAtPosition, mentionQuery]);

  return (
    <div className="relative">
      <div ref={editorRef}>
        <RichTextEditor
          value={value}
          onChange={handleTextChange}
          placeholder={placeholder}
          className={className}
        />
      </div>
      
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
              <div className="px-3 py-2 text-xs text-muted-foreground border-b">
                Digite para buscar ou selecione:
              </div>
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