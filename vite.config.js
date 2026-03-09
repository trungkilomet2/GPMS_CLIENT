import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path';
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    css: true,
    include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    exclude: [
      '**/src/services/__tests__/OrderService.test.js',
      '**/src/services/__tests__/CommentService.test.js',
      '**/src/services/__tests__/UserService.test.js',
      '**/src/hooks/__tests__/useFadeIn.test.js',
    ],
  },
  server: {
    host: '0.0.0.0', // Cho phép truy cập từ bên ngoài
    port: 3000, // Đặt cổng cho server phát triển
    strictPort: true, // Nếu cổng đã được sử dụng, sẽ báo lỗi thay vì tự động chuyển sang cổng khác
  },
});
