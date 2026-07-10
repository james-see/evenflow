import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  integrations: [svelte(), tailwind()],
  vite: {
    optimizeDeps: {
      exclude: ['@sqlite.org/sqlite-wasm'],
    },
    worker: {
      format: 'es',
    },
  },
});