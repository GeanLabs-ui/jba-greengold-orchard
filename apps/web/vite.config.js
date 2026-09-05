import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import { rm } from 'node:fs/promises'

const replacedPngAssets = [
  'pages/careers-cta-banner.png',
  'pages/careers-hero-team.png',
  'pages/local-supply-delivery.png',
  'pages/local-supply-header.png',
  'pages/local-supply-retail.png',
  'pages/local-supply-wholesale.png',
  'pages/local-supply-why-choose.png',
  'products/box-package.png',
  'products/dried-mango-jar.png',
  'products/dried-mango.png',
  'products/mango-pudding.png',
];

const pruneReplacedPublicAssets = () => ({
  name: 'prune-replaced-public-assets',
  closeBundle: async () => Promise.all(replacedPngAssets.map((asset) => rm(
    fileURLToPath(new URL(`./dist/${asset}`, import.meta.url)),
    { force: true },
  ))),
});

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    pruneReplacedPublicAssets(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    assetsInlineLimit: 4096,
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
});
