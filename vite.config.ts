
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Use (process as any).cwd() to resolve the TypeScript error where 'cwd' is not recognized on the global 'process' object in some environments.
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    server: {
      port: 3000,
      // Removed the Ark proxy configuration as the application is migrating to the Google Gemini SDK for direct multidimensional inference.
    }
  };
});
