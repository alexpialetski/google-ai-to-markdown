import TurndownService from 'turndown';

/**
 * Clone and clean the conversation node for conversion:
 * - Remove buttons, citation chips, hidden blocks
 * - Keep headings, paragraphs, lists, code
 */
export function cleanForMarkdown(root: Element | null): Element | null {
  if (!root) return null;
  const clone = root.cloneNode(true) as Element;

  const remove = clone.querySelectorAll(
    [
      'button',
      '[aria-label*="View related links"]',
      '[aria-label*="Expand"]',
      '.rBl3me',
      '.l1LGWd',
      '[style*="display: none"]',
      '[style*="display:none"]',
      '[data-crb-el]',
      'svg',
      'img',
      // Good/Bad response feedback block (label text is sibling of button, not inside it)
      '.VlQBpc',
      // "Creating a public link…" status text
      '.zg2IJb',
      // "Use code with caution." disclaimer under code blocks
      '.P8PNlb',
    ].join(',')
  );
  remove.forEach((el) => el.remove());

  // Unwrap spans that only add structure (e.g. T286Pc, uJ19be) so links/text remain
  clone.querySelectorAll('span.T286Pc').forEach((span) => {
    const parent = span.parentNode;
    if (!parent) return;
    while (span.firstChild) parent.insertBefore(span.firstChild, span);
    span.remove();
  });

  return clone;
}

/**
 * Replace Google AI code blocks (.r1PmQe with .z0e9Qd + .pCTyYe) with a single
 * <pre><code data-language="..."> so Turndown outputs ```lang\ncode\n```.
 */
function normalizeCodeBlocks(root: Element): void {
  const doc = root.ownerDocument;
  root.querySelectorAll('.r1PmQe').forEach((block) => {
    const langEl =
      block.querySelector('.z0e9Qd .vVRw1d') ?? block.querySelector('.z0e9Qd');
    const codeEl = block.querySelector('.pCTyYe pre code');
    if (!codeEl || !langEl) return;
    const lang = (langEl.textContent ?? '').trim();
    const code = (codeEl.textContent ?? '').trim();
    const pre = doc.createElement('pre');
    const codeNode = doc.createElement('code');
    codeNode.setAttribute('data-language', lang);
    codeNode.textContent = code;
    pre.appendChild(codeNode);
    block.parentNode?.replaceChild(pre, block);
  });
}

/**
 * Build Turndown with rules that suit Google AI DOM:
 * - User query as heading
 * - Section headings (otQkpb) as ###
 * - code.o8j0Mc preserved
 */
export function createTurndown(): TurndownService {
  const td = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
  });

  // Fenced code with language (from normalized .r1PmQe blocks); run before default pre rule
  // priority is supported at runtime by Turndown but not in @types/turndown
  td.addRule('codeBlockWithLanguage', {
    filter: (node: HTMLElement) => {
      if (node.nodeName !== 'PRE') return false;
      const code = node.firstElementChild;
      return (
        code?.nodeName === 'CODE' &&
        code.getAttribute('data-language') != null
      );
    },
    replacement: (content: string, node: HTMLElement) => {
      const code = node.querySelector('code[data-language]');
      if (!code) return content;
      const lang = code.getAttribute('data-language') ?? '';
      const codeText = (code.textContent ?? '').trim();
      return '\n\n```' + lang + '\n' + codeText + '\n```\n\n';
    },
    priority: 100,
  } as TurndownService.Rule & { priority?: number });

  // Remove citation/link buttons that might remain
  td.addRule('stripCitationButtons', {
    filter: (node: Node) =>
      node.nodeName === 'BUTTON' ||
      (node instanceof Element &&
        node.classList &&
        (node.classList.contains('rBl3me') ||
          node.classList.contains('uJ19be'))),
    replacement: () => '',
  });

  // Optional: treat .otQkpb strong as ### heading (Turndown already does strong → **)
  td.addRule('sectionHeadings', {
    filter: (node: Node) =>
      node instanceof Element &&
      node.classList?.contains('otQkpb') &&
      node.querySelector('strong.Yjhzub') !== null,
    replacement: (content: string) => {
      const strong = content.replace(/^\s*|\s*$/g, '');
      return '\n\n### ' + strong + '\n\n';
    },
  });

  return td;
}

/** UI artifact lines to strip from exported markdown (feedback, link status). */
const UI_ARTIFACT_LINES = new Set([
  'Creating a public link…',
  'Good response',
  'Bad response',
  'Use code with caution.',
]);

export function stripUiArtifacts(md: string): string {
  return md
    .split('\n')
    .filter((line) => !UI_ARTIFACT_LINES.has(line.trim()))
    .join('\n');
}

/**
 * Extract user query text from the turn (e.g. "mermaid diagram icons").
 */
export function getUserQuery(root: Element): string {
  const heading = root.querySelector(
    '.VndcI.veK2kb, .sUKAcb span[role="heading"], [aria-level="2"]'
  );
  if (heading) return heading.textContent?.trim() ?? '';
  const firstHeading = root.querySelector('.ilZyRc .sUKAcb span');
  return firstHeading ? (firstHeading.textContent?.trim() ?? '') : '';
}

/**
 * Convert conversation root to markdown string.
 */
export function toMarkdown(root: Element): string {
  const clean = cleanForMarkdown(root);
  if (!clean) return '';

  normalizeCodeBlocks(clean);

  const userQuery = getUserQuery(root);
  const td = createTurndown();

  const mainCol =
    clean.querySelector('[data-container-id="main-col"]') ?? clean;
  let bodyMd = td.turndown(mainCol as HTMLElement);

  // Normalize whitespace
  bodyMd = bodyMd.replace(/\n{3,}/g, '\n\n').replace(/^\s+|\s+$/g, '');

  // Strip recurring Google AI UI lines that may slip through (feedback, link status)
  bodyMd = stripUiArtifacts(bodyMd);

  if (!userQuery.trim() && !bodyMd.trim()) return '';

  const parts: string[] = [];
  if (userQuery.trim()) {
    parts.push('### User\n\n' + userQuery.trim() + '\n\n');
  }
  parts.push('### Assistant\n\n' + bodyMd);
  return parts.join('');
}
