/**
 * Sync version from package.json to manifest.json.
 * Run at the start of every build so the extension version stays in sync
 * with package.json (updated by semantic-release).
 */
const path = require('path');
const fs = require('fs');

const root = path.resolve(__dirname, '..');
const pkgPath = path.join(root, 'package.json');
const manifestPath = path.join(root, 'manifest.json');

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

manifest.version = pkg.version;
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Synced version to manifest.json:', pkg.version);
