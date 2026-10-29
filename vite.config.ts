import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  const name = env.VITE_APP_NAME || 'Mini App'

  return {
    plugins: [
      react(),
      {
        name: 'app-name-html',
        transformIndexHtml: (html) => html.replaceAll('__APP_NAME__', name),
      },
      VitePWA({
        registerType: 'autoUpdate',
        manifest: {
          name,
          short_name: name,
          description: `${name} — fast, simple, works anywhere.`,
          theme_color: '#2563eb',
          background_color: '#ffffff',
          display: 'standalone',
          start_url: '/',
          icons: [
            { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
      }),
    ],
  }
})
