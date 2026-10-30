import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { gmuYears } from '../src/utils.ts';

const faculty = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public', 'faculty.json'), 'utf8')) as Record<string, string>[];

test('gmuYears formats a former member\'s years in GMU CS', () => {
    assert.equal(gmuYears('2018', '2023'), '2018–2023');
    assert.equal(gmuYears('', '2023'), 'until 2023');
    assert.equal(gmuYears('2018', ''), 'from 2018');
    assert.equal(gmuYears('', ''), '');
});

test('former faculty records keep their GMU track and drop GMU contact details', () => {
    for (const row of faculty.filter(r => r.Former === 'Yes')) {
        const name = `${row['First Name']} ${row['Last Name']}`;
        assert.ok(row['Tenure-Track/Teaching/Staff'], `${name}: keeps the track held at GMU`);
        assert.ok(row.Rank, `${name}: keeps the rank held at GMU`);
        assert.equal(row['gmu email/userid'], '', `${name}: no GMU email`);
        assert.equal(row['Office (building and room #)'], '', `${name}: no GMU office`);
    }
});

test('only former records carry Year left GMU, Current Position, or Year of death', () => {
    for (const row of faculty.filter(r => r.Former !== 'Yes')) {
        assert.equal(row['Year left GMU'], '', `${row['First Name']} ${row['Last Name']}`);
        assert.equal(row['Current Position'], '', `${row['First Name']} ${row['Last Name']}`);
        assert.equal(row['Year of death'], '', `${row['First Name']} ${row['Last Name']}`);
    }
});

test('a deceased former member has no current position', () => {
    for (const row of faculty.filter(r => r['Year of death'])) {
        assert.equal(row['Current Position'], '', `${row['First Name']} ${row['Last Name']}`);
    }
});
