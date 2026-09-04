import { loadFaculty, loadStudents } from './data.js';
import { esc, safeUrl, profileIcons, createSearchController, setupSearchHelp, uniqueNonEmpty, splitList, sample, renderSearchExamples, setupSearchExamplesClick } from './common.js';
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
    phdyear: s => s.phdYear,
    msyear: s => s.msYear,
    bsyear: s => s.bsYear,
    year: s => s.gradYear,
    gradyear: s => s.gradYear,
    topic: s => s.topics.join(' '),
    topics: s => s.topics.join(' '),
    research: s => s.topics.join(' '),
    job: s => [s.currentJob, s.firstJob].filter(Boolean).join(' '),
    currentjob: s => s.currentJob,
    firstjob: s => s.firstJob,
    intern: s => s.internships,
    internship: s => s.internships,
    internships: s => s.internships,
    academia: s => (isAcademiaJob(s.currentJob) || isAcademiaJob(s.firstJob)) ? 'academia faculty professor postdoc' : '',
    industry: s => ((s.currentJob && isIndustryJob(s.currentJob)) || (s.firstJob && isIndustryJob(s.firstJob))) ? 'industry corporate tech engineer scientist' : '',
    gov: s => (isGovLabJob(s.currentJob) || isGovLabJob(s.firstJob)) ? 'government national lab nasa mitre' : '',
    government: s => (isGovLabJob(s.currentJob) || isGovLabJob(s.firstJob)) ? 'government national lab nasa mitre' : '',
};

const KEYWORD_META = {
    name: { label: 'Name', icon: '👤' },
    advisor: { label: 'Advisor', icon: '🎓' },
    honors: { label: 'Honors', icon: '🏆' },
    honor: { label: 'Honors', icon: '🏆' },
    award: { label: 'Honors', icon: '🏆' },
    awards: { label: 'Honors', icon: '🏆' },
    phd: { label: 'Degree', icon: '🎓' },
    degree: { label: 'Degree', icon: '🎓' },
    phdyear: { label: 'PhD Year', icon: '🎓' },
    msyear: { label: 'MS Year', icon: '🎓' },
    bsyear: { label: 'BS Year', icon: '🎓' },
    year: { label: 'Grad Year', icon: '🎓' },
    gradyear: { label: 'Grad Year', icon: '🎓' },
    topic: { label: 'Topic', icon: '🏷️' },
    topics: { label: 'Topic', icon: '🏷️' },
    research: { label: 'Topic', icon: '🏷️' },
    job: { label: 'Job', icon: '💼' },
    currentjob: { label: 'Current Job', icon: '💼' },
    firstjob: { label: 'First Job', icon: '💼' },
    intern: { label: 'Internship', icon: '💼' },
    internship: { label: 'Internship', icon: '💼' },
    internships: { label: 'Internship', icon: '💼' },
    academia: { label: 'Academia', icon: '🏛️' },
    industry: { label: 'Industry', icon: '💼' },
    gov: { label: 'Government', icon: '🏢' },
    government: { label: 'Government', icon: '🏢' },
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
    phdyear: () => uniqueNonEmpty(allStudents.map(s => s.phdYear.split(' ')[0])),
    msyear: () => uniqueNonEmpty(allStudents.map(s => s.msYear.split(' ')[0])),
    bsyear: () => uniqueNonEmpty(allStudents.map(s => s.bsYear.split(' ')[0])),
    year: () => uniqueNonEmpty(allStudents.map(s => s.gradYear.split(' ')[0])),
    gradyear: () => uniqueNonEmpty(allStudents.map(s => s.gradYear.split(' ')[0])),
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
    { code: 'name:', example: 'Timothy Balint' },
    { code: 'advisor:', example: 'Jan Allbeck' },
    { code: 'phdyear:', example: '2023' },
    { code: 'msyear:', example: '2025' },
    { code: 'topic:', example: 'Robotics' },
    { code: 'degree:', example: "PhD '24" },
    { code: 'honors:', example: 'NSF Fellowship' },
    { code: 'job:', example: 'Google' },
    { code: 'internships:', example: 'NVIDIA' },
    { code: '#tag', example: '— e.g. #AI' },
];

async function init() {
    const facultyData = await loadFaculty();
    const studentData = await loadStudents(facultyData.facultyByName);
    allStudents = studentData.students;
    topicIndex = studentData.topicIndex;

    // Assign a random index to each student once per session load
    const randomIndices = sample(Array.from({ length: allStudents.length }, (_, i) => i), allStudents.length);
    allStudents.forEach((s, idx) => { s.randomIndex = randomIndices[idx]; });

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
    document.getElementById('degree-filter').addEventListener('change', () => render());
    document.getElementById('status-filter').addEventListener('change', () => render());
    document.getElementById('sort-order').addEventListener('change', () => render());
}

function resetFilterDropdowns() {
    document.getElementById('degree-filter').value = 'all';
    document.getElementById('status-filter').value = 'all';
    document.getElementById('sort-order').value = 'random';
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
    document.getElementById('nav-students').addEventListener('click', e => {
        e.preventDefault();
        currentView = 'directory';
        activeTopic = null;
        document.getElementById('active-filter').style.display = 'none';
        document.getElementById('main-search').value = '';
        search.resetScope();
        refreshSearchExamples();
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

// One randomized "Try:" example per kind of query the search box accepts, so
// the row demonstrates the whole vocabulary and stays fresh on every visit.
function refreshSearchExamples() {
    const topics = Array.from(topicIndex.keys());
    const advisors = uniqueNonEmpty(allStudents.map(s => s.advisor));
    const honors = uniqueNonEmpty(allStudents.flatMap(s => s.honors));
    const jobs = uniqueNonEmpty(allStudents.flatMap(s => [s.currentJob, s.firstJob]));

    const examples = [
        ...sample(topics, 2).map(v => ({ label: v, query: `topic: ${v}` })),
        ...sample(advisors, 1).map(v => ({ label: v, query: `advisor: ${v}` })),
        ...sample(honors, 1).map(v => ({ label: v, query: `honors: ${v}` })),
        ...sample(jobs, 1).map(v => ({ label: v, query: `job: ${v}` })),
    ];
    renderSearchExamples(examples);
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
    const kw = search.effectiveSearch();
    if (kw) {
        if (kw.query) {
            list = list.filter(s => String(kw.getField(s) || '').toLowerCase().includes(kw.query));
        } else {
            list = list.filter(s => {
                const val = kw.getField(s);
                if (!val) return false;
                if (Array.isArray(val)) return val.length > 0;
                return String(val).trim() !== '';
            });
        }
    } else if (query) {
        if (query.startsWith('#')) {
            const tag = query.slice(1);
            list = list.filter(s =>
                s.topics.some(t => t.toLowerCase().includes(tag)) ||
                (s.degree && s.degree.toLowerCase().includes(tag))
            );
        } else {
            list = list.filter(s => studentSearchMatch(s, query));
        }
    }

    const sortOrder = document.getElementById('sort-order')?.value || 'random';
    return sortStudents(list, sortOrder);
}

function sortStudents(list, order) {
    const arr = list.slice();
    switch (order) {
        case 'random':
            return arr.sort((a, b) => (a.randomIndex ?? 0) - (b.randomIndex ?? 0));
        case 'name-asc':
            return arr.sort((a, b) => (a.lastName || '').localeCompare(b.lastName || '') || (a.firstName || '').localeCompare(b.firstName || ''));
        case 'name-desc':
            return arr.sort((a, b) => (b.lastName || '').localeCompare(a.lastName || '') || (b.firstName || '').localeCompare(a.firstName || ''));
        case 'grad-desc':
            return arr.sort((a, b) => {
                const yA = getGradYearNum(a);
                const yB = getGradYearNum(b);
                if (yA !== yB) return yB - yA;
                return (a.lastName || '').localeCompare(b.lastName || '');
            });
        case 'grad-asc':
            return arr.sort((a, b) => {
                const yA = getGradYearNum(a);
                const yB = getGradYearNum(b);
                if (yA === -1 && yB === -1) return (a.lastName || '').localeCompare(b.lastName || '');
                if (yA === -1) return 1;
                if (yB === -1) return -1;
                if (yA !== yB) return yA - yB;
                return (a.lastName || '').localeCompare(b.lastName || '');
            });
        case 'advisor-asc':
            return arr.sort((a, b) => {
                const advA = a.advisor || 'ZZZ';
                const advB = b.advisor || 'ZZZ';
                const partsA = advA.split(' ');
                const partsB = advB.split(' ');
                const lastA = partsA[partsA.length - 1];
                const lastB = partsB[partsB.length - 1];
                const comp = lastA.localeCompare(lastB);
                if (comp !== 0) return comp;
                return (a.lastName || '').localeCompare(b.lastName || '');
            });
        default:
            return arr.sort((a, b) => (a.randomIndex ?? 0) - (b.randomIndex ?? 0));
    }
}

function getGradYearNum(s) {
    const raw = s.gradYear || s.phdYear || s.msYear || s.degree || '';
    const m = raw.match(/\b(19\d{2}|20\d{2})\b/) || raw.match(/\x27(\d{2})\b/);
    if (!m) return -1;
    const val = parseInt(m[1], 10);
    return val < 100 ? (val > 50 ? 1900 + val : 2000 + val) : val;
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
    const sort = document.getElementById('sort-order')?.value || 'random';

    if (currentView !== 'directory') params.set('view', currentView);
    if (q) params.set('q', q);
    if (degree !== 'all') params.set('degree', degree);
    if (status !== 'all') params.set('status', status);
    if (sort !== 'random') params.set('sort', sort);
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
    if (params.has('sort') && document.getElementById('sort-order')) document.getElementById('sort-order').value = params.get('sort');
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
    document.getElementById('insights-link').classList.toggle('active', insightsView);
    document.getElementById('filters').style.display = insightsView ? 'none' : '';
    document.querySelector('.search-examples').style.display = insightsView ? 'none' : '';

    const filtered = getFiltered();

    if (insightsView) {
        grid.className = 'insights-view';
        grid.innerHTML = renderInsights(filtered);
        if (filtered.length === allStudents.length) {
            countEl.textContent = `Insights across ${allStudents.length} tracked students/alumni`;
        } else {
            countEl.textContent = `Insights across ${filtered.length} matching students/alumni (out of ${allStudents.length} total)`;
        }
        updateUrl();
        return;
    }

    const kw = search.effectiveSearch();
    const isAdvisorSearch = kw && kw.key === 'advisor' && kw.query;
    let advisorName = null;
    if (isAdvisorSearch) {
        const sampleStudent = filtered.find(s => s.advisor && s.advisor.toLowerCase().includes(kw.query))
            || allStudents.find(s => s.advisor && s.advisor.toLowerCase().includes(kw.query));
        advisorName = sampleStudent ? sampleStudent.advisor : kw.query;
    }

    if (advisorName) {
        const countText = filtered.length === 1 ? '1 student/alumnus' : `${filtered.length} students/alumni`;
        const facultyUrl = `index.html?q=name: ${encodeURIComponent(advisorName)}`;
        countEl.innerHTML = `${countText} advised by <a href="${esc(facultyUrl)}">${esc(advisorName)}</a>`;
    } else {
        countEl.textContent = `${filtered.length} students/alumni`;
    }

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
        metaParts.push(`Advisor: <a class="award-person" data-advisor="${esc(s.advisor)}" href="#">${esc(s.advisor)}</a>`);
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
function isAcademiaJob(text) {
    if (!text) return false;
    const t = text.toLowerCase();
    const roles = ['professor', 'prof.', 'prof ', 'postdoc', 'postdoctoral', 'faculty', 'lecturer', 'instructor', 'tenure'];
    const insts = ['university', 'college', 'univ', 'tu delft', 'eth zurich', 'epfl', 'mit ', 'stanford'];
    if (roles.some(r => t.includes(r))) return true;
    if (insts.some(i => t.includes(i)) && (t.includes('researcher') || t.includes('fellow') || t.includes('scholar'))) return true;
    return false;
}

function isGovLabJob(text) {
    if (!text) return false;
    const t = text.toLowerCase();
    const keywords = ['nasa', 'jpl', 'oak ridge', 'national lab', 'mitre', 'rand', 'nih', 'dod', 'navy', 'air force', 'army', 'defense', 'department of', 'government'];
    return keywords.some(k => t.includes(k));
}

function isIndustryJob(text) {
    if (!text) return false;
    return !isAcademiaJob(text) && !isGovLabJob(text);
}

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

function renderInsights(students = allStudents) {
    const total = students.length;
    if (total === 0) {
        return `<p class="insights-caption" style="margin-top: 2rem; font-size: 1.1rem; text-align: center;">No students match the current search filter.</p>`;
    }
    const withInternships = students.filter(s => s.internships).length;
    const withHonors = students.filter(s => s.honors.length).length;
    const currentCount = students.filter(s => studentStatus(s) === 'current').length;
    const alumniCount = total - currentCount;

    const academiaStudents = students.filter(s => isAcademiaJob(s.currentJob) || isAcademiaJob(s.firstJob));
    const academiaCount = academiaStudents.length;

    const govStudents = students.filter(s => isGovLabJob(s.currentJob) || isGovLabJob(s.firstJob));
    const govCount = govStudents.length;

    const industryStudents = students.filter(s => (s.currentJob && isIndustryJob(s.currentJob)) || (s.firstJob && isIndustryJob(s.firstJob)));
    const industryCount = industryStudents.length;

    const advisorCounts = topCounts(students.map(s => s.advisor), 8);
    const topicCounts = topCounts(students.flatMap(s => s.topics), 16);
    const orgCounts = topCounts(
        students.flatMap(s => [
            extractOrg(s.currentJob),
            ...splitList(s.internships).map(extractOrg),
        ]),
        10
    );

    const isFiltered = total < allStudents.length;

    const tiles = [
        { value: total, label: isFiltered ? 'Matching students/alumni' : 'Tracked students/alumni' },
        { value: `${academiaCount} (${total ? Math.round((academiaCount / total) * 100) : 0}%)`, label: 'In academia (faculty / postdoc)' },
        { value: `${industryCount} (${total ? Math.round((industryCount / total) * 100) : 0}%)`, label: 'In industry / corporate' },
        { value: `${govCount} (${total ? Math.round((govCount / total) * 100) : 0}%)`, label: 'In government / national labs' },
        { value: `${total ? Math.round((withInternships / total) * 100) : 0}%`, label: 'With a documented internship' },
        { value: `${total ? Math.round((withHonors / total) * 100) : 0}%`, label: 'With an honor or award on file' },
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

    ${advisorCounts.length ? `
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
    </div>` : ''}

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

    ${topicCounts.length ? `
    <div class="insights-section">
      <h3 class="insights-heading">Popular Research Topics</h3>
      <p class="insights-caption">Click a topic to see who works on it.</p>
      <div class="interest-tags insights-tags">
        ${topicCounts.map(({ value, count }) => `<span class="interest-tag" data-topic="${esc(value)}">${esc(value)} <span class="tag-count">${count}</span></span>`).join('')}
      </div>
    </div>` : ''}
  `;
}

// Click an advisor name (roster row or Insights bar) → filter to that advisor,
// same as typing "advisor: <name>" in the search box.
document.addEventListener('click', e => {
    const item = e.target.closest('[data-advisor]');
    if (!item) return;
    e.preventDefault();
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
