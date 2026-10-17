import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: 'http://127.0.0.1:8080/games/memory/',
    trace: 'on-first-retry'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],
  webServer: {
    command: 'npm run webDebug',
    env: { ...process.env, PLAYWRIGHT: '1' },
    url: 'http://127.0.0.1:8080/games/memory/',
    timeout: 120_000,
    reuseExistingServer: !process.env.CI
  }
})
