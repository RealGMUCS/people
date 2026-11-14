// Structured news feeds for the scheduled news routine (TASKS/AUTOMATION.md, "Faculty news and
// honors", pass 2): new NSF awards to roster faculty at George Mason, new funding of any kind
// (federal, state, industry, foundation) from the CEC grants list, and new papers by roster
// faculty at flagship venues (OpenAlex, filtered to GMU authorships). Faculty sites announce these
// late or never; the funder, college, and bibliographic records give a date and a source.
//
// Usage: tsx scripts/news-feeds.ts [--write] [--from <path>] [--report <path>] [--since YYYY-MM-DD]
//
// The state file (maintenance/news-feeds.json) remembers the NSF award, CEC entry, and OpenAlex ids already
// reported, so each run lists only new ones. `--write` updates it. `--from` reads another copy of it
// (an open [scheduled:news] PR's). The window starts 45 days before the last run (records are
// indexed late) or, on the first run, 120 days ago; `--since` overrides it.
// Set GMU_CS_OPENALEX_API_KEY (preferred: a key of this site's own) or OPENALEX_API_KEY for
// OpenAlex's per-key daily budget; without one, requests share the free pool and often fail.
import fs from 'node:fs';
import { CEC_GRANTS, type CecItem, cecEntries, fold, MINOR_TRACK, nameKey, nameKeys, TOP_VENUE } from './news-watch-lib.ts';

const root = new URL('..', import.meta.url);
const read = (file: string) => JSON.parse(fs.readFileSync(new URL(file, root), 'utf8'));
const arg = (name: string) => {
    const i = process.argv.indexOf(name);
    return i < 0 ? undefined : process.argv[i + 1];
};
const stateFile = new URL('maintenance/news-feeds.json', root);
type State = { _about: string; lastRun: string; seen: { nsf: string[]; cec: string[]; openalex: string[] } };
const fromPath = arg('--from');
const state: State = fromPath ? JSON.parse(fs.readFileSync(fromPath, 'utf8'))
    : fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile, 'utf8')) : { _about: '', lastRun: '', seen: { nsf: [], cec: [], openalex: [] } };
state.seen.cec ??= [];
state._about = 'Ids already reported by `npm run news:feeds` (scripts/news-feeds.ts), so each run lists only new NSF awards, CEC grants-list entries, and OpenAlex papers. Not a review log.';

const today = new Date().toISOString().slice(0, 10);
const daysBefore = (date: string, days: number) => new Date(Date.parse(date) - days * 864e5).toISOString().slice(0, 10);
const since = arg('--since') || (state.lastRun ? daysBefore(state.lastRun, 45) : daysBefore(today, 120));

// Every faculty record, current and former: a former member's grant or paper from their Mason
// years is still eligible, and the GMU affiliation filter keeps out their later work.
const faculty = read('public/faculty.json') as Record<string, string>[];
const roster = new Map<string, string>();
for (const row of faculty) {
    if (row['Tenure-Track/Teaching/Staff'] === 'Staff') continue;
    const name = `${row['First Name']} ${row['Last Name']}`;
    for (const key of nameKeys(row['First Name'], row['Last Name'])) roster.set(key, name);
}
const match = (full: string) => roster.get(nameKey(full));

async function getJson(url: string): Promise<any> {
    for (let attempt = 0; ; attempt++) {
        const response = await fetch(url, { headers: { 'User-Agent': 'GMU-CS-Directory news feeds' } });
        if (response.ok) return response.json();
        if (attempt >= 2 || ![429, 500, 502, 503, 504].includes(response.status)) throw new Error(`HTTP ${response.status} for ${url.replace(/api_key=[^&]+/, 'api_key=…')}`);
        await new Promise(resolve => setTimeout(resolve, 5000 * (attempt + 1)));
    }
}

// NSF Award Search API. Collaborative awards list only GMU's own part; its amount is GMU's share.
type NsfItem = { inNews?: string; related?: string[]; id: string; url: string; date: string; startDate: string; title: string; program: string; amount: string; pi: string; coPIs: string[]; people: string[] };
async function nsf(): Promise<NsfItem[]> {
    const mmddyyyy = (iso: string) => `${iso.slice(5, 7)}/${iso.slice(8, 10)}/${iso.slice(0, 4)}`;
    const fields = 'id,title,piFirstName,piLastName,coPDPI,date,startDate,awardeeName,fundsObligatedAmt,fundProgramName';
    const items: NsfItem[] = [];
    for (let offset = 1; ; offset += 25) {
        const data = await getJson(`https://api.nsf.gov/services/v1/awards.json?awardeeName=George+Mason+University&awardeeStateCode=VA&dateStart=${mmddyyyy(since)}&printFields=${fields}&offset=${offset}`);
        const awards = data.response?.award || [];
        for (const a of awards) {
            if (!/^george mason university$/i.test(a.awardeeName || '')) continue;
            const pi = `${a.piFirstName} ${a.piLastName}`;
            // coPDPI entries read "Name email".
            const coPIs = (a.coPDPI || []).map((entry: string) => entry.replace(/\s+\S+@\S+$/, '').replace(/\s*\(Former\)/, '').trim());
            const people = [...new Set([pi, ...coPIs].map(match).filter((name): name is string => !!name))];
            if (!people.length) continue;
            const iso = (d: string) => d ? `${d.slice(6, 10)}-${d.slice(0, 2)}-${d.slice(3, 5)}` : '';
            items.push({ id: a.id, url: `https://www.nsf.gov/awardsearch/show-award?AWD_ID=${a.id}`, date: iso(a.date), startDate: iso(a.startDate), title: a.title, program: a.fundProgramName || '', amount: a.fundsObligatedAmt || '', pi, coPIs, people });
        }
        if (awards.length < 25) break;
    }
    return items;
}

// The CEC grants list; see cecEntries in news-watch-lib.ts.
async function cec(): Promise<CecItem[]> {
    const response = await fetch(CEC_GRANTS, { headers: { 'User-Agent': 'Mozilla/5.0 (GMU-CS-Directory news feeds)' } });
    if (!response.ok) throw new Error(`HTTP ${response.status} for ${CEC_GRANTS}`);
    return cecEntries(await response.text(), key => roster.get(key));
}

// OpenAlex works with a George Mason authorship by a roster faculty member, at a flagship venue.
const GMU = 'I162714631';
type PaperItem = { inNews?: string; related?: string[]; id: string; doi: string; date: string; title: string; venue: string; type: string; pages: number | null; people: string[]; authors: string[] };
async function openalex(): Promise<PaperItem[]> {
    const key = (process.env.GMU_CS_OPENALEX_API_KEY || process.env.OPENALEX_API_KEY)?.trim();
    const items: PaperItem[] = [];
    let cursor = '*';
    while (cursor) {
        const url = `https://api.openalex.org/works?filter=authorships.institutions.id:${GMU},from_publication_date:${since},primary_topic.field.id:17&select=id,doi,title,publication_date,type,primary_location,locations,authorships,biblio&per_page=200&cursor=${encodeURIComponent(cursor)}${key ? `&api_key=${encodeURIComponent(key)}` : ''}`;
        const data = await getJson(url);
        for (const w of data.results || []) {
            // A paper is often listed twice (arXiv and the proceedings); use the best venue it has.
            const venues = [w.primary_location, ...(w.locations || [])].map((loc: any) => loc?.source?.display_name).filter(Boolean) as string[];
            const venue = venues.find(name => TOP_VENUE.test(name) && !MINOR_TRACK.test(name));
            if (!venue || MINOR_TRACK.test(w.title || '')) continue;
            const people = new Set<string>();
            for (const a of w.authorships || []) {
                const atGmu = (a.institutions || []).some((inst: any) => inst.id?.endsWith(GMU));
                const name = atGmu && (match(a.author?.display_name || '') || (a.raw_author_name && match(a.raw_author_name)));
                if (name) people.add(name);
            }
            if (!people.size) continue;
            // Page count flags short, companion, and perspective papers (under 8 pages) for a closer look.
            const first = Number(w.biblio?.first_page), last = Number(w.biblio?.last_page);
            const pages = first > 0 && last >= first ? last - first + 1 : null;
            items.push({ id: w.id.replace('https://openalex.org/', ''), doi: w.doi || '', date: w.publication_date, title: w.title, venue, type: w.type, pages, people: [...people], authors: (w.authorships || []).map((a: any) => a.author?.display_name).filter(Boolean) });
        }
        cursor = data.meta?.next_cursor || '';
    }
    return items;
}

const errors: string[] = [];
const [grants, cecGrants, papers] = await Promise.all([
    nsf().catch(error => { errors.push(`nsf: ${(error as Error).message}`); return [] as NsfItem[]; }),
    cec().catch(error => { errors.push(`cec: ${(error as Error).message}`); return [] as CecItem[]; }),
    openalex().catch(error => { errors.push(`openalex: ${(error as Error).message}`); return [] as PaperItem[]; }),
]);
// Mark what news.json already covers (an NSF id in a story's source, or the paper title in its
// title or summary), so the routine skips it after a glance. `related` lists stories of the same
// kind, people, and year that may cover it in other words ("Zhang group papers at CCS 2026").
const stories = read('public/news.json') as { id: string; title: string; summary: string; sourceUrl: string; date: string; category: string; people: string[] }[];
const related = (people: string[], date: string, kinds: string[]) => stories
    .filter(s => kinds.includes(s.category) && s.date.slice(0, 4) === date.slice(0, 4) && s.people.some(name => people.includes(name)))
    .map(s => s.id);
const covered = (needle: string) => {
    const key = fold(needle);
    return key.length < 12 ? undefined : stories.find(s => fold(`${s.title} ${s.summary} ${s.sourceUrl}`).includes(key))?.id;
};
for (const g of grants) Object.assign(g, { inNews: stories.find(s => s.sourceUrl.includes(`AWD_ID=${g.id}`) || s.summary.includes(g.id))?.id || covered(g.title) || '', related: related(g.people, g.date, ['grant', 'faculty-achievement']) });
// A CEC entry for an NSF award has the NSF title, so it is marked when the NSF story exists.
for (const g of cecGrants) Object.assign(g, { inNews: covered(g.title.split(/[:?]/).pop()!.trim()) || covered(g.title) || '', related: related(g.people, g.date || today, ['grant', 'faculty-achievement']) });
for (const p of papers) Object.assign(p, { inNews: covered(p.title.split(/[:?]/)[0]) || '', related: related(p.people, p.date, ['paper', 'paper-award']) });
const seenNsf = new Set(state.seen.nsf);
const seenWorks = new Set(state.seen.openalex);
const seenCec = new Set(state.seen.cec);
const report = {
    date: today, since, lastRun: state.lastRun, errors,
    grants: grants.filter(g => !seenNsf.has(g.id)).sort((a, b) => b.date.localeCompare(a.date)),
    cecGrants: cecGrants.filter(g => !seenCec.has(g.id)),
    papers: papers.filter(p => !seenWorks.has(p.id)).sort((a, b) => b.date.localeCompare(a.date)),
};

// A source that errored keeps its old ids and the old lastRun, so its window still covers the gap.
if (process.argv.includes('--write')) {
    if (!errors.length) state.lastRun = today;
    state.seen.nsf = [...new Set([...state.seen.nsf, ...grants.map(g => g.id)])].sort();
    state.seen.cec = [...new Set([...state.seen.cec, ...cecGrants.map(g => g.id)])].sort();
    state.seen.openalex = [...new Set([...state.seen.openalex, ...papers.map(p => p.id)])].sort();
    fs.writeFileSync(stateFile, `${JSON.stringify(state, null, 4)}\n`);
}
const reportPath = arg('--report');
if (reportPath) fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 4)}\n`);
console.log(JSON.stringify({
    date: today, since, errors,
    grants: report.grants.map(g => `${g.date} NSF ${g.id} ${g.people.join(', ')}: ${g.title}${g.inNews ? ` [in news: ${g.inNews}]` : g.related?.length ? ` [related: ${g.related.join(', ')}]` : ''}`),
    cecGrants: report.cecGrants.map(g => `${g.date} CEC ${g.people.join(', ')} from ${g.funder}${g.amount ? ` (${g.amount})` : ''}: ${g.title}${g.inNews ? ` [in news: ${g.inNews}]` : g.related?.length ? ` [related: ${g.related.join(', ')}]` : ''}`),
    papers: report.papers.map(p => `${p.date} ${p.venue}${p.pages && p.pages < 8 ? ` (${p.pages} pages)` : ''} — ${p.people.join(', ')}: ${p.title}${p.inNews ? ` [in news: ${p.inNews}]` : p.related?.length ? ` [related: ${p.related.join(', ')}]` : ''}`),
    detail: reportPath ? `full report in ${reportPath}` : 'pass --report <path> for authors, DOIs, and amounts',
}, null, 4));
