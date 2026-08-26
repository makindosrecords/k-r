import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  site: 'https://kandrpix.com',
  build: {
    inlineStylesheets: 'always'
  },
  image: {
    service: { id: 'passport' }
  },
  adapter: vercel({
    webAnalytics: { enabled: true }
  }),
  redirects: {
    // Legacy Wix General Pages
    '/book-online': { status: 301, destination: '/contact' },
    '/about-5': { status: 301, destination: '/#about' },
    '/gallery': { status: 301, destination: '/portfolio' },
    '/copy-of-gallery': { status: 301, destination: '/portfolio' },
    '/payment-request-page': { status: 301, destination: '/contact' },

    // Legacy Wix Booking Services
    '/service-page/wedding-photography': { status: 301, destination: '/weddings-and-couples' },
    '/service-page/wedding-videography': { status: 301, destination: '/weddings-and-couples' },
    '/service-page/engagement-photoshoot': { status: 301, destination: '/weddings-and-couples' },
    '/service-page/1-hour-session': { status: 301, destination: '/family-and-portraits' },
    '/service-page/real-estate-drone': { status: 301, destination: '/real-estate' },

    // Legacy Wix Store Categories
    '/category/wedding-photography': { status: 301, destination: '/weddings-and-couples' },
    '/category/family-photoshoots': { status: 301, destination: '/family-and-portraits' },
    '/category/event-photography': { status: 301, destination: '/packages' },
    '/category/all-products': { status: 301, destination: '/packages' },

    // Legacy Wix Store Products
    '/product-page/outdoor-family-portrait-session': { status: 301, destination: '/family-and-portraits' },
    '/product-page/children-s-portrait-package': { status: 301, destination: '/family-and-portraits' },
    '/product-page/bridal-party-portrait-package': { status: 301, destination: '/weddings-and-couples' },
    '/product-page/customized-wedding-photo-frame': { status: 301, destination: '/weddings-and-couples' },
    '/product-page/elegant-wedding-album': { status: 301, destination: '/weddings-and-couples' },
    '/product-page/corporate-event-coverage': { status: 301, destination: '/packages' },
    '/product-page/large-event-videography': { status: 301, destination: '/packages' },
    '/product-page/birthday-party-photo-book': { status: 301, destination: '/packages' },
    '/product-page/family-photo-canvas-print': { status: 301, destination: '/family-and-portraits' }
  }
});
