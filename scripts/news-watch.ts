// Watches every current faculty member's homepage, lab site (and the news/people subpages logged
// in maintenance/news-scan.json), official GMU bio, and CV, plus the department news pages, and
// reports the text lines that are new since the last snapshot (TASKS/AUTOMATION.md, "Faculty news
// and honors"). The scheduled news routine reads only what changed instead of re-reading every
// page twice a week.
//
// Usage: tsx scripts/news-watch.ts [--write] [--from <path>] [--report <path>] [--only <url>]
//
// The snapshot (maintenance/news-watch.json) stores short hashes of each page's text lines, not
// the text. `--write` updates it (a failed fetch keeps the old hashes). `--from` diffs against
// another copy of the snapshot, such as the one on an open [scheduled:news] PR branch saved to a
// file. `--report` writes the full JSON report there; stdout gets a short summary.
// CVs are found by following CV/vita/resume links on the homepage and lab site; PDFs are read with
// `pdftotext` (poppler-utils).
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);
const root = new URL('..', import.meta.url);
const read = (file: string) => JSON.parse(fs.readFileSync(new URL(file, root), 'utf8'));
const arg = (name: string) => {
    const i = process.argv.indexOf(name);
    return i < 0 ? undefined : process.argv[i + 1];
};
const snapshotFile = new URL('maintenance/news-watch.json', root);

type Kind = 'site' | 'bio' | 'cv' | 'department';
type Entry = { kind: Kind; people: string; fetched: string; status: string; lines: string };
type Snapshot = { _about: string; lastRun: string; sources: Record<string, Entry> };
type Source = { url: string; kind: Kind; people: string[] };

// Department news pages credit people the faculty sites may not mention.
const DEPARTMENT = ['https://cs.gmu.edu/news/', 'https://cec.gmu.edu/news'];
// A link counts as a CV when its text, or its file name, is a CV word on its own ("[CV]",
// "Curriculum Vitae", "resume.pdf", "Smith_CV.pdf"); "cvpr" or "iccv" don't match.
const CV_WORD = /(^|[^a-z])(cv|c\.v\.|vita|vitae|resume|résumé|curriculum[\s_-]*vitae)([^a-z]|$)/i;

const canonical = (raw: string) => {
    const url = new URL(/^https?:\/\//.test(raw) ? raw : `https://${raw}`);
    url.hash = '';
    return url.href.replace(/\/$/, '');
};

// Official bios are cs.gmu.edu/profiles/<slug>, but the slug isn't always the netid, so map names
// to the profile links on the department's listing pages, falling back to the netid.
const normalize = (name: string) => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\([^)]*\)/g, ' ')
    .toLowerCase().replace(/[^a-z\s-]/g, '').replace(/[\s-]+/g, ' ').trim();
async function profileLinks(): Promise<Map<string, string>> {
    const links = new Map<string, string>();
    for (const listing of ['https://cs.gmu.edu/people/faculty', 'https://cs.gmu.edu/people/faculty/affiliate-faculty', 'https://cs.gmu.edu/people/faculty/emeriti-faculty']) {
        for (let page = 0; page < 20; page++) {
            const html = await fetchHtml(`${listing}?page=${page}`);
            const found = [...html.matchAll(/view-profile-title"><a href="(\/profiles\/[^"]+)"[^>]*>([^<]+)</g)];
            // Stop at an empty page, or one that repeats names already seen (past the last page).
            const fresh = found.filter(([, , name]) => !links.has(normalize(decode(name))));
            for (const [, href, name] of fresh) links.set(normalize(decode(name)), `https://cs.gmu.edu${href}`);
            if (!fresh.length) break;
            await sleep(1000);
        }
    }
    return links;
}
function profileFor(links: Map<string, string>, first: string, last: string, netid: string): string {
    const exact = links.get(normalize(`${first} ${last}`));
    if (exact) return exact;
    // "Jim Chen" vs "James Chen", or a middle name on one side: same last name and first initial, if unique.
    const lastName = normalize(last), initial = normalize(first)[0];
    const close = [...links].filter(([name]) => name.endsWith(` ${lastName}`) && name[0] === initial);
    if (close.length === 1) return close[0][1];
    return netid ? `https://cs.gmu.edu/profiles/${netid}` : '';
}

function watchList(profiles: Map<string, string>): Source[] {
    const faculty = read('public/faculty.json') as Record<string, string>[];
    const scan = read('maintenance/news-scan.json') as { sources: { url: string; status: string }[] };
    const byUrl = new Map<string, Source>();
    const add = (raw: string, kind: Kind, name?: string) => {
        const url = canonical(raw);
        const item = byUrl.get(url) || { url, kind, people: [] };
        if (name && !item.people.includes(name)) item.people.push(name);
        byUrl.set(url, item);
        return url;
    };
    const hostPeople = new Map<string, Set<string>>();
    for (const row of faculty) {
        if (row.Former === 'Yes' || row['Tenure-Track/Teaching/Staff'] === 'Staff') continue;
        const name = `${row['First Name']} ${row['Last Name']}`;
        for (const raw of [row.Website, row['Lab Website']].filter(Boolean)) {
            const host = new URL(add(raw, 'site', name)).host;
            if (!hostPeople.has(host)) hostPeople.set(host, new Set());
            hostPeople.get(host)!.add(name);
        }
        const bio = profileFor(profiles, row['First Name'], row['Last Name'], (row['gmu email/userid'] || '').split('@')[0]);
        if (bio) add(bio, 'bio', name);
    }
    // Subpages logged by earlier news reviews (news archives, people pages) on a faculty site's
    // host. One-off historical sources (PDFs, award lists elsewhere) aren't watched.
    for (const source of scan.sources) {
        if (source.status !== 'checked' || /\.pdf$/i.test(source.url)) continue;
        const url = canonical(source.url);
        const host = new URL(url).host;
        if (byUrl.has(url) || !hostPeople.has(host) || host === 'cs.gmu.edu') continue;
        for (const name of hostPeople.get(host)!) add(url, 'site', name);
    }
    for (const url of DEPARTMENT) add(url, 'department');
    return [...byUrl.values()];
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '-', mdash: '-', rsquo: "'", lsquo: "'", ldquo: '"', rdquo: '"' };
const decode = (text: string) => text.replace(/&(#\d+|#x[\da-f]+|\w+);/gi, (m, e: string) =>
    e[0] === '#' ? String.fromCodePoint(e[1]?.toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : ENTITIES[e.toLowerCase()] ?? m);
const toLines = (text: string) => [...new Set(text.split('\n').map(line => line.replace(/\s+/g, ' ').trim()).filter(line => line.length >= 15))];
const htmlLines = (html: string) => toLines(decode(html
    .replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(br|\/p|\/div|\/li|\/h\d|\/tr|\/dd|\/dt|hr)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')));
function cvLinks(html: string, base: string): string[] {
    const found = new Set<string>();
    for (const [, href, text] of html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
        const label = decode(text.replace(/<[^>]+>/g, ' ')).trim();
        let url: URL;
        try {
            url = new URL(decode(href), base);
        } catch { continue; /* malformed href */ }
        let file = url.pathname.split('/').filter(Boolean).pop() || '';
        try { file = decodeURIComponent(file); } catch { /* keep it encoded */ }
        // Short link text only: a sentence that mentions a CV isn't a CV link.
        const isCv = (label.length <= 40 && CV_WORD.test(label)) || CV_WORD.test(file);
        if (isCv && /^https?:$/.test(url.protocol) && !/linkedin\.com|scholar\.google/.test(url.host)) found.add(canonical(url.href));
    }
    return [...found];
}
const hash = (line: string) => createHash('sha1').update(line.toLowerCase()).digest('hex').slice(0, 8);

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
async function fetchHtml(url: string): Promise<string> {
    try {
        const { stdout } = await run('curl', ['-sL', '--compressed', '--max-time', '40', '-A', 'Mozilla/5.0 (compatible; GMU-CS-Directory news watch)', url], { maxBuffer: 50 * 1024 * 1024 });
        return stdout;
    } catch {
        return '';
    }
}
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'news-watch-'));
let fileNo = 0;
// Throttling (403/429/444), server errors, and timeouts get one slower retry.
async function fetchPage(url: string): Promise<{ status: string; lines: string[]; cvs: string[] }> {
    const first = await fetchOnce(url);
    if (!/^(http (403|429|444|5\d\d)|error)/.test(first.status)) return first;
    await sleep(5000);
    return fetchOnce(url);
}
async function fetchOnce(url: string): Promise<{ status: string; lines: string[]; cvs: string[] }> {
    const file = path.join(tmp, `page-${fileNo++}`);
    try {
        // curl -k: people.cs.gmu.edu and some lab hosts send incomplete TLS chains; read-only.
        const { stdout } = await run('curl', ['-skL', '--compressed', '--max-time', '40', '-A', 'Mozilla/5.0 (compatible; GMU-CS-Directory news watch)',
            '-o', file, '-w', '%{http_code} %{content_type} %{url_effective}', url]);
        const [code, type = '', effective = url] = stdout.trim().split(' ');
        if (!code.startsWith('2')) return { status: `http ${code}`, lines: [], cvs: [] };
        const head = fs.readFileSync(file).subarray(0, 5).toString('latin1');
        if (/pdf/i.test(type) || head === '%PDF-') {
            const { stdout: text } = await run('pdftotext', [file, '-'], { maxBuffer: 50 * 1024 * 1024 });
            const lines = toLines(text);
            return { status: lines.length < 3 ? 'thin' : 'ok', lines, cvs: [] };
        }
        const html = fs.readFileSync(file, 'utf8');
        const lines = htmlLines(html);
        return { status: lines.length < 3 ? 'thin' : 'ok', lines, cvs: cvLinks(html, effective) };
    } catch (error) {
        // curl exit codes: 6 host not found, 7 refused, 28 timeout, 35 TLS failure.
        const code = (error as { code?: number | string }).code;
        return { status: typeof code === 'number' ? `error curl exit ${code}` : `error ${(error as Error).message.split('\n')[0].slice(0, 80)}`, lines: [], cvs: [] };
    } finally {
        fs.rmSync(file, { force: true });
    }
}

const today = new Date().toISOString().slice(0, 10);
const fromPath = arg('--from');
const snapshot: Snapshot = fromPath ? JSON.parse(fs.readFileSync(fromPath, 'utf8'))
    : fs.existsSync(snapshotFile) ? JSON.parse(fs.readFileSync(snapshotFile, 'utf8')) : { _about: '', lastRun: '', sources: {} };
snapshot._about = 'Line hashes of each watched page, written by `npm run news:watch -- --write` (scripts/news-watch.ts). Not a review log: maintenance/news-scan.json records what was actually read.';
const only = arg('--only');

type Change = Source & { since: string; newLines: string[]; more: number };
const report = { date: today, since: snapshot.lastRun, watched: 0, changed: [] as Change[], baseline: [] as Source[], failed: [] as (Source & { status: string; lastFetched: string })[], thin: [] as Source[], unchanged: 0 };
const watched = new Set<string>();

async function check(sources: Source[]): Promise<Source[]> {
    const discovered = new Map<string, Source>();
    const queue = sources.filter(source => !watched.has(source.url) && (!only || source.url === canonical(only)));
    for (const source of queue) watched.add(source.url);
    // Eight fetches at a time overall, but one at a time per host with a pause between them, so
    // cs.gmu.edu (100+ profile pages) doesn't start refusing requests.
    const busy = new Set<string>();
    const next = async (): Promise<Source | undefined> => {
        while (queue.length) {
            const i = queue.findIndex(source => !busy.has(new URL(source.url).host));
            if (i >= 0) {
                const [source] = queue.splice(i, 1);
                busy.add(new URL(source.url).host);
                return source;
            }
            await sleep(200);
        }
        return undefined;
    };
    const release = async (source: Source) => {
        await sleep(1000);
        busy.delete(new URL(source.url).host);
    };
    await Promise.all(Array.from({ length: 8 }, async () => {
        for (let source = await next(); source; source = await next()) {
            try {
                const page = await fetchPage(source.url);
                const prior = snapshot.sources[source.url];
                const entry = { kind: source.kind, people: source.people.join('; ') };
                if (page.status !== 'ok' && page.status !== 'thin') {
                    report.failed.push({ ...source, status: page.status, lastFetched: prior?.fetched || '' });
                    snapshot.sources[source.url] = { ...entry, fetched: prior?.fetched || '', status: page.status, lines: prior?.lines || '' };
                    // A CV we can't reach this time stays watched through the snapshot.
                    continue;
                }
                for (const cv of page.cvs) {
                    if (source.kind !== 'site') break;
                    const item = discovered.get(cv) || { url: cv, kind: 'cv' as const, people: [] };
                    for (const name of source.people) if (!item.people.includes(name)) item.people.push(name);
                    discovered.set(cv, item);
                }
                const hashes = page.lines.map(hash);
                if (page.status === 'thin') report.thin.push(source);
                if (!prior?.lines) report.baseline.push(source);
                else {
                    const seen = new Set(prior.lines.split(' '));
                    const added = page.lines.filter((_, i) => !seen.has(hashes[i]));
                    if (added.length) report.changed.push({ ...source, since: prior.fetched, newLines: added.slice(0, 80), more: Math.max(0, added.length - 80) });
                    else report.unchanged++;
                }
                snapshot.sources[source.url] = { ...entry, fetched: today, status: page.status, lines: [...new Set(hashes)].sort().join(' ') };
            } finally {
                await release(source);
            }
        }
    }));
    return [...discovered.values()];
}

const profiles = await profileLinks();
const current = watchList(profiles);
const currentPeople = new Set(current.flatMap(source => source.people));
const cvs = await check(current);
// CVs found on earlier runs stay watched while their people are current, even if the homepage
// link moved or the homepage failed this time.
for (const [url, entry] of Object.entries(snapshot.sources)) {
    if (entry.kind !== 'cv' || cvs.some(cv => cv.url === url)) continue;
    const people = entry.people.split('; ').filter(name => currentPeople.has(name));
    if (people.length) cvs.push({ url, kind: 'cv', people });
}
await check(cvs);
report.watched = watched.size;
fs.rmSync(tmp, { recursive: true, force: true });

if (process.argv.includes('--write')) {
    snapshot.lastRun = today;
    if (!only) for (const url of Object.keys(snapshot.sources)) if (!watched.has(url)) delete snapshot.sources[url];
    const sources = Object.fromEntries(Object.entries(snapshot.sources).sort(([a], [b]) => a.localeCompare(b)));
    fs.writeFileSync(snapshotFile, `${JSON.stringify({ ...snapshot, sources }, null, 4)}\n`);
}
const reportPath = arg('--report');
if (reportPath) fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 4)}\n`);
const count = (kind: Kind) => [...watched].filter(url => snapshot.sources[url]?.kind === kind).length;
console.log(JSON.stringify({
    date: today, since: report.since, watched: report.watched, profilesListed: profiles.size,
    byKind: { site: count('site'), bio: count('bio'), cv: count('cv'), department: count('department') },
    changed: report.changed.map(c => `${c.kind} ${c.url} (${c.newLines.length + c.more} new lines)`),
    baseline: report.baseline.length, unchanged: report.unchanged,
    failed: report.failed.map(f => `${f.kind} ${f.url}: ${f.status}`),
    thin: report.thin.map(t => `${t.kind} ${t.url}`),
    detail: reportPath ? `full report in ${reportPath}` : 'pass --report <path> for the new lines',
}, null, 4));
