import { expect, test } from '@playwright/test'

test('shows the memory game and mounts Google sign-in', async ({ page }) => {
  await page.route('**/auth/client.v1.js', route => route.fulfill({
    contentType: 'text/javascript',
    body: `window.SharedAccounts = {
      create: () => ({
        initialize: async () => {},
        storageKey: () => 'strapi_jwt'
      }),
      mount: (element) => {
        const button = document.createElement('button')
        button.textContent = 'Continue with Google'
        element.replaceChildren(button)
        return { destroy: () => button.remove() }
      }
    }`
  }))

  await page.goto('./')

  await expect(page.getByRole('heading', { name: 'Memory Game' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible()
})
