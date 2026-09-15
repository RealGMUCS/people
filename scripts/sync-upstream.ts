import { copyFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const vietprofsRoot = resolve(root, '../vietprofs');

async function sync() {
  try {
    await access(vietprofsRoot);
  } catch {
    console.log('vietprofs directory not found alongside people, skipping sync.');
    return;
  }

  const files = [
    ['src/style.css', 'src/profile.css'],
    ['src/search-kit.ts', 'src/search-kit.ts'],
    ['src/utils.ts', 'src/utils.ts'],
    ['default-portrait.svg', 'public/default-portrait.svg'],
  ];

  for (const [srcRel, destRel] of files) {
    const srcPath = resolve(vietprofsRoot, srcRel);
    const destPath = resolve(root, destRel);
    try {
      await copyFile(srcPath, destPath);
      console.log(`Synced ${srcRel} -> ${destRel}`);
    } catch (err) {
      console.warn(`Failed to sync ${srcRel}:`, err);
    }
  }
}

await sync();
