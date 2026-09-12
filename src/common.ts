// @ts-nocheck
// Shared utilities between the People (faculty/staff) and Students/Alumni pages.

// Escape untrusted spreadsheet values before inserting into HTML
export function esc(s) {
    return String(s)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

// Only allow http(s) URLs in href/src attributes
export function safeUrl(url) {
    return /^https?:\/\//i.test(url) ? esc(url) : null;
}

// Small external-link icons (profile/personal site/Scholar/LinkedIn), styled by
// vietprofs' shared stylesheet (.profile-link/.personal-site-link/.scholar-link/
// .linkedin-link already ship in profile.css — see index.html/students.html).
const SCHOLAR_ICON = '<path d="M12 3 1 9l11 6 9-4.91V17h2V9L12 3Z"/><path d="M5 12.18V16c0 1.66 3.13 3 7 3s7-1.34 7-3v-3.82l-7 3.82-7-3.82Z"/>';
const PERSONAL_SITE_ICON = '<path d="m12 3-9 8h3v10h5v-6h2v6h5V11h3l-9-8Z"/>';
const LINKEDIN_ICON = '<path d="M6.94 5a2 2 0 1 1-4-.02 2 2 0 0 1 4 .02ZM7 8.48H3V21h4V8.48Zm6.32 0H9.34V21h3.94v-6.57c0-3.66 4.77-4 4.77 0V21H22v-7.93c0-6.17-7.06-5.94-8.68-2.91V8.48Z"/>';

function entryIconLink(className, href, label, title, icon) {
    const url = safeUrl(href);
    if (!url) return '';
    return ` <a class="${className}" href="${url}" target="_blank" rel="noopener noreferrer" aria-label="${esc(label)}" title="${esc(title)}"><svg viewBox="0 0 24 24" aria-hidden="true">${icon}</svg></a>`;
}

// website/scholar/linkedin icon trio for a faculty or student entry's name row.
export function renderProfileIcons(name, { website, scholar, linkedin }) {
    return [
        website && entryIconLink('personal-site-link', website, `${name} personal or lab website`, 'Personal or lab website', PERSONAL_SITE_ICON),
        scholar && entryIconLink('scholar-link', scholar, `${name} on Google Scholar`, 'Google Scholar', SCHOLAR_ICON),
        linkedin && entryIconLink('linkedin-link', linkedin, `${name} on LinkedIn`, 'LinkedIn', LINKEDIN_ICON),
    ].filter(Boolean).join('');
}

// Email addresses are shown as a canvas-rendered image (drawn client-side from
// obfuscated parts, never present as plain text in the served HTML/JS) to deter
// naive scraping, while staying clickable for real visitors. The static markup
// only carries a reversed-base64 blob split across two data attributes — never
// the literal "user@domain" substring — so a scraper reading the page source
// alone finds nothing that looks like an email address.
function obfuscate(s) {
    return btoa(unescape(encodeURIComponent(s))).split('').reverse().join('');
}
function deobfuscate(s) {
    return decodeURIComponent(escape(atob(s.split('').reverse().join(''))));
}

export function renderEmailBadge(email) {
    if (!email || !email.includes('@')) return '';
    const [user, domain] = email.split('@');
    return `<span class="email-badge" data-u="${obfuscate(user)}" data-d="${obfuscate(domain)}" role="button" tabindex="0" title="Click to email"></span>`;
}

// Call once after any render pass that may have inserted .email-badge spans.
export function activateEmailBadges(root = document) {
    root.querySelectorAll('.email-badge:not([data-ready])').forEach(badge => {
        const address = `${deobfuscate(badge.dataset.u)}@${deobfuscate(badge.dataset.d)}`;
        badge.dataset.ready = '1';

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.font = font;
        const dpr = window.devicePixelRatio || 1;
        const width = Math.ceil(ctx.measureText(address).width) + 4;
        const height = 16;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.scale(dpr, dpr);
        ctx.font = font;
        ctx.textBaseline = 'middle';
        ctx.fillStyle = getComputedStyle(badge).color || '#333';
        ctx.fillText(address, 2, height / 2 + 1);
        badge.appendChild(canvas);

        const go = () => { window.location.href = `mailto:${address}`; };
        badge.addEventListener('click', go);
        badge.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    });
}

// Group a person's awards by category (newest-first order preserved) so each
// card shows its awards under headings like "NSF CAREER Awards".
export function renderAchievementGroups(awards) {
    const groups = [];
    const index = new Map();
    awards.forEach(a => {
        const cat = a.category || 'Awards';
        if (!index.has(cat)) { index.set(cat, groups.length); groups.push({ cat, items: [] }); }
        groups[index.get(cat)].items.push(a);
    });
    return groups.map(g => `
        <div class="achievement-group">
          <div class="achievement-cat">${esc(g.cat)}</div>
          <ul>${g.items.map(a =>
        `<li>${esc(a.award)}${a.year ? ` <span class="achievement-year">${esc(a.year)}</span>` : ''}</li>`
    ).join('')}</ul>
        </div>`).join('');
}

export function setupAchievementsToggle() {
    window.toggleAchievements = function (header) {
        header.closest('.achievements-section').classList.toggle('collapsed');
    };
}

export function uniqueNonEmpty(arr) {
    return Array.from(new Set(arr.filter(Boolean)));
}

// Semicolon-separated free-text list (e.g. Internships, Honors & Awards)
export function splitList(v) {
    return v ? v.split(';').map(x => x.trim()).filter(Boolean) : [];
}

// Renders the "Try: ..." row of example search queries, shared by both pages.
// `examples` is an array of { label, query }.
export function renderSearchExamples(examples) {
    const fixed = document.getElementById('search-example-fixed');
    const items = document.getElementById('search-example-items');
    if (!fixed || !items) return;
    fixed.innerHTML = '<span>Try:</span>';
    items.innerHTML = examples
        .map(ex => `<button type="button" data-search-example="${esc(ex.query)}">${esc(ex.label)}</button>`)
        .join('');
}

// Wires clicks on any "Try:" example button to a page-supplied handler.
export function setupSearchExamplesClick(onSelect) {
    document.querySelector('.search-examples')?.addEventListener('click', e => {
        const btn = e.target.closest('[data-search-example]');
        if (!btn) return;
        onSelect(btn.dataset.searchExample);
    });
}

if (typeof localStorage !== 'undefined' && localStorage.getItem('gmu_cs:crt') === '1') {
    document.documentElement.classList.add('crt-mode');
}

// The search box, scope-chip/suggestion UI, command-line easter eggs (help/fortune/
// whoami/theme crt/...), and j-k-r keyboard navigation are the same engine vietprofs
// uses, published as a standalone module at vietprofs.roars.dev/search-kit.js (same
// sharing pattern as profile.css — see vietprofs' scripts/sync-profile-css.ts and
// scripts/build-search-kit.ts). Fetched once and cached; the functions below are thin
// adapters that plug GMU-specific data (keyword maps, page ids, site copy) into it.
let kit = null;
let kitPromise = null;
export function loadSearchKit() {
    if (!kitPromise) {
        kitPromise = import(/* @vite-ignore */ 'https://vietprofs.roars.dev/search-kit.js').then(m => { kit = m; return m; });
    }
    return kitPromise;
}

export function showCommandOutput(message) {
    kit.showCommandOutput(document.getElementById('command-output'), message);
}

export function hideCommandOutput() {
    kit.hideCommandOutput(document.getElementById('command-output'));
}

// Fisher-Yates sample, used to pick fresh "Try:" search examples on each load.
export function sample(items, count) {
    return kit.sample(items, count);
}

// Sticky scope chip + live suggestion dropdown for the search box, shared by
// both pages. Each page supplies its own keyword map / suggestion sources /
// display metadata since Faculty and Students track different fields.
export function createSearchController({ input, scopeChip, scopeChipLabel, suggestionPanel, keywordMap, keywordMeta, suggestionSources, onChange, onCommand }) {
    const controller = kit.createSearchController({
        input, scopeChip, scopeChipLabel, suggestionPanel, keywordMeta,
        getSuggestions: key => (suggestionSources[key] ? suggestionSources[key]() : []),
        onChange, onCommand,
    });
    return {
        ...controller,
        effectiveSearch() {
            const kw = controller.effectiveSearch();
            return kw ? { ...kw, getField: keywordMap[kw.key] } : null;
        },
    };
}

// Populates the "(?)" search-syntax popover with page-specific keyword entries
// and wires its open/close behavior. `entries` is an array of
// { code, example, scope? } — scope is an optional parenthetical hint.
export function setupSearchHelp(entries) {
    kit.setupSearchHelp({
        btn: document.getElementById('search-help-btn'),
        panel: document.getElementById('search-help-panel'),
        list: document.getElementById('search-help-list'),
        entries,
    });
}

export function createSharedCommandHandler({ getSearch, resetDirectory, onUpdate, onRandom, facts, getQueryPlan, getStats }) {
    return kit.createCommandHandler({
        getSearch, resetDirectory, onUpdate, onRandom, facts, getQueryPlan, getStats,
        siteName: 'GMU CS Directory',
        aboutText: 'GMU CS Directory — an open, community-maintained index of George Mason University Computer Science faculty, students, and alumni.',
        searchInputId: 'main-search',
        commandOutputEl: document.getElementById('command-output'),
        searchHelpPanel: document.getElementById('search-help-panel'),
        searchHelpBtn: document.getElementById('search-help-btn'),
        buildCommit: typeof __BUILD_COMMIT__ !== 'undefined' ? __BUILD_COMMIT__ : 'dev',
        buildLabel: typeof __BUILD_LABEL__ !== 'undefined' ? __BUILD_LABEL__ : '',
    });
}

export function setupSharedKeyboardShortcuts({ getItemElements, getSelectedIndex, setSelectedIndex, onRandom }) {
    return kit.setupKeyboardShortcuts({ getItemElements, getSelectedIndex, setSelectedIndex, onRandom, searchInputId: 'main-search' });
}
