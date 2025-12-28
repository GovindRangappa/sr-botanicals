// lib/utils/sanitizeHtml.ts
/**
 * Sanitize user input to prevent XSS attacks
 * Escapes HTML special characters
 */
export function sanitizeHtml(text: string): string {
  if (typeof text !== 'string') return '';
  
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  
  return text.replace(/[&<>"'/]/g, (char) => map[char]);
}

/**
 * Sanitize text for use in HTML attributes
 */
export function escapeHtmlAttribute(text: string): string {
  return sanitizeHtml(text).replace(/\n/g, ' ');
}

