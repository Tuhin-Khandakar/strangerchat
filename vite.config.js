import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import legacy from '@vitejs/plugin-legacy';
import { visualizer } from 'rollup-plugin-visualizer';
import viteCompression from 'vite-plugin-compression';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production';

  return {
    root: 'src/client',
    publicDir: resolve(__dirname, 'public'),
    plugins: [
      legacy({
        targets: ['defaults', 'not IE 11'],
        additionalLegacyPolyfills: ['regenerator-runtime/runtime'],
      }),
      visualizer({
        open: false,
        gzipSize: true,
        brotliSize: true,
      }),
      viteCompression({
        algorithm: 'gzip',
        ext: '.gz',
      }),
      viteCompression({
        algorithm: 'brotliCompress',
        ext: '.br',
      }),
      {
        name: 'html-nonce-plugin',
        transformIndexHtml(html) {
          // Target scripts and styles that don't already have a nonce
          return html
            .replace(/<script(?![^>]*nonce=)/g, '<script nonce="__NONCE__"')
            .replace(/<style(?![^>]*nonce=)/g, '<style nonce="__NONCE__"');
        },
      },
    ],
    build: {
      manifest: true,
      outDir: resolve(__dirname, 'dist'),
      emptyOutDir: true,
      target: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari14'], // Broad modern support
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'src/client/index.html'),
          admin: resolve(__dirname, 'src/client/admin.html'),
          terms: resolve(__dirname, 'src/client/terms.html'),
          privacy: resolve(__dirname, 'src/client/privacy.html'),
          offline: resolve(__dirname, 'src/client/offline.html'),
        },
        output: {
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              if (id.includes('socket.io-client')) {
                return 'vendor-socket';
              }
              if (id.includes('zod')) {
                return 'vendor-zod';
              }
              return 'vendor'; // all other node_modules
            }
            if (id.includes('src/client/scripts/admin.js')) {
              return 'admin-logic';
            }
            if (id.includes('src/client/scripts/chat.js')) {
              return 'chat-logic';
            }
          },
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].js',
        },
      },
      reportCompressedSize: true,
      // ✅ production debugging (but not publicly exposed by default)
      sourcemap: isProd ? 'hidden' : true,

      // ✅ ensure we can selectively strip console.*
      minify: isProd ? 'terser' : true,

      terserOptions: isProd
        ? {
            compress: {
              drop_debugger: true,
              // ✅ remove ALL console.* in production
              pure_funcs: [
                'console.log',
                'console.info',
                'console.debug',
                'console.warn',
                'console.error',
                'console.trace',
                'console.group',
                'console.groupCollapsed',
                'console.groupEnd',
              ],
            },
          }
        : undefined,
    },
    cssCodeSplit: true,
    server: {
      port: 5173,
      proxy: {
        '/socket.io': {
          target: 'http://localhost:3000',
          ws: true,
          changeOrigin: true,
        },
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
        '/metrics': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
  };
});
