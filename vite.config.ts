import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/dashscope-api': {
            target: 'https://dashscope.aliyuncs.com',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/dashscope-api/, '/api/v1'),
          },
          '/dashscope-ws': {
            target: 'wss://dashscope.aliyuncs.com',
            changeOrigin: true,
            ws: true,
            rewrite: (path) => path.replace(/^\/dashscope-ws/, '/api-ws/v1/inference'),
            configure: (proxy) => {
              proxy.on('proxyReqWs', (proxyReq, req) => {
                proxyReq.setHeader('Authorization', `bearer ${env.DASHSCOPE_API_KEY}`);
              });
            }
          }
        }
      },
      plugins: [react()],
      define: {
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.DASHSCOPE_API_KEY': JSON.stringify(env.DASHSCOPE_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
