import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      // proxy all /api/* to Flask on port 5000
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
    },
  },
});
