import type { ExportRequest, ExportResponse } from '../types/messages';
import { toMarkdown } from './conversation';

/**
 * Find all Google AI conversation turns (Q/A pairs) in the page.
 * Scopes to the main conversation container when present so we export the full thread.
 */
function getConversationTurns(): Element[] {
  const scope =
    document.querySelector('[data-xid="aim-mars-turn-root"]') ?? document;
  const turns = scope.querySelectorAll('[data-scope-id="turn"]');
  return Array.from(turns);
}

chrome.runtime.onMessage.addListener(
  (
    msg: ExportRequest,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: ExportResponse) => void
  ) => {
    if (msg.type !== 'EXPORT_TO_MARKDOWN') return;
    try {
      const turns = getConversationTurns();
      if (turns.length === 0) {
        sendResponse({
          error: 'No Google AI conversation found on this page.',
        });
        return;
      }
      const parts = turns
        .map((turn) => toMarkdown(turn))
        .filter((md) => md.trim().length > 0);
      if (parts.length === 0) {
        sendResponse({
          error: 'Conversation content is empty or could not be converted.',
        });
        return;
      }
      let markdown = parts.join('\n\n---\n\n');
      // Use the page's <head><title> as the conversation title (for export heading and filename).
      const pageTitle =
        typeof document.title === 'string' && document.title.trim()
          ? document.title.trim()
          : undefined;
      if (pageTitle) {
        markdown = '# ' + pageTitle + '\n\n' + markdown;
      }
      sendResponse({ markdown, title: pageTitle });
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      sendResponse({ error: err });
    }
  }
);
