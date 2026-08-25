import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  site: 'https://kandrpix.com',
  image: {
    service: { id: 'passport' }
  },
  adapter: vercel({
    webAnalytics: { enabled: true }
  })
});
