import { defineConfig } from '@playwright/test'

// Pre-installed Chromium in this environment doesn't match the pinned
// revision @playwright/test's package.json expects — launch the real
// on-disk browser explicitly instead of letting Playwright look for "its"
// revision (which was never downloaded, and must not be: no network
// browser download in this sandbox).
const CHROMIUM_EXECUTABLE = process.env.PLAYWRIGHT_CHROMIUM_PATH || '/opt/pw-browsers/chromium'

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:5183',
    launchOptions: { executablePath: CHROMIUM_EXECUTABLE }
  },
  webServer: {
    command: 'npm run dev -- --port 5183 --strictPort',
    url: 'http://127.0.0.1:5183',
    reuseExistingServer: false,
    timeout: 30000
  }
})
