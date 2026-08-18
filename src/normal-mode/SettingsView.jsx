import { Button } from '@/components/ui/button'
import { demoBooksRemovalPrompt, removeDemoBooks } from '../library'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'

const graphicsOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

function SettingsView({
  reducedMotion,
  setReducedMotion,
  graphicsQuality,
  setGraphicsQuality,
  galaxyMode,
  setGalaxyMode,
  library = [],
  onRemoveDemoBooks,
  onStatus,
}) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Motion</CardTitle>
          <CardDescription>Reduce animation throughout the app.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant={reducedMotion ? 'default' : 'outline'}
            onClick={() => {
              setReducedMotion(!reducedMotion)
              onStatus?.(reducedMotion ? 'Motion enabled.' : 'Reduced motion enabled.')
            }}
          >
            {reducedMotion ? 'Reduced motion is on' : 'Reduce motion'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Graphics quality</CardTitle>
          <CardDescription>Applied when viewing the 3D room.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="graphics-quality">Quality preset</Label>
          <Select
            id="graphics-quality"
            value={graphicsQuality}
            onChange={(e) => setGraphicsQuality(e.target.value)}
          >
            {graphicsOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Galaxy style</CardTitle>
          <CardDescription>Background style in the 3D room.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="galaxy-mode">Style</Label>
          <Select
            id="galaxy-mode"
            value={galaxyMode}
            onChange={(e) => setGalaxyMode(e.target.value)}
          >
            <option value="realistic">Realistic</option>
            <option value="pixelated">Pixelated</option>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Library</CardTitle>
          <CardDescription>Remove starter catalog books that still use their original titles.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={() => {
              const removed = removeDemoBooks({ books: library }).removed
              if (removed && !window.confirm(demoBooksRemovalPrompt(removed))) return
              onRemoveDemoBooks?.()
            }}
          >
            Remove demo books
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export { SettingsView }
