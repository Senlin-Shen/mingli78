
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api/predict': {
        target: 'https://ark.cn-beijing.volces.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/predict/, '/api/v3/chat/completions'),
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // 注意：本地开发时建议在环境变量或此处手动设置 Key 测试
            // 生产环境由 api/predict.ts 处理
            if (process.env.API_KEY) {
              proxyReq.setHeader('Authorization', `Bearer ${process.env.API_KEY}`);
            }
          });
        }
      }
    }
  },
  build: {
    outDir: 'dist'
  }
});
