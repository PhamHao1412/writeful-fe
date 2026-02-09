import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        allowedHosts: true,
        port: 5173,
        strictPort: true, // Nếu port 5173 bị chiếm, nó sẽ báo lỗi chứ không tự nhảy sang port khác
    },
})