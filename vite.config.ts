
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // 根据当前模式加载环境变量
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    server: {
      port: 3000,
      proxy: {
        '/api/ark-proxy': {
          target: env.ARK_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/ark-proxy/, '/chat/completions'),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              const apiKey = env.ARK_API_KEY || '98cb8068-1092-4293-8284-e75748242001';
              proxyReq.setHeader('Authorization', `Bearer ${apiKey}`);
            });
          }
        }
      }
    }
  };
});
