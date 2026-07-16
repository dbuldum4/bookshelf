import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('selects a book from the library', async ({ page }) => {
  const book = page.getByRole('option', { name: /The Great Gatsby, by F[.] Scott Fitzgerald/ })
  await book.click()

  await expect(book).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('dialog', { name: 'Details for The Great Gatsby' })).toBeVisible()
})

test('edits a selected book and persists the change', async ({ page }) => {
  await page.getByRole('option', { name: /The Great Gatsby, by F[.] Scott Fitzgerald/ }).click()
  const title = page.getByLabel('Title')
  await title.fill('The Great Gatsby — Annotated')
  await expect(page.getByRole('dialog', { name: 'Details for The Great Gatsby — Annotated' })).toBeVisible()

  await page.reload()
  await expect(page.getByRole('option', { name: /The Great Gatsby — Annotated/ })).toBeVisible()
})

test('switches between view modes', async ({ page }) => {
  const play = page.getByRole('button', { name: 'Play', exact: true })
  await play.click()
  await expect(play).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText('Drag a book to grab it — release to fling')).toBeVisible()

  const customize = page.getByRole('button', { name: 'Customize', exact: true })
  await customize.click()
  await expect(customize).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText('Drag a book to grab it — release to fling')).toBeHidden()
})

test('opens settings and switches graphics quality without showing the WebGL fallback', async ({ page }) => {
  const openSettings = async () => {
    const dialog = page.getByRole('dialog', { name: 'Settings' })
    if (await dialog.isVisible().catch(() => false)) return dialog
    await page.getByRole('button', { name: 'Settings' }).click()
    await expect(dialog).toBeVisible()
    return dialog
  }

  await openSettings()

  for (const quality of ['Low', 'High', 'Medium']) {
    await openSettings()
    const button = page.getByRole('button', { name: `${quality} graphics quality` })
    // Canvas remounts on quality change and can briefly intercept hit-testing.
    await button.click({ force: true })
    await expect(button).toHaveAttribute('aria-pressed', 'true', { timeout: 15_000 })
    await expect(page.getByRole('heading', { name: '3D graphics are unavailable' })).toBeHidden()
  }
})

test('shows reading stats and sort controls in the library panel', async ({ page }) => {
  await expect(page.getByLabel('Reading stats')).toBeVisible()
  await expect(page.getByText('Pages read')).toBeVisible()
  await expect(page.getByLabel('Sort library')).toBeVisible()
  await page.getByLabel('Sort library').selectOption('title')
  await expect(page.getByLabel('Sort library')).toHaveValue('title')
})
