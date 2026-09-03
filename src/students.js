import { loadFaculty, loadStudents } from './data.js';
import { esc, safeUrl, profileIcons, createSearchController, setupSearchHelp, uniqueNonEmpty, splitList } from './common.js';
import './style.css';

let allStudents = [];
let topicIndex = new Map();
let activeTopic = null;
let currentView = 'directory'; // 'directory' | 'insights'
let search;

const CURRENT_YEAR = new Date().getFullYear();

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

const KEYWORD_META = {
    name: { label: 'Name', icon: '👤' },
    advisor: { label: 'Advisor', icon: '🎓' },
    honors: { label: 'Honors', icon: '🏅' },
    honor: { label: 'Honors', icon: '🏅' },
    award: { label: 'Honors', icon: '🏅' },
    awards: { label: 'Honors', icon: '🏅' },
    phd: { label: 'Degree', icon: '🎓' },
    degree: { label: 'Degree', icon: '🎓' },
    topic: { label: 'Topic', icon: '🏷️' },
    topics: { label: 'Topic', icon: '🏷️' },
    research: { label: 'Topic', icon: '🏷️' },
    job: { label: 'Job', icon: '💼' },
    currentjob: { label: 'Current Job', icon: '💼' },
    firstjob: { label: 'First Job', icon: '💼' },
    intern: { label: 'Internship', icon: '💼' },
    internship: { label: 'Internship', icon: '💼' },
    internships: { label: 'Internship', icon: '💼' },
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

const SEARCH_HELP_ENTRIES = [
    { code: 'name:', example: 'Jane Nguyen' },
    { code: 'advisor:', example: 'Jan Allbeck' },
    { code: 'topic:', example: 'Robotics' },
    { code: 'degree:', example: "PhD '24" },
    { code: 'honors:', example: 'NSF Fellowship' },
    { code: 'job:', example: 'Google' },
    { code: 'internship:', example: 'Amazon' },
    { code: '#tag', example: '— e.g. #AI' },
];

async function init() {
    const facultyData = await loadFaculty();
    const studentData = await loadStudents(facultyData.facultyByName);
    allStudents = studentData.students;
    topicIndex = studentData.topicIndex;

    setupSearchHelp(SEARCH_HELP_ENTRIES);
    search = createSearchController({
        input: document.getElementById('main-search'),
        scopeChip: document.getElementById('search-scope-chip'),
        scopeChipLabel: document.getElementById('search-scope-chip-label'),
        suggestionPanel: document.getElementById('search-suggestion-panel'),
        keywordMap: STUDENT_KEYWORDS,
        keywordMeta: KEYWORD_META,
        suggestionSources: STUDENT_SUGGESTION_SOURCES,
        onChange: render,
    });

    setupFilters();
    setupActiveFilterBanner();
    setupNav();
    restoreFromUrl();
    render();

    window.addEventListener('popstate', () => {
        restoreFromUrl();
        render();
    });
}

function setupFilters() {
    document.getElementById('degree-filter').addEventListener('change', () => render());
    document.getElementById('status-filter').addEventListener('change', () => render());
}

function resetFilterDropdowns() {
    document.getElementById('degree-filter').value = 'all';
    document.getElementById('status-filter').value = 'all';
}

// Degree dropdown reads the free-text Degree column ("PhD '24", "MS", "PhD (visiting)", ...)
function degreeMatches(s, value) {
    if (value === 'all') return true;
    const d = (s.degree || '').toLowerCase();
    if (value === 'PhD') return d.startsWith('phd');
    if (value === 'MS') return d.startsWith('ms');
    if (value === 'Undergrad') return d.startsWith('bs') || d.startsWith('ba') || d.startsWith('undergrad');
    return true;
}

// There's no explicit "graduated" flag in the data, so Current/Alumni is inferred:
// a apostrophe-year in the Degree column (e.g. "PhD '26") is compared to the current
// year; without one, we fall back to whether a Current Job is on file.
function studentStatus(s) {
    const match = (s.degree || '').match(/'(\d{2})\b/);
    if (match) {
        const year = 2000 + parseInt(match[1], 10);
        return year >= CURRENT_YEAR ? 'current' : 'alumni';
    }
    return s.currentJob ? 'alumni' : 'current';
}

function statusMatches(s, value) {
    return value === 'all' || studentStatus(s) === value;
}

function setupActiveFilterBanner() {
    document.getElementById('clear-filter').addEventListener('click', () => {
        activeTopic = null;
        document.getElementById('active-filter').style.display = 'none';
        render();
    });
}

function setupNav() {
    document.getElementById('students-link').addEventListener('click', e => {
        e.preventDefault();
        currentView = 'directory';
        activeTopic = null;
        document.getElementById('active-filter').style.display = 'none';
        document.getElementById('main-search').value = '';
        search.resetScope();
        window.scrollTo({ top: 0 });
        render();
    });
    document.getElementById('insights-link').addEventListener('click', e => {
        e.preventDefault();
        currentView = 'insights';
        window.scrollTo({ top: 0 });
        render();
    });
}

function getFiltered() {
    let list = allStudents;

    if (activeTopic) {
        list = topicIndex.get(activeTopic) || [];
    }

    const degreeFilter = document.getElementById('degree-filter').value;
    const statusFilter = document.getElementById('status-filter').value;
    list = list.filter(s => degreeMatches(s, degreeFilter) && statusMatches(s, statusFilter));

    const query = document.getElementById('main-search').value.trim().toLowerCase();
    if (query) {
        const kw = search.effectiveSearch();
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
    const q = search.searchQueryValue();
    const degree = document.getElementById('degree-filter').value;
    const status = document.getElementById('status-filter').value;

    if (currentView !== 'directory') params.set('view', currentView);
    if (q) params.set('q', q);
    if (degree !== 'all') params.set('degree', degree);
    if (status !== 'all') params.set('status', status);
    if (activeTopic) params.set('topic', activeTopic);

    const qs = params.toString();
    const url = window.location.pathname + (qs ? '?' + qs : '');
    history.replaceState(null, '', url);
}

function restoreFromUrl() {
    const params = new URLSearchParams(window.location.search);

    if (params.get('view') === 'insights') currentView = 'insights';
    if (params.has('q')) search.setSearchValue(params.get('q'));
    if (params.has('degree')) document.getElementById('degree-filter').value = params.get('degree');
    if (params.has('status')) document.getElementById('status-filter').value = params.get('status');
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
    const insightsView = currentView === 'insights';
    document.getElementById('students-link').classList.toggle('active', !insightsView);
    document.getElementById('insights-link').classList.toggle('active', insightsView);
    document.getElementById('filters').style.display = insightsView ? 'none' : '';

    if (insightsView) {
        search.resetScope();
        grid.className = 'insights-view';
        grid.innerHTML = renderInsights();
        countEl.textContent = `Insights across ${allStudents.length} tracked students/alumni`;
        updateUrl();
        return;
    }

    grid.className = 'roster';
    const filtered = getFiltered();
    countEl.textContent = `${filtered.length} students/alumni`;
    grid.innerHTML = filtered.map(renderStudentRow).join('');
    updateUrl();
}

// Compact row for the Students/Alumni list — there can be hundreds of entries,
// so this is deliberately much lighter than the faculty card.
function renderStudentRow(s) {
    const fullName = `${s.firstName} ${s.lastName}`.trim();
    const picture = s.picture && safeUrl(s.picture);
    const icons = profileIcons(s, fullName);

    const metaParts = [];
    if (s.advisor) {
        const advisorValue = s.advisorFaculty
            ? `<a class="award-person" href="index.html?q=${encodeURIComponent(s.advisor)}">${esc(s.advisor)}</a>`
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

// Insights — a handful of automatically-computed, clickable facts about the
// tracked students/alumni. Company names are extracted from free-text
// Internships/Current Job fields with a simple heuristic (text after the
// first comma, parentheticals stripped), so treat the employer list as
// approximate rather than authoritative.
function extractOrg(text) {
    if (!text) return null;
    let part = text.includes(',') ? text.split(',').slice(1).join(',').trim() : text.trim();
    part = part.replace(/\(.*?\)/g, '').trim();
    return part || null;
}

function topCounts(items, limit) {
    const counts = new Map();
    items.forEach(item => {
        if (!item) return;
        counts.set(item, (counts.get(item) || 0) + 1);
    });
    return Array.from(counts, ([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
        .slice(0, limit);
}

function renderInsights() {
    const total = allStudents.length;
    const withInternships = allStudents.filter(s => s.internships).length;
    const withHonors = allStudents.filter(s => s.honors.length).length;
    const currentCount = allStudents.filter(s => studentStatus(s) === 'current').length;
    const alumniCount = total - currentCount;

    const advisorCounts = topCounts(allStudents.map(s => s.advisor), 8);
    const topicCounts = topCounts(allStudents.flatMap(s => s.topics), 16);
    const orgCounts = topCounts(
        allStudents.flatMap(s => [
            extractOrg(s.currentJob),
            ...splitList(s.internships).map(extractOrg),
        ]),
        10
    );

    const tiles = [
        { value: total, label: 'Tracked students/alumni' },
        { value: `${Math.round((withInternships / total) * 100)}%`, label: 'With a documented internship' },
        { value: `${Math.round((withHonors / total) * 100)}%`, label: 'With an honor or award on file' },
        { value: currentCount, label: 'Current students' },
        { value: alumniCount, label: 'Alumni' },
    ];

    const maxAdvisor = advisorCounts[0]?.count || 1;
    const maxOrg = orgCounts[0]?.count || 1;

    return `
    <p class="insights-caption">Auto-computed from the tracked roster below — a work in progress, not the full department. Employer names are extracted heuristically from free-text job/internship entries, so treat that list as approximate.</p>
    <div class="stat-tiles">
      ${tiles.map(t => `<div class="stat-tile"><div class="stat-tile-value">${esc(t.value)}</div><div class="stat-tile-label">${esc(t.label)}</div></div>`).join('')}
    </div>

    <div class="insights-section">
      <h3 class="insights-heading">Top Advisors</h3>
      <p class="insights-caption">By number of tracked students; click to see their advisees.</p>
      <div class="ranked-list">
        ${advisorCounts.map(({ value, count }) => `
          <button type="button" class="ranked-item" data-advisor="${esc(value)}" title="Filter by ${esc(value)}">
            <div class="ranked-header">
              <span class="ranked-name">${esc(value)}</span>
              <span class="ranked-count">${count}</span>
            </div>
            <div class="ranked-track"><div class="ranked-bar" style="width: ${Math.round((count / maxAdvisor) * 100)}%;"></div></div>
          </button>`).join('')}
      </div>
    </div>

    ${orgCounts.length ? `
    <div class="insights-section">
      <h3 class="insights-heading">Where They've Worked</h3>
      <p class="insights-caption">Top employers seen across current jobs and internships (approximate, see caption above); click to search.</p>
      <div class="ranked-list">
        ${orgCounts.map(({ value, count }) => `
          <button type="button" class="ranked-item" data-org="${esc(value)}" title="Search for ${esc(value)}">
            <div class="ranked-header">
              <span class="ranked-name">${esc(value)}</span>
              <span class="ranked-count">${count}</span>
            </div>
            <div class="ranked-track"><div class="ranked-bar" style="width: ${Math.round((count / maxOrg) * 100)}%;"></div></div>
          </button>`).join('')}
      </div>
    </div>` : ''}

    <div class="insights-section">
      <h3 class="insights-heading">Popular Research Topics</h3>
      <p class="insights-caption">Click a topic to see who works on it.</p>
      <div class="interest-tags insights-tags">
        ${topicCounts.map(({ value, count }) => `<span class="interest-tag" data-topic="${esc(value)}">${esc(value)} <span class="tag-count">${count}</span></span>`).join('')}
      </div>
    </div>
  `;
}

// Click an advisor bar in Insights → filter the directory to that advisor
document.addEventListener('click', e => {
    const item = e.target.closest('.ranked-item[data-advisor]');
    if (!item) return;
    currentView = 'directory';
    activeTopic = null;
    document.getElementById('active-filter').style.display = 'none';
    resetFilterDropdowns();
    search.setSearchValue(`advisor: ${item.dataset.advisor}`);
    window.scrollTo({ top: 0 });
    render();
});

// Click an employer bar in Insights → search for it across current job/internships
document.addEventListener('click', e => {
    const item = e.target.closest('.ranked-item[data-org]');
    if (!item) return;
    currentView = 'directory';
    activeTopic = null;
    document.getElementById('active-filter').style.display = 'none';
    resetFilterDropdowns();
    document.getElementById('main-search').value = item.dataset.org;
    search.resetScope();
    window.scrollTo({ top: 0 });
    render();
});

// Click a topic tag (in the roster or Insights) to filter
document.addEventListener('click', e => {
    const tag = e.target.closest('.interest-tag');
    if (!tag || !tag.dataset.topic) return;
    currentView = 'directory';
    activeTopic = tag.dataset.topic;
    document.getElementById('active-filter').style.display = 'flex';
    document.getElementById('active-filter-text').textContent = `Topic: ${activeTopic}`;
    resetFilterDropdowns();
    document.getElementById('main-search').value = '';
    search.resetScope();
    render();
});

init();
