import { expect, test } from '@playwright/test'

const hasPreviewOwner = Boolean(process.env.E2E_STORAGE_STATE)

test.describe('preview owner track switching', () => {
  test.skip(!hasPreviewOwner, '需要由预览专用 owner 在仓库外提供 storageState。')

  test('owner switches tracks', async ({ page }) => {
    await page.goto('/dashboard')
    await page.getByRole('button', { name: '唯吾 · B端获客' }).click()
    await expect(page).toHaveURL(/track=weiwu_b2b/)
    await page.getByRole('button', { name: '陪跑 · C端获客' }).click()
    await expect(page).toHaveURL(/track=coaching_c2c/)
  })
})
