import { expect, test } from '@playwright/test'
import { mockAccountSdk, openPlayerGame } from './fixtures'

test('mounts Google sign-in', async ({ page }) => {
  await mockAccountSdk(page)
  await page.goto('./')
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible()
})

for (const viewport of [
  { width: 320, height: 568 },
  { width: 390, height: 844 },
  { width: 844, height: 390 },
  { width: 820, height: 1180 },
  { width: 1440, height: 900 }
]) {
  test(`board and footer remain separate at ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await openPlayerGame(page)
    await expect(page.locator('.memory-card')).toHaveCount(20)
    await expect(page.locator('.memory-card__symbol')).toHaveCount(0)
    const board = await page.locator('.memory-board').boundingBox()
    const footer = await page.locator('footer').boundingBox()
    if (!board || !footer) throw new Error('The board and footer must be visible')
    expect(board.y + board.height).toBeLessThanOrEqual(footer.y)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width)
  })
}

test('matches, misses, keyboard play, and restart work without reloading the account', async ({ page }) => {
  await openPlayerGame(page)
  const cards = page.locator('.memory-card')
  await cards.nth(0).focus()
  await page.keyboard.press('Enter')
  await expect(cards.nth(0)).toHaveAttribute('aria-label', 'Card 1, heart')
  await cards.nth(0).click({ force: true })
  await expect(page.locator('.memory-card__symbol')).toHaveCount(1)
  await cards.nth(1).click()
  await expect(page.getByRole('progressbar', { name: 'Pairs found' })).toHaveAttribute('aria-valuenow', '1')
  await expect(page.locator('.memory-card--matched')).toHaveCount(2)

  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') })
  await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'))
  await cards.nth(2).click()
  await cards.nth(4).click()
  await cards.nth(6).click({ force: true })
  await expect(page.locator('.memory-card--revealed')).toHaveCount(2)
  await expect(page.getByRole('status')).toHaveText('Not a pair. Remember these for later.')
  await page.clock.runFor(650)
  await page.clock.resume()
  await expect(page.locator('.memory-card--revealed')).toHaveCount(0)
  await expect(page.locator('.game-stat').nth(1)).toContainText('01')

  await page.getByRole('button', { name: 'Restart game' }).click()
  await expect(page.getByText('Your current game will be lost.')).toBeVisible()
  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(page.locator('.memory-card--matched')).toHaveCount(2)
  await page.getByRole('button', { name: 'Restart game' }).click()
  await page.getByRole('button', { name: 'Restart', exact: true }).click()
  await expect(page.locator('.memory-card--hidden')).toHaveCount(20)
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
  await expect(page.locator('.game-stat').nth(0)).toContainText('0:00')
  await expect(page.locator('.memory-player')).toContainText('Jamie')
})

test('a completed game saves its score and returns to a fresh deck', async ({ page }) => {
  await openPlayerGame(page)
  let savedScore: number | undefined
  await page.route('**/memorygames/12', async route => {
    const payload: unknown = route.request().postDataJSON()
    if (typeof payload !== 'object' || payload === null || !('score' in payload) || typeof payload.score !== 'number') {
      throw new Error('Expected a numeric score')
    }
    savedScore = payload.score
    await route.fulfill({ json: { id: 12, player: 'Jamie', score: savedScore } })
  })
  const cards = page.locator('.memory-card')
  for (let index = 0; index < 20; index++) await cards.nth(index).click()
  await expect(page.getByText('A new personal best.')).toBeVisible()
  await expect(page.locator('.game-stat--best')).toContainText('17,290')
  await page.getByRole('button', { name: 'Save to leaderboard' }).click()
  await expect(page.locator('.leaderboard-card')).toBeVisible()
  expect(savedScore).toBeGreaterThan(17290)
  await expect(page.locator('.leaderboard-bottom')).toContainText(String(savedScore).replace(/\B(?=(\d{3})+(?!\d))/g, ','))
  await page.getByRole('button', { name: 'Back to game' }).click()
  await page.getByRole('button', { name: 'Restart game' }).click()
  await expect(page.locator('.memory-card--hidden')).toHaveCount(20)
})
