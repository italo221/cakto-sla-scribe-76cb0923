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
  const { user, canEdit, isSuperAdmin } = useAuth();

  // Permitir menções para todos os usuários logados
  const canMention = true;

  // Buscar usuários para mentions via RPC (sem restrições de setor/ativo/role)
  const searchUsers = useCallback(async (raw: string) => {
    const q0 = (raw ?? '').trim(); // vazio = listar todos
    const { data, error } = await supabase.rpc('mention_search', { q: q0 });

    if (error) {
      console.error('mention search error (rpc)', error);
      setMentionUsers([]);
      return;
    }

    setMentionUsers((data ?? []).map((u: any) => ({
      id: u.user_id, // usar user_id como id para chave da lista
      user_id: u.user_id,
      nome_completo: u.nome_completo ?? u.email ?? 'Usuário',
      email: u.email ?? '',
    })));
  }, []);

  // Detectar @ no texto
  const handleTextChange = (newValue: string) => {
    onChange(newValue);
    
    // Trabalhar direto com o texto visível do editor
    let textContent = '';
    if (editorRef.current) {
      textContent = editorRef.current.textContent || editorRef.current.innerText || '';
    } else {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = newValue;
      textContent = tempDiv.textContent || tempDiv.innerText || '';
    }
    
    // Se o valor está vazio ou só tem BR, limpar tudo
    if (!newValue || newValue === '<br>' || newValue === '<p></p>' || newValue.trim() === '') {
      setShowMentions(false);
      setMentionQuery('');
      setLastAtPosition(-1);
      setSelectedIndex(0);
      return;
    }
    
    const lastAtIndex = textContent.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      // Verificar se o @ está dentro de uma menção válida (span com data-user-id)
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = newValue;
      
      // Buscar spans com data-user-id
      const mentionSpans = tempDiv.querySelectorAll('span[data-user-id]');
      let isInValidMention = false;
      
      mentionSpans.forEach(span => {
        const spanText = span.textContent || '';
        const spanStart = textContent.indexOf(spanText);
        const spanEnd = spanStart + spanText.length;
        
        if (lastAtIndex >= spanStart && lastAtIndex < spanEnd) {
          isInValidMention = true;
        }
      });
      
      // Se o @ está em uma menção válida, não abrir dropdown
      if (isInValidMention) {
        setShowMentions(false);
        setMentionQuery('');
        setLastAtPosition(-1);
        setSelectedIndex(0);
        return;
      }
      
      // Pegar o token imediatamente após o "@" até espaço/quebra
      const afterAtRaw = textContent.substring(lastAtIndex + 1);

      // Extrair apenas o primeiro token (até espaço ou quebra de linha)
      let token = afterAtRaw.split(/\s|\n/)[0] ?? '';

      // Remover artefatos visuais que alguns editores inserem
      token = token.replace(/[A-Za-z]?\u2191[A-Za-z]?\u2193$/, '');

      // Sanitizar para manter apenas caracteres relevantes para nomes/emails
      const sanitized = token.replace(/[^\p{L}\p{N}._+\-]/gu, '');

      // Mostrar dropdown apenas se não for uma menção completa e válida
      setLastAtPosition(lastAtIndex);
      setMentionQuery(sanitized);
      setShowMentions(true);
      setSelectedIndex(0);

      // Calcular posição aproximada do dropdown
      if (editorRef.current) {
        const rect = editorRef.current.getBoundingClientRect();
        setMentionPosition({ top: rect.bottom + 5, left: rect.left + 10 });
      }

      // Buscar usuários com a query sanitizada
      searchUsers(sanitized);
      return;
    }
    
    // Sem "@" válido no texto: limpar estado de menções
    setShowMentions(false);
    setMentionQuery('');
    setLastAtPosition(-1);
    setSelectedIndex(0);
  };

  // Selecionar usuário da lista
  const selectUser = (selectedUser: User) => {
    if (lastAtPosition === -1 || !editorRef.current) return;
    
    const editor = editorRef.current.querySelector('[contenteditable]') as HTMLElement;
    if (!editor) return;
    
    // Preservar o conteúdo atual e trabalhar com Range API
    const selection = window.getSelection();
    if (!selection) return;
    
    // Obter o texto atual para calcular posições
    const textContent = editor.textContent || editor.innerText || '';
    
    // Calcular posições para substituição
    const beforeAt = textContent.substring(0, lastAtPosition);
    const afterAtWithQuery = textContent.substring(lastAtPosition + 1); // Remove o @
    const afterQuery = afterAtWithQuery.substring(mentionQuery.length); // Remove a query
    
    // Criar um range que seleciona apenas o texto do @ até o final da query
    const range = document.createRange();
    
    // Encontrar todos os nós de texto no editor
    const walker = document.createTreeWalker(
      editor,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    let textPosition = 0;
    let startNode: Text | null = null;
    let endNode: Text | null = null;
    let startOffset = 0;
    let endOffset = 0;
    
    // Encontrar nós de início e fim da seleção
    while (walker.nextNode()) {
      const node = walker.currentNode as Text;
      const nodeText = node.textContent || '';
      const nodeEnd = textPosition + nodeText.length;
      
      // Início do @ (nó e posição)
      if (!startNode && nodeEnd > lastAtPosition) {
        startNode = node;
        startOffset = lastAtPosition - textPosition;
      }
      
      // Final da query (nó e posição)
      if (!endNode && nodeEnd >= lastAtPosition + 1 + mentionQuery.length) {
        endNode = node;
        endOffset = (lastAtPosition + 1 + mentionQuery.length) - textPosition;
        break;
      }
      
      textPosition += nodeText.length;
    }
    
    if (!startNode || !endNode) return;
    
    // Selecionar o texto que será substituído (@ + query)
    range.setStart(startNode, startOffset);
    range.setEnd(endNode, endOffset);
    
    // Criar a menção
    const mentionText = `@${selectedUser.nome_completo}`;
    const mentionSpan = document.createElement('span');
    mentionSpan.className = 'mention-highlight';
    mentionSpan.setAttribute('data-user-id', selectedUser.user_id);
    mentionSpan.setAttribute('data-user-name', selectedUser.nome_completo);
    mentionSpan.setAttribute('contenteditable', 'false');
    mentionSpan.textContent = mentionText;
    
    // Deletar o conteúdo selecionado e inserir a menção
    range.deleteContents();
    range.insertNode(mentionSpan);
    
    // Inserir espaço após a menção
    const spaceNode = document.createTextNode(' ');
    range.setStartAfter(mentionSpan);
    range.insertNode(spaceNode);
    
    // Normalizar o DOM
    editor.normalize();
    
    // Atualizar o valor
    onChange(editor.innerHTML);
    
    // Limpar estado das menções
    setShowMentions(false);
    setMentionQuery('');
    setLastAtPosition(-1);
    setSelectedIndex(0);
    
    // Posicionar cursor após o espaço
    setTimeout(() => {
      editor.focus();
      
      const newRange = document.createRange();
      const newSelection = window.getSelection();
      
      // Posicionar cursor após o espaço
      newRange.setStartAfter(spaceNode);
      newRange.collapse(true);
      
      if (newSelection) {
        newSelection.removeAllRanges();
        newSelection.addRange(newRange);
      }
    }, 10);
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