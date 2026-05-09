// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
    site: 'https://bambi-ui.felekoglu.dev',
    integrations: [starlight({
        title: 'Bambi UI',
        logo: {
            src: './src/assets/bambi-logo.svg',
            alt: 'Bambi UI',
        },
        head: [
            { tag: 'link', attrs: { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' } },
        ],
        social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/bambiui/platform' }],
        customCss: ['./src/styles/global.css', './src/styles/preview.css'],
        components: {
            ThemeSelect: './src/overrides/ThemeSelect.astro',
        },
        sidebar: [
            { label: 'Get Started', slug: 'get-started' },
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
        })],
});
