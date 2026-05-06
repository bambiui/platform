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
        components: {
            ThemeSelect: './src/overrides/ThemeSelect.astro',
        },
        head: [
            {
                tag: 'script',
                content: `(function(){try{var s=localStorage.getItem('bambi-theme');if(!s)return;var d=JSON.parse(s),root=document.documentElement;window.__bambiTheme=d;function isDark(){var t=root.dataset.theme||localStorage.getItem('starlight-theme');if(t==='light')return false;if(t==='dark')return true;return!window.matchMedia('(prefers-color-scheme: light)').matches;}function apply(){var src=window.__bambiTheme||d;var t=Object.assign({},isDark()?src.dark:src.light,src.radius);Object.keys(t).forEach(function(k){root.style.setProperty(k,t[k]);});}apply();new MutationObserver(function(ms){ms.forEach(function(m){if(m.attributeName==='data-theme')apply();});}).observe(root,{attributes:true,attributeFilter:['data-theme']});}catch(e){}})();`,
            },
        ],
        sidebar: [
            { label: 'Theme Builder', slug: 'themes' },
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
        ssr: {
            noExternal: ['@bambi-react/button', '@bambi-ui/theme', '@bambi-ui/button', '@bambi-svelte/button', '@bambi-vue/button'],
        },
    },
});