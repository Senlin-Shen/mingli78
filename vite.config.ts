
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api/volc-proxy': {
        // 本地开发时直接代理到火山引擎
        target: 'https://ark.cn-beijing.volces.com/api/v3',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/volc-proxy/, '/chat/completions'),
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // 本地调试时使用的 Key
            const apiKey = process.env.VOLC_API_KEY || '98cb8068-1092-4293-8284-e75748242001';
            proxyReq.setHeader('Authorization', `Bearer ${apiKey}`);
          });
        }
      }
    }
  }
});
