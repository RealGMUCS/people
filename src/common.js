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

export const WEBSITE_ICON = '<path d="m12 3-9 8h3v10h5v-6h2v6h5V11h3l-9-8Z"/>';
export const SCHOLAR_ICON = '<path d="M12 3 1 9l11 6 9-4.91V17h2V9L12 3Z"/><path d="M5 12.18V16c0 1.66 3.13 3 7 3s7-1.34 7-3v-3.82l-7 3.82-7-3.82Z"/>';
export const LINKEDIN_ICON = '<path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.11 1 2.48 1s2.5 1.12 2.5 2.5ZM.24 8h4.48v15.5H.24V8Zm7.72 0h4.29v2.12h.06c.6-1.13 2.06-2.33 4.25-2.33 4.54 0 5.38 2.99 5.38 6.88v8.83h-4.47v-7.83c0-1.87-.03-4.27-2.6-4.27-2.61 0-3.01 2.04-3.01 4.14v7.96H7.96V8Z"/>';

export function iconLink(className, href, label, iconPath) {
    return `<a class="icon-link ${className}" href="${href}" target="_blank" rel="noopener noreferrer" aria-label="${label}" title="${label}"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${iconPath}</svg></a>`;
}

// Website/LinkedIn/Google Scholar icon row shared by faculty cards and student rows
export function profileIcons(p, name) {
    const links = [];
    const website = p.website && safeUrl(p.website);
    const linkedin = p.linkedin && safeUrl(p.linkedin);
    const scholar = p.scholar && safeUrl(p.scholar);
    if (website) links.push(iconLink('website-link', website, `${name} personal or lab website`, WEBSITE_ICON));
    if (linkedin) links.push(iconLink('linkedin-link', linkedin, `${name} on LinkedIn`, LINKEDIN_ICON));
    if (scholar) links.push(iconLink('scholar-link', scholar, `${name} on Google Scholar`, SCHOLAR_ICON));
    return links.join('');
}

export function detailRow(label, value) {
    return `<div class="faculty-detail"><span class="detail-label">${label}</span><span class="detail-value">${value}</span></div>`;
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

// Keyword search: "advisor: Nguyen", "honors: NSF", "phd: MIT", etc. let the
// single search box target one field directly; a match becomes a scope chip.
export function parseKeywordQuery(raw, keywordMap) {
    const match = raw.match(/^\s*([^:]{1,24}?)\s*:\s*(.*)$/s);
    if (!match) return null;
    const key = match[1].toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!keywordMap[key]) return null;
    return { key, getField: keywordMap[key], query: match[2].trim() };
}

export function uniqueNonEmpty(arr) {
    return Array.from(new Set(arr.filter(Boolean)));
}

// Semicolon-separated free-text list (e.g. Internships, Honors & Awards)
export function splitList(v) {
    return v ? v.split(';').map(x => x.trim()).filter(Boolean) : [];
}

// Fisher-Yates sample, used to pick fresh "Try:" search examples on each load
export function sample(items, count) {
    const arr = items.slice();
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.slice(0, count);
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

// Sticky scope chip + live suggestion dropdown for the search box, shared by
// both pages. Each page supplies its own keyword map / suggestion sources /
// display metadata since Faculty and Students track different fields.
export function createSearchController({ input, scopeChip, scopeChipLabel, suggestionPanel, keywordMap, keywordMeta, suggestionSources, onChange }) {
    let activeScope = null;
    let activeSuggestion = -1;

    function renderChip() {
        scopeChip.hidden = !activeScope;
        if (!activeScope) { scopeChipLabel.textContent = ''; return; }
        const meta = keywordMeta[activeScope] || { label: activeScope, icon: '🔎' };
        scopeChipLabel.textContent = `${meta.icon} ${meta.label}`;
        scopeChip.setAttribute('aria-label', `Remove ${meta.label} search scope`);
    }

    function hideSuggestions() {
        activeSuggestion = -1;
        suggestionPanel.hidden = true;
        suggestionPanel.replaceChildren();
        input.setAttribute('aria-expanded', 'false');
    }

    function showSuggestions() {
        const raw = input.value.trim();
        if (!raw) { hideSuggestions(); return; }
        const sourceKey = activeScope && suggestionSources[activeScope] ? activeScope : 'name';
        const values = suggestionSources[sourceKey] ? suggestionSources[sourceKey]() : [];
        const query = raw.toLowerCase();
        const matches = values
            .filter(v => v.toLowerCase().includes(query))
            .sort((a, b) => {
                const aStarts = a.toLowerCase().startsWith(query);
                const bStarts = b.toLowerCase().startsWith(query);
                return Number(bStarts) - Number(aStarts) || a.localeCompare(b);
            })
            .slice(0, 8);
        if (!matches.length) { hideSuggestions(); return; }
        suggestionPanel.replaceChildren(...matches.map((value, index) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'search-suggestion';
            btn.setAttribute('role', 'option');
            btn.dataset.index = String(index);
            btn.textContent = value;
            btn.addEventListener('click', () => {
                input.value = value;
                hideSuggestions();
                onChange();
                input.focus();
            });
            return btn;
        }));
        activeSuggestion = -1;
        suggestionPanel.hidden = false;
        input.setAttribute('aria-expanded', 'true');
    }

    function effectiveSearch() {
        const raw = input.value.trim();
        if (activeScope && keywordMap[activeScope]) {
            return { getField: keywordMap[activeScope], query: raw.toLowerCase() };
        }
        const parsed = parseKeywordQuery(raw, keywordMap);
        return parsed ? { getField: parsed.getField, query: parsed.query.toLowerCase() } : null;
    }

    function setSearchValue(raw) {
        const parsed = parseKeywordQuery(raw, keywordMap);
        activeScope = parsed ? parsed.key : null;
        input.value = parsed ? parsed.query : raw;
        renderChip();
    }

    function searchQueryValue() {
        const raw = input.value.trim();
        if (!activeScope) return raw;
        const meta = keywordMeta[activeScope];
        const label = (meta ? meta.label : activeScope).toLowerCase();
        return `${label}:${raw ? ' ' + raw : ''}`;
    }

    function resetScope() {
        activeScope = null;
        renderChip();
        hideSuggestions();
    }

    input.addEventListener('input', () => {
        if (!activeScope) {
            const parsed = parseKeywordQuery(input.value, keywordMap);
            if (parsed) {
                activeScope = parsed.key;
                input.value = parsed.query;
                renderChip();
            }
        }
        showSuggestions();
        onChange();
    });
    input.addEventListener('focus', showSuggestions);
    input.addEventListener('blur', () => window.setTimeout(hideSuggestions, 150));
    input.addEventListener('keydown', e => {
        const options = [...suggestionPanel.querySelectorAll('.search-suggestion')];
        if (e.key === 'Escape') { hideSuggestions(); return; }
        if (!options.length || !['ArrowDown', 'ArrowUp', 'Enter'].includes(e.key)) return;
        if (e.key === 'Enter' && activeSuggestion >= 0) {
            e.preventDefault();
            options[activeSuggestion].click();
            return;
        }
        if (e.key === 'ArrowDown') activeSuggestion = (activeSuggestion + 1) % options.length;
        if (e.key === 'ArrowUp') activeSuggestion = (activeSuggestion - 1 + options.length) % options.length;
        options.forEach((opt, i) => opt.setAttribute('aria-selected', String(i === activeSuggestion)));
        e.preventDefault();
    });
    scopeChip.addEventListener('click', () => {
        resetScope();
        input.focus();
        onChange();
    });

    return { effectiveSearch, setSearchValue, searchQueryValue, resetScope };
}

// Populates the "(i)" search-syntax popover with page-specific keyword entries
// and wires its open/close behavior. `entries` is an array of
// { code, example, scope? } — scope is an optional parenthetical hint.
export function setupSearchHelp(entries) {
    const helpBtn = document.getElementById('search-help-btn');
    const helpPanel = document.getElementById('search-help-panel');
    const list = document.getElementById('search-help-list');
    list.innerHTML = entries.map(e =>
        `<li><code>${esc(e.code)}</code> ${esc(e.example)}${e.scope ? ` <span class="search-help-scope">(${esc(e.scope)})</span>` : ''}</li>`
    ).join('');

    function hideSearchHelp() {
        helpPanel.hidden = true;
        helpBtn.setAttribute('aria-expanded', 'false');
    }
    helpBtn.addEventListener('click', e => {
        e.stopPropagation();
        const willShow = helpPanel.hidden;
        helpPanel.hidden = !willShow;
        helpBtn.setAttribute('aria-expanded', String(willShow));
    });
    document.addEventListener('click', e => {
        if (!helpPanel.hidden && !helpPanel.contains(e.target) && e.target !== helpBtn) hideSearchHelp();
    });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && !helpPanel.hidden) hideSearchHelp();
    });
}
