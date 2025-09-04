// Função para extrair texto do HTML preservando as menções formatadas
export function extractCleanTextWithMentions(htmlContent: string): string {
  // Se não há conteúdo HTML, retornar como está
  if (!htmlContent.includes('<')) {
    return htmlContent;
  }

  // Criar um elemento temporário para processar o HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;
  
  // Remover wrappers duplicados/aninhados de menções
  const nestedMentions = tempDiv.querySelectorAll('span[data-user-id] span, span.mention-highlight span');
  nestedMentions.forEach(innerSpan => {
    // Se é um span dentro de uma menção, mover o conteúdo para o pai e remover
    const parent = innerSpan.parentElement;
    if (parent) {
      parent.textContent = innerSpan.textContent || parent.textContent;
      innerSpan.remove();
    }
  });
  
  // Normalizar menções para garantir formato único
  const mentionSpans = tempDiv.querySelectorAll('span[data-user-id], span[style*="background-color: hsl(var(--primary)"], span.mention-highlight');
  mentionSpans.forEach(span => {
    const textContent = span.textContent || '';
    const userId = span.getAttribute('data-user-id');
    const userName = span.getAttribute('data-user-name');
    
    // Se tem userId, criar menção estruturada única
    if (userId && userName) {
      const newSpan = document.createElement('span');
      newSpan.className = 'mention-highlight';
      newSpan.setAttribute('data-user-id', userId);
      newSpan.setAttribute('data-user-name', userName);
      newSpan.setAttribute('contenteditable', 'false');
      newSpan.textContent = textContent;
      span.replaceWith(newSpan);
    } else if (span.classList.contains('mention-highlight')) {
      // Se não tem userId mas tem a classe, manter formatação visual apenas
      const newSpan = document.createElement('span');
      newSpan.className = 'mention-highlight';
      newSpan.textContent = textContent;
      span.replaceWith(newSpan);
    }
  });
  
  // Retornar o HTML processado e normalizado
  return tempDiv.innerHTML;
}

// Função para converter texto simples com menções em HTML formatado para exibição
export function formatMentionsForDisplay(text: string): string {
  // Se já contém HTML formatado, retornar como está
  if (text.includes('<span') && text.includes('background-color')) {
    return text;
  }
  
  const mentionRegex = /@([a-zA-ZÀ-ÿ0-9_.-]+(?:\s+[a-zA-ZÀ-ÿ0-9_.-]+)*)/g;
  
  return text.replace(mentionRegex, (match, username) => {
    return `<span class="mention-highlight">${match}</span>`;
  });
}