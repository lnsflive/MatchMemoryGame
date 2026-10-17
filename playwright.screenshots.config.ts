import { defineConfig } from '@playwright/test'
import base from './playwright.config'

export default defineConfig({
  ...base,
  testDir: './tests/screenshots',
  fullyParallel: false,
  workers: 1,
  reporter: 'line'
})
