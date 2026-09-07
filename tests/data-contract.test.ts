import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const schemas = {
    faculty: ['First Name', 'Last Name', 'gmu email/userid', 'Picture', 'Tenure-Track/Teaching/Staff', 'Rank', 'Dept Role', 'Website', 'LinkedIn', 'Google Scholar', 'Research interests', 'Office (building and room #)', 'Year started at GMU', 'PhD from', 'Postdoc from', 'Last Modified', 'Last Verified'],
    students: ['First Name', 'Last Name', 'Advisor', 'Co-Advisor', 'Degree', 'Dissertation Title', 'Current Job', 'First Job', 'Location', 'Internships', 'Honors & Awards', 'Topics', 'Picture', 'Website', 'LinkedIn', 'Google Scholar', 'Last Modified', 'Last Verified'],
    awards: ['Name', 'Category', 'Award', 'Year', 'Former'],
} as const;

function read(name: keyof typeof schemas): Record<string, unknown>[] {
    return JSON.parse(fs.readFileSync(path.join(root, 'public', `${name}.json`), 'utf8')) as Record<string, unknown>[];
}

test('JSON datasets preserve their complete field contracts', () => {
    for (const [name, fields] of Object.entries(schemas)) {
        const records = read(name as keyof typeof schemas);
        assert.ok(records.length > 0, `${name} should not be empty`);
        for (const record of records) {
            assert.deepEqual(Object.keys(record), fields);
            for (const field of fields) assert.equal(typeof record[field], 'string');
        }
    }
});

test('student primary advisors and award recipients resolve to faculty names', () => {
    const faculty = new Set(read('faculty').map(row => `${row['First Name']} ${row['Last Name']}`));
    const students = read('students');
    const awards = read('awards');
    assert.ok(students.some(row => typeof row.Advisor === 'string' && faculty.has(row.Advisor)));
    assert.ok(awards.some(row => faculty.has(row.Name as string)));
});
