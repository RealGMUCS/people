import { loadFaculty } from './data.js';
import { esc, safeUrl, profileIcons, detailRow, renderAchievementGroups, setupAchievementsToggle, createSearchController, setupSearchHelp, sample, renderSearchExamples, setupSearchExamplesClick } from './common.js';
import './style.css';

let allFaculty = [];
let interestIndex = new Map();
let awardCategories = [];
let activeInterest = null; // currently selected faculty research-interest filter
let currentView = 'directory'; // 'directory' | 'awards'
let search;

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

const KEYWORD_META = {
    name: { label: 'Name', icon: '👤' },
    research: { label: 'Research', icon: '🔬' },
    interest: { label: 'Research', icon: '🔬' },
    interests: { label: 'Research', icon: '🔬' },
    phd: { label: 'PhD', icon: '🎓' },
    postdoc: { label: 'Postdoc', icon: '🎓' },
    rank: { label: 'Rank', icon: '🎓' },
    type: { label: 'Type', icon: '🏷️' },
    office: { label: 'Office', icon: '🏢' },
    honors: { label: 'Honors', icon: '🏆' },
    honor: { label: 'Honors', icon: '🏆' },
    award: { label: 'Honors', icon: '🏆' },
    awards: { label: 'Honors', icon: '🏆' },
};

function uniqueNonEmpty(arr) {
    return Array.from(new Set(arr.filter(Boolean)));
}

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

const SEARCH_HELP_ENTRIES = [
    { code: 'name:', example: 'ThanhVu Nguyen' },
    { code: 'research:', example: 'Software Engineering' },
    { code: 'rank:', example: 'Associate Professor' },
    { code: 'type:', example: 'Tenured' },
    { code: 'phd:', example: 'MIT' },
    { code: 'postdoc:', example: 'University of Maryland' },
    { code: 'office:', example: 'Engineering 4430' },
    { code: 'honors:', example: 'NSF CAREER' },
    { code: '#tag', example: '— e.g. #AI, #associate' },
];

async function init() {
    const data = await loadFaculty();
    allFaculty = data.faculty;
    interestIndex = data.interestIndex;
    awardCategories = data.awardCategories;

    setupAchievementsToggle();
    setupSearchHelp(SEARCH_HELP_ENTRIES);
    search = createSearchController({
        input: document.getElementById('main-search'),
        scopeChip: document.getElementById('search-scope-chip'),
        scopeChipLabel: document.getElementById('search-scope-chip-label'),
        suggestionPanel: document.getElementById('search-suggestion-panel'),
        keywordMap: FACULTY_KEYWORDS,
        keywordMeta: KEYWORD_META,
        suggestionSources: FACULTY_SUGGESTION_SOURCES,
        onChange: render,
    });

    setupFilters();
    setupInterestBanner();
    setupNav();
    setupSearchExamplesClick(query => {
        search.setSearchValue(query);
        render();
        document.getElementById('main-search').focus();
    });
    refreshSearchExamples();
    restoreFromUrl();
    render();

    window.addEventListener('popstate', () => {
        restoreFromUrl();
        render();
    });
}

function setupFilters() {
    document.getElementById('rank-filter').addEventListener('change', () => render());
    document.getElementById('type-filter').addEventListener('change', () => render());
}

// Rank dropdown mixes two underlying fields: Professor/Associate/Assistant come from
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
        document.getElementById('active-filter').style.display = 'none';
        render();
    });
}

function setupNav() {
    const go = (view) => {
        currentView = view;
        activeInterest = null;
        document.getElementById('active-filter').style.display = 'none';
        document.getElementById('main-search').value = '';
        search.resetScope();
        if (view === 'directory') refreshSearchExamples();
        window.scrollTo({ top: 0 });
        render();
    };
    document.getElementById('awards-link').addEventListener('click', e => { e.preventDefault(); go('awards'); });
    document.getElementById('nav-people').addEventListener('click', e => { e.preventDefault(); go('directory'); });
}

// One randomized "Try:" example per kind of query the search box accepts, so
// the row demonstrates the whole vocabulary and stays fresh on every visit.
function refreshSearchExamples() {
    const interests = Array.from(interestIndex.keys());
    const names = uniqueNonEmpty(allFaculty.map(f => `${f.firstName} ${f.lastName}`.trim()));
    const honors = uniqueNonEmpty(allFaculty.flatMap(f => f.achievements));
    const ranks = uniqueNonEmpty(allFaculty.map(f => f.category));

    const examples = [
        ...sample(interests, 2).map(v => ({ label: v, query: `research: ${v}` })),
        ...sample(names, 1).map(v => ({ label: v, query: `name: ${v}` })),
        ...sample(honors, 1).map(v => ({ label: v, query: `honors: ${v}` })),
        ...sample(ranks, 1).map(v => ({ label: `${v} Professors`, query: `rank: ${v}` })),
    ];
    renderSearchExamples(examples);
}

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

    // Search query or keyword filter
    const kw = search.effectiveSearch();
    if (kw) {
        if (kw.query) {
            list = list.filter(f => String(kw.getField(f) || '').toLowerCase().includes(kw.query));
        } else {
            list = list.filter(f => {
                const val = kw.getField(f);
                if (!val) return false;
                if (Array.isArray(val)) return val.length > 0;
                return String(val).trim() !== '';
            });
        }
    } else if (query) {
        if (query.startsWith('#')) {
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

function updateUrl() {
    const params = new URLSearchParams();
    const q = search.searchQueryValue();
    const rank = document.getElementById('rank-filter').value;
    const type = document.getElementById('type-filter').value;

    if (currentView !== 'directory') params.set('view', currentView);
    if (q) params.set('q', q);
    if (rank !== 'all') params.set('rank', rank);
    if (type !== 'all') params.set('type', type);
    if (activeInterest) params.set('interest', activeInterest);

    const qs = params.toString();
    const url = window.location.pathname + (qs ? '?' + qs : '');
    history.replaceState(null, '', url);
}

function restoreFromUrl() {
    const params = new URLSearchParams(window.location.search);

    if (params.get('view') === 'awards') {
        currentView = 'awards';
    }
    if (params.has('q')) search.setSearchValue(params.get('q'));
    if (params.has('rank')) document.getElementById('rank-filter').value = params.get('rank');
    if (params.has('type')) document.getElementById('type-filter').value = params.get('type');
    if (params.has('interest')) {
        activeInterest = params.get('interest');
        document.getElementById('active-filter').style.display = 'flex';
        document.getElementById('active-filter-text').textContent = `Research: ${activeInterest}`;
    }
}

// Rendering

function render() {
    const grid = document.getElementById('faculty-results');
    const countEl = document.getElementById('faculty-count');
    const awardsView = currentView === 'awards';
    document.getElementById('awards-link').classList.toggle('active', awardsView);
    document.getElementById('filters').style.display = awardsView ? 'none' : '';
    document.querySelector('.search-examples').style.display = awardsView ? 'none' : '';

    if (awardsView) {
        search.resetScope();
        grid.className = 'awards-view';
        grid.innerHTML = renderAwards();
        const total = awardCategories.reduce((n, c) => n + c.awards.length, 0);
        countEl.textContent = `${total} awards across ${awardCategories.length} categories`;
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
    if (f.advisees && f.advisees.length > 0) {
        const count = f.advisees.length;
        const label = count === 1 ? '1 student' : `${count} students`;
        const url = `students.html?q=advisor:${encodeURIComponent(fullName)}`;
        details.push(detailRow('Advisees', `<a class="advisees-link" href="${esc(url)}">${esc(label)} ↗</a>`));
    }

    const achievementsList = f.awards.length
        ? `<div class="achievements-section collapsed">
             <div class="achievements-header" onclick="toggleAchievements(this)">
               <h3 class="achievements-heading"><span class="honors-label">🏆 Honors & Awards:</span></h3>
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

// Click an interest tag to filter
document.addEventListener('click', e => {
    const tag = e.target.closest('.interest-tag');
    if (!tag) return;
    document.getElementById('active-filter').style.display = 'flex';
    resetFilterDropdowns();
    document.getElementById('main-search').value = '';
    search.resetScope();
    currentView = 'directory';
    activeInterest = tag.dataset.interest;
    document.getElementById('active-filter-text').textContent = `Research: ${activeInterest}`;
    render();
});

// Click an award recipient (in the #awards view) to open their card
document.addEventListener('click', e => {
    const link = e.target.closest('.award-person');
    if (!link || !link.dataset.name) return;
    e.preventDefault();
    currentView = 'directory';
    activeInterest = null;
    document.getElementById('active-filter').style.display = 'none';
    resetFilterDropdowns();
    document.getElementById('main-search').value = link.dataset.name;
    search.resetScope();
    window.scrollTo({ top: 0 });
    render();
});

init();
