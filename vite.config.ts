import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget = env.VITE_MELP_PROXY_TARGET || 'https://uat-api.melpapp.com'

  return {
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  server: {
    proxy: {
      '/MelpService': {
        target: proxyTarget,
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            // Remove Origin header — backend rejects non-whitelisted origins with 403
            proxyReq.removeHeader('Origin')
          });
        },
        rewrite: (path: string) => {
          // Auth endpoints need /MelpService prefix on backend (SPA uses WEBSERVICE_JAVA)
          if (/^\/MelpService\/(generatewebmelpsession|melplogin|auth\/)/.test(path)) {
            return path
          }
          // Admin endpoints don't need /MelpService prefix (SPA uses WEBSERVICE_JAVA_BASE)
          return path.replace(/^\/MelpService/, '')
        },
      },
    },
  },
  }
})
