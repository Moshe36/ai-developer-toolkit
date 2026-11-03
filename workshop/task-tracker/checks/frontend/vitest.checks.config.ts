import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

const repo = process.env.REPO as string

export default defineConfig({
  root: repo,
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/__hidden__/hidden.check.tsx'],
    setupFiles: [path.join(repo, 'src', 'test', 'setup.ts')],
    testTimeout: 15000,
  },
})
