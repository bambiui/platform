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
        '@bambi-ui/theme/tokens.css': resolve(root, 'packages/ui/theme/src/tokens.css'),
        '@bambi-ui/button/index.css': resolve(root, 'packages/ui/button/src/index.css'),
      },
    },
  },
});
