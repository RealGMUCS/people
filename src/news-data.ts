import { normalizeText } from './vietprofs/search-kit.ts';

export const NEWS_CATEGORIES = {
    'faculty-achievement': 'Faculty achievements',
    'paper-award': 'Paper awards & distinctions',
    grant: 'Grant awards',
    graduation: 'Student graduations & defenses',
    'student-achievement': 'Student achievements',
    research: 'Research highlights',
} as const;
export type NewsCategory = keyof typeof NEWS_CATEGORIES;
export interface NewsItem {
    id: string;
    title: string;
    summary: string;
    date: string;
    category: NewsCategory;
    people: string[];
    tags: string[];
    sourceName: string;
    sourceUrl: string;
    lastModified: string;
    lastVerified: string;
}
export const NEWS_FIELDS = ['id', 'title', 'summary', 'date', 'category', 'people', 'tags', 'sourceName', 'sourceUrl', 'lastModified', 'lastVerified'];

// A source may give a year, a month, or a day. Never manufacture date precision.
export function validNewsDate(value: string): boolean {
    if (!/^\d{4}(?:-\d{2}(?:-\d{2})?)?$/.test(value)) return false;
    const full = value.length === 4 ? `${value}-01-01` : value.length === 7 ? `${value}-01` : value;
    const date = new Date(`${full}T00:00:00Z`);
    return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === full;
}
export function formatNewsDate(value: string): string {
    if (!validNewsDate(value)) return '';
    if (value.length === 4) return value;
    return new Intl.DateTimeFormat('en-US', {
        month: 'short', year: 'numeric', timeZone: 'UTC',
        ...(value.length === 10 ? { day: 'numeric' as const } : {}),
    }).format(new Date(`${value.length === 7 ? `${value}-01` : value}T00:00:00Z`));
}
export function newsField(item: NewsItem, key: string): string {
    switch (key) {
        case 'person': case 'name': return item.people.join(' ');
        case 'category': return `${item.category} ${NEWS_CATEGORIES[item.category]}`;
        case 'year': return item.date.slice(0, 4);
        case 'topic': return item.tags.join(' ');
        case 'source': return item.sourceName;
        case 'title': return item.title;
        default: return [item.title, item.summary, ...item.people, ...item.tags, item.date, NEWS_CATEGORIES[item.category], item.sourceName].join(' ');
    }
}
export function filterNews(items: NewsItem[], options: { query?: string; scope?: string; category?: string; year?: string; sort?: string }): NewsItem[] {
    const query = normalizeText((options.query || '').trim().replace(/^#/, ''));
    const dateKey = (item: NewsItem) => item.date.length === 4 ? `${item.date}-01-01` : item.date.length === 7 ? `${item.date}-01` : item.date;
    return items.filter(item =>
        (!options.category || options.category === 'all' || item.category === options.category) &&
        (!options.year || options.year === 'all' || item.date.startsWith(options.year)) &&
        (!query || normalizeText(newsField(item, options.scope || '')).includes(query))
    ).sort((a, b) => {
        const order = dateKey(a).localeCompare(dateKey(b));
        return (options.sort === 'oldest' ? order : -order) || a.id.localeCompare(b.id);
    });
}

export function validateNews(data: unknown, facultyNames: Set<string>): string[] {
    if (!Array.isArray(data)) return ['news.json must contain an array'];
    const errors: string[] = [];
    const ids = new Set<string>();
    const stories = new Set<string>();
    data.forEach((row, index) => {
        const prefix = `news.json:${index + 1}`;
        if (!row || typeof row !== 'object' || Array.isArray(row)) {
            errors.push(`${prefix}: expected an object`); return;
        }
        if (Object.keys(row).join('|') !== NEWS_FIELDS.join('|')) errors.push(`${prefix}: fields must match NEWS_FIELDS in order`);
        for (const key of NEWS_FIELDS.filter(k => !['people', 'tags'].includes(k))) {
            if (typeof row[key] !== 'string' || !row[key].trim()) errors.push(`${prefix}: ${key} must be a nonempty string`);
        }
        if (typeof row.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.id) || ids.has(row.id)) errors.push(`${prefix}: invalid or duplicate id`);
        ids.add(row.id);
        if (!Object.hasOwn(NEWS_CATEGORIES, row.category)) errors.push(`${prefix}: unknown category`);
        for (const key of ['people', 'tags']) {
            if (!Array.isArray(row[key]) || row[key].length === 0 || row[key].some((v: unknown) => typeof v !== 'string' || !v.trim()) || new Set(row[key]).size !== row[key].length) errors.push(`${prefix}: ${key} must be a nonempty array of unique strings`);
        }
        if (!Array.isArray(row.people) || !row.people.some((name: string) => facultyNames.has(name))) errors.push(`${prefix}: at least one person must match a faculty record exactly`);
        if (typeof row.date !== 'string' || !validNewsDate(row.date)) errors.push(`${prefix}: invalid event/announcement date`);
        for (const key of ['lastModified', 'lastVerified']) {
            if (typeof row[key] !== 'string' || row[key].length !== 10 || !validNewsDate(row[key])) errors.push(`${prefix}: invalid ${key}`);
        }
        try {
            const url = new URL(row.sourceUrl);
            if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
        } catch { errors.push(`${prefix}: invalid source URL`); }
        const story = `${row.date}|${normalizeText(String(row.title))}`;
        if (stories.has(story)) errors.push(`${prefix}: duplicate story title and date`);
        stories.add(story);
    });
    return errors;
}
