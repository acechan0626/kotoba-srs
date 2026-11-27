import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => ({
  base: mode === 'pages' ? '/kotoba-srs/' : '/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Kotoba SRS — 日文 JLPT 背單字',
        short_name: 'Kotoba SRS',
        description: '專為日文 JLPT (N5~N1) 設計的雙卡片 FSRS 間隔重複背單字工具',
        theme_color: '#f8f5f0',
        background_color: '#f8f5f0',
        display: 'standalone',
        icons: [
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
}));
