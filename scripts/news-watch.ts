// Watches every current faculty member's homepage, lab site (and the news/people subpages logged
// in maintenance/news-scan.json) and CV, plus the department news pages, and
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
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { bundleLines, canonical, cvLinks, hash, htmlLines, metaRefresh, scriptSources, toLines } from './news-watch-lib.ts';

const run = promisify(execFile);
const root = new URL('..', import.meta.url);
const read = (file: string) => JSON.parse(fs.readFileSync(new URL(file, root), 'utf8'));
const arg = (name: string) => {
    const i = process.argv.indexOf(name);
    return i < 0 ? undefined : process.argv[i + 1];
};
const snapshotFile = new URL('maintenance/news-watch.json', root);

type Kind = 'site' | 'cv' | 'department';
type Entry = { kind: Kind; people: string; fetched: string; status: string; lines: string };
type Snapshot = { _about: string; lastRun: string; sources: Record<string, Entry> };
type Source = { url: string; kind: Kind; people: string[] };

// Department news pages credit people the faculty sites may not mention.
// gmu.edu/news/all lists every university headline; the model reads only the new ones.
const DEPARTMENT = ['https://cs.gmu.edu/news/', 'https://cec.gmu.edu/news', 'https://www.gmu.edu/news/all'];

function watchList(): Source[] {
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


const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'news-watch-'));
let fileNo = 0;
// Throttling (403/429/444), server errors, and timeouts get one slower retry.
async function fetchPage(url: string): Promise<{ status: string; lines: string[]; cvs: string[] }> {
    const first = await fetchOnce(url);
    if (!/^(http (403|429|444|5\d\d)|error)/.test(first.status)) return first;
    await sleep(5000);
    return fetchOnce(url);
}
type Download = { code: string; type: string; effective: string; file: string };
async function download(url: string): Promise<Download> {
    const file = path.join(tmp, `page-${fileNo++}`);
    // curl -k: people.cs.gmu.edu and some lab hosts send incomplete TLS chains; read-only.
    // -g: URLs like ".../[CV]JinweiYe.pdf" contain brackets curl would otherwise expand.
    const { stdout } = await run('curl', ['-skLg', '--compressed', '--max-time', '40', '--max-filesize', '20000000', '-A', 'Mozilla/5.0 (compatible; GMU-CS-Directory news watch)',
        '-o', file, '-w', '%{http_code}\t%{content_type}\t%{url_effective}', url]);
    // Tabs, not spaces: a content type like "text/html; charset=utf-8" contains a space.
    const [code, type = '', effective = url] = stdout.trim().split('\t');
    return { code, type, effective, file };
}
async function fetchOnce(url: string, hops = 0): Promise<{ status: string; lines: string[]; cvs: string[] }> {
    let page: Download | undefined;
    try {
        page = await download(url);
        if (!page.code.startsWith('2')) return { status: `http ${page.code}`, lines: [], cvs: [] };
        const head = fs.readFileSync(page.file).subarray(0, 5).toString('latin1');
        if (/pdf/i.test(page.type) || head === '%PDF-') {
            const { stdout: text } = await run('pdftotext', [page.file, '-'], { maxBuffer: 50 * 1024 * 1024 });
            const lines = toLines(text);
            return { status: lines.length < 3 ? 'thin' : 'ok', lines, cvs: [] };
        }
        const html = fs.readFileSync(page.file, 'utf8');
        let lines = htmlLines(html);
        let cvs = cvLinks(html, page.effective);
        if (lines.length < 3) {
            // A stub that forwards with <meta refresh>: read the page it forwards to.
            const target = hops < 3 ? metaRefresh(html, page.effective) : undefined;
            if (target && canonical(target) !== canonical(page.effective)) {
                const next = await fetchOnce(target, hops + 1);
                if (!next.status.startsWith('http') && !next.status.startsWith('error')) {
                    lines = [...new Set([...lines, ...next.lines])];
                    cvs = [...new Set([...cvs, ...next.cvs])];
                }
            } else {
                // A JavaScript app: its text is in its own bundle.
                for (const src of scriptSources(html, page.effective).slice(0, 4)) {
                    const js = await download(src).catch(() => undefined);
                    if (!js) continue;
                    if (js.code.startsWith('2')) lines = [...new Set([...lines, ...bundleLines(fs.readFileSync(js.file, 'utf8'))])];
                    fs.rmSync(js.file, { force: true });
                }
            }
        }
        return { status: lines.length < 3 ? 'thin' : 'ok', lines, cvs };
    } catch (error) {
        // curl exit codes: 6 host not found, 7 refused, 28 timeout, 35 TLS failure.
        const code = (error as { code?: number | string }).code;
        return { status: typeof code === 'number' ? `error curl exit ${code}` : `error ${(error as Error).message.split('\n')[0].slice(0, 80)}`, lines: [], cvs: [] };
    } finally {
        if (page) fs.rmSync(page.file, { force: true });
    }
}

const today = new Date().toISOString().slice(0, 10);
const fromPath = arg('--from');
const snapshot: Snapshot = fromPath ? JSON.parse(fs.readFileSync(fromPath, 'utf8'))
    : fs.existsSync(snapshotFile) ? JSON.parse(fs.readFileSync(snapshotFile, 'utf8')) : { _about: '', lastRun: '', sources: {} };
snapshot._about = 'Line hashes of each watched page, written by `npm run news:watch -- --write` (scripts/news-watch.ts). Not a review log: maintenance/news-scan.json records what was actually read.';
const only = arg('--only');

type Change = Source & { since: string; newLines: string[]; more: number };
const report = { date: today, since: snapshot.lastRun, watched: 0, changed: [] as Change[], baseline: [] as Source[], failed: [] as (Source & { status: string; lastFetched: string })[], dead: [] as (Source & { status: string })[], thin: [] as Source[], unchanged: 0 };
const watched = new Set<string>();

async function check(sources: Source[]): Promise<Source[]> {
    const discovered = new Map<string, Source>();
    const queue = sources.filter(source => !watched.has(source.url) && (!only || source.url === canonical(only)));
    for (const source of queue) watched.add(source.url);
    // Eight fetches at a time overall, but one at a time per host with a pause between them, so
    // one site (people.cs.gmu.edu hosts dozens of homepages) doesn't start refusing requests.
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
                // A CV link that 404s is broken on the faculty member's own site: not worth a retry
                // or a read, and not kept in the snapshot.
                if (source.kind === 'cv' && /^http (404|410)$/.test(page.status)) {
                    report.dead.push({ ...source, status: page.status });
                    delete snapshot.sources[source.url];
                    continue;
                }
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

const current = watchList();
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
    date: today, since: report.since, watched: report.watched,
    byKind: { site: count('site'), cv: count('cv'), department: count('department') },
    changed: report.changed.map(c => `${c.kind} ${c.url} (${c.newLines.length + c.more} new lines)`),
    baseline: report.baseline.length, unchanged: report.unchanged,
    failed: report.failed.map(f => `${f.kind} ${f.url}: ${f.status}`),
    dead: report.dead.map(d => `${d.kind} ${d.url}: ${d.status}`),
    thin: report.thin.map(t => `${t.kind} ${t.url}`),
    detail: reportPath ? `full report in ${reportPath}` : 'pass --report <path> for the new lines',
}, null, 4));
