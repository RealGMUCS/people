import fs from 'node:fs';

const faculty = JSON.parse(fs.readFileSync(new URL('../public/faculty.json', import.meta.url), 'utf8')) as Record<string, string>[];
const audit = JSON.parse(fs.readFileSync(new URL('../maintenance/news-scan.json', import.meta.url), 'utf8')) as { sources: { url: string; checked: string; status: string }[] };
const limitIndex = process.argv.indexOf('--limit');
const limit = limitIndex < 0 ? 10 : Number(process.argv[limitIndex + 1]);
if (!Number.isInteger(limit) || limit <= 0) throw new Error('--limit must be a positive integer');
const canonical = (raw: string) => {
    const url = new URL(/^https?:\/\//.test(raw) ? raw : `https://${raw}`);
    url.hash = '';
    return url.href.replace(/\/$/, '');
};
const byUrl = new Map<string, { url: string; people: string[]; tenureLine: boolean; lastChecked: string; status: string }>();
const missing: string[] = [];
for (const row of faculty) {
    if (row.Former === 'Yes' || row['Tenure-Track/Teaching/Staff'] === 'Staff') continue;
    const name = `${row['First Name']} ${row['Last Name']}`;
    const urls = [...new Set([row.Website, row['Lab Website']].filter(Boolean).map(canonical))];
    if (!urls.length) missing.push(name);
    for (const url of urls) {
        const prior = audit.sources.find(source => canonical(source.url) === url);
        const item = byUrl.get(url) || { url, people: [], tenureLine: false, lastChecked: prior?.checked || '', status: prior?.status || 'pending' };
        item.people.push(name);
        item.tenureLine ||= ['Tenured', 'Tenure-Track'].includes(row['Tenure-Track/Teaching/Staff']);
        byUrl.set(url, item);
    }
}
// Never-checked sources first, then oldest checked; tenure-line priority breaks ties.
const queue = [...byUrl.values()].sort((a, b) => a.lastChecked.localeCompare(b.lastChecked) || Number(b.tenureLine) - Number(a.tenureLine) || a.url.localeCompare(b.url));
console.log(JSON.stringify({ totalSources: queue.length, neverChecked: queue.filter(item => !item.lastChecked).length, nextSources: queue.slice(0, limit), facultyWithoutSources: missing }, null, 4));
