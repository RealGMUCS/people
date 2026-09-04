import Papa from 'papaparse';

// The database is three CSVs in this repo — public/faculty.csv (people),
// public/awards.csv (awards, one row per award), and public/students.csv
// (grad students/alumni). Edit any on GitHub and the push redeploys the
// site. Achievements shown on a card are joined from awards.csv by full
// name, so there is no achievements column in faculty.csv. Likewise a
// student's Advisor is joined to a faculty card by full name.
export async function loadFaculty() {
    const base = import.meta.env.BASE_URL;
    const [facText, awardText, studentText] = await Promise.all([
        fetchCsv(`${base}faculty.csv`),
        fetchCsv(`${base}awards.csv`),
        fetchCsv(`${base}students.csv`),
    ]);

    const { awardsByName, awardCategories } = parseAwards(awardText);

    const { data } = Papa.parse(facText, { header: true, skipEmptyLines: true });

    const faculty = data.map(row => {
        // Handle variable header names (they include examples in parentheses)
        const interestKey = Object.keys(row).find(k => k.toLowerCase().startsWith('research interests')) || 'Research interests';
        const rankKey = Object.keys(row).find(k => k.toLowerCase().startsWith('rank')) || 'Rank';
        const roleKey = Object.keys(row).find(k => k.toLowerCase().startsWith('dept role')) || 'Dept Role';

        const rawTrack = clean(row['Tenure-Track/Teaching/Staff']);
        const rawRank = clean(row[rankKey]);
        const firstName = clean(row['First Name']);
        const lastName = clean(row['Last Name']);
        const awards = awardsByName.get(`${firstName || ''} ${lastName || ''}`.trim()) || [];

        return {
            firstName,
            lastName,
            email: clean(row['gmu email/userid']),
            track: rawTrack,
            rank: rawRank,
            type: deriveType(rawTrack, rawRank),
            category: deriveCategory(rawRank),
            role: clean(row[roleKey]),
            website: normalizeUrl(clean(row['Website'])),
            linkedin: normalizeUrl(clean(row['LinkedIn'])),
            scholar: normalizeUrl(clean(row['Google Scholar'])),
            interests: parseInterests(row[interestKey]),
            office: clean(row['Office (building and room #)']),
            yearStarted: clean(row['Year started at GMU']),
            phdFrom: clean(row['PhD from']),
            postdocFrom: clean(row['Postdoc from']),
            awards,
            // searchable text only (cards render from `awards`); include the
            // category so e.g. "NSF CAREER" matches
            achievements: awards.map(a => [a.category, a.award, a.year].filter(Boolean).join(' ')),
            picture: normalizeUrl(clean(row['Picture'])),
            advisees: [],
        };
    }).filter(f => f.firstName || f.lastName);

    // Link each award recipient to a faculty card where one exists
    const byName = new Map(faculty.map(f => [`${f.firstName || ''} ${f.lastName || ''}`.trim(), f]));
    awardCategories.forEach(cat => {
        cat.awards.forEach(a => { a.faculty = byName.get(a.name) || null; });
    });

    // Link student advisees to faculty cards
    if (studentText) {
        const { data: studentData } = Papa.parse(studentText, { header: true, skipEmptyLines: true });
        studentData.forEach(row => {
            const advisorName = clean(row['Advisor']);
            if (advisorName && byName.has(advisorName)) {
                byName.get(advisorName).advisees.push({
                    firstName: clean(row['First Name']),
                    lastName: clean(row['Last Name']),
                    degree: clean(row['Degree']),
                });
            }
        });
    }

    // Map each interest string to the list of faculty who share it
    const interestIndex = new Map();
    faculty.forEach(f => {
        f.interests.forEach(interest => {
            if (!interestIndex.has(interest)) interestIndex.set(interest, []);
            interestIndex.get(interest).push(f);
        });
    });

    return { faculty, interestIndex, awardCategories, facultyByName: byName };
}

// Load public/students.csv (grad students/alumni). facultyByName (from
// loadFaculty) links each student's Advisor to a faculty card where one
// exists, the same way awards.csv links to faculty.
export async function loadStudents(facultyByName) {
    const base = import.meta.env.BASE_URL;
    const text = await fetchCsv(`${base}students.csv`);
    const { data } = Papa.parse(text, { header: true, skipEmptyLines: true });

    const topicIndex = new Map();
    const students = data.map(row => {
        const firstName = clean(row['First Name']);
        const lastName = clean(row['Last Name']);
        const advisor = clean(row['Advisor']);
        const degree = clean(row['Degree']);
        const topics = parseInterests(row['Topics']);
        const honors = parseList(row['Honors & Awards']);
        const { phdYear, msYear, bsYear, gradYear } = parseDegreeYears(degree);

        const student = {
            firstName,
            lastName,
            advisor,
            advisorFaculty: advisor ? (facultyByName.get(advisor) || null) : null,
            degree,
            phdYear,
            msYear,
            bsYear,
            gradYear,
            currentJob: clean(row['Current Job']),
            firstJob: clean(row['First Job']),
            internships: clean(row['Internships']),
            honors,
            topics,
            picture: normalizeUrl(clean(row['Picture'])),
            website: normalizeUrl(clean(row['Website'])),
            linkedin: normalizeUrl(clean(row['LinkedIn'])),
            scholar: normalizeUrl(clean(row['Google Scholar'])),
        };

        topics.forEach(topic => {
            if (!topicIndex.has(topic)) topicIndex.set(topic, []);
            topicIndex.get(topic).push(student);
        });

        return student;
    }).filter(s => s.firstName || s.lastName);

    return { students, topicIndex };
}

function parseDegreeYears(degreeStr) {
    if (!degreeStr) return { phdYear: '', msYear: '', bsYear: '', gradYear: '' };
    const d = degreeStr.trim();
    const m = d.match(/\x27?(\d{2,4})/);
    let year = '';
    let fullYear = '';
    if (m) {
        year = m[1];
        if (year.length === 2) {
            const num = parseInt(year, 10);
            fullYear = (num > 50 ? '19' : '20') + year;
        } else {
            fullYear = year;
        }
    }
    const isPhd = /ph\.?d/i.test(d);
    const isMs = /\b(m\.?s|master)\b/i.test(d);
    const isBs = /\b(b\.?s|bachelor)\b/i.test(d);

    const phdYear = isPhd && fullYear ? `${fullYear} ${year}` : '';
    const msYear = isMs && fullYear ? `${fullYear} ${year}` : '';
    const bsYear = isBs && fullYear ? `${fullYear} ${year}` : '';
    const gradYear = fullYear ? `${fullYear} ${year}` : '';

    return { phdYear, msYear, bsYear, gradYear };
}

async function fetchCsv(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
    return res.text();
}

// Parse awards.csv into: a name→awards map (for cards) and category-grouped
// awards (for the #awards view). Category order follows the CSV's own order.
function parseAwards(text) {
    const { data } = Papa.parse(text, { header: true, skipEmptyLines: true });
    const awardsByName = new Map();
    const catMap = new Map(); // preserves first-seen category order

    data.forEach(row => {
        const name = clean(row['Name']);
        const award = clean(row['Award']);
        if (!name || !award) return;
        const entry = {
            name,
            category: clean(row['Category']),
            award,
            year: clean(row['Year']),
            former: (row['Former'] || '').trim().toLowerCase() === 'yes',
        };
        if (!awardsByName.has(name)) awardsByName.set(name, []);
        awardsByName.get(name).push(entry);
        if (!catMap.has(entry.category)) catMap.set(entry.category, []);
        catMap.get(entry.category).push(entry);
    });

    // sort each person's awards newest first
    awardsByName.forEach(list => list.sort((a, b) => (b.year || '').localeCompare(a.year || '')));

    const awardCategories = Array.from(catMap, ([category, awards]) => ({ category, awards }));
    return { awardsByName, awardCategories };
}

function deriveType(track, rank) {
    if (!track) return null;
    const t = track.toLowerCase().trim();
    if (t === 'emeritus' || t === 'retired') return 'Emeritus';
    if (t === 'affiliate') return 'Affiliate';
    if (t === 'staff') return 'Staff';
    if (t === 'teaching') return 'Teaching';
    if (t === 'tenured') return 'Tenured';
    if (t === 'tenure-track' || t === 'tenured-track') {
        if (rank && rank.toLowerCase() === 'assistant professor') return 'Tenure-Track';
        return 'Tenured';
    }
    return track; // fallback
}

function deriveCategory(rank) {
    if (!rank) return null;
    const r = rank.toLowerCase();
    if (r === 'professor') return 'Professor';
    if (r === 'associate professor') return 'Associate';
    if (r === 'assistant professor') return 'Assistant';
    return rank; // Instructor, Senior Instructor, Professor of Practice — keep as-is
}

function clean(val) {
    if (!val) return null;
    const trimmed = val.trim();
    return (trimmed === '' || trimmed.toLowerCase() === 'null') ? null : trimmed;
}

function normalizeUrl(url) {
    if (!url) return null;
    return url.startsWith('http') ? url : `https://${url}`;
}

function parseInterests(raw) {
    if (!raw || raw.trim().toLowerCase() === 'null') return [];
    return raw.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
}

// Semicolon-separated free-text list (e.g. Honors & Awards, where a single entry
// like "Best Paper Award, VLHCC 2021" already contains a comma).
function parseList(raw) {
    if (!raw || raw.trim().toLowerCase() === 'null') return [];
    return raw.split(';').map(s => s.trim()).filter(Boolean);
}

