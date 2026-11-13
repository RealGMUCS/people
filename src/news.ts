import { createSearchController, setupSearchHelp, renderSearchExamples, setupSearchExamplesClick, createSharedCommandHandler, finishPageSetup, esc, safeUrl, showCommandOutput } from './common';
import { personPath, slugify } from './data';
import { NEWS_CATEGORIES, NEWS_CATEGORY_ICONS, csNewsFacultyNames, filterNews, formatNewsDate, newsField, validateNews } from './news-data';
import type { NewsItem } from './news-data';
import './style.css';

const input = document.getElementById('main-search') as HTMLInputElement;
const results = document.getElementById('news-results')!;
const count = document.getElementById('news-count')!;
const category = document.getElementById('category-filter') as HTMLSelectElement;
const facultyGroup = document.getElementById('faculty-group-filter') as HTMLSelectElement;
const year = document.getElementById('year-filter') as HTMLSelectElement;
const sort = document.getElementById('sort-order') as HTMLSelectElement;
let items: NewsItem[] = [];
let people = new Set<string>();
let csFaculty = new Set<string>();
let search: ReturnType<typeof createSearchController> | undefined;
const scopes = ['person', 'name', 'category', 'year', 'topic', 'source', 'title'];
const keywordMap = Object.fromEntries(scopes.map(key => [key, (item: NewsItem) => newsField(item, key)]));
const keywordMeta = Object.fromEntries(scopes.map(key => [key, { label: key[0]!.toUpperCase() + key.slice(1) }]));
const values = (key: string) => [...new Set(items.flatMap(item => key === 'person' || key === 'name' ? item.people : key === 'topic' ? item.tags : [newsField(item, key)]))];

function reset() {
    facultyGroup.value = 'cs';
    category.value = year.value = 'all';
    sort.value = 'newest';
    search?.setSearchValue('');
    search?.resetScope();
    render();
}
function render() {
    const scoped = search?.effectiveSearch();
    const visible = filterNews(items, {
        query: scoped ? scoped.query : input.value,
        scope: scoped?.key,
        category: category.value, year: year.value, sort: sort.value,
        facultyNames: facultyGroup.value === 'all' ? undefined : csFaculty,
    });
    count.textContent = `${visible.length} of ${items.length} news items`;
    results.setAttribute('aria-busy', 'false');
    results.innerHTML = visible.length ? visible.map(item => {
        const source = safeUrl(item.sourceUrl)!;
        const names = item.people.map(name => people.has(name)
            ? `<a class="news-person" href="${esc(personPath(slugify(name)))}">${esc(name)}</a>`
            : `<span class="news-person">${esc(name)}</span>`).join('');
        return `<article class="entry news-entry" id="${esc(item.id)}">
            <div class="news-meta"><time datetime="${esc(item.date)}">${esc(formatNewsDate(item.date))}</time><span class="tag news-category"><span aria-hidden="true">${NEWS_CATEGORY_ICONS[item.category]}</span>${esc(NEWS_CATEGORIES[item.category])}</span></div>
            <h3><a class="entry-name" href="${source}" target="_blank" rel="noopener noreferrer">${esc(item.title)}</a></h3>
            <p class="news-summary">${esc(item.summary)}</p>
            <div class="news-people" aria-label="People in this story">${names}</div>
            <div class="news-footer"><a href="${source}" target="_blank" rel="noopener noreferrer">Source: ${esc(item.sourceName)} ↗</a><div class="news-tags">${item.tags.map(tag => `<button type="button" class="tag tag-topic" data-news-topic="${esc(tag)}">${esc(tag)}</button>`).join('')}</div></div>
        </article>`;
    }).join('') : '<div class="news-empty"><h3>No matching news</h3><p>Try a different name, topic, category, or year.</p><button type="button" class="page-link-btn" data-news-reset>Clear filters</button></div>';
    const params = new URLSearchParams();
    const query = search?.searchQueryValue() || '';
    if (query) params.set('q', query);
    if (facultyGroup.value === 'all') params.set('faculty', 'all');
    if (category.value !== 'all') params.set('category', category.value);
    if (year.value !== 'all') params.set('year', year.value);
    if (sort.value !== 'newest') params.set('sort', sort.value);
    const url = new URL(window.location.href);
    url.search = params.toString();
    history.replaceState(null, '', url);
}
function restore() {
    const params = new URLSearchParams(location.search);
    facultyGroup.value = params.get('faculty') === 'all' ? 'all' : 'cs';
    category.value = Object.hasOwn(NEWS_CATEGORIES, params.get('category') || '') ? params.get('category')! : 'all';
    const requestedYear = params.get('year');
    year.value = [...year.options].some(opt => opt.value === requestedYear) ? requestedYear! : 'all';
    sort.value = params.get('sort') === 'oldest' ? 'oldest' : 'newest';
    search?.setSearchValue(params.get('q') || '');
}
async function fetchJson(path: string): Promise<unknown> {
    const response = await fetch(`${import.meta.env.BASE_URL}${path}`);
    if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
    return response.json();
}
async function init() {
    const [raw, faculty, students] = await Promise.all([fetchJson('news.json'), fetchJson('faculty.json'), fetchJson('students.json')]);
    const names = (rows: unknown) => (rows as Record<string, string>[]).map(row => `${row['First Name']} ${row['Last Name']}`.trim());
    const errors = validateNews(raw, new Set(names(faculty)));
    if (errors.length) throw new Error(errors.join('\n'));
    items = raw as NewsItem[];
    csFaculty = csNewsFacultyNames(faculty as Record<string, string>[]);
    people = new Set([...names(faculty), ...names(students)]);
    category.innerHTML += Object.entries(NEWS_CATEGORIES).map(([key, label]) => `<option value="${key}">${NEWS_CATEGORY_ICONS[key as NewsItem['category']]} ${label} (${items.filter(item => item.category === key).length})</option>`).join('');
    year.innerHTML += [...new Set(items.map(item => item.date.slice(0, 4)))].sort().reverse().map(value => `<option value="${value}">${value}</option>`).join('');
    const help = setupSearchHelp([
        { code: 'person:', example: 'Wing Lam' }, { code: 'category:', example: 'grant' },
        { code: 'year:', example: '2026' }, { code: 'topic:', example: 'Robotics' },
        { code: 'source:', example: 'ROARS Lab' }, { code: 'title:', example: 'PhD' },
        { code: '#tag', example: '— e.g. #AI' },
    ], () => search);
    const runCommand = createSharedCommandHandler({
        getSearch: () => search || null, resetDirectory: reset, onUpdate: render, help,
        getQueryPlan: () => `scope=${search?.effectiveSearch()?.key || 'all'} faculty=${facultyGroup.value} category=${category.value} year=${year.value} sort=${sort.value} matches=${count.textContent}`,
    });
    search = createSearchController({
        input, scopeChip: document.getElementById('search-scope-chip'),
        scopeChipLabel: document.getElementById('search-scope-chip-label'),
        suggestionPanel: document.getElementById('search-suggestion-panel'),
        keywordMap, keywordMeta,
        suggestionSources: Object.fromEntries(scopes.map(key => [key, () => values(key)])),
        onChange: render,
        onCommand: (raw: string) => {
            const command = raw.trim().toLowerCase().replace(/^[:\/]/, '');
            if (command === 'recent' || command === 'newest') {
                sort.value = 'newest'; search?.setSearchValue(''); render();
                showCommandOutput('Displaying news from newest to oldest.'); return true;
            }
            return runCommand(raw);
        },
    });
    [facultyGroup, category, year, sort].forEach(select => select.addEventListener('change', render));
    document.getElementById('clear-news-filters')!.addEventListener('click', reset);
    results.addEventListener('click', event => {
        const target = event.target as HTMLElement;
        const topic = target.closest<HTMLElement>('[data-news-topic]')?.dataset.newsTopic;
        if (topic) { search?.setSearchValue(`topic: ${topic}`); render(); }
        if (target.closest('[data-news-reset]')) reset();
    });
    renderSearchExamples([
        { label: 'Papers', query: 'category: papers' },
        { label: 'Paper awards', query: 'category: paper awards' },
        { label: 'Grants', query: 'category: grant' },
        { label: 'Graduations', query: 'category: graduation' },
        { label: 'Robotics', query: '#robotics' },
    ]);
    setupSearchExamplesClick(query => { search?.setSearchValue(query); render(); input.focus(); });
    restore(); render(); finishPageSetup();
    window.addEventListener('popstate', () => { restore(); render(); });
}
init().catch(error => {
    console.error('Unable to load news', error);
    results.setAttribute('aria-busy', 'false');
    count.textContent = 'News could not be loaded.';
    results.innerHTML = '<div class="news-empty"><h3>Unable to load news</h3><p>Please reload the page to try again.</p><button type="button" class="page-link-btn" id="retry-news">Reload news</button></div>';
    document.getElementById('retry-news')!.addEventListener('click', () => location.reload());
});
