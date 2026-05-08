// @ts-check
import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'url';
import { resolve } from 'path';
import starlight from '@astrojs/starlight';

import react from '@astrojs/react';

import svelte from '@astrojs/svelte';
import vue from '@astrojs/vue';

const root = fileURLToPath(new URL('../../', import.meta.url));

// https://astro.build/config
export default defineConfig({
    integrations: [starlight({
        title: 'Bambi UI',
        social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/yusuffelekoglu/bambi-ui' }],
        customCss: ['./src/styles/global.css', './src/styles/preview.css'],
        components: {
            ThemeSelect: './src/overrides/ThemeSelect.astro',
        },
        sidebar: [
            {
                label: 'Components',
                items: [
                    { label: 'Button', slug: 'components/button' },
                ],
            },
            {
                label: 'Tokens',
                items: [
                    { label: 'Theme', slug: 'tokens/theme' },
                    { label: 'Button', slug: 'tokens/button' },
                ],
            },
        ],
        }), react(), svelte(), vue()],
    vite: {
        resolve: {
            alias: {
                '@bambiui/components/button/react': resolve(root, 'packages/components/button/src/react.tsx'),
                '@bambiui/components/button/svelte': resolve(root, 'packages/components/button/src/svelte.svelte'),
                '@bambiui/components/button/vue': resolve(root, 'packages/components/button/src/vue.vue'),
                '@bambiui/components/button/astro': resolve(root, 'packages/components/button/src/astro.astro'),
            },
            dedupe: ['vue', 'react', 'react-dom', 'svelte'],
        },
    },
});