import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';
import { describe, it, expect } from 'vitest';
import {
  cleanForMarkdown,
  getUserQuery,
  toMarkdown,
  stripUiArtifacts,
} from '../content/conversation';

function parseHtml(html: string): Element {
  const wrap = document.createElement('div');
  wrap.innerHTML = html;
  const first = wrap.firstElementChild;
  if (!first) throw new Error('No element');
  return first;
}

describe('stripUiArtifacts', () => {
  it('removes Good/Bad response, Creating a public link, and Use code with caution lines', () => {
    const md = [
      'Some content.',
      'Good response',
      'More content.',
      'Bad response',
      'Creating a public link…',
      'Use code with caution.',
      'End.',
    ].join('\n');
    const out = stripUiArtifacts(md);
    expect(out).toBe('Some content.\nMore content.\nEnd.');
  });

  it('leaves other lines unchanged', () => {
    const md = '## Head\n\nParagraph with Good stuff.\n\nAnother line.';
    expect(stripUiArtifacts(md)).toBe(md);
  });
});

describe('getUserQuery', () => {
  it('extracts from .VndcI.veK2kb', () => {
    const root = parseHtml(
      '<div><span class="VndcI veK2kb">mermaid diagram icons</span></div>'
    );
    expect(getUserQuery(root)).toBe('mermaid diagram icons');
  });

  it('extracts from .sUKAcb span', () => {
    const root = parseHtml(
      '<div class="ilZyRc"><div class="sUKAcb"><span>my query</span></div></div>'
    );
    expect(getUserQuery(root)).toBe('my query');
  });

  it('returns empty when no heading', () => {
    const root = parseHtml('<div><p>No heading here</p></div>');
    expect(getUserQuery(root)).toBe('');
  });
});

describe('cleanForMarkdown', () => {
  it('removes buttons and strips noise selectors', () => {
    const root = parseHtml(
      '<div><p>Keep</p><button>Remove</button><span class="rBl3me">X</span></div>'
    );
    const cleaned = cleanForMarkdown(root);
    expect(cleaned).not.toBeNull();
    expect(cleaned!.querySelector('button')).toBeNull();
    expect(cleaned!.querySelector('.rBl3me')).toBeNull();
    expect(cleaned!.querySelector('p')?.textContent).toBe('Keep');
  });

  it('removes .P8PNlb (Use code with caution disclaimer)', () => {
    const root = parseHtml(
      '<div><p>Code below.</p><div class="P8PNlb">Use code with caution.</div></div>'
    );
    const cleaned = cleanForMarkdown(root);
    expect(cleaned).not.toBeNull();
    expect(cleaned!.querySelector('.P8PNlb')).toBeNull();
    expect(cleaned!.querySelector('p')?.textContent).toBe('Code below.');
  });

  it('returns null for null input', () => {
    expect(cleanForMarkdown(null)).toBeNull();
  });
});

describe('toMarkdown', () => {
  it('produces ### User / ### Assistant and body for minimal turn', () => {
    const root = parseHtml(
      '<div data-container-id="main-col">' +
        '<span class="VndcI veK2kb">the query</span>' +
        '<p>Some <strong>bold</strong> text.</p>' +
        '</div>'
    );
    const md = toMarkdown(root);
    expect(md).toContain('### User');
    expect(md).toContain('the query');
    expect(md).toContain('### Assistant');
    expect(md).toContain('Some');
    expect(md).toContain('**bold**');
  });

  it('converts .otQkpb strong.Yjhzub to ### heading', () => {
    const root = parseHtml(
      '<div data-container-id="main-col">' +
        '<div class="otQkpb"><strong class="Yjhzub">1. Section Title</strong></div>' +
        '<p>Body</p>' +
        '</div>'
    );
    const md = toMarkdown(root);
    expect(md).toContain('###');
    expect(md).toContain('Section Title');
    expect(md).toContain('Body');
  });

  it('outputs fenced code block with language when .r1PmQe block present', () => {
    const root = parseHtml(
      '<div data-container-id="main-col">' +
        '<span class="VndcI veK2kb">show code</span>' +
        '<div class="r1PmQe">' +
        '<div class="z0e9Qd"><div class="vVRw1d">mermaid</div></div>' +
        '<div class="pCTyYe"><pre><code>graph LR\n  A --> B</code></pre></div>' +
        '</div>' +
        '</div>'
    );
    const md = toMarkdown(root);
    expect(md).toContain('```mermaid');
    expect(md).toContain('graph LR');
    expect(md).toContain('A --> B');
    expect(md).toContain('```');
  });

  it('omits "Use code with caution." when P8PNlb is present in DOM', () => {
    const root = parseHtml(
      '<div data-container-id="main-col">' +
        '<span class="VndcI veK2kb">run this</span>' +
        '<p>Here is code:</p>' +
        '<div class="r1PmQe">' +
        '<div class="z0e9Qd"><div class="vVRw1d">javascript</div></div>' +
        '<div class="pCTyYe"><pre><code>console.log(1);</code></pre></div>' +
        '<div class="LIBz9e"><div class="P8PNlb">Use code with caution.</div></div>' +
        '</div>' +
        '</div>'
    );
    const md = toMarkdown(root);
    expect(md).not.toContain('Use code with caution');
    expect(md).toContain('```javascript');
    expect(md).toContain('console.log(1);');
  });

  it('returns empty string for empty root', () => {
    const root = parseHtml('<div></div>');
    const md = toMarkdown(root);
    expect(md.trim()).toBe('');
  });
});

describe('toMarkdown with fixture (google-ai-turn.html)', () => {
  it('extracts user query and section heading from trimmed fixture', () => {
    const fixturePath = path.join(__dirname, 'fixtures', 'google-ai-turn.html');
    const html = fs.readFileSync(fixturePath, 'utf-8');
    const { document } = new JSDOM(html).window;
    const root = document.querySelector('div[data-processed="true"]');
    expect(root).not.toBeNull();
    const md = toMarkdown(root!);
    expect(md).toContain('### User');
    expect(md).toContain('mermaid diagram icons');
    expect(md).toContain('### Assistant');
    expect(md).toContain('Architecture Diagrams');
    expect(md).toContain('various icons');
  });
});

describe('multi-turn export', () => {
  it('joins multiple turns with separator', () => {
    const fixturePath = path.join(
      __dirname,
      'fixtures',
      'google-ai-two-turns.html'
    );
    const html = fs.readFileSync(fixturePath, 'utf-8');
    const { document } = new JSDOM(html).window;
    const scope =
      document.querySelector('[data-xid="aim-mars-turn-root"]') ?? document;
    const turns = Array.from(scope.querySelectorAll('[data-scope-id="turn"]'));
    expect(turns.length).toBe(2);
    const parts = turns
      .map((turn) => toMarkdown(turn))
      .filter((md) => md.trim().length > 0);
    const markdown = parts.join('\n\n---\n\n');
    expect(markdown).toContain('### User');
    expect(markdown).toContain('first question');
    expect(markdown).toContain('### Assistant');
    expect(markdown).toContain('First answer.');
    expect(markdown).toContain('second question');
    expect(markdown).toContain('Second answer.');
    expect(markdown).toContain('\n\n---\n\n');
  });
});
