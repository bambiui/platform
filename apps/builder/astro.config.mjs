// @ts-check
import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'url';
import { resolve } from 'path';

const root = fileURLToPath(new URL('../../', import.meta.url));

// https://astro.build/config
export default defineConfig({
  base: '/builder',
  vite: {
    resolve: {
      alias: {
        '@bambiui/tokens/tokens.css': resolve(root, 'packages/tokens/src/tokens.css'),
        '@bambiui/components/button.css': resolve(root, 'packages/components/button/src/button.css'),
        '@bambiui/components/button/astro': resolve(root, 'packages/components/button/src/astro.astro'),
      },
    },
  },
});
