
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api/volc-proxy': {
        target: process.env.VOLC_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/volc-proxy/, '/chat/completions'),
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            if (process.env.VOLC_API_KEY) {
              proxyReq.setHeader('Authorization', `Bearer ${process.env.API_KEY || process.env.VOLC_API_KEY}`);
            }
          });
        }
      }
    }
  }
});
