import type { ExportResponse } from '../types/messages';

const statusEl = document.getElementById('status') as HTMLParagraphElement;
const outEl = document.getElementById('out') as HTMLDivElement;
const mdEl = document.getElementById('md') as HTMLTextAreaElement;
const exportBtn = document.getElementById('export') as HTMLButtonElement;
const copyBtn = document.getElementById('copy') as HTMLButtonElement;
const downloadBtn = document.getElementById('download') as HTMLButtonElement;

let lastExportTitle: string | undefined;

function setStatus(text: string, isError = false, isSuccess = false): void {
  statusEl.textContent = text;
  statusEl.className = 'msg' + (isError ? ' error' : isSuccess ? ' success' : '');
}

function showResult(markdown: string, title?: string): void {
  mdEl.value = markdown;
  lastExportTitle = title;
  outEl.classList.add('show');
  const statusText = title
    ? `Exported “${title.length > 40 ? title.slice(0, 40) + '…' : title}”. Copy or download below.`
    : 'Exported. Copy or download below.';
  setStatus(statusText, false, true);
}

function sanitizeFilename(name: string, maxLength = 100): string {
  const sanitized = name
    .replace(/[\s/\\:*?"<>|]+/g, ' ')
    .replace(/\s+/g, '-')
    .trim();
  if (sanitized.length > maxLength) {
    return sanitized.slice(0, maxLength).replace(/-+$/, '');
  }
  return sanitized;
}

exportBtn.addEventListener('click', async () => {
  exportBtn.disabled = true;
  setStatus('Exporting…');
  outEl.classList.remove('show');
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!tab?.id) {
      setStatus('No active tab.', true);
      return;
    }
    const response = (await chrome.tabs.sendMessage(tab.id, {
      type: 'EXPORT_TO_MARKDOWN',
    })) as ExportResponse | undefined;
    if (response && 'error' in response) {
      setStatus(response.error, true);
      return;
    }
    if (response && 'markdown' in response) {
      showResult(response.markdown, response.title);
    } else {
      setStatus('No conversation found on this page.', true);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (
      msg.includes('Receiving end does not exist') ||
      msg.includes('Could not establish connection')
    ) {
      setStatus(
        'Load a Google AI conversation page first, then try again.',
        true
      );
    } else {
      setStatus('Error: ' + msg, true);
    }
  } finally {
    exportBtn.disabled = false;
  }
});

copyBtn.addEventListener('click', () => {
  const text = mdEl.value;
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    const t = copyBtn.textContent ?? '';
    copyBtn.textContent = 'Copied!';
    setTimeout(() => {
      copyBtn.textContent = t;
    }, 1500);
  });
});

downloadBtn.addEventListener('click', () => {
  const text = mdEl.value;
  if (!text) return;
  const blob = new Blob([text], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const base =
    lastExportTitle && sanitizeFilename(lastExportTitle)
      ? sanitizeFilename(lastExportTitle)
      : 'google-ai-conversation';
  const filename = base.endsWith('.md') ? base : base + '.md';
  chrome.downloads.download({ url, filename, saveAs: true }, () => {
    URL.revokeObjectURL(url);
  });
});
