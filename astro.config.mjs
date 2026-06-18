// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

const assetVersion = process.env.CAPA_ASSET_VERSION ?? '20260619-adopted-dogs';
const versionedAssetName = `_astro/[name].${assetVersion}.[hash]`;

// https://astro.build/config
export default defineConfig({
  integrations: [react()],

  vite: {
    plugins: [tailwindcss()],
    build: {
      rollupOptions: {
        output: {
          entryFileNames: `${versionedAssetName}.js`,
          chunkFileNames: `${versionedAssetName}.js`,
          assetFileNames: `${versionedAssetName}[extname]`,
        },
      },
    },
  },
});
