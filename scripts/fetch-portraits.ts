// Downloads each faculty member's hotlinked "Picture" URL, converts it to a
// capped-size .webp, and stores it under public/portraits/ so the site no
// longer depends on external hosts staying up (mirrors vietprofs' approach:
// see ../vietprofs/scripts/fetch-portraits.ts).
//
// Usage: tsx scripts/fetch-portraits.ts [--dry-run] [--name "Full Name"]
import { readFile, writeFile, mkdir, unlink } from 'node:fs/promises';
import { existsSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import https from 'node:https';
import http from 'node:http';
import { slugify } from './generate-profile-pages.ts';

const root = resolve(import.meta.dirname, '..');
const facultyPath = resolve(root, 'public/faculty.json');
const portraitsDir = resolve(root, 'public/portraits');
const dryRun = process.argv.includes('--dry-run');
const nameFilterIdx = process.argv.indexOf('--name');
const nameFilter = nameFilterIdx !== -1 ? process.argv[nameFilterIdx + 1]?.toLowerCase() : null;

// GMU's Drupal image-style derivatives (/sites/default/files/styles/{style}/public/...)
// get served as AVIF, which this box's ImageMagick can't decode. The original,
// un-derived file at /sites/default/files/... is a plain JPEG/PNG, so prefer that.
function preferOriginalAsset(url: string): string {
  return url.replace(/\/sites\/default\/files\/styles\/[^/]+\/public\//, '/sites/default/files/');
}

// Extension guessed from the URL's path only (not its query string) — Google
// Scholar photo URLs like ".../citations?...&citpid=3" have no extension in
// the path at all, so a naive split('.') on the whole URL grabs garbage
// (e.g. picking up ".com" from the hostname) and produces an invalid filename.
function guessExtension(url: string): string {
  let pathname: string;
  try {
    pathname = new URL(url).pathname;
  } catch {
    pathname = url;
  }
  const match = /\.([a-z0-9]{2,5})$/i.exec(pathname);
  return match ? match[1] : 'jpg';
}

// Some internal GMU lab sites (e.g. cnslab.cs.gmu.edu) present certs Node
// won't trust by default; retry over a connection that skips verification
// rather than failing outright, mirroring what a browser+"proceed anyway" or
// `curl -k` would do for these known-internal academic hosts.
function insecureDownload(url: string): Promise<Buffer> {
  return new Promise((resolvePromise, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, {
      rejectUnauthorized: false,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GMUCSDirectoryBot/1.0)' },
    }, res => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        insecureDownload(new URL(res.headers.location, url).toString()).then(resolvePromise, reject);
        return;
      }
      if (!res.statusCode || res.statusCode >= 400) { reject(new Error(`HTTP ${res.statusCode}`)); return; }
      const chunks: Buffer[] = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolvePromise(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function downloadToFile(url: string, destPath: string): Promise<void> {
  const resolved = preferOriginalAsset(url);
  let buf: Buffer;
  try {
    const res = await fetch(resolved, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GMUCSDirectoryBot/1.0)' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    buf = Buffer.from(await res.arrayBuffer());
  } catch (err) {
    const cause = err instanceof Error && err.cause instanceof Error ? err.cause.message : '';
    const message = `${err instanceof Error ? err.message : String(err)} ${cause}`;
    if (!/certificate|self.signed|unable to verify/i.test(message)) throw err;
    buf = await insecureDownload(resolved);
  }
  if (buf.length < 512) throw new Error(`response too small (${buf.length} bytes), likely not an image`);
  await writeFile(destPath, buf);
}

function convertToWebp(sourcePath: string, destPath: string): void {
  const args = [sourcePath, '-auto-orient', '-strip', '-resize', '1200x1200>', '-quality', '86', destPath];
  try {
    execFileSync('magick', args, { stdio: 'pipe' });
  } catch {
    // ImageMagick on this box has no AVIF/HEIF decode delegate, but some GMU
    // asset paths serve AVIF even at what looks like the "original" file path
    // — decode with ffmpeg to an intermediate PNG first, then convert as usual.
    const pngPath = `${sourcePath}.decoded.png`;
    execFileSync('ffmpeg', ['-y', '-i', sourcePath, '-frames:v', '1', pngPath], { stdio: 'pipe' });
    try {
      execFileSync('magick', [pngPath, '-auto-orient', '-strip', '-resize', '1200x1200>', '-quality', '86', destPath], { stdio: 'pipe' });
    } finally {
      unlinkSync(pngPath);
    }
  }
}

// Rebuilds the record with "Picture Source" immediately after "Picture" (the
// data-contract test asserts an exact key order), preserving every other
// field/value and its position.
function withPictureSourceField(f: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(f)) {
    if (key === 'Picture Source') continue; // re-inserted right after Picture below
    out[key] = f[key];
    if (key === 'Picture') out['Picture Source'] = f['Picture Source'] ?? '';
  }
  return out;
}

async function main() {
  await mkdir(portraitsDir, { recursive: true });
  const rawFaculty = JSON.parse(await readFile(facultyPath, 'utf8'));
  const faculty = rawFaculty.map(withPictureSourceField);

  let converted = 0;
  let skipped = 0;
  let failed = 0;

  for (const f of faculty) {
    const fullName = `${f['First Name'] || ''} ${f['Last Name'] || ''}`.trim();
    const picture = (f['Picture'] || '').trim();

    if (!picture || picture.startsWith('portraits/')) { skipped++; continue; }
    if (!/^https?:\/\//i.test(picture)) { skipped++; continue; }
    if (nameFilter && !fullName.toLowerCase().includes(nameFilter)) { skipped++; continue; }

    const filename = `${slugify(fullName)}.webp`;
    const destPath = resolve(portraitsDir, filename);
    const ext = guessExtension(picture);
    const tmpPath = resolve(portraitsDir, `.tmp-${slugify(fullName)}.${ext}`);

    if (dryRun) {
      console.log(`[dry-run] would fetch ${fullName}: ${picture} -> portraits/${filename}`);
      continue;
    }

    try {
      await downloadToFile(picture, tmpPath);
      convertToWebp(tmpPath, destPath);
      f['Picture'] = `portraits/${filename}`;
      f['Picture Source'] = picture;
      converted++;
      console.log(`✓ ${fullName} -> portraits/${filename}`);
    } catch (err) {
      failed++;
      console.warn(`✗ ${fullName}: ${err instanceof Error ? err.message : err}`);
    } finally {
      if (existsSync(tmpPath)) await unlink(tmpPath);
    }
  }

  if (!dryRun) {
    await writeFile(facultyPath, JSON.stringify(faculty, null, 4));
  }

  console.log(`\nConverted: ${converted}, skipped: ${skipped}, failed: ${failed}`);
}

main();
