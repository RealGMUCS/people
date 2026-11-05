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
