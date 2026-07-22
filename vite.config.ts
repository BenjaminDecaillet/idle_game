import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// Deployed to GitHub Pages under /idle_game/ — override with VITE_BASE for other hosts.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/idle_game/',
  build: {
    target: 'es2022',
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Idle Silicon Valley',
        short_name: 'IdleSV',
        description:
          'Build the greatest tech company: hire workers, ship projects, earn billions — even while you are away.',
        theme_color: '#0b0f1a',
        background_color: '#0b0f1a',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '.',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
});
