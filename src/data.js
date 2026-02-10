import Papa from 'papaparse';

// Fetch and parse the CSV, normalize values, build an interest index
// Google Sheets CSV export URL
const LIVE_CSV = 'https://docs.google.com/spreadsheets/d/1Cei8Dqc_i1MXVBEKy_H6LIG5R6HmFEEwfrk9WmlruXM/export?format=csv';

export async function loadFaculty() {
    let text;
    try {
        const res = await fetch(LIVE_CSV);
        if (!res.ok) throw new Error('Failed to fetch live data');
        text = await res.text();
    } catch (err) {
        console.warn('Live fetch failed, falling back to local CSV:', err);
        const res = await fetch('/faculty.csv');
        text = await res.text();
    }

    const { data } = Papa.parse(text, { header: true, skipEmptyLines: true });

    const faculty = data.map(row => ({
        firstName: clean(row['First Name']),
        lastName: clean(row['Last Name']),
        email: clean(row['gmu email/userid']),
        track: clean(row['Tenure-Track/Teaching/Staff']),
        rank: clean(row['Rank']),
        website: normalizeUrl(clean(row['Website'])),
        interests: parseInterests(row['Research interests']),
        office: clean(row['Office (building and room #)']),
        yearStarted: clean(row['Year started at GMU']),
        phdFrom: clean(row['PhD from']),
    }));

    // Map each interest string to the list of faculty who share it
    const interestIndex = new Map();
    faculty.forEach(f => {
        f.interests.forEach(interest => {
            if (!interestIndex.has(interest)) interestIndex.set(interest, []);
            interestIndex.get(interest).push(f);
        });
    });

    return { faculty, interestIndex };
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
    return raw.split(',').map(s => s.trim()).filter(Boolean);
}
