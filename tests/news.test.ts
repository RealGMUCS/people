import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { filterNews, formatNewsDate, validNewsDate, validateNews } from '../src/news-data.ts';
import type { NewsItem } from '../src/news-data.ts';

const items = JSON.parse(fs.readFileSync('public/news.json', 'utf8')) as NewsItem[];
const faculty = new Set((JSON.parse(fs.readFileSync('public/faculty.json', 'utf8')) as Record<string, string>[]).map(row => `${row['First Name']} ${row['Last Name']}`));

test('news data has sourced stories with valid dates, categories, IDs, and faculty connections', () => {
    assert.deepEqual(validateNews(items, faculty), []);
    assert.ok(items.length > 0);
    for (const category of ['grant', 'graduation', 'paper-award', 'student-achievement', 'faculty-achievement']) {
        assert.ok(items.some(item => item.category === category), `missing ${category}`);
    }
    const broken = { ...items[0], id: 'Invalid ID', date: '2026-02-30', sourceUrl: 'javascript:alert(1)', people: ['Name-only match'] };
    const errors = validateNews([items[0], items[0], broken], faculty).join('\n');
    assert.match(errors, /duplicate id/);
    assert.match(errors, /invalid event\/announcement date/);
    assert.match(errors, /invalid source URL/);
    assert.match(errors, /match a faculty record/);
});

test('news preserves source date precision and orders mixed-precision dates consistently', () => {
    assert.equal(formatNewsDate('2026'), '2026');
    assert.equal(formatNewsDate('2026-09'), 'Sep 2026');
    assert.equal(formatNewsDate('2026-09-24'), 'Sep 24, 2026');
    assert.equal(validNewsDate('2024-02-29'), true);
    for (const date of ['2026-02-29', '2026-13', '2026-1', 'not a date']) assert.equal(validNewsDate(date), false);
    const sample = ['2025-12-31', '2026', '2026-09', '2026-09-24'].map((date, i) => ({ ...items[0]!, id: `story-${i}`, date }));
    assert.deepEqual(filterNews(sample, {}).map(item => item.date), ['2026-09-24', '2026-09', '2026', '2025-12-31']);
    assert.deepEqual(filterNews(sample, { sort: 'oldest' }).map(item => item.date), sample.map(item => item.date));
});

test('news search combines scope, category, year, hashtags, and accent-insensitive text', () => {
    const sample = { ...items[0]!, title: 'José wins a robotics award', people: ['José Example'], date: '2025-08', category: 'student-achievement' as const, tags: ['Robotics'] };
    assert.equal(filterNews([sample], { query: 'jose', scope: 'person', year: '2025', category: 'student-achievement' }).length, 1);
    assert.equal(filterNews([sample], { query: 'jose', scope: 'title' }).length, 1);
    assert.equal(filterNews([sample], { query: '#robotics' }).length, 1);
    assert.equal(filterNews([sample], { query: 'jose', year: '2026' }).length, 0);
    assert.equal(filterNews([sample], { query: 'jose', scope: 'source' }).length, 0);
    assert.equal(filterNews(items, { query: 'paper awards', scope: 'category' }).every(item => item.category === 'paper-award'), true);
});
