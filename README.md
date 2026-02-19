# Google AI to Markdown

Chrome extension: export the current Google AI (Gemini) conversation to Markdown with one click.

## How to use

### Install manually (load unpacked)

1. **Clone and install:**  
   `git clone <repo-url> && cd google-ai-to-markdown && npm install`

2. **Build:**  
   `npm run build`  
   (This compiles the TypeScript and writes `dist/content.js` and `popup/popup.js`.)

3. **Load in Chrome:**  
   - Open `chrome://extensions`
   - Turn on **Developer mode**
   - Click **Load unpacked**
   - Select this project folder (the one that contains `manifest.json`)

4. **Export a conversation**
   - Open a Google Search page that shows an AI overview / conversation (e.g. search something and open the AI answer).
   - Click the extension icon in the toolbar.
   - Click **Export conversation to Markdown**.
   - Copy to clipboard or **Download as .md file**.

## Requirements

- Chrome (Manifest V3)
- The extension only runs on `https://www.google.com/*` and `https://*.google.com/*`. You must be on a page that already shows the AI conversation (e.g. after a search with AI overview).

## Development

After cloning the repo:

1. **Install dependencies:** `npm install`
2. **Build:** `npm run build`
3. **Lint:** `npm run lint`
4. **Test:** `npm run test`

See the **Scripts** table below for all available commands.

## Project layout

- `manifest.json` – extension manifest (MV3)
- `popup/` – popup UI (Export, Copy, Download). Source: `popup/popup.ts` → built to `popup/popup.js`
- `content/content.ts` – entry that finds the conversation DOM; `content/conversation.ts` – pure conversion logic. Built to `dist/content.js` via [Turndown](https://github.com/mixmark-io/turndown)
- `types/messages.ts` – shared message types (content ↔ popup)
- `icons/` – toolbar icons (PNGs are committed; run `npm run icons:generate` to regenerate from `icon.svg` if you change it)
- `scripts/` – build and tooling (sync version, generate icons)
- `tests/` – Vitest tests (message contract, conversation/DOM helpers, fixture)

## Scripts

| Script                   | Description                          |
| ------------------------ | ------------------------------------ |
| `npm run build`          | Build content and popup from TS      |
| `npm run typecheck`      | TypeScript check (`tsc --noEmit`)    |
| `npm run lint`           | Run ESLint                           |
| `npm run lint:fix`       | ESLint with auto-fix                 |
| `npm run format`         | Format with Prettier                 |
| `npm run format:check`   | Check formatting (CI)                |
| `npm run test`           | Run Vitest tests                     |
| `npm run test:watch`     | Vitest watch mode                    |
| `npm run ci`             | typecheck + lint + test + build      |
| `npm run icons:generate` | Regenerate PNG icons from `icon.svg` (optional) |

## Versioning

The project uses [Conventional Commits](https://www.conventionalcommits.org/) and [semantic-release](https://github.com/semantic-release/semantic-release). On push to `main`/`master`, CI runs semantic-release: it reads commits since the last tag, determines the next version (`feat:` → minor, `fix:` → patch, `BREAKING CHANGE:`/`feat!:`/`fix!:` → major), updates `package.json`, and pushes a release commit and tag (e.g. `v1.2.3`). The extension version is kept in sync with `package.json` via a build step that writes it into `manifest.json`.

## License

MIT — see [LICENSE](LICENSE).
