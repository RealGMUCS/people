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
                submit: resolve(root, 'submit.html'),
            },
        },
    },
});

