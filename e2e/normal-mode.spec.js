import { expect, test } from '@playwright/test'

// Desktop defaults to 3D; seed storage so these tests exercise Normal mode.
async function gotoNormalMode(page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('bookshelf-view-mode', 'normal')
  })
  await page.goto('/')
  await dismissFirstRunIfPresent(page)
}

async function dismissFirstRunIfPresent(page) {
  const demo = page.getByRole('button', { name: 'Browse the demo library' })
  if (await demo.isVisible({ timeout: 1000 }).catch(() => false)) {
    await demo.click()
    await expect(demo).toHaveCount(0)
  }
}

test.describe('Normal mode', () => {
  test.beforeEach(async ({ page }) => {
    await gotoNormalMode(page)
  })

  test('list shows a book', async ({ page }) => {
    await expect(page.getByRole('button', { name: /The Great Gatsby/ })).toBeVisible()
  })

  test('opens a book sheet', async ({ page }) => {
    await page.getByRole('button', { name: /The Great Gatsby/ }).click()
    await expect(page.getByRole('heading', { name: 'The Great Gatsby', level: 2 })).toBeVisible()
    await expect(page.getByLabel('Title')).toHaveValue('The Great Gatsby')
    await expect(page.getByText('Edit details for this book.')).toBeVisible()
  })

  test('edits a title and persists after reload', async ({ page }) => {
    await page.getByRole('button', { name: /The Great Gatsby/ }).click()
    const title = page.getByLabel('Title')
    await title.fill('The Great Gatsby — Annotated')
    await expect(page.getByRole('heading', { name: 'The Great Gatsby — Annotated', level: 2 })).toBeVisible()

    await page.reload()
    await dismissFirstRunIfPresent(page)
    await expect(page.getByRole('button', { name: /The Great Gatsby — Annotated/ })).toBeVisible()
  })

  test('stats tab shows Pages read', async ({ page }) => {
    await page.getByRole('button', { name: 'Stats' }).click()
    await expect(page.getByRole('heading', { name: 'Pages read' })).toBeVisible()
  })

  test('import/export tab shows Export JSON', async ({ page }) => {
    await page.getByRole('button', { name: 'Import / Export' }).click()
    await expect(page.getByRole('button', { name: 'Export JSON', exact: true })).toBeVisible()
  })
})
