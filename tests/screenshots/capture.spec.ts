import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { openPlayerGame } from '../e2e/fixtures'

const directory = resolve('docs/screenshots')

for (const [name, viewport] of [
  ['phone', { width: 390, height: 844 }],
  ['landscape', { width: 844, height: 390 }],
  ['tablet', { width: 820, height: 1180 }],
  ['desktop', { width: 1440, height: 900 }]
] satisfies [string, { width: number; height: number }][]) {
  test(`capture ${name} gameplay`, async ({ page }) => {
    await mkdir(directory, { recursive: true })
    await page.setViewportSize(viewport)
    await openPlayerGame(page)
    // Play three pairs and reveal one card through the same controls a player uses.
    for (const index of [0, 1, 8, 9, 16, 17, 6]) await page.locator('.memory-card').nth(index).click()
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '3')
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({ path: resolve(directory, `${name}.png`), fullPage: true, animations: 'disabled' })

    if (name === 'desktop') {
      await page.getByRole('button', { name: 'Leaderboard', exact: true }).click()
      await expect(page.locator('.leaderboard-card')).toBeVisible()
      await page.locator('.leaderboard-card').screenshot({ path: resolve(directory, 'leaderboard.png'), animations: 'disabled' })
    }
  })
}
