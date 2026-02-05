
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api/ark-proxy': {
        target: 'https://ark.cn-beijing.volces.com/api/v3',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ark-proxy/, '/chat/completions'),
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // 优先使用 ARK_API_KEY，备用用户提供的默认 Key
            const apiKey = process.env.ARK_API_KEY || '98cb8068-1092-4293-8284-e75748242001';
            proxyReq.setHeader('Authorization', `Bearer ${apiKey}`);
          });
        }
      }
    }
  }
});
