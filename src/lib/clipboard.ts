/**
 * Cross-environment clipboard copy.
 *
 * Tries the modern navigator.clipboard API first (requires HTTPS / secure context).
 * Falls back to document.execCommand('copy') for Capacitor WebView, older browsers,
 * and any context where the Clipboard API is unavailable.
 */
export async function copyToClipboard(text: string): Promise<void> {
  // Modern path: Clipboard API (standard browsers, HTTPS)
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fall through to execCommand fallback
    }
  }

  // Legacy / WebView path: execCommand
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  try {
    const success = document.execCommand('copy');
    if (!success) throw new Error('execCommand copy returned false');
  } finally {
    document.body.removeChild(textarea);
  }
}
