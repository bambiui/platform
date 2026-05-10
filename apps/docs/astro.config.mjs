// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
    site: 'https://bambiui.com',
    integrations: [starlight({
        title: 'bambiui',
        logo: {
            src: './src/assets/bambi-logo.svg',
            alt: 'bambiui',
        },
        head: [
            { tag: 'link', attrs: { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' } },
            { tag: 'link', attrs: { rel: 'manifest', href: '/site.webmanifest' } },
            { tag: 'meta', attrs: { name: 'theme-color', content: '#3d56f0' } },
            { tag: 'meta', attrs: { name: 'robots', content: 'index, follow' } },
            { tag: 'meta', attrs: { property: 'og:site_name', content: 'bambiui' } },
            { tag: 'meta', attrs: { property: 'og:image', content: 'https://bambiui.com/og.svg' } },
            { tag: 'meta', attrs: { property: 'og:image:alt', content: 'bambiui source-distributed UI components' } },
            { tag: 'meta', attrs: { name: 'twitter:card', content: 'summary_large_image' } },
            { tag: 'meta', attrs: { name: 'twitter:image', content: 'https://bambiui.com/og.svg' } },
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
