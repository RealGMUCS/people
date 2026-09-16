// Shared utilities between the People (faculty/staff) and Students/Alumni pages.
import * as kit from './search-kit.ts';
import { escapeHtml } from './utils.ts';

export { escapeHtml as esc, formatRosterDate, showToast } from './utils.ts';
export { normalizeText, parseKeywordQuery } from './search-kit.ts';

// Only allow http(s) URLs in href/src attributes
export function safeUrl(url: unknown): string | null {
  if (typeof url !== 'string') return null;
  return /^https?:\/\//i.test(url) ? escapeHtml(url) : null;
}

// Small external-link icons (profile/personal site/Scholar/LinkedIn), styled by
// vietprofs' shared stylesheet (.profile-link/.personal-site-link/.scholar-link/
// .linkedin-link).
export const SCHOLAR_ICON = '<path d="M12 3 1 9l11 6 9-4.91V17h2V9L12 3Z"/><path d="M5 12.18V16c0 1.66 3.13 3 7 3s7-1.34 7-3v-3.82l-7 3.82-7-3.82Z"/>';
export const PERSONAL_SITE_ICON = '<path d="m12 3-9 8h3v10h5v-6h2v6h5V11h3l-9-8Z"/>';
export const LINKEDIN_ICON = '<path d="M6.94 5a2 2 0 1 1-4-.02 2 2 0 0 1 4 .02ZM7 8.48H3V21h4V8.48Zm6.32 0H9.34V21h3.94v-6.57c0-3.66 4.77-4 4.77 0V21H22v-7.93c0-6.17-7.06-5.94-8.68-2.91V8.48Z"/>';

function entryIconLink(className: string, href: string, label: string, title: string, icon: string) {
  const url = safeUrl(href);
  if (!url) return '';
  return ` <a class="${className}" href="${url}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(label)}" title="${escapeHtml(title)}"><svg viewBox="0 0 24 24" aria-hidden="true">${icon}</svg></a>`;
}

// website/scholar/linkedin icon trio for a faculty or student entry's name row.
export function renderProfileIcons(name: string, { website, scholar, linkedin }: { website?: string; scholar?: string; linkedin?: string }) {
  return [
    website && entryIconLink('personal-site-link', website, `${name} personal or lab website`, 'Personal or lab website', PERSONAL_SITE_ICON),
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

if (typeof localStorage !== 'undefined' && localStorage.getItem('gmu_cs:crt') === '1') {
  document.documentElement.classList.add('crt-mode');
}

export function loadSearchKit() {
  return Promise.resolve(kit);
}

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
  });
  return {
    ...controller,
    effectiveSearch() {
      const kw = controller.effectiveSearch();
      return kw ? { ...kw, getField: options.keywordMap[kw.key] } : null;
    },
  };
}

// Populates the "(?)" search-syntax popover with page-specific keyword entries.
export function setupSearchHelp(entries: any) {
  kit.setupSearchHelp({
    btn: document.getElementById('search-help-btn') as HTMLButtonElement,
    panel: document.getElementById('search-help-panel') as HTMLElement,
    list: document.getElementById('search-help-list') as HTMLElement,
    entries,
  });
}

export function createSharedCommandHandler(options: any) {
  return kit.createCommandHandler({
    ...options,
    siteName: 'GMU CS Directory',
    aboutText: 'GMU CS Directory — an open, community-maintained index of George Mason University Computer Science faculty, students, and alumni.',
    searchInputId: 'main-search',
    commandOutputEl: document.getElementById('command-output'),
    searchHelpPanel: document.getElementById('search-help-panel'),
    searchHelpBtn: document.getElementById('search-help-btn') as HTMLButtonElement,
    buildCommit: typeof __BUILD_COMMIT__ !== 'undefined' ? __BUILD_COMMIT__ : 'dev',
    buildLabel: typeof __BUILD_LABEL__ !== 'undefined' ? __BUILD_LABEL__ : '',
  });
}

export function setupSharedKeyboardShortcuts(options: any) {
  return kit.setupKeyboardShortcuts({ ...options, searchInputId: 'main-search' });
}
