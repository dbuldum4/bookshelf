import { useMemo, useState } from 'react'
import { BookOpen, Calendar, ChevronDown, ChevronRight, FileText, Star, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  computeGoalProgress,
  computeLibraryStats,
  computeYearInReview,
  loadReadingGoals,
  normalizeReadingGoals,
  READING_STATUSES,
  saveReadingGoals,
  yearInReviewComparisonText,
} from '../library'

function formatPages(count) {
  return new Intl.NumberFormat().format(count || 0)
}

const MONTH_LABELS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function GoalProgressBar({ label, progress, unitLabel }) {
  const { active, current, target, ratio, remaining, met } = progress
  if (!active) {
    return (
      <div className="space-y-1.5">
        <div className="flex justify-between gap-2 text-xs text-muted-foreground">
          <span>{label}</span>
          <span>{formatPages(current)} {unitLabel} · no goal</span>
        </div>
        <div className="h-2 rounded-full bg-muted" />
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between gap-2 text-xs">
        <span className="font-medium">{label}</span>
        <span className={met ? 'text-emerald-400' : 'text-muted-foreground'}>
          {formatPages(current)} / {formatPages(target)} {unitLabel}
          {met ? ' · met' : remaining > 0 ? ` · ${formatPages(remaining)} left` : ''}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={`${label}: ${current} of ${target} ${unitLabel}`}
        aria-valuemin={0}
        aria-valuemax={target}
        aria-valuenow={Math.min(current, target)}
        className="h-2 overflow-hidden rounded-full bg-muted"
      >
        <div
          className={`h-full rounded-full ${met ? 'bg-emerald-500' : 'bg-primary'}`}
          style={{ width: `${Math.round(ratio * 100)}%` }}
        />
      </div>
    </div>
  )
}

function StatsView({ library, onSelectBook }) {
  const stats = useMemo(() => computeLibraryStats(library), [library])
  const yearReview = useMemo(
    () => computeYearInReview(library, stats.year),
    [library, stats.year],
  )
  const statusStats = useMemo(
    () => READING_STATUSES.map((value) => ({ label: value, count: stats.byStatus[value] || 0 })),
    [stats]
  )
  const [goals, setGoals] = useState(() => loadReadingGoals())
  const [editingGoals, setEditingGoals] = useState(false)
  const [goalDraft, setGoalDraft] = useState(() => loadReadingGoals())
  const [goalError, setGoalError] = useState('')
  const [reviewOpen, setReviewOpen] = useState(false)

  const booksGoalProgress = useMemo(
    () => computeGoalProgress(stats.finishedThisYear, goals.books),
    [stats.finishedThisYear, goals.books],
  )
  const pagesGoalProgress = useMemo(
    () => computeGoalProgress(stats.pagesFinishedThisYear, goals.pages),
    [stats.pagesFinishedThisYear, goals.pages],
  )

  const beginEditGoals = () => {
    setGoalDraft(goals)
    setGoalError('')
    setEditingGoals(true)
  }

  const cancelEditGoals = () => {
    setGoalDraft(goals)
    setGoalError('')
    setEditingGoals(false)
  }

  const commitGoals = () => {
    const next = normalizeReadingGoals(goalDraft)
    if (!saveReadingGoals(stats.year, next)) {
      setGoalError('Could not save reading goals. Check that browser storage is available and try again.')
      return
    }
    setGoals(next)
    setGoalDraft(next)
    setGoalError('')
    setEditingGoals(false)
  }

  const maxRating = Math.max(1, ...[1, 2, 3, 4, 5].map((s) => stats.ratingCounts[s] || 0))
  const maxMonthly = Math.max(1, ...yearReview.monthlyFinished)
  const maxYearRating = Math.max(1, ...[1, 2, 3, 4, 5].map((s) => yearReview.ratingCounts[s] || 0))

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

      <Card aria-label="Reading goals">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">{stats.year} goals</CardTitle>
          </div>
          {!editingGoals ? (
            <Button type="button" variant="outline" size="sm" onClick={beginEditGoals}>
              {goals.books || goals.pages ? 'Edit goals' : 'Set goals'}
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={cancelEditGoals}>
                Cancel
              </Button>
              <Button type="button" size="sm" onClick={commitGoals}>
                Save
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {editingGoals ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="books-finished-goal">Books finished</Label>
                <Input
                  id="books-finished-goal"
                  aria-label="Books finished goal"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={goalDraft.books || ''}
                  placeholder="0"
                  onChange={(event) => setGoalDraft((prev) => ({ ...prev, books: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pages-finished-goal">Pages finished</Label>
                <Input
                  id="pages-finished-goal"
                  aria-label="Pages finished goal"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={goalDraft.pages || ''}
                  placeholder="0"
                  onChange={(event) => setGoalDraft((prev) => ({ ...prev, pages: event.target.value }))}
                />
              </div>
              <p className="text-xs text-muted-foreground sm:col-span-2">
                Leave at 0 to hide a goal. Progress uses books finished this year and their page counts.
              </p>
              {goalError && (
                <p role="alert" className="text-sm text-destructive sm:col-span-2">
                  {goalError}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <GoalProgressBar label="Books" progress={booksGoalProgress} unitLabel="books" />
              <GoalProgressBar label="Pages" progress={pagesGoalProgress} unitLabel="pages" />
            </div>
          )}
        </CardContent>
      </Card>

      <div>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-between"
          aria-expanded={reviewOpen}
          aria-controls="year-in-review"
          onClick={() => setReviewOpen((open) => !open)}
        >
          <span>{stats.year} year in review</span>
          {reviewOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>

        {reviewOpen && (
          <Card id="year-in-review" aria-label={`${stats.year} year in review`} className="mt-3">
            <CardContent className="space-y-5 pt-6">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-md border bg-muted/40 p-3">
                  <div className="text-xl font-bold">{yearReview.finishedCount}</div>
                  <div className="text-xs text-muted-foreground">Finished</div>
                </div>
                <div className="rounded-md border bg-muted/40 p-3">
                  <div className="text-xl font-bold">{formatPages(yearReview.pagesFinished)}</div>
                  <div className="text-xs text-muted-foreground">Pages</div>
                </div>
                <div className="rounded-md border bg-muted/40 p-3">
                  <div className="text-xl font-bold">
                    {yearReview.ratedCount ? `${yearReview.averageRating.toFixed(1)} ★` : '—'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Avg{yearReview.ratedCount ? ` · ${yearReview.ratedCount}` : ''}
                  </div>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">{yearInReviewComparisonText(yearReview)}</p>

              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Monthly finishes
                </div>
                <div className="flex h-16 items-end gap-1">
                  {yearReview.monthlyFinished.map((count, index) => {
                    const height = count ? Math.max(8, Math.round((count / maxMonthly) * 48)) : 4
                    return (
                      <div key={MONTH_NAMES[index]} className="flex flex-1 flex-col items-center gap-1">
                        <span
                          title={`${MONTH_NAMES[index]}: ${count}`}
                          className={`w-full rounded-sm ${count ? 'bg-primary' : 'bg-muted'}`}
                          style={{ height }}
                        />
                        <span className="text-[10px] text-muted-foreground">{MONTH_LABELS[index]}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {yearReview.ratedCount > 0 && (
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Ratings this year
                  </div>
                  <div className="flex h-8 items-end gap-1">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const count = yearReview.ratingCounts[star] || 0
                      const height = count ? Math.max(6, Math.round((count / maxYearRating) * 24)) : 4
                      return (
                        <span
                          key={star}
                          title={`${star}★: ${count}`}
                          className={`flex-1 rounded-sm ${count ? 'bg-amber-500' : 'bg-muted'}`}
                          style={{ height }}
                        />
                      )
                    })}
                  </div>
                </div>
              )}

              {yearReview.topRated.length > 0 && (
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Top rated
                  </div>
                  <ul className="space-y-1.5">
                    {yearReview.topRated.map((book) => (
                      <li key={book.id || book.title}>
                        <button
                          type="button"
                          onClick={() => onSelectBook?.(book.id)}
                          className="flex w-full items-center justify-between gap-3 rounded-md border bg-card px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                        >
                          <span className="min-w-0 truncate">
                            {book.title}
                            {book.author ? (
                              <span className="text-muted-foreground"> · {book.author}</span>
                            ) : null}
                          </span>
                          <span className="shrink-0 text-amber-500">{book.rating}★</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {yearReview.books.length > 0 && (
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Finished in {yearReview.year}
                  </div>
                  <ul className="max-h-40 space-y-1 overflow-auto">
                    {yearReview.books.map((book) => (
                      <li key={`finished-${book.id || book.title}`}>
                        <button
                          type="button"
                          onClick={() => onSelectBook?.(book.id)}
                          className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                        >
                          <span className="min-w-0 truncate">{book.title}</span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {book.finishedAt ? String(book.finishedAt).slice(0, 10) : ''}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}
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
                const width = count ? Math.max(4, Math.round((count / maxRating) * 100)) : 4
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
