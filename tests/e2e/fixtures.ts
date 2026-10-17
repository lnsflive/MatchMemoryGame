import { expect, type Page } from '@playwright/test'

export async function mockAccountSdk(page: Page) {
  await page.route('**/auth/client.v1.js', route => route.fulfill({
    contentType: 'text/javascript',
    body: `window.SharedAccounts = {
      create: () => ({ initialize: async () => {}, storageKey: () => 'strapi_jwt' }),
      mount: (element) => {
        const button = document.createElement('button')
        button.textContent = 'Continue with Google'
        element.replaceChildren(button)
        return { destroy: () => button.remove() }
      }
    }`
  }))
}

export async function openPlayerGame(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('strapi_jwt', 'test-token')
    // Stable sample deck for browser regressions and reproducible documentation images.
    Math.random = () => 0
  })
  await mockAccountSdk(page)
  await page.route('**/users/me', route => route.fulfill({ json: { id: 7 } }))
  const profiles = [
    { id: 11, player: 'Martha', score: 17940 },
    { id: 12, player: 'Jamie', score: 17290 },
    { id: 13, player: 'Diego', score: 16643 },
    { id: 14, player: 'Danielle', score: 16020 },
    { id: 15, player: 'Debbie', score: 15725 }
  ]
  await page.route('**/memorygames?portfolioUserId=7', route => route.fulfill({ json: profiles.filter(profile => profile.id === 12) }))
  await page.route('**/memorygames?_sort=score:desc', route => route.fulfill({ json: profiles }))
  await page.goto('./')
  await expect(page.locator('.memory-player')).toBeVisible()
  await expect(page.locator('.auth-card')).toBeHidden()
}
