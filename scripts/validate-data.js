import fs from 'node:fs';
import Papa from 'papaparse';

const facultyFields = [
    'First Name',
    'Last Name',
    'gmu email/userid',
    'Picture',
    'Tenure-Track/Teaching/Staff',
    'Rank',
    'Dept Role',
    'Website',
    'Research interests',
    'Office (building and room #)',
    'Year started at GMU',
    'PhD from',
    'Postdoc from',
];
const awardFields = ['Name', 'Category', 'Award', 'Year', 'Former', 'Faculty ID'];
const facultyTypes = new Set(['Affiliate', 'Emeritus', 'Staff', 'Teaching', 'Tenure-Track', 'Tenured']);
const errors = [];

function parse(file, expectedFields) {
    const text = fs.readFileSync(new URL(`../public/${file}`, import.meta.url), 'utf8');
    const result = Papa.parse(text, { header: true, skipEmptyLines: 'greedy' });

    result.errors.forEach(error => {
        const line = Number.isInteger(error.row) ? error.row + 2 : 'unknown';
        errors.push(`${file}:${line}: ${error.message}`);
    });

    const actualFields = result.meta.fields || [];
    expectedFields.forEach(field => {
        if (!actualFields.includes(field)) errors.push(`${file}: missing column "${field}"`);
    });
    actualFields.forEach(field => {
        if (!expectedFields.includes(field)) errors.push(`${file}: unexpected column "${field}"`);
    });

    return result.data;
}

function value(row, field) {
    const raw = row[field]?.trim() || '';
    return raw.toLowerCase() === 'null' ? '' : raw;
}

function validHttpUrl(raw, allowMissingProtocol = false) {
    if (!raw) return true;
    const candidate = allowMissingProtocol && !/^https?:\/\//i.test(raw) ? `https://${raw}` : raw;
    try {
        const url = new URL(candidate);
        return (url.protocol === 'http:' || url.protocol === 'https:') && Boolean(url.hostname);
    } catch {
        return false;
    }
}

const faculty = parse('faculty.csv', facultyFields);
const awards = parse('awards.csv', awardFields);
const facultyNames = new Set();
const facultyIds = new Map();

faculty.forEach((row, index) => {
    const line = index + 2;
    const firstName = value(row, 'First Name');
    const lastName = value(row, 'Last Name');
    const name = `${firstName} ${lastName}`.trim();
    const email = value(row, 'gmu email/userid');
    const type = value(row, 'Tenure-Track/Teaching/Staff');
    const startYear = value(row, 'Year started at GMU');
    const picture = value(row, 'Picture');
    const website = value(row, 'Website');

    if (!firstName || !lastName) errors.push(`faculty.csv:${line}: first and last name are required`);
    if (facultyNames.has(name)) errors.push(`faculty.csv:${line}: duplicate faculty name "${name}"`);
    facultyNames.add(name);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errors.push(`faculty.csv:${line}: invalid email "${email}"`);
    if (!facultyIds.has(email)) facultyIds.set(email, []);
    facultyIds.get(email).push(name);
    if (!facultyTypes.has(type)) errors.push(`faculty.csv:${line}: invalid faculty type "${type}"`);
    if (startYear && !/^\d{4}$/.test(startYear)) errors.push(`faculty.csv:${line}: invalid start year "${startYear}"`);
    if (!validHttpUrl(picture)) errors.push(`faculty.csv:${line}: invalid picture URL "${picture}"`);
    if (!validHttpUrl(website, true)) errors.push(`faculty.csv:${line}: invalid website URL "${website}"`);
});

const awardKeys = new Set();
awards.forEach((row, index) => {
    const line = index + 2;
    const name = value(row, 'Name');
    const category = value(row, 'Category');
    const award = value(row, 'Award');
    const year = value(row, 'Year');
    const former = value(row, 'Former').toLowerCase();
    const facultyId = value(row, 'Faculty ID');
    const key = [name, category, award, year].join('\u0000');

    if (!name) errors.push(`awards.csv:${line}: name is required`);
    if (!category) errors.push(`awards.csv:${line}: category is required`);
    if (!award) errors.push(`awards.csv:${line}: award is required`);
    if (year && !/^\d{4}$/.test(year)) errors.push(`awards.csv:${line}: invalid year "${year}"`);
    if (former && former !== 'yes') errors.push(`awards.csv:${line}: Former must be "yes" or blank`);
    if (former === 'yes' && facultyId) errors.push(`awards.csv:${line}: former recipients must not have a Faculty ID`);
    if (!former && !facultyId) errors.push(`awards.csv:${line}: current recipients require a Faculty ID`);
    if (facultyId && !facultyIds.has(facultyId)) errors.push(`awards.csv:${line}: unknown Faculty ID "${facultyId}"`);
    if (facultyId && facultyIds.get(facultyId)?.length !== 1) errors.push(`awards.csv:${line}: Faculty ID "${facultyId}" must identify exactly one faculty member`);
    if (awardKeys.has(key)) errors.push(`awards.csv:${line}: duplicate award for "${name}"`);
    awardKeys.add(key);
});

if (errors.length) {
    console.error(`Data validation failed with ${errors.length} error${errors.length === 1 ? '' : 's'}:`);
    errors.forEach(error => console.error(`- ${error}`));
    process.exitCode = 1;
} else {
    const formerNames = new Set(awards
        .filter(row => value(row, 'Former').toLowerCase() === 'yes' || !facultyNames.has(value(row, 'Name')))
        .map(row => value(row, 'Name')));
    console.log(`Data validation passed: ${faculty.length} faculty, ${awards.length} awards, ${formerNames.size} former faculty.`);
}
