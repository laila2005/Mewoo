import DOMPurify from 'dompurify';

/**
 * Minimal, safe Markdown → HTML for VetAI chat replies.
 * Supports **bold**, *italic*, [links](url), `code`, "- " bullets, and newlines.
 * HTML is escaped first, then re-introduced only via this whitelist, then
 * DOMPurify-sanitized — so model output can never inject markup.
 */
export function mdToSafeHtml(src = '') {
  let s = String(src ?? '');
  // 1) Escape any existing HTML.
  s = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // 2) Links [text](http…)
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline">$1</a>');
  // 3) Inline code `x`
  s = s.replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 bg-slate-100 rounded text-[0.85em]">$1</code>');
  // 4) Bold then italic.
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  // 5) Bullet lines "- " / "* " → •
  s = s.replace(/^\s*[-*]\s+/gm, '• ');
  // 6) Newlines → <br/>
  s = s.replace(/\n/g, '<br/>');
  return DOMPurify.sanitize(s, {
    ALLOWED_TAGS: ['a', 'strong', 'em', 'code', 'br'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
  });
}

export default mdToSafeHtml;
