import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'

const repo = process.env.REPO as string
const setupFile = path.join(repo, 'src', 'test', 'setup.ts')
const hasSetupFile = fs.existsSync(setupFile)

export default defineConfig({
  root: repo,
  plugins: [react()],
  define: { __REPO_HAS_SETUP__: JSON.stringify(hasSetupFile) },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/__hidden__/hidden.check.tsx'],
    setupFiles: hasSetupFile ? [setupFile] : [],
    testTimeout: 15000,
  },
})
