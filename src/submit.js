import { loadFaculty, loadStudents } from './data.js';
import './style.css';

const SUBMISSION_EMAIL = 'tvn@gmu.edu';
const GITHUB_REPO = 'RealGMUCS/people';

const app = document.getElementById('app');

// Plain-text dump of a faculty record, one line per faculty.csv column — so a maintainer
// can copy a corrected version straight back into the spreadsheet.
function facultyToText(f) {
    return [
        ['First Name', f.firstName],
        ['Last Name', f.lastName],
        ['gmu email/userid', f.email],
        ['Picture', f.picture],
        ['Tenure-Track/Teaching/Staff', f.track],
        ['Rank', f.rank],
        ['Dept Role', f.role],
        ['Website', f.website],
        ['LinkedIn', f.linkedin],
        ['Google Scholar', f.scholar],
        ['Research interests', f.interests.join(', ')],
        ['Office (building and room #)', f.office],
        ['Year started at GMU', f.yearStarted],
        ['PhD from', f.phdFrom],
        ['Postdoc from', f.postdocFrom],
    ].map(([k, v]) => `${k}: ${v || ''}`).join('\n');
}

// Plain-text dump of a student/alumni record, one line per students.csv column.
function studentToText(s) {
    return [
        ['First Name', s.firstName],
        ['Last Name', s.lastName],
        ['Advisor', s.advisor],
        ['Degree', s.degree],
        ['Current Job', s.currentJob],
        ['First Job', s.firstJob],
        ['Internships', s.internships],
        ['Honors & Awards', s.honors.join('; ')],
        ['Topics', s.topics.join(', ')],
        ['Picture', s.picture],
        ['Website', s.website],
        ['LinkedIn', s.linkedin],
        ['Google Scholar', s.scholar],
    ].map(([k, v]) => `${k}: ${v || ''}`).join('\n');
}

function renderShell() {
    app.innerHTML = `
    <header>
        <h1><a class="home-link" href="./">GMU CS Directory</a></h1>
        <p>George Mason University — Department of Computer Science</p>
    </header>

    <fieldset class="form-section purpose-toggle" id="list-toggle">
        <legend>Which list?</legend>
        <label class="radio-row"><input type="radio" name="list" value="faculty" checked> Faculty</label>
        <label class="radio-row"><input type="radio" name="list" value="students"> Students / Alumni</label>
    </fieldset>

    <fieldset class="form-section purpose-toggle" id="purpose-toggle">
        <legend>What are you doing?</legend>
        <label class="radio-row"><input type="radio" name="purpose" value="add" checked> Add a new entry</label>
        <label class="radio-row"><input type="radio" name="purpose" value="update"> Update an existing entry</label>
    </fieldset>

    <form id="submit-form" class="submit-form" novalidate>
      <div class="form-group required-group">
        <div class="form-section" id="name-section" hidden>
            <label for="entryName">Name</label>
            <input id="entryName" name="entryName" type="text" autocomplete="off" role="combobox"
                aria-autocomplete="list" aria-expanded="false" aria-controls="name-suggestions"
                placeholder="Start typing a name…" />
            <div id="name-suggestions" class="correction-suggestions" role="listbox" hidden></div>
            <p class="form-help notice" id="match-notice" hidden></p>
        </div>

        <div class="form-section">
            <label for="details" id="details-label">Details</label>
            <p class="form-help" id="details-help">
                Paste anything: full details, a link to a profile page, or just a few facts. Plain
                text is fine — a maintainer will read it and add/update the record.
            </p>
            <textarea id="details" name="details" rows="10"
                placeholder="e.g.&#10;Timothy Balint, PhD 2023, advised by Jan Allbeck.&#10;Topics: Virtual Humans, Games.&#10;Current job: Postdoctoral Researcher at TU Delft."></textarea>
        </div>
      </div>

      <div class="submit-actions">
        <button type="submit" class="submit-btn" name="delivery" value="email">Send by email</button>
        <button type="submit" class="submit-btn" name="delivery" value="github">Submit as a GitHub issue</button>
      </div>
      <p class="submit-hint">
        Email opens a pre-filled message to the maintainer and needs no GitHub account. GitHub opens
        a pre-filled issue for anyone who prefers to submit there.
      </p>
    </form>
  `;
}

function buildEmailUrl(subject, body) {
    return `mailto:${SUBMISSION_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function buildGithubIssueUrl(subject, body) {
    const params = new URLSearchParams({ title: subject, body });
    return `https://github.com/${GITHUB_REPO}/issues/new?${params.toString()}`;
}

function getRadio(name) {
    return document.querySelector(`input[name="${name}"]:checked`).value;
}

function fullName(entry) {
    return `${entry.firstName || ''} ${entry.lastName || ''}`.trim();
}

async function init() {
    renderShell();

    const facultyData = await loadFaculty();
    const studentData = await loadStudents(facultyData.facultyByName);
    const lists = {
        faculty: {
            entries: facultyData.faculty,
            label: 'faculty member',
            toText: facultyToText,
            subtitle: e => [e.rank, e.role].filter(Boolean).join(' · '),
        },
        students: {
            entries: studentData.students,
            label: 'student/alum',
            toText: studentToText,
            subtitle: e => [e.advisor && `Advised by ${e.advisor}`, e.degree].filter(Boolean).join(' · '),
        },
    };

    const form = document.getElementById('submit-form');
    const nameSection = document.getElementById('name-section');
    const nameInput = document.getElementById('entryName');
    const suggestions = document.getElementById('name-suggestions');
    const matchNotice = document.getElementById('match-notice');
    const detailsLabel = document.getElementById('details-label');
    const detailsHelp = document.getElementById('details-help');
    const details = document.getElementById('details');

    let byName = new Map();
    let lastAutoFilled = ''; // last text we auto-populated, so we don't clobber manual edits
    let matchingEntries = [];
    let activeSuggestion = -1;

    function currentList() {
        return lists[getRadio('list')];
    }

    function refreshByName() {
        byName = new Map(currentList().entries.map(e => [fullName(e).toLowerCase(), e]));
    }

    function hideSuggestions() {
        activeSuggestion = -1;
        suggestions.hidden = true;
        suggestions.replaceChildren();
        nameInput.setAttribute('aria-expanded', 'false');
    }

    function showSuggestions() {
        const query = nameInput.value.trim().toLowerCase();
        if (!query) { hideSuggestions(); return; }
        const list = currentList();
        matchingEntries = list.entries
            .filter(e => fullName(e).toLowerCase().includes(query))
            .slice(0, 8);
        if (!matchingEntries.length) { hideSuggestions(); return; }
        suggestions.replaceChildren();
        matchingEntries.forEach((entry, index) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'correction-suggestion';
            button.role = 'option';
            button.dataset.index = String(index);
            const name = document.createElement('strong');
            name.textContent = fullName(entry);
            button.append(name);
            const subtitle = list.subtitle(entry);
            if (subtitle) {
                const span = document.createElement('span');
                span.textContent = subtitle;
                button.append(span);
            }
            button.addEventListener('click', () => {
                nameInput.value = fullName(entry);
                checkMatch();
                hideSuggestions();
            });
            suggestions.append(button);
        });
        activeSuggestion = -1;
        suggestions.hidden = false;
        nameInput.setAttribute('aria-expanded', 'true');
    }

    function applyPurpose() {
        const isAdd = getRadio('purpose') === 'add';
        nameSection.hidden = isAdd;
        nameInput.required = !isAdd;
        if (isAdd) {
            matchNotice.hidden = true;
            nameInput.value = '';
            if (details.value === lastAutoFilled) { details.value = ''; lastAutoFilled = ''; }
            detailsLabel.textContent = 'Details';
            detailsHelp.textContent = 'Paste anything: full details, a link to a profile page, or just a few facts. Plain text is fine — a maintainer will read it and add/update the record.';
            details.placeholder = 'e.g.\nTimothy Balint, PhD 2023, advised by Jan Allbeck.\nTopics: Virtual Humans, Procedural Generation, Games.\nCurrent job: Postdoctoral Researcher at TU Delft.';
        } else {
            detailsLabel.textContent = 'What should change?';
            detailsHelp.textContent = 'Type the name above to load their current entry, then edit the text below to show what should change.';
            details.placeholder = 'e.g. Update Current Job to "Senior SWE at Google".';
            checkMatch();
        }
    }

    function checkMatch() {
        const name = nameInput.value.trim().toLowerCase();
        const entry = name && byName.get(name);
        if (!entry) {
            matchNotice.hidden = true;
            return;
        }
        const list = currentList();
        matchNotice.hidden = false;
        matchNotice.textContent = `Found this ${list.label}. Their current entry is pre-filled below — edit it to show the change.`;
        const text = list.toText(entry);
        if (!details.value.trim() || details.value === lastAutoFilled) {
            details.value = text;
            lastAutoFilled = text;
        }
    }

    document.getElementById('list-toggle').addEventListener('change', () => {
        nameInput.value = '';
        matchNotice.hidden = true;
        hideSuggestions();
        if (details.value === lastAutoFilled) { details.value = ''; lastAutoFilled = ''; }
        refreshByName();
        applyPurpose();
    });
    document.getElementById('purpose-toggle').addEventListener('change', applyPurpose);
    nameInput.addEventListener('input', () => { checkMatch(); showSuggestions(); });
    nameInput.addEventListener('focus', showSuggestions);
    nameInput.addEventListener('blur', () => window.setTimeout(hideSuggestions, 150));
    nameInput.addEventListener('keydown', e => {
        const options = [...suggestions.querySelectorAll('.correction-suggestion')];
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

    refreshByName();
    applyPurpose();

    form.addEventListener('submit', e => {
        e.preventDefault();
        const purpose = getRadio('purpose');
        const list = currentList();
        const name = nameInput.value.trim();
        const text = details.value.trim();

        if (purpose === 'update' && !name) {
            nameInput.setCustomValidity('Type the name of the entry you want to update.');
            nameInput.reportValidity();
            return;
        }
        nameInput.setCustomValidity('');
        if (!text) {
            details.setCustomValidity('Please add some details.');
            details.reportValidity();
            return;
        }
        details.setCustomValidity('');

        const listLabel = getRadio('list') === 'faculty' ? 'Faculty' : 'Students/Alumni';
        const subject = purpose === 'update'
            ? `People update (${listLabel}): ${name}`
            : `People submission (${listLabel})${name ? ': ' + name : ''}`;
        const body = [
            `Request: ${purpose === 'update' ? 'Update existing entry' : 'New entry'}`,
            `List: ${listLabel}`,
            ...(name ? [`Name: ${name}`] : []),
            '',
            text,
        ].join('\n');

        if (e.submitter?.value === 'github') {
            window.open(buildGithubIssueUrl(subject, body), '_blank', 'noopener,noreferrer');
        } else {
            window.location.href = buildEmailUrl(subject, body);
        }
    });
}

init();
