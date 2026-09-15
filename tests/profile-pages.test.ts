import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { slugify } from '../scripts/generate-profile-pages.ts';

const root = process.cwd();

test('slugify generates clean URL-friendly slugs', () => {
    assert.equal(slugify('ThanhVu (Vu) Nguyen'), 'thanhvu-vu-nguyen');
    assert.equal(slugify('Jan Allbeck'), 'jan-allbeck');
    assert.equal(slugify('Timothy Balint'), 'timothy-balint');
    assert.equal(slugify('Ghada Abdelmoumin'), 'ghada-abdelmoumin');
});

test('profile pages generate valid HTML for faculty and students', () => {
    const peopleDir = path.join(root, 'public', 'people');
    if (!fs.existsSync(peopleDir)) {
        // Run generation if not already generated
        const { execFileSync } = require('node:child_process');
        execFileSync('npx', ['tsx', 'scripts/generate-profile-pages.ts', '--dev'], { cwd: root });
    }

    const files = fs.readdirSync(peopleDir).filter(f => f.endsWith('.html'));
    assert.ok(files.length > 500, `Expected > 500 profile files, got ${files.length}`);

    // Verify key sample profiles exist and have proper man-page layout
    const sampleSlugs = ['thanhvu-vu-nguyen', 'jan-allbeck', 'timothy-balint'];
    for (const slug of sampleSlugs) {
        const filePath = path.join(peopleDir, `${slug}.html`);
        assert.ok(fs.existsSync(filePath), `Profile file should exist: ${slug}.html`);
        const content = fs.readFileSync(filePath, 'utf8');
        assert.ok(content.includes('class="man-page"'), `${slug}.html should have .man-page`);
        assert.ok(content.includes('class="man-running-head"'), `${slug}.html should have .man-running-head`);
        assert.ok(content.includes('class="man-section"'), `${slug}.html should have .man-section`);
        assert.ok(content.includes('application/ld+json'), `${slug}.html should have structured schema.org JSON-LD`);
        assert.ok(content.includes('style.css'), `${slug}.html should link style.css`);
    }
});
