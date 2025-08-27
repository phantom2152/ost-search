// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from "@tailwindcss/vite";
import react from '@astrojs/react';

import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  integrations: [react()],

  vite: {
    plugins: [tailwindcss()],
  },

  adapter: vercel(),

  server:{
    allowedHosts: ["pictures-native-cultural-bikini.trycloudflare.com"]
  }
});