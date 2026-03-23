import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // 포트포워딩·리버스프록시로 다른 Host 헤더로 접속할 때 Vite 기본 정책에 막히지 않게 함
    allowedHosts: ['intra.novonetworks.com'],
    proxy: {
      '/v1': 'http://localhost:8080',
      '/healthz': 'http://localhost:8080',
    },
  },
})
