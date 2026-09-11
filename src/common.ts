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
