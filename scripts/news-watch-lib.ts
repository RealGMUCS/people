// Pure parsing helpers for scripts/news-watch.ts, kept separate so tests can import them without
// running the watcher.
import { createHash } from 'node:crypto';

// A link counts as a CV when its text, or its file name, is a CV word on its own ("[CV]",
// "Curriculum Vitae", "resume.pdf", "Smith_CV.pdf"); "cvpr" or "iccv" don't match.
export const CV_WORD = /(^|[^a-z])(cv|c\.v\.|vita|vitae|resume|résumé|curriculum[\s_-]*vitae)([^a-z]|$)/i;
// "MyCV.pdf": an upper-case CV after other letters, in a file name.
const CV_CAPS = /(^|[^A-Z])CV([^A-Za-z]|$)/;

export const canonical = (raw: string) => {
    const url = new URL(/^https?:\/\//.test(raw) ? raw : `https://${raw}`);
    url.hash = '';
    return url.href.replace(/\/$/, '');
};

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '-', mdash: '-', rsquo: "'", lsquo: "'", ldquo: '"', rdquo: '"' };
export const decode = (text: string) => text.replace(/&(#\d+|#x[\da-f]+|\w+);/gi, (m, e: string) =>
    e[0] === '#' ? String.fromCodePoint(e[1]?.toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : ENTITIES[e.toLowerCase()] ?? m);
export const toLines = (text: string) => [...new Set(text.split('\n').map(line => line.replace(/\s+/g, ' ').trim()).filter(line => line.length >= 15))];
export const htmlLines = (html: string) => toLines(decode(html
    .replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(br|\/p|\/div|\/li|\/h\d|\/tr|\/dd|\/dt|hr)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')));
export function cvLinks(html: string, base: string): string[] {
    const found = new Set<string>();
    for (const [, attrs, text] of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
        const href = attrs.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1];
        if (!href) continue;
        // Icon links carry their name in aria-label or title.
        const named = attrs.match(/\b(?:aria-label|title)\s*=\s*["']([^"']*)["']/i)?.[1] || '';
        const label = decode(`${text.replace(/<[^>]+>/g, ' ')} ${named}`).trim();
        let url: URL;
        try {
            url = new URL(decode(href), base);
        } catch { continue; /* malformed href */ }
        let file = url.pathname.split('/').filter(Boolean).pop() || '';
        try { file = decodeURIComponent(file); } catch { /* keep it encoded */ }
        // Short link text only: a sentence that mentions a CV isn't a CV link.
        const isCv = (label.length <= 40 && CV_WORD.test(label)) || CV_WORD.test(file) || CV_CAPS.test(file);
        if (isCv && /^https?:$/.test(url.protocol) && !/linkedin\.com|scholar\.google/.test(url.host)) found.add(canonical(url.href));
    }
    return [...found];
}
export const hash = (line: string) => createHash('sha1').update(line.toLowerCase()).digest('hex').slice(0, 8);

// `<meta http-equiv="refresh" content="0; url=...">` or a `<frame>`: several homepages are a stub
// that forwards to the real site (people.cs.gmu.edu/~msnyde14 -> muddsnyder.com).
export function metaRefresh(html: string, base: string): string | undefined {
    for (const [tag] of html.matchAll(/<meta\b[^>]*>/gi)) {
        if (!/http-equiv\s*=\s*["']?refresh/i.test(tag)) continue;
        const target = tag.match(/content\s*=\s*["'][^"']*?url\s*=\s*['"]?\s*([^"'>\s]+)/i)?.[1];
        if (!target) continue;
        try { return new URL(decode(target), base).href; } catch { return undefined; }
    }
    // A domain-forwarding frameset (torabi.org frames satorabi.github.io).
    const frame = html.match(/<frame\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/i)?.[1];
    if (frame) try { return new URL(decode(frame), base).href; } catch { /* malformed src */ }
    return undefined;
}

// Same-host `<script src>` files: a JavaScript app (React, Vite) ships its text in its bundle.
export function scriptSources(html: string, base: string): string[] {
    const host = new URL(base).host;
    const found = new Set<string>();
    for (const [, src] of html.matchAll(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi)) {
        try {
            const url = new URL(decode(src), base);
            if (url.host === host) found.add(url.href);
        } catch { /* malformed src */ }
    }
    return [...found];
}

// Prose string literals in a JavaScript bundle: three or more words, no code or markup. Framework
// messages come along too, but they are the same every run, so the diff never reports them.
export function bundleLines(js: string): string[] {
    const out: string[] = [];
    for (const [, dq, tpl] of js.matchAll(/"((?:[^"\\\n]|\\.){20,600})"|`((?:[^`\\$]|\\.){20,600})`/g)) {
        const text = (dq ?? tpl).replace(/\\n/g, ' ').replace(/\\(["'`\\])/g, '$1').replace(/\\u([\da-f]{4})/gi, (_, h: string) => String.fromCharCode(parseInt(h, 16)));
        if (!/[A-Za-z]{2,} [A-Za-z]{2,} [A-Za-z]{2,}/.test(text) || /[{};<>[\]]|=>|\bfunction\b|\w\(|\w:\w/.test(text)) continue;
        out.push(text);
    }
    return toLines(out.join('\n'));
}

// Names compared without accents, case, punctuation, middle names, or a parenthesized nickname,
// so "Lap-Fai (Craig) Yu" matches "Craig Yu" and "Lap-Fai Yu".
export const fold = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z\s-]/g, ' ').replace(/\s+/g, ' ').trim();
export function nameKeys(first: string, last: string): string[] {
    const lastKey = fold(last).split(' ').pop()!;
    const firsts = new Set<string>();
    for (const part of [first.replace(/\(.*?\)/g, ''), ...[...first.matchAll(/\((.*?)\)/g)].map(m => m[1])]) {
        const token = fold(part).split(' ')[0];
        if (token) firsts.add(token);
    }
    return [...firsts].map(f => `${f} ${lastKey}`);
}
// "Marcos Zampieri", "Marcos A. Zampieri", "Zampieri, Marcos" -> "marcos zampieri".
export function nameKey(full: string): string {
    const [a, b] = full.includes(',') ? [full.split(',')[1], full.split(',')[0]] : [full, ''];
    const tokens = fold(`${a} ${b}`).split(' ').filter(Boolean);
    return tokens.length < 2 ? tokens.join(' ') : `${tokens[0]} ${tokens[tokens.length - 1]}`;
}

// Flagship venues from TASKS/collect_faculty_news.md §3 (that list is "e.g.", so other flagship
// conferences of the same rank are here too). Matched against OpenAlex source names, which spell
// venues out ("ACM SIGSAC Conference on Computer and Communications Security (CCS)").
export const TOP_VENUE = new RegExp([
    'neural information processing systems', 'neurips', 'international conference on machine learning\\b', '\\bicml\\b',
    'learning representations', '\\biclr\\b', 'computer vision and pattern recognition', '\\bcvpr\\b',
    'international conference on computer vision', '\\biccv\\b', 'european conference on computer vision', '\\beccv\\b',
    'annual meeting of the association for computational linguistics', '\\(acl\\)', 'empirical methods in natural language processing', '\\bemnlp\\b',
    '\\baaai\\b', 'conference on artificial intelligence', '\\bijcai\\b',
    'international conference on software engineering\\b', '\\(icse\\)', 'foundations of software engineering', '\\besec/fse\\b',
    'proceedings of the acm on software engineering', 'automated software engineering \\(ase\\)', 'international conference on automated software engineering',
    'software testing and analysis', '\\bissta\\b', 'computer aided verification', '\\bcav\\b',
    'programming language design and implementation', '\\bpldi\\b', 'principles of programming languages', '\\bpopl\\b', 'proceedings of the acm on programming languages',
    'computer and communications security', 'usenix security', 'symposium on security and privacy', 'network and distributed system security', '\\bndss\\b',
    'mobile computing and networking', '\\bmobicom\\b', 'mobile systems, applications', '\\bmobisys\\b', 'embedded networked sensor', '\\bsensys\\b',
    '\\beurosys\\b', 'operating systems design and implementation', '\\bosdi\\b', 'symposium on operating systems principles', '\\bsosp\\b',
    'networked systems design and implementation', '\\bnsdi\\b', '\\bsigcomm\\b', 'internet measurement conference',
    'human factors in computing systems', '\\bchi\\b', 'computer-supported cooperative work', '\\bcscw\\b', 'proceedings of the acm on human-computer interaction',
    'user interface software and technology', '\\buist\\b', '\\bsiggraph\\b', 'acm transactions on graphics',
    'international conference on robotics and automation', '\\bicra\\b', 'intelligent robots and systems', '\\biros\\b', 'conference on robot learning', '\\bcorl\\b', 'robotics: science and systems',
    'knowledge discovery and data mining', '\\bkdd\\b', '\\bsigmod\\b', 'very large data bases', '\\bvldb\\b', 'the web conference', 'world wide web conference',
    'symposium on theory of computing', '\\bstoc\\b', 'foundations of computer science', '\\bfocs\\b', 'symposium on discrete algorithms', '\\bsoda\\b',
    'transactions on software engineering', 'pattern analysis and machine intelligence', 'journal of artificial intelligence research',
    'journal of the acm', 'communications of the acm',
].join('|'), 'i');
// Not newsworthy on their own (playbook §3), even at a top venue, and regional spin-offs whose
// names contain a flagship's ("IEEE European Symposium on Security and Privacy", "ASIA CCS").
export const MINOR_TRACK = /workshop|findings|companion|extended abstract|poster|demo|doctoral|student (research|symposium)|adjunct|\barxiv\b|zenodo|ssrn|research square|techrxiv|european symposium|euros&p|\basia\b|asiaccs/i;
