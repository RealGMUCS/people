import { loadFaculty, loadStudents } from './data.js';
import './style.css';

let allFaculty = [];
let interestIndex = new Map();
let awardCategories = [];
let allStudents = [];
let topicIndex = new Map();
let activeInterest = null; // currently selected faculty research-interest filter
let activeTopic = null; // currently selected student topic filter
let currentView = 'directory'; // 'directory' | 'awards' | 'students' — independent of the search box text
let activeSearchScope = null; // committed keyword (e.g. "advisor"), shown as a chip to the left of the input
let activeSuggestion = -1; // keyboard-selected index in the suggestion panel

async function init() {
    const data = await loadFaculty();
    allFaculty = data.faculty;
    interestIndex = data.interestIndex;
    awardCategories = data.awardCategories;

    const studentData = await loadStudents(data.facultyByName);
    allStudents = studentData.students;
    topicIndex = studentData.topicIndex;

    setupSearch();
    setupFilters();
    setupInterestBanner();
    setupNav();
    restoreFromUrl();
    render();

    window.addEventListener('popstate', () => {
        restoreFromUrl();
        render();
    });
}

// Search & Filters

function activeKeywordMap() {
    if (currentView === 'students') return STUDENT_KEYWORDS;
    if (currentView === 'directory') return FACULTY_KEYWORDS;
    return null; // no keyword search in the #awards view
}

function activeSuggestionSources() {
    return currentView === 'students' ? STUDENT_SUGGESTION_SOURCES : FACULTY_SUGGESTION_SOURCES;
}

function renderSearchScopeChip() {
    const chip = document.getElementById('search-scope-chip');
    const label = document.getElementById('search-scope-chip-label');
    chip.hidden = !activeSearchScope;
    if (!activeSearchScope) { label.textContent = ''; return; }
    const meta = KEYWORD_META[activeSearchScope] || { label: activeSearchScope, icon: '🔎' };
    label.textContent = `${meta.icon} ${meta.label}`;
    chip.setAttribute('aria-label', `Remove ${meta.label} search scope`);
}

// A "keyword: value" prefix typed or pasted into the free-text box becomes a visible scope
// chip; the input then only holds the value. Used for the URL round-trip and clicking a
// suggestion while browsing without a committed scope.
function setSearchValue(raw) {
    const map = activeKeywordMap();
    const parsed = map ? parseKeywordQuery(raw, map) : null;
    activeSearchScope = parsed ? parsed.key : null;
    document.getElementById('main-search').value = parsed ? parsed.query : raw;
    renderSearchScopeChip();
}

function searchQueryValue() {
    const raw = document.getElementById('main-search').value.trim();
    if (!activeSearchScope) return raw;
    const meta = KEYWORD_META[activeSearchScope];
    const label = (meta ? meta.label : activeSearchScope).toLowerCase();
    return `${label}:${raw ? ' ' + raw : ''}`;
}

// Resolve the effective {getField, query} for the current search box + committed scope,
// or null if the text isn't a keyword search (falls back to free-text/#tag search).
function effectiveSearch(keywordMap) {
    const raw = document.getElementById('main-search').value.trim();
    if (activeSearchScope && keywordMap[activeSearchScope]) {
        return { getField: keywordMap[activeSearchScope], query: raw.toLowerCase() };
    }
    const parsed = parseKeywordQuery(raw, keywordMap);
    return parsed ? { getField: parsed.getField, query: parsed.query.toLowerCase() } : null;
}

function resetSearchScope() {
    activeSearchScope = null;
    renderSearchScopeChip();
    hideSuggestions();
}

function hideSuggestions() {
    activeSuggestion = -1;
    const panel = document.getElementById('search-suggestion-panel');
    panel.hidden = true;
    panel.replaceChildren();
    document.getElementById('main-search').setAttribute('aria-expanded', 'false');
}

function showSuggestions() {
    if (currentView === 'awards') { hideSuggestions(); return; }
    const input = document.getElementById('main-search');
    const raw = input.value.trim();
    if (!raw) { hideSuggestions(); return; }

    const sources = activeSuggestionSources();
    const sourceKey = activeSearchScope && sources[activeSearchScope] ? activeSearchScope : 'name';
    const values = sources[sourceKey]();
    const query = raw.toLowerCase();
    const matches = values
        .filter(v => v.toLowerCase().includes(query))
        .sort((a, b) => {
            const aStarts = a.toLowerCase().startsWith(query);
            const bStarts = b.toLowerCase().startsWith(query);
            return Number(bStarts) - Number(aStarts) || a.localeCompare(b);
        })
        .slice(0, 8);

    const panel = document.getElementById('search-suggestion-panel');
    if (!matches.length) { hideSuggestions(); return; }
    panel.replaceChildren(...matches.map((value, index) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'search-suggestion';
        btn.setAttribute('role', 'option');
        btn.dataset.index = String(index);
        btn.textContent = value;
        btn.addEventListener('click', () => {
            input.value = value;
            hideSuggestions();
            render();
            input.focus();
        });
        return btn;
    }));
    activeSuggestion = -1;
    panel.hidden = false;
    input.setAttribute('aria-expanded', 'true');
}

function setupSearch() {
    const input = document.getElementById('main-search');

    input.addEventListener('input', () => {
        if (!activeSearchScope) {
            const map = activeKeywordMap();
            const parsed = map ? parseKeywordQuery(input.value, map) : null;
            if (parsed) {
                activeSearchScope = parsed.key;
                input.value = parsed.query;
                renderSearchScopeChip();
            }
        }
        showSuggestions();
        render();
    });
    input.addEventListener('focus', showSuggestions);
    input.addEventListener('blur', () => window.setTimeout(hideSuggestions, 150));
    input.addEventListener('keydown', e => {
        const options = [...document.querySelectorAll('#search-suggestion-panel .search-suggestion')];
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

    document.getElementById('search-scope-chip').addEventListener('click', () => {
        activeSearchScope = null;
        renderSearchScopeChip();
        hideSuggestions();
        input.focus();
        render();
    });

    setupSearchHelp();
}

function setupSearchHelp() {
    const helpBtn = document.getElementById('search-help-btn');
    const helpPanel = document.getElementById('search-help-panel');
    function hideSearchHelp() {
        helpPanel.hidden = true;
        helpBtn.setAttribute('aria-expanded', 'false');
    }
    helpBtn.addEventListener('click', e => {
        e.stopPropagation();
        const willShow = helpPanel.hidden;
        hideSuggestions();
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

function setupFilters() {
    document.getElementById('rank-filter').addEventListener('change', () => render());
    document.getElementById('type-filter').addEventListener('change', () => render());
}

// Rank dropdown mixes two underlying fields: Full/Associate/Assistant come from
// f.category (derived from the Rank column), while Emeritus/Affiliate come from
// f.type (derived from the Tenure-Track/Teaching/Staff column) since those aren't
// ranks in the data. This keeps Instructors/Senior Instructors/unranked staff out
// of a specific Rank filter (they only show under "All").
function rankMatches(f, value) {
    if (value === 'all') return true;
    if (value === 'Emeritus' || value === 'Affiliate') return f.type === value;
    return f.category === value;
}

function typeMatches(f, value) {
    return value === 'all' || f.type === value;
}

function resetFilterDropdowns() {
    document.getElementById('rank-filter').value = 'all';
    document.getElementById('type-filter').value = 'all';
}

function setupInterestBanner() {
    document.getElementById('clear-filter').addEventListener('click', () => {
        activeInterest = null;
        activeTopic = null;
        document.getElementById('active-filter').style.display = 'none';
        render();
    });
}

function setupNav() {
    const go = (view) => {
        currentView = view;
        activeInterest = null;
        activeTopic = null;
        document.getElementById('active-filter').style.display = 'none';
        document.getElementById('main-search').value = '';
        resetSearchScope();
        window.scrollTo({ top: 0 });
        render();
    };
    document.getElementById('awards-link').addEventListener('click', e => { e.preventDefault(); go('awards'); });
    document.getElementById('students-link').addEventListener('click', e => { e.preventDefault(); go('students'); });
    document.getElementById('directory-link').addEventListener('click', e => { e.preventDefault(); go('directory'); });
}

// Keyword search: "advisor: Nguyen", "honors: NSF", "phd: MIT", etc. let the
// single search box target one field directly; a match becomes a scope chip.
function parseKeywordQuery(raw, keywordMap) {
    const match = raw.match(/^\s*([^:]{1,24}?)\s*:\s*(.*)$/s);
    if (!match) return null;
    const key = match[1].toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!keywordMap[key]) return null;
    return { key, getField: keywordMap[key], query: match[2].trim() };
}

const FACULTY_KEYWORDS = {
    name: f => `${f.firstName} ${f.lastName}`,
    research: f => f.interests.join(' '),
    interest: f => f.interests.join(' '),
    interests: f => f.interests.join(' '),
    phd: f => f.phdFrom,
    postdoc: f => f.postdocFrom,
    rank: f => f.category,
    type: f => f.type,
    office: f => f.office,
    honors: f => f.achievements.join(' '),
    honor: f => f.achievements.join(' '),
    award: f => f.achievements.join(' '),
    awards: f => f.achievements.join(' '),
};

const STUDENT_KEYWORDS = {
    name: s => `${s.firstName} ${s.lastName}`,
    advisor: s => s.advisor,
    honors: s => s.honors.join(' '),
    honor: s => s.honors.join(' '),
    award: s => s.honors.join(' '),
    awards: s => s.honors.join(' '),
    phd: s => s.degree,
    degree: s => s.degree,
    topic: s => s.topics.join(' '),
    topics: s => s.topics.join(' '),
    research: s => s.topics.join(' '),
    job: s => [s.currentJob, s.firstJob].join(' '),
    currentjob: s => s.currentJob,
    firstjob: s => s.firstJob,
    intern: s => s.internships,
    internship: s => s.internships,
    internships: s => s.internships,
};

// Display label + icon for each keyword key, used for the scope chip and search help panel.
const KEYWORD_META = {
    name: { label: 'Name', icon: '👤' },
    advisor: { label: 'Advisor', icon: '🎓' },
    research: { label: 'Research', icon: '🔬' },
    interest: { label: 'Research', icon: '🔬' },
    interests: { label: 'Research', icon: '🔬' },
    topic: { label: 'Topic', icon: '🏷️' },
    topics: { label: 'Topic', icon: '🏷️' },
    phd: { label: 'PhD', icon: '🎓' },
    degree: { label: 'Degree', icon: '🎓' },
    postdoc: { label: 'Postdoc', icon: '🎓' },
    rank: { label: 'Rank', icon: '🎓' },
    type: { label: 'Type', icon: '🏷️' },
    office: { label: 'Office', icon: '🏢' },
    honors: { label: 'Honors', icon: '🏅' },
    honor: { label: 'Honors', icon: '🏅' },
    award: { label: 'Honors', icon: '🏅' },
    awards: { label: 'Honors', icon: '🏅' },
    job: { label: 'Job', icon: '💼' },
    currentjob: { label: 'Current Job', icon: '💼' },
    firstjob: { label: 'First Job', icon: '💼' },
    intern: { label: 'Internship', icon: '💼' },
    internship: { label: 'Internship', icon: '💼' },
    internships: { label: 'Internship', icon: '💼' },
};

function uniqueNonEmpty(arr) {
    return Array.from(new Set(arr.filter(Boolean)));
}

function splitList(v) {
    return v ? v.split(';').map(x => x.trim()).filter(Boolean) : [];
}

// Distinct values per keyword, used to populate the suggestion dropdown once a scope is active.
const FACULTY_SUGGESTION_SOURCES = {
    name: () => allFaculty.map(f => `${f.firstName} ${f.lastName}`.trim()),
    research: () => Array.from(interestIndex.keys()),
    interest: () => Array.from(interestIndex.keys()),
    interests: () => Array.from(interestIndex.keys()),
    phd: () => uniqueNonEmpty(allFaculty.map(f => f.phdFrom)),
    postdoc: () => uniqueNonEmpty(allFaculty.map(f => f.postdocFrom)),
    rank: () => uniqueNonEmpty(allFaculty.map(f => f.category)),
    type: () => uniqueNonEmpty(allFaculty.map(f => f.type)),
    office: () => uniqueNonEmpty(allFaculty.map(f => f.office)),
    honors: () => uniqueNonEmpty(allFaculty.flatMap(f => f.achievements)),
    honor: () => uniqueNonEmpty(allFaculty.flatMap(f => f.achievements)),
    award: () => uniqueNonEmpty(allFaculty.flatMap(f => f.achievements)),
    awards: () => uniqueNonEmpty(allFaculty.flatMap(f => f.achievements)),
};

const STUDENT_SUGGESTION_SOURCES = {
    name: () => allStudents.map(s => `${s.firstName} ${s.lastName}`.trim()),
    advisor: () => uniqueNonEmpty(allStudents.map(s => s.advisor)),
    honors: () => uniqueNonEmpty(allStudents.flatMap(s => s.honors)),
    honor: () => uniqueNonEmpty(allStudents.flatMap(s => s.honors)),
    award: () => uniqueNonEmpty(allStudents.flatMap(s => s.honors)),
    awards: () => uniqueNonEmpty(allStudents.flatMap(s => s.honors)),
    phd: () => uniqueNonEmpty(allStudents.map(s => s.degree)),
    degree: () => uniqueNonEmpty(allStudents.map(s => s.degree)),
    topic: () => Array.from(topicIndex.keys()),
    topics: () => Array.from(topicIndex.keys()),
    research: () => Array.from(topicIndex.keys()),
    job: () => uniqueNonEmpty(allStudents.flatMap(s => [s.currentJob, s.firstJob])),
    currentjob: () => uniqueNonEmpty(allStudents.map(s => s.currentJob)),
    firstjob: () => uniqueNonEmpty(allStudents.map(s => s.firstJob)),
    intern: () => uniqueNonEmpty(allStudents.flatMap(s => splitList(s.internships))),
    internship: () => uniqueNonEmpty(allStudents.flatMap(s => splitList(s.internships))),
    internships: () => uniqueNonEmpty(allStudents.flatMap(s => splitList(s.internships))),
};

// Filter faculty based on current search + dropdowns + active interest
function getFiltered() {
    const query = document.getElementById('main-search').value.trim().toLowerCase();
    const rankFilter = document.getElementById('rank-filter').value;
    const typeFilter = document.getElementById('type-filter').value;

    let list = allFaculty;

    // Interest tag
    if (activeInterest) {
        list = interestIndex.get(activeInterest) || [];
    }

    // Dropdown filters
    list = list.filter(f => rankMatches(f, rankFilter) && typeMatches(f, typeFilter));

    // Search query
    if (query) {
        const kw = effectiveSearch(FACULTY_KEYWORDS);
        if (kw) {
            list = list.filter(f => String(kw.getField(f) || '').toLowerCase().includes(kw.query));
        } else if (query.startsWith('#')) {
            // #tag shortcuts
            const tag = query.slice(1);
            list = list.filter(f => {
                const typeMatch = f.type && f.type.toLowerCase().includes(tag);
                const categoryMatch = f.category && f.category.toLowerCase().includes(tag);
                const interestMatch = f.interests.some(i => i.toLowerCase().includes(tag));
                return typeMatch || categoryMatch || interestMatch;
            });
        } else {
            list = list.filter(f => searchMatch(f, query));
        }
    }

    return list.sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''));
}

function searchMatch(f, q) {
    const fields = [
        `${f.firstName} ${f.lastName}`,
        ...Object.values(f).flat()
    ];
    return fields.some(v => v && String(v).toLowerCase().includes(q));
}

// Filter students/alumni based on the current search box + active topic tag
function getFilteredStudents() {
    let list = allStudents;

    if (activeTopic) {
        list = topicIndex.get(activeTopic) || [];
    }

    const query = document.getElementById('main-search').value.trim().toLowerCase();
    if (query) {
        const kw = effectiveSearch(STUDENT_KEYWORDS);
        if (kw) {
            list = list.filter(s => String(kw.getField(s) || '').toLowerCase().includes(kw.query));
        } else if (query.startsWith('#')) {
            const tag = query.slice(1);
            list = list.filter(s =>
                s.topics.some(t => t.toLowerCase().includes(tag)) ||
                (s.degree && s.degree.toLowerCase().includes(tag))
            );
        } else {
            list = list.filter(s => studentSearchMatch(s, query));
        }
    }

    return list.sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''));
}

function studentSearchMatch(s, q) {
    const fields = [
        `${s.firstName} ${s.lastName}`,
        ...Object.values(s).flat()
    ];
    return fields.some(v => v && String(v).toLowerCase().includes(q));
}

function updateUrl() {
    const params = new URLSearchParams();
    const q = searchQueryValue();
    const rank = document.getElementById('rank-filter').value;
    const type = document.getElementById('type-filter').value;

    if (currentView !== 'directory') params.set('view', currentView);
    if (q) params.set('q', q);
    if (rank !== 'all') params.set('rank', rank);
    if (type !== 'all') params.set('type', type);
    if (activeInterest) params.set('interest', activeInterest);
    if (activeTopic) params.set('topic', activeTopic);

    const qs = params.toString();
    const url = window.location.pathname + (qs ? '?' + qs : '');
    history.replaceState(null, '', url);
}

function restoreFromUrl() {
    const params = new URLSearchParams(window.location.search);

    if (params.get('view') === 'awards' || params.get('view') === 'students') {
        currentView = params.get('view');
    }
    if (params.has('q')) setSearchValue(params.get('q'));
    if (params.has('rank')) document.getElementById('rank-filter').value = params.get('rank');
    if (params.has('type')) document.getElementById('type-filter').value = params.get('type');
    if (params.has('interest')) {
        activeInterest = params.get('interest');
        document.getElementById('active-filter').style.display = 'flex';
        document.getElementById('active-filter-text').textContent = `Research: ${activeInterest}`;
    }
    if (params.has('topic')) {
        activeTopic = params.get('topic');
        document.getElementById('active-filter').style.display = 'flex';
        document.getElementById('active-filter-text').textContent = `Topic: ${activeTopic}`;
    }
}

// Rendering

function render() {
    const grid = document.getElementById('faculty-results');
    const countEl = document.getElementById('faculty-count');
    const awardsView = currentView === 'awards';
    const studentsView = currentView === 'students';
    document.getElementById('awards-link').classList.toggle('active', awardsView);
    document.getElementById('students-link').classList.toggle('active', studentsView);
    document.getElementById('directory-link').classList.toggle('active', !awardsView && !studentsView);
    document.getElementById('filters').style.display = (awardsView || studentsView) ? 'none' : '';

    if (awardsView) {
        if (activeSearchScope) resetSearchScope();
        grid.className = 'awards-view';
        grid.innerHTML = renderAwards();
        const total = awardCategories.reduce((n, c) => n + c.awards.length, 0);
        countEl.textContent = `${total} awards across ${awardCategories.length} categories`;
        updateUrl();
        return;
    }

    if (studentsView) {
        grid.className = 'roster';
        const filtered = getFilteredStudents();
        countEl.textContent = `${filtered.length} students/alumni`;
        grid.innerHTML = filtered.map(renderStudentRow).join('');
        updateUrl();
        return;
    }

    grid.className = 'results-grid';
    const filtered = getFiltered();
    countEl.textContent = `${filtered.length} people`;
    grid.innerHTML = filtered.map(renderCard).join('');
    updateUrl();
}

function renderAwards() {
    return awardCategories.map(cat => `
      <section class="award-category">
        <h2 class="award-category-title">${esc(cat.category)} <span class="award-count">${cat.awards.length}</span></h2>
        <ul class="award-list">${cat.awards.map(renderAwardItem).join('')}</ul>
      </section>`).join('');
}

function renderAwardItem(a) {
    const name = a.faculty
        ? `<a class="award-person" data-name="${esc(a.name)}" href="#">${esc(a.name)}</a>`
        : `<span class="award-person former" title="Formerly at GMU">${esc(a.name)}</span>`;
    const year = a.year ? `<span class="award-year">${esc(a.year)}</span>` : '';
    return `<li class="award-item">${name}<span class="award-desc">${esc(a.award)}</span>${year}</li>`;
}

// Escape untrusted spreadsheet values before inserting into HTML
function esc(s) {
    return String(s)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

// Only allow http(s) URLs in href/src attributes
function safeUrl(url) {
    return /^https?:\/\//i.test(url) ? esc(url) : null;
}

const WEBSITE_ICON = '<path d="m12 3-9 8h3v10h5v-6h2v6h5V11h3l-9-8Z"/>';
const SCHOLAR_ICON = '<path d="M12 3 1 9l11 6 9-4.91V17h2V9L12 3Z"/><path d="M5 12.18V16c0 1.66 3.13 3 7 3s7-1.34 7-3v-3.82l-7 3.82-7-3.82Z"/>';
const LINKEDIN_ICON = '<path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.11 1 2.48 1s2.5 1.12 2.5 2.5ZM.24 8h4.48v15.5H.24V8Zm7.72 0h4.29v2.12h.06c.6-1.13 2.06-2.33 4.25-2.33 4.54 0 5.38 2.99 5.38 6.88v8.83h-4.47v-7.83c0-1.87-.03-4.27-2.6-4.27-2.61 0-3.01 2.04-3.01 4.14v7.96H7.96V8Z"/>';

function iconLink(className, href, label, iconPath) {
    return `<a class="icon-link ${className}" href="${href}" target="_blank" rel="noopener noreferrer" aria-label="${label}" title="${label}"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${iconPath}</svg></a>`;
}

function profileIcons(p, name) {
    const links = [];
    const website = p.website && safeUrl(p.website);
    const linkedin = p.linkedin && safeUrl(p.linkedin);
    const scholar = p.scholar && safeUrl(p.scholar);
    if (website) links.push(iconLink('website-link', website, `${name} personal or lab website`, WEBSITE_ICON));
    if (linkedin) links.push(iconLink('linkedin-link', linkedin, `${name} on LinkedIn`, LINKEDIN_ICON));
    if (scholar) links.push(iconLink('scholar-link', scholar, `${name} on Google Scholar`, SCHOLAR_ICON));
    return links.join('');
}

function renderCard(f) {
    const fullName = `${f.firstName} ${f.lastName}`;
    const interestTags = f.interests.map(i =>
        `<span class="interest-tag" data-interest="${esc(i)}">${esc(i)}</span>`
    ).join('');

    const details = [];
    if (f.category && f.type) details.push(detailRow('Position', esc(`${f.category} · ${f.type}`)));
    if (f.office) details.push(detailRow('Office', esc(f.office)));
    if (f.email) details.push(detailRow('Email', esc(f.email)));
    if (f.phdFrom) details.push(detailRow('PhD', esc(f.phdFrom)));
    if (f.postdocFrom) details.push(detailRow('Postdoc', esc(f.postdocFrom)));
    if (f.yearStarted) details.push(detailRow('At GMU since', esc(f.yearStarted)));

    const achievementsList = f.awards.length
        ? `<div class="achievements-section collapsed">
             <div class="achievements-header" onclick="toggleAchievements(this)">
               <h3 class="achievements-heading">Achievements</h3>
               <span class="achievements-toggle">▶</span>
             </div>
             <div class="achievements-list">${renderAchievementGroups(f.awards)}</div>
           </div>`
        : '';

    const picture = f.picture && safeUrl(f.picture);
    const icons = profileIcons(f, fullName);
    return `
    <div class="card">
      <div class="card-header">
        ${picture ? `<img class="faculty-photo" src="${picture}" alt="${esc(fullName)}" loading="lazy" onerror="this.remove()">` : ''}
        <div class="card-header-text">
          <div class="card-name-row">
            <h2>${esc(fullName)}</h2>
            ${icons ? `<span class="card-icons">${icons}</span>` : ''}
          </div>
          ${f.role ? `<div class="card-subtitle"><strong>${esc(f.role)}</strong></div>` : ''}
        </div>
      </div>
      <div class="card-content">
        <div class="faculty-details">${details.join('')}</div>
        ${interestTags ? `<div class="interest-tags">${interestTags}</div>` : ''}
        ${achievementsList}
      </div>
    </div>
  `;
}

function detailRow(label, value) {
    return `<div class="faculty-detail"><span class="detail-label">${label}</span><span class="detail-value">${value}</span></div>`;
}

// Compact row for the Students/Alumni view — there can be hundreds of entries,
// so this is deliberately much lighter than the faculty card.
function renderStudentRow(s) {
    const fullName = `${s.firstName} ${s.lastName}`.trim();
    const picture = s.picture && safeUrl(s.picture);
    const icons = profileIcons(s, fullName);

    const metaParts = [];
    if (s.advisor) {
        const advisorValue = s.advisorFaculty
            ? `<a class="award-person" data-name="${esc(s.advisor)}" href="#">${esc(s.advisor)}</a>`
            : esc(s.advisor);
        metaParts.push(`Advisor: ${advisorValue}`);
    }
    if (s.degree) metaParts.push(esc(s.degree));

    const detailParts = [];
    if (s.currentJob) detailParts.push(`Now: ${esc(s.currentJob)}`);
    if (s.firstJob) detailParts.push(`First job: ${esc(s.firstJob)}`);
    if (s.internships) detailParts.push(`Internships: ${esc(s.internships)}`);

    const honorsHtml = s.honors.length
        ? `<div class="entry-honors"><span class="honors-label">🏆 Honors:</span> ${s.honors.map(esc).join(' · ')}</div>`
        : '';

    const topicTags = s.topics.map(t =>
        `<span class="interest-tag" data-topic="${esc(t)}">${esc(t)}</span>`
    ).join('');

    return `
    <div class="entry${picture ? ' entry-with-portrait' : ''}">
      ${picture ? `<img class="entry-portrait" src="${picture}" alt="" loading="lazy" onerror="this.remove()">` : ''}
      <div class="entry-content">
        <div class="entry-name-row">
          <span class="entry-name">${esc(fullName)}</span>
          ${icons ? `<span class="entry-icons">${icons}</span>` : ''}
        </div>
        ${metaParts.length ? `<div class="entry-meta">${metaParts.join(' · ')}</div>` : ''}
        ${detailParts.length ? `<div class="entry-details">${detailParts.join(' · ')}</div>` : ''}
        ${honorsHtml}
        ${topicTags ? `<div class="entry-tags">${topicTags}</div>` : ''}
      </div>
    </div>
  `;
}

// Group a person's awards by category (newest-first order preserved) so each
// card shows its awards under headings like "NSF CAREER Awards".
function renderAchievementGroups(awards) {
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

// Achievements expand/collapse
window.toggleAchievements = function (header) {
    header.closest('.achievements-section').classList.toggle('collapsed');
};

// Click an interest tag (faculty) or topic tag (students) to filter
document.addEventListener('click', e => {
    const tag = e.target.closest('.interest-tag');
    if (!tag) return;
    document.getElementById('active-filter').style.display = 'flex';
    resetFilterDropdowns();
    document.getElementById('main-search').value = '';
    resetSearchScope();

    if (tag.dataset.topic) {
        currentView = 'students';
        activeTopic = tag.dataset.topic;
        activeInterest = null;
        document.getElementById('active-filter-text').textContent = `Topic: ${activeTopic}`;
    } else {
        currentView = 'directory';
        activeInterest = tag.dataset.interest;
        activeTopic = null;
        document.getElementById('active-filter-text').textContent = `Research: ${activeInterest}`;
    }
    render();
});

// Click an award recipient (in the #awards view) or a student's advisor to open their card
document.addEventListener('click', e => {
    const link = e.target.closest('.award-person');
    if (!link || !link.dataset.name) return;
    e.preventDefault();
    currentView = 'directory';
    activeInterest = null;
    activeTopic = null;
    document.getElementById('active-filter').style.display = 'none';
    resetFilterDropdowns();
    document.getElementById('main-search').value = link.dataset.name;
    resetSearchScope();
    window.scrollTo({ top: 0 });
    render();
});



init();
