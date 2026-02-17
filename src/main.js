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
    render();
}

// Search & Filters

function setupSearch() {
    const input = document.getElementById('main-search');
    input.addEventListener('input', () => render());
}

function setupFilters() {
    document.getElementById('track-filter').addEventListener('change', () => render());
    document.getElementById('rank-filter').addEventListener('change', () => render());
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
    const track = document.getElementById('track-filter').value;
    const rank = document.getElementById('rank-filter').value;

    let list = allFaculty;

    // Interest tag
    if (activeInterest) {
        list = interestIndex.get(activeInterest) || [];
    }

    // Dropdown filters
    if (track !== 'all') list = list.filter(f => f.type === track);
    if (rank !== 'all') list = list.filter(f => f.category === rank);

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

    return list;
}

function searchMatch(f, q) {
    const fields = [
        f.firstName, f.lastName, `${f.firstName} ${f.lastName}`,
        f.email, f.type, f.category, f.office, f.phdFrom,
        ...f.interests
    ];
    return fields.some(v => v && v.toLowerCase().includes(q));
}

// Rendering

function render() {
    const filtered = getFiltered();
    const grid = document.getElementById('faculty-results');
    const countEl = document.getElementById('faculty-count');

    countEl.textContent = `${filtered.length} faculty`;
    grid.innerHTML = filtered.map(renderCard).join('');
}

function renderCard(f) {
    const fullName = `${f.firstName} ${f.lastName}`;
    const interestTags = f.interests.map(i =>
        `<span class="interest-tag" data-interest="${i}">${i}</span>`
    ).join('');

    const details = [];
    if (f.category && f.type) details.push(detailRow('Position', `${f.category} · ${f.type}`));
    if (f.office) details.push(detailRow('Office', f.office));
    if (f.email) details.push(detailRow('Email', `<button class="copy-email-inline" data-email="${f.email}">${f.email}</button>`));
    if (f.phdFrom) details.push(detailRow('PhD', f.phdFrom));
    if (f.yearStarted) details.push(detailRow('At GMU since', f.yearStarted));

    const links = [];
    if (f.website) links.push(`<a class="card-link" href="${f.website}" target="_blank" rel="noopener">Website ↗</a>`);
    if (f.email) links.push(`<button class="card-link copy-email-btn" data-email="${f.email}">Email</button>`);

    return `
    <div class="card">
      <div class="card-header" onclick="toggleCard(this)">
        <h2>${fullName}</h2>
        <span class="toggle-icon">▼</span>
      </div>
      <div class="card-subtitle">${f.category || ''}${f.type ? ` · ${f.type}` : ''}</div>
      <div class="card-content">
        <div class="faculty-details">${details.join('')}</div>
        ${links.length ? `<div class="card-links">${links.join('')}</div>` : ''}
        ${interestTags ? `<div class="interest-tags">${interestTags}</div>` : ''}
      </div>
    </div>
  `;
}

function detailRow(label, value) {
    return `<div class="faculty-detail"><span class="detail-label">${label}</span><span class="detail-value">${value}</span></div>`;
}

// Card expand/collapse
window.toggleCard = function (header) {
    header.closest('.card').classList.toggle('collapsed');
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
    document.getElementById('track-filter').value = 'all';
    document.getElementById('rank-filter').value = 'all';
    render();
});

// Copy email to clipboard
document.addEventListener('click', e => {
    const emailBtn = e.target.closest('.copy-email-btn, .copy-email-inline');
    if (!emailBtn) return;
    e.preventDefault();
    const email = emailBtn.dataset.email;
    navigator.clipboard.writeText(email).then(() => {
        const original = emailBtn.textContent;
        emailBtn.textContent = '✓ Copied!';
        emailBtn.classList.add('copied');
        setTimeout(() => {
            emailBtn.textContent = original;
            emailBtn.classList.remove('copied');
        }, 1500);
    });
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
