import { useMemo, useState } from 'react'
import { BookOpen, Calendar, Download, FileText, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { computeLibraryStats, computeYearInReview, READING_STATUSES } from '../library'
import { downloadYearInReviewImage } from '../yearInReviewImage'

function formatPages(count) {
  return new Intl.NumberFormat().format(count || 0)
}

function StatsView({ library }) {
  const stats = useMemo(() => computeLibraryStats(library), [library])
  const yearReview = useMemo(
    () => computeYearInReview(library, stats.year),
    [library, stats.year],
  )
  const statusStats = useMemo(
    () => READING_STATUSES.map((value) => ({ label: value, count: stats.byStatus[value] || 0 })),
    [stats]
  )
  const [imageStatus, setImageStatus] = useState('')
  const [imageError, setImageError] = useState('')

  const downloadReviewImage = () => {
    setImageStatus('')
    setImageError('')
    try {
      const { filename } = downloadYearInReviewImage(library, stats.year)
      setImageStatus(`Downloaded ${filename}.`)
    } catch (error) {
      setImageError(error instanceof Error ? error.message : 'Could not download the year-in-review image.')
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <CardTitle className="text-sm font-medium">{stats.year} year in review</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label={`Download ${stats.year} year-in-review image`}
            onClick={downloadReviewImage}
          >
            <Download />
            Download share image
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <div className="text-2xl font-bold">{yearReview.finishedCount}</div>
              <div className="text-sm text-muted-foreground">Finished</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{formatPages(yearReview.pagesFinished)}</div>
              <div className="text-sm text-muted-foreground">Pages</div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {yearReview.ratedCount ? `${yearReview.averageRating.toFixed(1)} ★` : '—'}
              </div>
              <div className="text-sm text-muted-foreground">Average rating</div>
            </div>
          </div>
          {yearReview.topRated.length > 0 && (
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Top titles
              </div>
              <ul className="space-y-1">
                {yearReview.topRated.map((book) => (
                  <li key={book.id || book.title} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate">{book.title}</span>
                    <span className="shrink-0 text-muted-foreground">{book.rating}★</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {imageError ? (
            <p role="alert" className="text-sm text-destructive">{imageError}</p>
          ) : imageStatus ? (
            <p role="status" className="text-sm text-muted-foreground">{imageStatus}</p>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total books</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Finished in {stats.year}</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.finishedThisYear}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pages read</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPages(stats.pagesRead)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Average rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.ratedCount ? `${stats.averageRating.toFixed(1)} ★` : '—'}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>By status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {statusStats.map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{item.label}</span>
                  <span className="text-sm text-muted-foreground">{item.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rating breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = stats.ratingCounts[star] || 0
                const max = Math.max(1, ...[1, 2, 3, 4, 5].map((s) => stats.ratingCounts[s] || 0))
                const width = count ? Math.max(4, Math.round((count / max) * 100)) : 4
                return (
                  <div key={star} className="flex items-center gap-3">
                    <span className="w-12 text-sm">{star}★</span>
                    <div className="flex-1 rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-amber-500"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-sm text-muted-foreground">{count}</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export { StatsView }
