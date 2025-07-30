// Função para extrair texto limpo do HTML preservando apenas as menções
export function extractCleanTextWithMentions(htmlContent: string): string {
  // Criar um elemento temporário para processar o HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;
  
  // Encontrar todos os spans de menção e substituir pelo formato simples @usuario
  const mentionSpans = tempDiv.querySelectorAll('span[style*="background-color: hsl(var(--primary)"]');
  mentionSpans.forEach(span => {
    const textContent = span.textContent || '';
    span.replaceWith(textContent);
  });
  
  // Retornar apenas o texto limpo
  return tempDiv.textContent || tempDiv.innerText || '';
}

// Função para converter texto com menções em HTML formatado para exibição
export function formatMentionsForDisplay(text: string): string {
  const mentionRegex = /@([a-zA-ZÀ-ÿ0-9_.-]+(?:\s+[a-zA-ZÀ-ÿ0-9_.-]+)*)/g;
  
  return text.replace(mentionRegex, (match, username) => {
    return `<span style="background-color: hsl(var(--primary) / 0.1); color: hsl(var(--primary)); padding: 2px 6px; border-radius: 4px; font-weight: 500; margin: 0 1px;">${match}</span>`;
  });
}