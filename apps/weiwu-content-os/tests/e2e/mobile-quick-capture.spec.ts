import { expect, test } from '@playwright/test'

const hasPreviewOwner = Boolean(process.env.E2E_STORAGE_STATE)

test.describe('mobile quick capture', () => {
  test.skip(!hasPreviewOwner, '需要由预览专用 owner 在仓库外提供 storageState。')
  test.use({ viewport: { width: 390, height: 844 } })

  test('mobile captures C端 topic', async ({ page }) => {
    await page.goto('/topics?track=coaching_c2c')
    await page.getByRole('button', { name: /快速记录|新建选题/ }).click()
    await page.getByLabel(/选题或一句想法|标题/).fill('业主不在场量房怎么拍')
    await page.getByRole('button', { name: /记录到选题库|保存/ }).click()
    await expect(page.getByText('已记录到选题库')).toBeVisible()
  })
})
