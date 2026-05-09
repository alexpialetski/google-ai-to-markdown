/**
 * Produces dist/ as a complete unpacked MV3 extension — load only dist/ in Chrome.
 */
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');

function rmDist() {
  fs.rmSync(dist, { recursive: true, force: true });
}

function syncManifest() {
  const pkgPath = path.join(root, 'package.json');
  const manifestSrcPath = path.join(root, 'manifest.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  const manifest = JSON.parse(fs.readFileSync(manifestSrcPath, 'utf-8'));
  manifest.version = pkg.version;
  const json = JSON.stringify(manifest, null, 2) + '\n';
  fs.mkdirSync(dist, { recursive: true });
  fs.writeFileSync(path.join(dist, 'manifest.json'), json);
  fs.writeFileSync(manifestSrcPath, json);
  console.log('Synced version to manifest.json and dist/manifest.json:', pkg.version);
}

async function bundle() {
  await esbuild.build({
    entryPoints: [path.join(root, 'content/content.ts')],
    bundle: true,
    outfile: path.join(dist, 'content.js'),
    platform: 'browser',
  });
  console.log('Built dist/content.js');
  await esbuild.build({
    entryPoints: [path.join(root, 'popup/popup.ts')],
    bundle: true,
    outfile: path.join(dist, 'popup/popup.js'),
    platform: 'browser',
  });
  console.log('Built dist/popup/popup.js');
}

function copyStatics() {
  const popupDir = path.join(dist, 'popup');
  fs.mkdirSync(popupDir, { recursive: true });
  fs.copyFileSync(path.join(root, 'popup/popup.html'), path.join(popupDir, 'popup.html'));

  const iconsSrc = path.join(root, 'icons');
  const iconsDst = path.join(dist, 'icons');
  fs.mkdirSync(iconsDst, { recursive: true });
  for (const name of fs.readdirSync(iconsSrc)) {
    const src = path.join(iconsSrc, name);
    if (fs.statSync(src).isFile()) {
      fs.copyFileSync(src, path.join(iconsDst, name));
    }
  }
  console.log('Copied popup HTML and icons');
}

async function main() {
  rmDist();
  syncManifest();
  await bundle();
  copyStatics();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
