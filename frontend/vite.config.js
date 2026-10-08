import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'injectManifest',
      srcDir: 'public',
      filename: 'sw.js',
      codeSplitting: false,
      injectManifest: {
        swSrc: 'public/sw.js',
        swDest: 'dist/sw.js',
        globDirectory: 'dist',
        globPatterns: ['**/*.{js,css,html,png,svg,ico,json,woff,woff2}'],
      },
      manifest: {
        name: 'SumanMusic - Stream from Drive',
        short_name: 'SumanMusic',
        description: 'Stream your personal Google Drive music library.',
        theme_color: '#1db954',
        background_color: '#121212',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'favicon.png', sizes: '64x64 32x32 24x24 16x16', type: 'image/png' },
          { src: 'logo192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: 'logo512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
        screenshots: [
          {
            src: 'screenshots/home_dark.png',
            sizes: '1536x730',
            type: 'image/png',
            form_factor: 'wide',
            label: 'Home - Dark Mode',
          },
          {
            src: 'screenshots/home_light.png',
            sizes: '1536x730',
            type: 'image/png',
            form_factor: 'wide',
            label: 'Home - Light Mode',
          },
          {
            src: 'screenshots/landing.png',
            sizes: '1536x730',
            type: 'image/png',
            form_factor: 'wide',
            label: 'Landing Page',
          },
          {
            src: 'screenshots/player_expanded.png',
            sizes: '1919x912',
            type: 'image/png',
            form_factor: 'wide',
            label: 'Music Player',
          },
          {
            src: 'screenshots/search.png',
            sizes: '1919x908',
            type: 'image/png',
            form_factor: 'wide',
            label: 'Search',
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  server: {
    host: true,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
  },
})
