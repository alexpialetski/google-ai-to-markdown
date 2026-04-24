import type { ExportRequest, ExportResponse } from '../types/messages';
import { toMarkdown, toMarkdownAssistantOnly } from './conversation';

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
    if (msg.type !== 'EXPORT_TO_MARKDOWN' && msg.type !== 'EXPORT_LAST_TO_MARKDOWN') return;
    try {
      const turns = getConversationTurns();
      if (turns.length === 0) {
        sendResponse({
          error: 'No Google AI conversation found on this page.',
        });
        return;
      }

      const pageTitle =
        typeof document.title === 'string' && document.title.trim()
          ? document.title.trim()
          : undefined;

      let markdown: string;

      if (msg.type === 'EXPORT_LAST_TO_MARKDOWN') {
        const lastTurn = turns[turns.length - 1];
        const md = toMarkdownAssistantOnly(lastTurn);
        if (!md.trim()) {
          sendResponse({
            error: 'Last response is empty or could not be converted.',
          });
          return;
        }
        markdown = md;
      } else {
        const parts = turns
          .map((turn) => toMarkdown(turn))
          .filter((md) => md.trim().length > 0);
        if (parts.length === 0) {
          sendResponse({
            error: 'Conversation content is empty or could not be converted.',
          });
          return;
        }
        markdown = parts.join('\n\n---\n\n');
        if (pageTitle) {
          markdown = '# ' + pageTitle + '\n\n' + markdown;
        }
      }

      sendResponse({ markdown, title: pageTitle });
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      sendResponse({ error: err });
    }
  }
);
