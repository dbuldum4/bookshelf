import { computeYearInReview } from './library'

export const YEAR_IN_REVIEW_IMAGE_WIDTH = 1200
export const YEAR_IN_REVIEW_IMAGE_HEIGHT = 640

const FONT_STACK = 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
const HEADING_FONT = 'ui-serif, Georgia, "Times New Roman", serif'

function formatCount(value) {
  return new Intl.NumberFormat().format(value || 0)
}

/**
 * Pure card copy for the year-in-review share image.
 * @param {unknown} library
 * @param {number | Date} [yearOrNow]
 */
export function buildYearInReviewCardModel(library, yearOrNow = new Date()) {
  const review = computeYearInReview(library, yearOrNow)
  const topTitles = (review.topRated.length > 0 ? review.topRated : review.books)
    .slice(0, 5)
    .map((book) => book.title || 'Untitled')

  return {
    year: review.year,
    heading: `Bookshelf ${review.year}`,
    finishedCount: review.finishedCount,
    finishedLabel: formatCount(review.finishedCount),
    pagesFinished: review.pagesFinished,
    pagesLabel: formatCount(review.pagesFinished),
    averageRating: review.averageRating,
    ratedCount: review.ratedCount,
    ratingLabel: review.ratedCount ? `${review.averageRating.toFixed(1)} ★` : '—',
    topTitles,
    filename: `bookshelf-${review.year}-year-in-review.png`,
  }
}

function fillRoundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + width, y, x + width, y + height, r)
  ctx.arcTo(x + width, y + height, x, y + height, r)
  ctx.arcTo(x, y + height, x, y, r)
  ctx.arcTo(x, y, x + width, y, r)
  ctx.closePath()
  ctx.fill()
}

function strokeRoundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + width, y, x + width, y + height, r)
  ctx.arcTo(x + width, y + height, x, y + height, r)
  ctx.arcTo(x, y + height, x, y, r)
  ctx.arcTo(x, y, x + width, y, r)
  ctx.closePath()
  ctx.stroke()
}

function fitText(ctx, text, maxWidth) {
  const value = String(text || '')
  if (ctx.measureText(value).width <= maxWidth) return value
  const ellipsis = '…'
  let truncated = value
  while (truncated.length && ctx.measureText(`${truncated}${ellipsis}`).width > maxWidth) {
    truncated = truncated.slice(0, -1)
  }
  return truncated ? `${truncated}${ellipsis}` : ellipsis
}

function drawYearInReviewCard(ctx, model) {
  const width = YEAR_IN_REVIEW_IMAGE_WIDTH
  const height = YEAR_IN_REVIEW_IMAGE_HEIGHT

  ctx.fillStyle = '#0b0a14'
  ctx.fillRect(0, 0, width, height)

  ctx.fillStyle = '#141225'
  fillRoundRect(ctx, 28, 28, width - 56, height - 56, 28)
  ctx.strokeStyle = 'rgba(169, 131, 255, 0.32)'
  ctx.lineWidth = 2
  strokeRoundRect(ctx, 28, 28, width - 56, height - 56, 28)

  ctx.fillStyle = 'rgba(126, 91, 226, 0.9)'
  fillRoundRect(ctx, 28, 28, 10, height - 56, 6)

  ctx.fillStyle = 'rgba(169, 131, 255, 0.82)'
  ctx.font = `700 15px ${FONT_STACK}`
  ctx.fillText('YEAR IN REVIEW', 72, 92)

  ctx.fillStyle = '#ffffff'
  ctx.font = `700 58px ${HEADING_FONT}`
  ctx.fillText(fitText(ctx, model.heading, 560), 72, 162)

  const stats = [
    { value: model.finishedLabel, caption: 'Finished' },
    { value: model.pagesLabel, caption: 'Pages' },
    { value: model.ratingLabel, caption: 'Average rating' },
  ]
  stats.forEach((stat, index) => {
    const x = 72 + index * 196
    const y = 214
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)'
    fillRoundRect(ctx, x, y, 180, 118, 16)
    ctx.fillStyle = '#ffffff'
    ctx.font = `700 36px ${FONT_STACK}`
    ctx.fillText(fitText(ctx, stat.value, 152), x + 16, y + 58)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.52)'
    ctx.font = `600 14px ${FONT_STACK}`
    ctx.fillText(stat.caption, x + 16, y + 88)
  })

  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
  ctx.font = `700 13px ${FONT_STACK}`
  ctx.fillText('TOP TITLES', 700, 92)

  const titles = model.topTitles
  if (titles.length === 0) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)'
    ctx.font = `500 22px ${FONT_STACK}`
    ctx.fillText('No finished titles yet', 700, 150)
    return
  }

  titles.forEach((title, index) => {
    const y = 132 + index * 86
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)'
    fillRoundRect(ctx, 700, y - 36, 428, 72, 14)
    ctx.fillStyle = 'rgba(169, 131, 255, 0.95)'
    ctx.font = `700 18px ${FONT_STACK}`
    ctx.fillText(String(index + 1).padStart(2, '0'), 720, y + 8)
    ctx.fillStyle = '#ffffff'
    ctx.font = `600 22px ${FONT_STACK}`
    ctx.fillText(fitText(ctx, title, 340), 770, y + 8)
  })
}

/**
 * Draw a 1200x640 year-in-review card and trigger a PNG download.
 * @param {unknown} library
 * @param {number | Date} [year]
 */
export function downloadYearInReviewImage(library, year = new Date()) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('Year-in-review image is only available in the browser.')
  }

  const model = buildYearInReviewCardModel(library, year)
  const canvas = document.createElement('canvas')
  canvas.width = YEAR_IN_REVIEW_IMAGE_WIDTH
  canvas.height = YEAR_IN_REVIEW_IMAGE_HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Could not create a drawing context for the year-in-review image.')
  }

  drawYearInReviewCard(ctx, model)

  let href
  try {
    href = canvas.toDataURL('image/png')
  } catch {
    throw new Error('Could not encode the year-in-review image.')
  }
  if (!href || !href.startsWith('data:image/png')) {
    throw new Error('Could not encode the year-in-review image.')
  }

  const anchor = document.createElement('a')
  anchor.href = href
  anchor.download = model.filename
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  return { filename: model.filename, year: model.year }
}
