import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();

test('generated profile pages never emit schemeless external links', () => {
    const peopleDir = path.join(root, 'public', 'people');
    if (!fs.existsSync(peopleDir)) {
        execFileSync('npx', ['tsx', 'scripts/generate-profile-pages.ts', '--dev'], { cwd: root });
    }

    const files = fs.readdirSync(peopleDir).filter(f => f.endsWith('.html'));
    assert.ok(files.length > 500, `Expected > 500 profile files, got ${files.length}`);

    for (const file of files) {
        const content = fs.readFileSync(path.join(peopleDir, file), 'utf8');
        const linksSection = content.match(/<nav class="links"[^>]*>([\s\S]*?)<\/nav>/);
        if (!linksSection) continue;
        const hrefs = [...linksSection[1].matchAll(/<a href="([^"]*)"/g)].map(m => m[1]);
        for (const href of hrefs) {
            // A schemeless href (e.g. "sites.google.com/...") is a RELATIVE path to a
            // browser, not an absolute URL, so clicking it silently appends onto the
            // current page's directory instead of navigating away.
            assert.match(href, /^https?:\/\//, `${file} has a schemeless external link: ${href}`);
        }
    }
});

test('name links to profile pages are rooted at the site base path, not relative', () => {
    // A bare relative href like "people/${slug}.html" resolves against whatever
    // directory the current page lives in. Since the site is deployed under a
    // /people/ base path, that turns one click into an extra, wrong, nested
    // /people/people/ segment. Every place that builds this href must anchor it
    // with the Vite base path instead.
    const sources = [
        path.join(root, 'src', 'main.ts'),
        path.join(root, 'src', 'students.ts'),
        path.join(root, 'src', 'data.ts'),
    ];
    for (const file of sources) {
        const content = fs.readFileSync(file, 'utf8');
        const bareRelativeHrefs = content.match(/href=["'`]people\/\$\{/g) ?? [];
        assert.equal(
            bareRelativeHrefs.length,
            0,
            `${path.basename(file)} builds a profile link without rooting it at BASE_URL: ${bareRelativeHrefs.join(', ')}`,
        );
    }
});
