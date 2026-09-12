// @ts-nocheck
import { loadFaculty, loadStudents } from './data';
import { esc, safeUrl, loadSearchKit, createSearchController, setupSearchHelp, uniqueNonEmpty, splitList, sample, renderSearchExamples, setupSearchExamplesClick, showCommandOutput, hideCommandOutput, createSharedCommandHandler, setupSharedKeyboardShortcuts, renderProfileIcons } from './common';
import './style.css';
import { isAcademiaJob, isGovLabJob, isIndustryJob, isGmuFacultyJob, getGmuAlumniFaculty, extractOrg, topCounts } from './student-insights';

let allStudents = [];
let allFaculty = [];
let topicIndex = new Map();
let activeTopic = null;
let currentView = 'directory'; // 'directory' | 'insights'
let search;
let keyboardSelectedIndex = -1;

const CURRENT_YEAR = new Date().getFullYear();
const advisorSearchText = s => [s.advisor, s.coAdvisor].filter(Boolean).join(' ');

const STUDENT_KEYWORDS = {
    name: s => `${s.firstName} ${s.lastName}`,
    advisor: advisorSearchText,
    coadvisor: s => s.coAdvisor,
    'co-advisor': s => s.coAdvisor,
    dissertation: s => s.dissertationTitle,
    thesis: s => s.dissertationTitle,
    title: s => s.dissertationTitle,
    location: s => s.location,
    city: s => s.location,
    state: s => s.location,
    country: s => s.location,
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
    gmufaculty: s => (isGmuFacultyJob(s.currentJob) || isGmuFacultyJob(s.firstJob)) ? 'gmu faculty alumni professor' : '',
};

const KEYWORD_META = {
    name: { label: 'Name', icon: '👤' },
    advisor: { label: 'Advisor', icon: '🎓' },
    coadvisor: { label: 'Co-Advisor', icon: '🎓' },
    'co-advisor': { label: 'Co-Advisor', icon: '🎓' },
    dissertation: { label: 'Dissertation', icon: '📜' },
    thesis: { label: 'Dissertation', icon: '📜' },
    title: { label: 'Dissertation', icon: '📜' },
    location: { label: 'Location', icon: '📍' },
    city: { label: 'Location', icon: '📍' },
    state: { label: 'Location', icon: '📍' },
    country: { label: 'Location', icon: '📍' },
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
    gmufaculty: { label: 'GMU Faculty Alumni', icon: '🏛️' },
};

const STUDENT_SUGGESTION_SOURCES = {
    name: () => allStudents.map(s => `${s.firstName} ${s.lastName}`.trim()),
    advisor: () => uniqueNonEmpty(allStudents.flatMap(s => [s.advisor, s.coAdvisor])),
    coadvisor: () => uniqueNonEmpty(allStudents.map(s => s.coAdvisor)),
    'co-advisor': () => uniqueNonEmpty(allStudents.map(s => s.coAdvisor)),
    dissertation: () => uniqueNonEmpty(allStudents.map(s => s.dissertationTitle)),
    thesis: () => uniqueNonEmpty(allStudents.map(s => s.dissertationTitle)),
    title: () => uniqueNonEmpty(allStudents.map(s => s.dissertationTitle)),
    location: () => uniqueNonEmpty(allStudents.map(s => s.location)),
    city: () => uniqueNonEmpty(allStudents.map(s => s.location)),
    state: () => uniqueNonEmpty(allStudents.map(s => s.location)),
    country: () => uniqueNonEmpty(allStudents.map(s => s.location)),
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
    { code: 'coadvisor:', example: 'Foteini Baldimtsi' },
    { code: 'dissertation:', example: 'Procedural' },
    { code: 'location:', example: 'San Francisco, CA' },
    { code: 'phdyear:', example: '2023' },
    { code: 'topic:', example: 'Robotics' },
    { code: 'job:', example: 'Google' },
    { code: '#tag', example: '— e.g. #AI' },
];

function resetDirectory() {
    document.getElementById('main-search').value = '';
    search.resetScope();
    hideCommandOutput();
    activeTopic = null;
    document.getElementById('active-filter').style.display = 'none';
    resetFilterDropdowns();
    currentView = 'directory';
    render();
}

function pickRandomStudent() {
    if (allStudents.length > 0) {
        const person = allStudents[Math.floor(Math.random() * allStudents.length)];
        document.getElementById('main-search').value = `name: ${person.firstName} ${person.lastName}`;
        hideCommandOutput();
        render();
        const entries = document.querySelectorAll('.entry');
        if (entries.length > 0) {
            keyboardSelectedIndex = 0;
            entries[0].classList.add('entry-keyboard-selected');
            entries[0].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }
}

let queryPlan = '';

function updateQueryPlan(matches, mode = currentView) {
    const query = document.getElementById('main-search')?.value.trim() || '';
    const degreeFilter = document.getElementById('degree-filter')?.value || 'all';
    const statusFilter = document.getElementById('status-filter')?.value || 'all';
    const sortOrder = document.getElementById('sort-order')?.value || 'random';
    const kw = search ? search.effectiveSearch() : null;
    const scope = kw && kw.key ? kw.key : 'all';

    queryPlan = [
        `mode=${mode}`,
        `scope=${scope}`,
        `query=${query ? JSON.stringify(query) : '*'}`,
        `degree=${JSON.stringify(degreeFilter)}`,
        `status=${JSON.stringify(statusFilter)}`,
        activeTopic ? `topic=${JSON.stringify(activeTopic)}` : '',
        `sort=${sortOrder}`,
        `matches=${matches}`,
    ].filter(Boolean).join('  ');
}

let runCommand;

async function init() {
    await loadSearchKit();
    const facultyData = await loadFaculty();
    allFaculty = facultyData.faculty;
    const studentData = await loadStudents(facultyData.facultyByName);
    allStudents = studentData.students;
    topicIndex = studentData.topicIndex;

    // Assign a random index to each student once per session load
    const randomIndices = sample(Array.from({ length: allStudents.length }, (_, i) => i), allStudents.length);
    allStudents.forEach((s, idx) => { s.randomIndex = randomIndices[idx]; });

    runCommand = createSharedCommandHandler({
        getSearch: () => search,
        resetDirectory,
        onUpdate: () => render(),
        onRandom: pickRandomStudent,
        getQueryPlan: () => queryPlan,
        getStats: () => `${allStudents.length} graduate students and alumni`,
        facts: [
            'GMU CS Alumni work at top tech companies, research labs, and academic institutions worldwide.',
            'GMU CS graduate students publish at top-tier conferences like SIGCOMM, S&P, PLDI, ICSE, and NeurIPS.',
            'Over 40+ alumni hold tenure-line or research faculty positions across global universities.'
        ]
    });

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
        onCommand: runCommand,
    });

    setupFilters();
    setupActiveFilterBanner();
    setupNav();
    setupSearchExamplesClick(query => {
        search.setSearchValue(query);
        render();
        document.getElementById('main-search').focus();
    });
    setupSharedKeyboardShortcuts({
        getItemElements: () => [...document.querySelectorAll('.entry')],
        getSelectedIndex: () => keyboardSelectedIndex,
        setSelectedIndex: idx => { keyboardSelectedIndex = idx; },
        onRandom: () => runCommand('/dev/random'),
    });
    refreshSearchExamples();
    restoreFromUrl();
    render();

    window.addEventListener('popstate', () => {
        restoreFromUrl();
        render();
    });

    const commitStr = typeof __BUILD_COMMIT__ !== 'undefined' ? __BUILD_COMMIT__ : 'dev';
    console.info(`%cGMU CS Directory ${commitStr}`, 'color:#006633;font-weight:bold;font-size:16px');
    console.info('The roster is open source: https://github.com/RealGMUCS/people');
    console.info('Try typing “help”, “fortune”, or “uname -a” into search.');
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
    keyboardSelectedIndex = -1;

    const filtered = getFiltered();

    if (insightsView) {
        grid.className = 'insights-view';
        grid.innerHTML = renderInsights(filtered);
        if (filtered.length === allStudents.length) {
            countEl.textContent = `Insights across ${allStudents.length} tracked students/alumni`;
        } else {
            countEl.textContent = `Insights across ${filtered.length} matching students/alumni (out of ${allStudents.length} total)`;
        }
        updateQueryPlan(filtered.length, 'insights');
        updateUrl();
        return;
    }

    const kw = search.effectiveSearch();
    const isAdvisorSearch = kw && kw.key === 'advisor' && kw.query;
    let advisorName = null;
    if (isAdvisorSearch) {
        const sampleStudent = filtered.find(s => advisorSearchText(s).toLowerCase().includes(kw.query))
            || allStudents.find(s => advisorSearchText(s).toLowerCase().includes(kw.query));
        advisorName = sampleStudent
            ? [sampleStudent.advisor, sampleStudent.coAdvisor].find(name => name && name.toLowerCase().includes(kw.query))
            : kw.query;
    }

    if (advisorName) {
        const countText = filtered.length === 1 ? '1 student/alumnus' : `${filtered.length} students/alumni`;
        if (advisorName.toLowerCase() === 'none') {
            countEl.textContent = `${countText} with no designated advisor (None / Coursework MS)`;
        } else {
            const facultyUrl = `index.html?q=name: ${encodeURIComponent(advisorName)}`;
            countEl.innerHTML = `${countText} advised by <a href="${esc(facultyUrl)}">${esc(advisorName)}</a>`;
        }
    } else {
        countEl.textContent = `${filtered.length} students/alumni`;
    }

    grid.innerHTML = filtered.map(renderStudentRow).join('');
    updateQueryPlan(filtered.length);
    updateUrl();
}

// Compact row for the Students/Alumni list — there can be hundreds of entries,
// so this is deliberately much lighter than the faculty card.
function renderStudentRow(s) {
    const fullName = `${s.firstName} ${s.lastName}`.trim();
    const defaultPortrait = `${import.meta.env.BASE_URL}default-portrait.svg`;
    const picture = (s.picture && safeUrl(s.picture)) || defaultPortrait;

    const metaParts = [];
    if (s.advisor) {
        if (s.advisor.toLowerCase() === 'none') {
            metaParts.push(`Advisor: <a class="award-person" data-advisor="None" href="#">None</a>`);
        } else {
            let advHtml = `Advisor: <a class="award-person" data-advisor="${esc(s.advisor)}" href="#">${esc(s.advisor)}</a>`;
            if (s.coAdvisor) {
                advHtml += ` & <a class="award-person" data-advisor="${esc(s.coAdvisor)}" href="#">${esc(s.coAdvisor)}</a> <span style="font-size:0.85em; color:var(--text-secondary);">(Co-advisor)</span>`;
            }
            metaParts.push(advHtml);
        }
    } else {
        metaParts.push(`Advisor: <a class="award-person" data-advisor="None" href="#">None</a>`);
    }
    if (s.degree) metaParts.push(esc(s.degree));

    const detailParts = [];
    if (s.currentJob) detailParts.push(`Now: ${esc(s.currentJob)}`);
    if (s.firstJob) detailParts.push(`First job: ${esc(s.firstJob)}`);
    if (s.internships) detailParts.push(`Internships: ${esc(s.internships)}`);

    const dissertationHtml = s.dissertationTitle
        ? `<div class="entry-dissertation"><span class="dissertation-label">📜 Dissertation:</span> ${esc(s.dissertationTitle)}</div>`
        : '';

    const honorsHtml = s.honors.length
        ? `<div class="entry-honors"><span class="honors-label">🏆 Honors:</span> ${s.honors.map(esc).join(' · ')}</div>`
        : '';

    const verifiedTag = s.verified
        ? `<span class="tag tag-verified" title="Confirmed directly by the advisor or student, not just scraped from a public source">✓ Verified</span>`
        : '';

    const topicTags = s.topics.map(t =>
        `<span class="tag tag-topic">${esc(t)}</span>`
    ).join('');

    const locationBadge = s.location
        ? `<span class="entry-location" data-location="${esc(s.location)}" title="Estimated current location: ${esc(s.location)}">📍 ${esc(s.location)}</span>`
        : '';
    const profileIcons = renderProfileIcons(fullName, { website: s.website, scholar: s.scholar, linkedin: s.linkedin });

    return `
    <div class="entry entry-with-portrait">
      <img class="entry-portrait" src="${picture}" alt="${esc(fullName)}" loading="lazy" onerror="this.src='${defaultPortrait}'">
      <div class="entry-content">
        <div class="entry-name-row">
          <span class="entry-name">${esc(fullName)}</span>${profileIcons}
          ${locationBadge}
          <time class="entry-updated" datetime="${esc(s.lastModified || '2026-09-04')}" title="Record last modified ${esc(s.lastModified || '2026-09-04')}">Updated ${esc(s.lastModified || '2026-09-04')}</time>
        </div>
        ${metaParts.length ? `<div class="entry-meta">${metaParts.join(' · ')}</div>` : ''}
        ${dissertationHtml}
        ${detailParts.length ? `<div class="entry-details">${detailParts.join(' · ')}</div>` : ''}
        ${honorsHtml}
        ${(verifiedTag || topicTags) ? `<div class="tags">${verifiedTag}${topicTags}</div>` : ''}
      </div>
    </div>
  `;
}

// Insights — a handful of automatically-computed, clickable facts about the
// tracked students/alumni. Company names are extracted from free-text
// Internships/Current Job fields with a simple heuristic (text after the
// first comma, parentheticals stripped), so treat the employer list as
// approximate rather than authoritative.
function renderInsights(students = allStudents) {
    const total = students.length;
    if (total === 0) {
        return `<p class="insights-caption" style="margin-top: 2rem; font-size: 1.1rem; text-align: center;">No students match the current search filter.</p>`;
    }
    const withInternships = students.filter(s => s.internships).length;
    const withHonors = students.filter(s => s.honors.length).length;

    const academiaStudents = students.filter(s => isAcademiaJob(s.currentJob) || isAcademiaJob(s.firstJob));
    const academiaCount = academiaStudents.length;

    const govStudents = students.filter(s => isGovLabJob(s.currentJob) || isGovLabJob(s.firstJob));
    const govCount = govStudents.length;

    const industryStudents = students.filter(s => (s.currentJob && isIndustryJob(s.currentJob)) || (s.firstJob && isIndustryJob(s.firstJob)));
    const industryCount = industryStudents.length;

    const gmuAlumniFacultyList = getGmuAlumniFaculty(students, allFaculty, allStudents);

    const advisorCounts = topCounts(students.flatMap(s => [s.advisor, s.coAdvisor].filter(Boolean)), 10);
    const locationCounts = topCounts(students.map(s => s.location), 8);
    const topicCounts = topCounts(students.flatMap(s => s.topics), 16);

    const acadOrgs = topCounts(academiaStudents.map(s => extractOrg(s.currentJob) || extractOrg(s.firstJob)), 6);
    const indOrgs = topCounts(industryStudents.map(s => extractOrg(s.currentJob) || extractOrg(s.firstJob)), 6);
    const govOrgs = topCounts(govStudents.map(s => extractOrg(s.currentJob) || extractOrg(s.firstJob)), 6);

    const isFiltered = total < allStudents.length;

    const tiles = [
        { value: total, label: isFiltered ? 'Matching students/alumni' : 'Tracked students/alumni' },
        { value: gmuAlumniFacultyList.length, label: 'GMU CS alumni on GMU faculty' },
        { value: `${academiaCount} (${total ? Math.round((academiaCount / total) * 100) : 0}%)`, label: 'In academia (faculty / postdoc)' },
        { value: `${industryCount} (${total ? Math.round((industryCount / total) * 100) : 0}%)`, label: 'In industry / corporate' },
        { value: `${govCount} (${total ? Math.round((govCount / total) * 100) : 0}%)`, label: 'In government / national labs' },
        { value: `${total ? Math.round((withInternships / total) * 100) : 0}%`, label: 'With a documented internship' },
        { value: `${total ? Math.round((withHonors / total) * 100) : 0}%`, label: 'With an honor or award on file' },
    ];

    const maxAdvisor = advisorCounts[0]?.count || 1;
    const maxLoc = locationCounts[0]?.count || 1;
    const maxAcadOrg = acadOrgs[0]?.count || 1;
    const maxIndOrg = indOrgs[0]?.count || 1;
    const maxGovOrg = govOrgs[0]?.count || 1;
    const maxTopic = topicCounts[0]?.count || 1;

    const orgBar = (org, max) => `
        <button type="button" class="ranked-item" data-org="${esc(org.value)}" title="Search ${esc(org.value)}">
          <div class="ranked-header">
            <span class="ranked-name">${esc(org.value)}</span>
            <span class="ranked-count">${org.count}</span>
          </div>
          <div class="ranked-track"><div class="ranked-bar" style="width: ${Math.round((org.count / max) * 100)}%;"></div></div>
        </button>`;

    return `
    <p class="insights-caption">Auto-computed from the tracked roster — geographic hubs, employer breakdown, and faculty metrics.</p>
    <div class="stat-tiles">
      ${tiles.map(t => `<div class="stat-tile"><div class="stat-tile-value">${esc(t.value)}</div><div class="stat-tile-label">${esc(t.label)}</div></div>`).join('')}
    </div>

    ${gmuAlumniFacultyList.length ? `
    <div class="insights-section">
      <h3 class="insights-heading">🏛️ GMU CS Alumni on GMU Faculty (${gmuAlumniFacultyList.length})</h3>
      <p class="insights-caption">GMU CS graduates who became faculty members at George Mason University; click a name to view their faculty card.</p>
      <div class="ranked-list">
        ${gmuAlumniFacultyList.map(item => `
          <a class="ranked-item" href="index.html?q=name: ${encodeURIComponent(item.name)}" title="View ${esc(item.name)} faculty card">
            <div class="ranked-header">
              <span class="ranked-name">${esc(item.name)}</span>
              <span class="ranked-count">${esc(item.role)}</span>
            </div>
          </a>
        `).join('')}
      </div>
    </div>` : ''}

    <div class="insights-grid">
      ${acadOrgs.length || indOrgs.length ? `
      <div class="insights-section">
        <h3 class="insights-heading">🏢 Top Employers & Institutions</h3>
        <p class="insights-caption">Hiring breakdown across Academia, Industry, and Government; click to search.</p>

        ${acadOrgs.length ? `
        <h4 style="margin: 0.8rem 0 0.4rem 0; font-size: 0.95rem; color: var(--text-primary);">Academic & Research Institutions</h4>
        <div class="ranked-list" style="margin-bottom: 1rem;">
          ${acadOrgs.map(org => orgBar(org, maxAcadOrg)).join('')}
        </div>` : ''}

        ${indOrgs.length ? `
        <h4 style="margin: 0.8rem 0 0.4rem 0; font-size: 0.95rem; color: var(--text-primary);">Industry Tech Leaders</h4>
        <div class="ranked-list" style="margin-bottom: 1rem;">
          ${indOrgs.map(org => orgBar(org, maxIndOrg)).join('')}
        </div>` : ''}

        ${govOrgs.length ? `
        <h4 style="margin: 0.8rem 0 0.4rem 0; font-size: 0.95rem; color: var(--text-primary);">Government & National Labs</h4>
        <div class="ranked-list">
          ${govOrgs.map(org => orgBar(org, maxGovOrg)).join('')}
        </div>` : ''}
      </div>` : ''}

      ${locationCounts.length ? `
      <div class="insights-section">
        <h3 class="insights-heading">📍 Top Geographic Hubs</h3>
        <p class="insights-caption">Top cities and regions where alumni are located; click to filter roster.</p>
        <div class="ranked-list">
          ${locationCounts.map(({ value, count }) => `
            <button type="button" class="ranked-item" data-location="${esc(value)}" title="Filter by ${esc(value)}">
              <div class="ranked-header">
                <span class="ranked-name">📍 ${esc(value)}</span>
                <span class="ranked-count">${count}</span>
              </div>
              <div class="ranked-track"><div class="ranked-bar" style="width: ${Math.round((count / maxLoc) * 100)}%;"></div></div>
            </button>`).join('')}
        </div>
      </div>` : ''}
    </div>

    ${advisorCounts.length ? `
    <div class="insights-section" style="margin-top: 1.5rem;">
      <h3 class="insights-heading">🎓 Top Advisors & Co-Advisors</h3>
      <p class="insights-caption">By number of tracked advisees; click to see their advisees.</p>
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

    ${topicCounts.length ? `
    <div class="insights-section">
      <h3 class="insights-heading">🏷️ Popular Research Topics</h3>
      <p class="insights-caption">Click a topic to see who works on it.</p>
      <div class="ranked-list">
        ${topicCounts.map(({ value, count }) => `
          <button type="button" class="ranked-item" data-topic="${esc(value)}" title="Filter by ${esc(value)}">
            <div class="ranked-header">
              <span class="ranked-name">${esc(value)}</span>
              <span class="ranked-count">${count}</span>
            </div>
            <div class="ranked-track"><div class="ranked-bar" style="width: ${Math.round((count / maxTopic) * 100)}%;"></div></div>
          </button>`).join('')}
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

// Click a location badge or popup button → filter to that location
document.addEventListener('click', e => {
    const item = e.target.closest('[data-location], [data-loc]');
    if (!item || item.closest('[data-advisor]') || item.closest('.ranked-item[data-org]')) return;
    const locName = item.dataset.location || item.dataset.loc;
    if (!locName) return;
    e.preventDefault();
    currentView = 'directory';
    activeTopic = null;
    document.getElementById('active-filter').style.display = 'none';
    resetFilterDropdowns();
    search.setSearchValue(`location: ${locName}`);
    window.scrollTo({ top: 0 });
    render();
});

// Click a topic in the Insights "Popular Research Topics" ranked list to filter.
// Per-row topic tags on the roster are static, matching faculty and vietprofs.
document.addEventListener('click', e => {
    const tag = e.target.closest('.ranked-item[data-topic]');
    if (!tag) return;
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
