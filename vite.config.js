import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
    base: '/people/',
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
