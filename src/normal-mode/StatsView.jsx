import { useMemo } from 'react'
import { BookOpen, Calendar, FileText, Star } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { computeLibraryStats, READING_STATUSES } from '../library'

function formatPages(count) {
  return new Intl.NumberFormat().format(count || 0)
}

function StatsView({ library }) {
  const stats = useMemo(() => computeLibraryStats(library), [library])
  const statusStats = useMemo(
    () => READING_STATUSES.map((value) => ({ label: value, count: stats.byStatus[value] || 0 })),
    [stats]
  )

  return (
    <div className="space-y-6">
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
