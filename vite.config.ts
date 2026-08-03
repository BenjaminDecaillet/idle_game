import { execSync } from 'node:child_process';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// Short commit sha for the Settings build stamp: CI provides GITHUB_SHA,
// local builds fall back to git, and anything else shows "dev".
function buildSha(): string {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7);
  try {
    return execSync('git rev-parse --short=7 HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return 'dev';
  }
}

// Deployed to GitHub Pages under /idle_game/ — override with VITE_BASE for other hosts.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/idle_game/',
  define: {
    __BUILD_SHA__: JSON.stringify(buildSha()),
    __BUILD_DATE__: JSON.stringify(`${new Date().toISOString().slice(0, 16).replace('T', ' ')}Z`),
  },
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
        theme_color: '#6ec6f5',
        background_color: '#cdefff',
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
