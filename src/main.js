import { loadFaculty } from './data.js';
import './style.css';

let allFaculty = [];
let interestIndex = new Map();
let activeInterest = null; // currently selected interest filter

async function init() {
    const data = await loadFaculty();
    allFaculty = data.faculty;
    interestIndex = data.interestIndex;

    setupSearch();
    setupFilters();
    setupThemeToggle();
    setupInterestBanner();
    restoreFromUrl();
    render();

    window.addEventListener('popstate', () => {
        restoreFromUrl();
        render();
    });
}

// Search & Filters

function setupSearch() {
    const input = document.getElementById('main-search');
    input.addEventListener('input', () => render());
}

function setupFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.classList.toggle('active');
            render();
        });
    });
}

function getActiveFilters(containerId) {
    return Array.from(document.querySelectorAll(`#${containerId} .filter-btn.active`)).map(b => b.dataset.value);
}

function setupInterestBanner() {
    document.getElementById('clear-filter').addEventListener('click', () => {
        activeInterest = null;
        document.getElementById('active-filter').style.display = 'none';
        document.getElementById('main-search').value = '';
        render();
    });
}

// Filter faculty based on current search + dropdowns + active interest
function getFiltered() {
    const query = document.getElementById('main-search').value.trim().toLowerCase();
    const activeTypes = getActiveFilters('type-buttons');
    const activeCategories = getActiveFilters('category-buttons');

    let list = allFaculty;

    // Interest tag
    if (activeInterest) {
        list = interestIndex.get(activeInterest) || [];
    }

    // Button filters
    list = list.filter(f => {
        const typeMatch = activeTypes.length === 0 || activeTypes.includes(f.type);

        const hasCategory = f.category && ['Full', 'Associate', 'Assistant'].includes(f.category);
        const categoryMatch = !hasCategory || activeCategories.length === 0 || activeCategories.includes(f.category);
        return typeMatch && categoryMatch;
    });

    // Search query
    if (query) {
        // #tag shortcuts
        if (query.startsWith('#')) {
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
    const q = document.getElementById('main-search').value.trim();
    const activeTypes = getActiveFilters('type-buttons');
    const activeCategories = getActiveFilters('category-buttons');
    const allTypes = Array.from(document.querySelectorAll('#type-buttons .filter-btn')).map(b => b.dataset.value);
    const allCategories = Array.from(document.querySelectorAll('#category-buttons .filter-btn')).map(b => b.dataset.value);

    if (q) params.set('q', q);
    if (activeTypes.length > 0 && activeTypes.length < allTypes.length) params.set('type', activeTypes.join(','));
    if (activeTypes.length === 0) params.set('type', 'none');
    if (activeCategories.length > 0 && activeCategories.length < allCategories.length) params.set('cat', activeCategories.join(','));
    if (activeCategories.length === 0) params.set('cat', 'none');
    if (activeInterest) params.set('interest', activeInterest);

    const qs = params.toString();
    const url = window.location.pathname + (qs ? '?' + qs : '');
    history.replaceState(null, '', url);
}

function restoreFromUrl() {
    const params = new URLSearchParams(window.location.search);

    if (params.has('q')) document.getElementById('main-search').value = params.get('q');
    if (params.has('type')) {
        const types = params.get('type') === 'none' ? [] : params.get('type').split(',');
        document.querySelectorAll('#type-buttons .filter-btn').forEach(btn => {
            btn.classList.toggle('active', types.includes(btn.dataset.value));
        });
    }
    if (params.has('cat')) {
        const cats = params.get('cat') === 'none' ? [] : params.get('cat').split(',');
        document.querySelectorAll('#category-buttons .filter-btn').forEach(btn => {
            btn.classList.toggle('active', cats.includes(btn.dataset.value));
        });
    }
    if (params.has('interest')) {
        activeInterest = params.get('interest');
        document.getElementById('active-filter').style.display = 'flex';
        document.getElementById('active-filter-text').textContent = `Research: ${activeInterest}`;
    }
}

// Rendering

function render() {
    const filtered = getFiltered();
    const grid = document.getElementById('faculty-results');
    const countEl = document.getElementById('faculty-count');

    countEl.textContent = `${filtered.length} people`;
    grid.innerHTML = filtered.map(renderCard).join('');
    updateUrl();
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

function renderCard(f) {
    const fullName = `${f.firstName} ${f.lastName}`;
    const interestTags = f.interests.map(i =>
        `<span class="interest-tag" data-interest="${esc(i)}">${esc(i)}</span>`
    ).join('');

    const details = [];
    if (f.category && f.type) details.push(detailRow('Position', esc(`${f.category} · ${f.type}`)));
    if (f.office) details.push(detailRow('Office', esc(f.office)));
    if (f.email) details.push(detailRow('Email', esc(f.email)));
    const website = f.website && safeUrl(f.website);
    if (website) details.push(detailRow('Website', `<a href="${website}" target="_blank" rel="noopener">${esc(f.website.replace(/^https?:\/\//, ''))} ↗</a>`));
    if (f.phdFrom) details.push(detailRow('PhD', esc(f.phdFrom)));
    if (f.postdocFrom) details.push(detailRow('Postdoc', esc(f.postdocFrom)));
    if (f.yearStarted) details.push(detailRow('At GMU since', esc(f.yearStarted)));

    const achievementsList = f.achievements.length
        ? `<div class="achievements-section collapsed">
             <div class="achievements-header" onclick="toggleAchievements(this)">
               <h3 class="achievements-heading">Achievements</h3>
               <span class="achievements-toggle">▶</span>
             </div>
             <ul class="achievements-list">${f.achievements.map(a => `<li>${esc(a)}</li>`).join('')}</ul>
           </div>`
        : '';

    const picture = f.picture && safeUrl(f.picture);
    return `
    <div class="card">
      <div class="card-header">
        ${picture ? `<img class="faculty-photo" src="${picture}" alt="${esc(fullName)}" loading="lazy" onerror="this.remove()">` : ''}
        <div class="card-header-text">
          <h2>${esc(fullName)}</h2>
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

// Achievements expand/collapse
window.toggleAchievements = function (header) {
    header.closest('.achievements-section').classList.toggle('collapsed');
};

// Click an interest tag to filter
document.addEventListener('click', e => {
    const tag = e.target.closest('.interest-tag');
    if (!tag) return;
    const interest = tag.dataset.interest;
    activeInterest = interest;
    document.getElementById('active-filter').style.display = 'flex';
    document.getElementById('active-filter-text').textContent = `Research: ${interest}`;
    document.getElementById('main-search').value = '';
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.add('active'));
    render();
});



// Theme Toggle

function setupThemeToggle() {
    const btn = document.getElementById('theme-toggle');
    btn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
    });
}

init();
