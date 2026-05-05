// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

import react from '@astrojs/react';

import svelte from '@astrojs/svelte';
import vue from '@astrojs/vue';

// https://astro.build/config
export default defineConfig({
    integrations: [starlight({
        title: 'Bambi UI',
        social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/yusuffelekoglu/bambi-ui' }],
        customCss: ['./src/styles/global.css', './src/styles/preview.css'],
        sidebar: [
            {
                label: 'Components',
                items: [
                    { label: 'Button', slug: 'components/button' },
                ],
            },
        ],
        }), react(), svelte(), vue()],
    vite: {
        ssr: {
            noExternal: ['@bambi-react/button', '@bambi-ui/theme', '@bambi-ui/button', '@bambi-svelte/button', '@bambi-vue/button'],
        },
    },
});