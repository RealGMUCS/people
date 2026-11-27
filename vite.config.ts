import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = fileURLToPath(new URL('.', import.meta.url));
const commit = process.env.VITE_GIT_COMMIT || (() => {
    try {
        return execFileSync('git', ['rev-parse', '--short=8', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
    } catch {
        return 'development';
    }
})();
// The "Updated <date>" line in each page header: the latest commit's date (every data change is a
// commit, and every push to main deploys), formatted in US Eastern time.
const lastUpdated = (() => {
    try {
        return execFileSync('git', ['log', '-1', '--format=%cI'], { cwd: root, encoding: 'utf8' }).trim();
    } catch {
        return '';
    }
})() || new Date().toISOString();
const lastUpdatedLabel = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'America/New_York',
}).format(new Date(lastUpdated));
const siteUpdated = `Updated <time datetime="${lastUpdated}">${lastUpdatedLabel}</time>`;
const buildTimestamp = process.env.VITE_BUILD_TIME || new Date().toISOString();
const buildLabel = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short',
}).format(new Date(buildTimestamp));

export default defineConfig({
    base: '/people/',
    plugins: [
        {
            name: 'site-updated',
            transformIndexHtml: (html) =>
                html.replace(/(<p class="site-subtitle">[\s\S]*?)<\/p>/, `$1 · <span class="site-updated">${siteUpdated}</span></p>`),
        },
    ],
    define: {
        __BUILD_COMMIT__: JSON.stringify(commit),
        __BUILD_TIMESTAMP__: JSON.stringify(buildTimestamp),
        __BUILD_LABEL__: JSON.stringify(buildLabel),
    },
    build: {
        rollupOptions: {
            input: {
                main: resolve(root, 'index.html'),
                students: resolve(root, 'students.html'),
                news: resolve(root, 'news.html'),
                submit: resolve(root, 'submit.html'),
                notFound: resolve(root, '404.html'),
            },
        },
    },
});

