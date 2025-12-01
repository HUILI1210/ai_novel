import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: '/ai_novel/',  // GitHub Pages 部署路径
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        // 代码分割优化
        rollupOptions: {
          output: {
            manualChunks: {
              // 将 React 相关库打包到单独的 chunk
              'vendor-react': ['react', 'react-dom'],
              // 将动画库单独打包
              'vendor-motion': ['framer-motion'],
              // 将图标库单独打包
              'vendor-icons': ['lucide-react'],
            },
          },
        },
        // 压缩配置
        minify: 'terser',
        terserOptions: {
          compress: {
            drop_console: mode === 'production',
            drop_debugger: true,
          },
        },
        // 启用 gzip 压缩大小报告
        reportCompressedSize: true,
        // chunk 大小警告阈值
        chunkSizeWarningLimit: 500,
        // 资源内联阈值（小于4kb的资源内联为base64）
        assetsInlineLimit: 4096,
      },
      // 优化依赖预构建
      optimizeDeps: {
        include: ['react', 'react-dom', 'framer-motion', 'lucide-react'],
      },
    };
});
