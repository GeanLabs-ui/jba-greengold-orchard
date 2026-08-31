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

const splitVendorChunk = (id) => {
  if (!id.includes('node_modules')) return undefined;
  if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) return 'vendor-react';
  if (id.includes('@radix-ui') || /[\\/]node_modules[\\/](lucide-react|cmdk|vaul|embla-carousel-react)[\\/]/.test(id)) return 'vendor-ui';
  if (id.includes('framer-motion')) return 'vendor-motion';
  if (id.includes('recharts') || /[\\/]node_modules[\\/](d3-|victory-vendor)/.test(id)) return 'vendor-charts';
  if (id.includes('@tanstack') || /[\\/]node_modules[\\/](date-fns|moment|zod)[\\/]/.test(id)) return 'vendor-data';
  if (id.includes('@stripe')) return 'vendor-commerce';
  return 'vendor-core';
};

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
    rollupOptions: {
      output: {
        manualChunks: splitVendorChunk,
      },
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
});
