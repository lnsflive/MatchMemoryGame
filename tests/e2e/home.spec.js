const { test, expect } = require('@playwright/test')

test('shows the memory game', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Memory Game' })).toBeVisible()
})
