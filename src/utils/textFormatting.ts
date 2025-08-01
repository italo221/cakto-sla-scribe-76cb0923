// Função para extrair texto do HTML preservando as menções formatadas
export function extractCleanTextWithMentions(htmlContent: string): string {
  // Se não há conteúdo HTML, retornar como está
  if (!htmlContent.includes('<')) {
    return htmlContent;
  }

  // Criar um elemento temporário para processar o HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;
  
  // Preservar menções que já estão formatadas (com data-user-id ou estilo inline)
  const mentionSpans = tempDiv.querySelectorAll('span[data-user-id], span[style*="background-color: hsl(var(--primary)"]');
  mentionSpans.forEach(span => {
    const textContent = span.textContent || '';
    const userId = span.getAttribute('data-user-id');
    const userName = span.getAttribute('data-user-name');
    
    // Se tem userId, manter a formatação para preservar a menção
    if (userId && userName) {
      span.outerHTML = `<span style="background-color: hsl(var(--primary) / 0.1); color: hsl(var(--primary)); padding: 2px 6px; border-radius: 4px; font-weight: 500; margin: 0 1px; border: 1px solid hsl(var(--primary) / 0.2);" data-user-id="${userId}" data-user-name="${userName}">${textContent}</span>`;
    } else {
      // Se não tem userId, manter pelo menos a formatação visual
      span.outerHTML = `<span style="background-color: hsl(var(--primary) / 0.1); color: hsl(var(--primary)); padding: 2px 6px; border-radius: 4px; font-weight: 500; margin: 0 1px; border: 1px solid hsl(var(--primary) / 0.2);">${textContent}</span>`;
    }
  });
  
  // Retornar o HTML processado (não apenas texto)
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
    return `<span style="background-color: hsl(var(--primary) / 0.1); color: hsl(var(--primary)); padding: 2px 6px; border-radius: 4px; font-weight: 500; margin: 0 1px; border: 1px solid hsl(var(--primary) / 0.2);">${match}</span>`;
  });
}