// Shared utilities between the People (faculty/staff) and Students/Alumni pages.
import * as kit from './vietprofs/search-kit.ts';
import { setupBackToTop } from './vietprofs/back-to-top.ts';
import { escapeHtml } from './utils.ts';

export { escapeHtml as esc, formatRosterDate, gmuYears, showToast } from './utils.ts';
export { normalizeText, parseKeywordQuery } from './vietprofs/search-kit.ts';

// Only allow http(s) URLs in href/src attributes
export function safeUrl(url: unknown): string | null {
  if (typeof url !== 'string') return null;
  return /^https?:\/\//i.test(url) ? escapeHtml(url) : null;
}

// A person's `picture` field is either a full external URL (hotlinked, only
// http(s) allowed) or a local relative asset path (e.g. "portraits/x.webp",
// downloaded/converted by scripts/fetch-portraits.ts and served from the site
// root alongside default-portrait.svg).
export function resolvePictureUrl(picture: unknown): string | null {
  if (typeof picture !== 'string' || !picture) return null;
  if (/^https?:\/\//i.test(picture)) return safeUrl(picture);
  return escapeHtml(`${import.meta.env.BASE_URL}${picture}`);
}

// Small external-link icons (profile/personal site/Scholar/LinkedIn), styled by
// vietprofs' shared stylesheet (.profile-link/.personal-site-link/.scholar-link/
// .linkedin-link).
export const SCHOLAR_ICON = '<path d="M12 3 1 9l11 6 9-4.91V17h2V9L12 3Z"/><path d="M5 12.18V16c0 1.66 3.13 3 7 3s7-1.34 7-3v-3.82l-7 3.82-7-3.82Z"/>';
export const PERSONAL_SITE_ICON = '<path d="m12 3-9 8h3v10h5v-6h2v6h5V11h3l-9-8Z"/>';
export const LAB_ICON = '<path d="M9 2h6v2h-1v5.59l6.71 9.4A1.9 1.9 0 0 1 19.16 22H4.84a1.9 1.9 0 0 1-1.55-3.01L10 9.59V4H9V2Zm3 8.23L7.88 16h8.24L12 10.23Z"/>';
export const LINKEDIN_ICON = '<path d="M6.94 5a2 2 0 1 1-4-.02 2 2 0 0 1 4 .02ZM7 8.48H3V21h4V8.48Zm6.32 0H9.34V21h3.94v-6.57c0-3.66 4.77-4 4.77 0V21H22v-7.93c0-6.17-7.06-5.94-8.68-2.91V8.48Z"/>';

function entryIconLink(className: string, href: string, label: string, title: string, icon: string) {
  const url = safeUrl(href);
  if (!url) return '';
  return ` <a class="${className}" href="${url}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(label)}" title="${escapeHtml(title)}"><svg viewBox="0 0 24 24" aria-hidden="true">${icon}</svg></a>`;
}

// Website, research lab, Scholar, and LinkedIn icons for a faculty or student entry's name row.
export function renderProfileIcons(name: string, { website, labWebsite, scholar, linkedin }: { website?: string; labWebsite?: string; scholar?: string; linkedin?: string }) {
  return [
    website && entryIconLink('personal-site-link', website, `${name} website`, 'Website', PERSONAL_SITE_ICON),
    labWebsite && entryIconLink('lab-site-link', labWebsite, `${name} research lab website`, 'Research lab website', LAB_ICON),
    scholar && entryIconLink('scholar-link', scholar, `${name} on Google Scholar`, 'Google Scholar', SCHOLAR_ICON),
    linkedin && entryIconLink('linkedin-link', linkedin, `${name} on LinkedIn`, 'LinkedIn', LINKEDIN_ICON),
  ].filter(Boolean).join('');
}

// Email addresses are shown as a canvas-rendered image (drawn client-side from
// obfuscated parts, never present as plain text in the served HTML/JS) to deter
// naive scraping, while staying clickable for real visitors.
function obfuscate(s: string) {
  return btoa(unescape(encodeURIComponent(s))).split('').reverse().join('');
}
function deobfuscate(s: string) {
  return decodeURIComponent(escape(atob(s.split('').reverse().join(''))));
}

export function renderEmailBadge(email?: string) {
  if (!email || !email.includes('@')) return '';
  const parts = email.split('@');
  const user = parts[0] || '';
  const domain = parts[1] || '';
  return `<span class="email-badge" data-u="${obfuscate(user)}" data-d="${obfuscate(domain)}" role="button" tabindex="0" title="Click to email"></span>`;
}

// Call once after any render pass that may have inserted .email-badge spans.
export function activateEmailBadges(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>('.email-badge:not([data-ready])').forEach(badge => {
    const address = `${deobfuscate(badge.dataset.u || '')}@${deobfuscate(badge.dataset.d || '')}`;
    badge.dataset.ready = '1';

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
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
export function renderAchievementGroups(awards: Array<{ category?: string; award: string; year?: string | number }>) {
  const groups: Array<{ cat: string; items: typeof awards }> = [];
  const index = new Map<string, number>();
  awards.forEach(a => {
    const cat = a.category || 'Awards';
    let groupIdx = index.get(cat);
    if (groupIdx === undefined) {
      groupIdx = groups.length;
      index.set(cat, groupIdx);
      groups.push({ cat, items: [] });
    }
    groups[groupIdx]!.items.push(a);
  });
  return groups.map(g => `
    <div class="achievement-group">
      <div class="achievement-cat">${escapeHtml(g.cat)}</div>
      <ul>${g.items.map(a =>
        `<li>${escapeHtml(a.award)}${a.year ? ` <span class="achievement-year">${escapeHtml(String(a.year))}</span>` : ''}</li>`
      ).join('')}</ul>
    </div>`).join('');
}

export function setupAchievementsToggle() {
  (window as any).toggleAchievements = function (header: HTMLElement) {
    header.closest('.achievements-section')?.classList.toggle('collapsed');
  };
}

export function uniqueNonEmpty<T>(arr: T[]): T[] {
  return Array.from(new Set(arr.filter(Boolean)));
}

// Matches an institution's free-text name against GMU/George Mason University
export function isGmuInstitution(name?: string | null): boolean {
  if (!name) return false;
  const n = name.toLowerCase();
  return n.includes('gmu') || n.includes('george mason');
}

// Appends a dynamically computed "(count)" to each <option> of a filter <select>,
// based on how many records in `items` match that option's value per `matches`.
// Re-running this (e.g. after data reloads) replaces any previously appended count.
export function annotateOptionCounts<T>(selectId: string, items: T[], matches: (item: T, value: string) => boolean) {
  const select = document.getElementById(selectId) as HTMLSelectElement | null;
  if (!select) return;
  Array.from(select.options).forEach(opt => {
    const label = opt.textContent?.replace(/\s*\(\d+\)$/, '') ?? '';
    const count = items.filter(item => matches(item, opt.value)).length;
    opt.textContent = `${label} (${count})`;
  });
}

// Semicolon-separated free-text list (e.g. Internships, Honors & Awards)
export function splitList(v?: string): string[] {
  return v ? v.split(';').map(x => x.trim()).filter(Boolean) : [];
}

// Renders the "Try: ..." row of example search queries, shared by both pages.
export function renderSearchExamples(examples: Array<{ label: string; query: string }>) {
  const container = document.getElementById('examples');
  if (container) {
    container.innerHTML = `
      <span class="examples-label">Try:</span>
      ${examples.map(ex => `<button type="button" class="example-chip" data-search-example="${escapeHtml(ex.query)}">${escapeHtml(ex.label)}</button>`).join('')}
    `;
    return;
  }
  const fixed = document.getElementById('search-example-fixed');
  const items = document.getElementById('search-example-items');
  if (!fixed || !items) return;
  fixed.innerHTML = '<span class="examples-label">Try:</span>';
  items.innerHTML = examples
    .map(ex => `<button type="button" class="example-chip" data-search-example="${escapeHtml(ex.query)}">${escapeHtml(ex.label)}</button>`)
    .join('');
}

// Wires clicks on any "Try:" example button to a page-supplied handler.
export function setupSearchExamplesClick(onSelect: (query: string) => void) {
  const container = document.getElementById('examples') || document.querySelector('.search-examples');
  container?.addEventListener('click', e => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-search-example]');
    if (!btn || !btn.dataset.searchExample) return;
    onSelect(btn.dataset.searchExample);
  });
}

const searchInput = () => document.getElementById('main-search') as HTMLInputElement;

export function showCommandOutput(message: string) {
  kit.showCommandOutput(document.getElementById('command-output'), message);
}

export function hideCommandOutput() {
  kit.hideCommandOutput(document.getElementById('command-output'));
}

// Fisher-Yates sample, used to pick fresh "Try:" search examples on each load.
export function sample<T>(items: readonly T[], count: number): T[] {
  return kit.sample(items, count);
}

// Sticky scope chip + live suggestion dropdown for the search box.
export function createSearchController(options: any) {
  const controller = kit.createSearchController({
    ...options,
    getSuggestions: (key: string) => (options.suggestionSources[key] ? options.suggestionSources[key]() : []),
    onClear: hideCommandOutput,
  });
  return {
    ...controller,
    effectiveSearch() {
      const kw = controller.effectiveSearch();
      return kw ? { ...kw, getField: options.keywordMap[kw.key] } : null;
    },
  };
}

// Populates the "(?)" search-syntax popover with page-specific keyword entries; opening it
// closes the suggestion list so the two don't overlap.
export function setupSearchHelp(entries: any, getSearch: () => { close: () => void } | undefined) {
  return kit.setupSearchHelp({
    btn: document.getElementById('search-help-btn') as HTMLButtonElement,
    panel: document.getElementById('search-help-panel') as HTMLElement,
    list: document.getElementById('search-help-list') as HTMLElement,
    entries,
    onBeforeToggle: () => getSearch()?.close(),
  });
}

// The shared help / query plan / clear commands; every other input is a search.
export function createSharedCommandHandler(options: Omit<kit.CommandHandlerOptions, 'commandOutputEl'>) {
  return kit.createCommandHandler({
    ...options,
    input: searchInput(),
    commandOutputEl: document.getElementById('command-output'),
  });
}

// Pick a random visible entry and j/k-select it, as VietProfs' `r` shortcut does.
function selectRandomEntry(selectedIndex: number, setSelectedIndex: (index: number) => void) {
  const entries = [...document.querySelectorAll<HTMLElement>('.entry')];
  if (!entries.length) return;
  entries[selectedIndex]?.classList.remove('entry-keyboard-selected');
  const index = Math.floor(Math.random() * entries.length);
  setSelectedIndex(index);
  entries[index]!.classList.add('entry-keyboard-selected');
  entries[index]!.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

// j/k (or arrows) move, Enter opens, r random, / search, ? help, and Escape steps back:
// close help → blur search → clear search.
export function setupSharedKeyboardShortcuts(options: {
  help: kit.SearchHelp;
  search: { close: () => void; setSearchValue: (raw: string) => void };
  getSelectedIndex: () => number;
  setSelectedIndex: (index: number) => void;
  onClear: () => void;
}) {
  kit.setupKeyboardShortcuts({
    input: searchInput(),
    help: options.help,
    getItemElements: () => [...document.querySelectorAll<HTMLElement>('.entry')],
    getSelectedIndex: options.getSelectedIndex,
    setSelectedIndex: options.setSelectedIndex,
    selectedClass: 'entry-keyboard-selected',
    nextKeys: ['j', 'ArrowDown'],
    prevKeys: ['k', 'ArrowUp'],
    onEnter: selected => selected.querySelector<HTMLAnchorElement>('.entry-name')?.click(),
    onRandom: () => selectRandomEntry(options.getSelectedIndex(), options.setSelectedIndex),
    escape: {
      closeSuggestions: () => options.search.close(),
      clearSearch: () => {
        options.search.setSearchValue('');
        options.onClear();
      },
    },
  });
}

// Page chrome shared with VietProfs: the floating back-to-top button, and landing ready to
// type without popping the suggestion list open (leaves focus alone if the reader moved it).
export function finishPageSetup() {
  setupBackToTop(document.getElementById('back-to-top'));
  if (document.activeElement === document.body) kit.focusQuietly(searchInput());
}
