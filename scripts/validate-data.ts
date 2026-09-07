import fs from 'node:fs';

const facultyFields = [
    'First Name',
    'Last Name',
    'gmu email/userid',
    'Picture',
    'Tenure-Track/Teaching/Staff',
    'Rank',
    'Dept Role',
    'Website',
    'LinkedIn',
    'Google Scholar',
    'Research interests',
    'Office (building and room #)',
    'Year started at GMU',
    'PhD from',
    'Postdoc from',
    'Last Modified',
    'Last Verified',
];

const studentFields = [
    'First Name',
    'Last Name',
    'Advisor',
    'Co-Advisor',
    'Degree',
    'Dissertation Title',
    'Current Job',
    'First Job',
    'Location',
    'Internships',
    'Honors & Awards',
    'Topics',
    'Picture',
    'Website',
    'LinkedIn',
    'Google Scholar',
    'Last Modified',
    'Last Verified',
];

const awardFields = ['Name', 'Category', 'Award', 'Year', 'Former'];
const facultyTypes = new Set(['Affiliate', 'Emeritus', 'Staff', 'Teaching', 'Tenure-Track', 'Tenured']);
type JsonRecord = Record<string, unknown>;
const errors: string[] = [];

function parse(file: string, expectedFields: readonly string[]): JsonRecord[] {
    const text = fs.readFileSync(new URL(`../public/${file}`, import.meta.url), 'utf8');
    let data;
    try {
        data = JSON.parse(text) as unknown;
    } catch (error) {
        errors.push(`${file}: invalid JSON (${error instanceof Error ? error.message : String(error)})`);
        return [];
    }
    if (!Array.isArray(data)) {
        errors.push(`${file}: expected a JSON array`);
        return [];
    }

    data.forEach((row: unknown, index: number) => {
        const entry = index + 1;
        if (!row || typeof row !== 'object' || Array.isArray(row)) {
            errors.push(`${file}:${entry}: expected an object`);
            return;
        }
        expectedFields.forEach(field => {
            if (!Object.hasOwn(row, field)) errors.push(`${file}:${entry}: missing property "${field}"`);
        });
        Object.keys(row).forEach(field => {
            if (!expectedFields.includes(field)) errors.push(`${file}:${entry}: unexpected property "${field}"`);
        });
    });

    return data as JsonRecord[];
}

function value(row: JsonRecord, field: string) {
    const raw = typeof row[field] === 'string' ? row[field].trim() : '';
    return raw.toLowerCase() === 'null' ? '' : raw;
}

function validHttpUrl(raw: string, allowMissingProtocol = false) {
    if (!raw) return true;
    const candidate = allowMissingProtocol && !/^https?:\/\//i.test(raw) ? `https://${raw}` : raw;
    try {
        const url = new URL(candidate);
        return (url.protocol === 'http:' || url.protocol === 'https:') && Boolean(url.hostname);
    } catch {
        return false;
    }
}

const faculty = parse('faculty.json', facultyFields);
const students = parse('students.json', studentFields);
const awards = parse('awards.json', awardFields);
const facultyNames = new Set();
const facultyEmails = new Set();

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
    const linkedin = value(row, 'LinkedIn');
    const scholar = value(row, 'Google Scholar');
    const lastModified = value(row, 'Last Modified');
    const lastVerified = value(row, 'Last Verified');

    if (!firstName || !lastName) errors.push(`faculty.json:${line}: first and last name are required`);
    if (facultyNames.has(name)) errors.push(`faculty.json:${line}: duplicate faculty name "${name}"`);
    facultyNames.add(name);
    if (email) {
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errors.push(`faculty.json:${line}: invalid email "${email}"`);
        const genericStaffEmails = new Set(['csug@gmu.edu', 'csgrad@gmu.edu']);
        if (!genericStaffEmails.has(email.toLowerCase()) && facultyEmails.has(email)) {
            errors.push(`faculty.json:${line}: duplicate email "${email}"`);
        }
        facultyEmails.add(email);
    }
    if (type && !facultyTypes.has(type)) errors.push(`faculty.json:${line}: invalid faculty type "${type}"`);
    if (startYear && !/^\d{4}$/.test(startYear)) errors.push(`faculty.json:${line}: invalid start year "${startYear}"`);
    if (!validHttpUrl(picture)) errors.push(`faculty.json:${line}: invalid picture URL "${picture}"`);
    if (!validHttpUrl(website, true)) errors.push(`faculty.json:${line}: invalid website URL "${website}"`);
    if (!validHttpUrl(linkedin, true)) errors.push(`faculty.json:${line}: invalid linkedin URL "${linkedin}"`);
    if (!validHttpUrl(scholar, true)) errors.push(`faculty.json:${line}: invalid scholar URL "${scholar}"`);
    if (lastModified && !/^\d{4}-\d{2}-\d{2}$/.test(lastModified)) errors.push(`faculty.json:${line}: invalid Last Modified date "${lastModified}"`);
    if (lastVerified && !/^\d{4}-\d{2}-\d{2}$/.test(lastVerified)) errors.push(`faculty.json:${line}: invalid Last Verified date "${lastVerified}"`);
});

students.forEach((row, index) => {
    const line = index + 2;
    const firstName = value(row, 'First Name');
    const lastName = value(row, 'Last Name');
    const advisor = value(row, 'Advisor');
    const coAdvisor = value(row, 'Co-Advisor');
    const picture = value(row, 'Picture');
    const website = value(row, 'Website');
    const linkedin = value(row, 'LinkedIn');
    const scholar = value(row, 'Google Scholar');
    const lastModified = value(row, 'Last Modified');
    const lastVerified = value(row, 'Last Verified');

    if (!firstName && !lastName) errors.push(`students.json:${line}: first or last name is required`);
    if (!validHttpUrl(picture)) errors.push(`students.json:${line}: invalid picture URL "${picture}"`);
    if (!validHttpUrl(website, true)) errors.push(`students.json:${line}: invalid website URL "${website}"`);
    if (!validHttpUrl(linkedin, true)) errors.push(`students.json:${line}: invalid linkedin URL "${linkedin}"`);
    if (!validHttpUrl(scholar, true)) errors.push(`students.json:${line}: invalid scholar URL "${scholar}"`);
    if (lastModified && !/^\d{4}-\d{2}-\d{2}$/.test(lastModified)) errors.push(`students.json:${line}: invalid Last Modified date "${lastModified}"`);
    if (lastVerified && !/^\d{4}-\d{2}-\d{2}$/.test(lastVerified)) errors.push(`students.json:${line}: invalid Last Verified date "${lastVerified}"`);
});

const awardKeys = new Set();
awards.forEach((row, index) => {
    const line = index + 2;
    const name = value(row, 'Name');
    const category = value(row, 'Category');
    const award = value(row, 'Award');
    const year = value(row, 'Year');
    const former = value(row, 'Former').toLowerCase();
    const key = [name, category, award, year].join('\u0000');

    if (!name) errors.push(`awards.json:${line}: name is required`);
    if (!category) errors.push(`awards.json:${line}: category is required`);
    if (!award) errors.push(`awards.json:${line}: award is required`);
    if (year && !/^\d{4}$/.test(year)) errors.push(`awards.json:${line}: invalid year "${year}"`);
    if (former && former !== 'yes') errors.push(`awards.json:${line}: Former must be "yes" or blank`);
    if (awardKeys.has(key)) errors.push(`awards.json:${line}: duplicate award for "${name}"`);
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
    console.log(`Data validation passed: ${faculty.length} faculty, ${students.length} students, ${awards.length} awards, ${formerNames.size} former award recipients.`);
}
