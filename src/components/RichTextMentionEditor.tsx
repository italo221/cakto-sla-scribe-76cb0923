import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface User {
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
  const { user, canEdit, isSuperAdmin } = useAuth();

  // Permitir menções para todos os usuários logados
  const canMention = true;

  // Função para sanitizar query removendo caracteres invisíveis/estranhos
  const sanitizeQuery = (raw: string) => {
    return (raw ?? '')
      // normaliza acentos
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      // remove caracteres invisíveis/controle (como A↑A↓)
      .replace(/[^\p{L}\p{N}\s.@_-]+/gu, '')
      .trim();
  };

  // Buscar usuários para mentions
  const searchUsers = useCallback(async (query: string) => {
    console.log('🔍 searchUsers chamado:', { query, user: user?.email });
    
    // Primeiro fazer probe da sessão
    const authUser = await supabase.auth.getUser();
    console.log('🔍 auth probe:', authUser?.data?.user?.id ? 'ok' : 'missing');
    
    try {
      // Sanitizar query para remover caracteres estranhos
      const sanitizedQuery = sanitizeQuery(query);
      console.log('🔍 Query sanitizada:', { original: query, sanitized: sanitizedQuery });

      // Base query: buscar todos os usuários ativos, exceto o próprio
      let queryBuilder = supabase
        .from('profiles')
        .select('user_id, nome_completo, email')
        .neq('user_id', user?.id) // Não incluir o próprio usuário
        .order('nome_completo', { ascending: true })
        .limit(50);

      // IMPORTANTE: Se query estiver vazia, retornar todos os usuários (até 50)
      // Se houver texto, aplicar filtro por nome/email
      if (sanitizedQuery.length > 0) {
        // Escapar % e _ para evitar problemas com ILIKE
        const escapedQuery = sanitizedQuery.replace(/[%_]/g, s => '\\' + s);
        queryBuilder = queryBuilder.or(`nome_completo.ilike.%${escapedQuery}%,email.ilike.%${escapedQuery}%`);
      }

      const { data, error } = await queryBuilder;

      if (error) {
        console.error('🔍 Erro na busca:', error);
        throw error;
      }
      
      console.log('🔍 Usuários encontrados:', data?.length || 0, data);
      setMentionUsers(data || []);
    } catch (error) {
      console.error('🔍 Erro ao buscar usuários:', error);
      setMentionUsers([]);
    }
  }, [user?.id]);

  // Debounced search function
  const debouncedSearchUsers = useCallback(
    (() => {
      let timeout: NodeJS.Timeout;
      return (query: string) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          searchUsers(query);
        }, 250); // 250ms debounce
      };
    })(),
    [searchUsers]
  );

  // Detectar @ no texto
  const handleTextChange = (newValue: string) => {
    console.log('🔍 RichTextMentionEditor - handleTextChange:', { 
      newValue: newValue.substring(0, 100) + (newValue.length > 100 ? '...' : ''),
      valueLength: newValue.length,
      user: user?.email 
    });
    onChange(newValue);
    
    // ABORDAGEM MAIS DIRETA: trabalhar direto com o texto do DOM
    let textContent = '';
    if (editorRef.current) {
      textContent = editorRef.current.textContent || editorRef.current.innerText || '';
      console.log('🔍 Texto extraído diretamente do DOM:', { 
        textContent: textContent.substring(0, 100) + (textContent.length > 100 ? '...' : ''),
        contentLength: textContent.length
      });
    } else {
      // Fallback para o método anterior
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = newValue;
      textContent = tempDiv.textContent || tempDiv.innerText || '';
      console.log('🔍 Texto extraído via tempDiv (fallback):', { 
        textContent: textContent.substring(0, 100) + (textContent.length > 100 ? '...' : ''),
        contentLength: textContent.length
      });
    }
    
    const lastAtIndex = textContent.lastIndexOf('@');
    console.log('🔍 Último @ encontrado na posição:', lastAtIndex);
    
    if (lastAtIndex !== -1) {
      const afterAt = textContent.substring(lastAtIndex + 1);
      console.log('🔍 Texto após @ (RAW):', { 
        afterAt: JSON.stringify(afterAt), 
        length: afterAt.length,
        chars: afterAt.split('').map(c => c.charCodeAt(0))
      });
      
      // Condições mais simples para detectar menção
      const isValidMention = afterAt.length <= 50 && 
                           !afterAt.includes('\n') && 
                           (!afterAt.includes(' ') || afterAt.trim().length > 0);
      
      console.log('🔍 Validação de menção:', { isValidMention, afterAt, conditions: {
        lengthOk: afterAt.length <= 50,
        noNewline: !afterAt.includes('\n'),
        spaceOk: !afterAt.includes(' ') || afterAt.trim().length > 0
      }});
      
      if (isValidMention) {
        console.log('🔍 ATIVANDO DROPDOWN - Query será:', JSON.stringify(afterAt));
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
        
        // Chamar searchUsers com debounce
        console.log('🔍 Chamando debouncedSearchUsers com query:', JSON.stringify(afterAt));
        debouncedSearchUsers(afterAt);
        return;
      }
    }
    
    // Limpar estado de menções quando não há @ ou quando a busca foi cancelada
    console.log('🔍 Limpando estado de menções - não há @ válido');
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
                  key={mentionUser.user_id}
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