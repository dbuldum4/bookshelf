import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear())
  await page.goto('/')
})

test('selects a book from the library', async ({ page }) => {
  const book = page.getByRole('option', { name: /The Great Gatsby, by F\. Scott Fitzgerald/ })
  await book.click()

  await expect(book).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('dialog', { name: 'Details for The Great Gatsby' })).toBeVisible()
})

test('edits a selected book and persists the change', async ({ page }) => {
  await page.getByRole('option', { name: /The Great Gatsby, by F\. Scott Fitzgerald/ }).click()
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
