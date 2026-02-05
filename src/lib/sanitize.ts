import DOMPurify from 'dompurify';

// Configure DOMPurify to only allow mention-related tags and attributes
const ALLOWED_TAGS = ['span', 'p', 'br', 'strong', 'em', 'b', 'i', 'u', 'div'];
const ALLOWED_ATTR = ['data-user-id', 'data-user-name', 'class', 'contenteditable'];

/**
 * Sanitize HTML content to prevent XSS attacks.
 * Only allows mention-related tags and safe attributes.
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty) return '';
  
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    KEEP_CONTENT: true,
    // Remove all event handlers (onclick, onerror, etc.)
    FORBID_ATTR: ['onclick', 'onerror', 'onload', 'onmouseover', 'onfocus', 'onblur'],
    // Block dangerous tags
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'link', 'style', 'svg', 'math']
  });
}

/**
 * Sanitize and process mention content for display.
 * Processes spans with data-user-id attributes while sanitizing dangerous content.
 */
export function sanitizeMentionContent(content: string): string {
  if (!content) return '';
  
  // First, sanitize with DOMPurify
  const sanitized = sanitizeHtml(content);
  
  // If no HTML, return as-is
  if (!sanitized.includes('<span') || !sanitized.includes('data-user-id')) {
    return sanitized;
  }
  
  // Process mention spans for proper styling
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = sanitized;
  
  // Style valid mentions
  const mentionSpans = tempDiv.querySelectorAll('span[data-user-id]');
  mentionSpans.forEach(span => {
    const userId = span.getAttribute('data-user-id');
    const userName = span.getAttribute('data-user-name');
    
    if (userId && userName) {
      span.className = 'mention-highlight';
    }
  });
  
  // Remove any remaining potentially dangerous spans
  const allSpans = tempDiv.querySelectorAll('span:not([data-user-id])');
  allSpans.forEach(span => {
    if (span.classList.contains('mention-highlight') || 
        span.getAttribute('style')?.includes('background-color')) {
      // Replace with just text content
      const textNode = document.createTextNode(span.textContent || '');
      span.parentNode?.replaceChild(textNode, span);
    }
  });
  
  return tempDiv.innerHTML;
}

/**
 * Sanitize comment content for shared tickets (external view).
 * Removes user IDs and other sensitive data while keeping content readable.
 */
export function sanitizeExternalContent(content: string): string {
  if (!content) return '';
  
  // First sanitize HTML
  let sanitized = sanitizeHtml(content);
  
  // Remove data-user-id attributes (sensitive info)
  sanitized = sanitized.replace(/data-user-id="[^"]*"/g, '');
  
  // Convert @mentions to styled spans without sensitive data
  sanitized = sanitized.replace(
    /@([^@<>]*?)(?=\s|<|$)/g, 
    '<span class="mention text-primary">@$1</span>'
  );
  
  return sanitized;
}
