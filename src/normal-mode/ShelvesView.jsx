import { useEffect, useState } from 'react'
import { Layers, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  booksOnShelf,
  ROOM_PRESETS,
  SHELF_ROWS_MAX,
  SHELF_ROWS_MIN,
  SHELF_WIDTH_MAX,
  SHELF_WIDTH_MIN,
} from '../library'

function ShelvesView({
  library,
  shelves,
  selectedShelfId,
  onSelectShelf,
  onRenameShelf,
  onTransformShelf,
  onAddShelf,
  onDeleteShelf,
  onApplyRoomPreset,
}) {
  const [nameDrafts, setNameDrafts] = useState({})

  useEffect(() => {
    setNameDrafts((current) => {
      const next = { ...current }
      for (const shelf of shelves) {
        if (next[shelf.id] === undefined) next[shelf.id] = shelf.name
      }
      return next
    })
  }, [shelves])

  const handleRename = (shelfId) => {
    onRenameShelf(shelfId, nameDrafts[shelfId] || '')
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Room layout presets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {ROOM_PRESETS.map((preset) => (
              <Button
                key={preset.id}
                variant="outline"
                size="sm"
                onClick={() => onApplyRoomPreset(preset.id)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Presets reposition existing cases in the 3D room. Switch back to 3D mode to walk the layout.
          </p>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Shelves ({shelves.length})</h3>
        <Button onClick={onAddShelf}>
          <Plus className="mr-2 h-4 w-4" />
          Add shelf
        </Button>
      </div>

      <div className="grid gap-4">
        {shelves.map((shelf) => {
          const members = booksOnShelf(library, shelf.id).length
          const selected = selectedShelfId === shelf.id
          return (
            <Card key={shelf.id} className={selected ? 'border-ring ring-1 ring-ring' : ''}>
              <CardContent className="space-y-4 p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor={`shelf-name-${shelf.id}`}>Name</Label>
                    <div className="flex gap-2">
                      <Input
                        id={`shelf-name-${shelf.id}`}
                        value={nameDrafts[shelf.id] ?? shelf.name}
                        onChange={(e) =>
                          setNameDrafts((current) => ({ ...current, [shelf.id]: e.target.value }))
                        }
                        onBlur={() => handleRename(shelf.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRename(shelf.id)
                        }}
                      />
                      <Button variant="outline" onClick={() => onSelectShelf(shelf.id)}>
                        {selected ? 'Selected' : 'Select'}
                      </Button>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <Layers className="mr-1 inline h-4 w-4" />
                    {members} book{members === 1 ? '' : 's'}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor={`shelf-width-${shelf.id}`}>
                      Width ({shelf.width.toFixed(1)})
                    </Label>
                    <input
                      id={`shelf-width-${shelf.id}`}
                      type="range"
                      min={SHELF_WIDTH_MIN}
                      max={SHELF_WIDTH_MAX}
                      step={0.1}
                      value={shelf.width}
                      onChange={(e) =>
                        onTransformShelf(shelf.id, { width: Number(e.target.value) })
                      }
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`shelf-rows-${shelf.id}`}>
                      Rows ({shelf.rows})
                    </Label>
                    <input
                      id={`shelf-rows-${shelf.id}`}
                      type="range"
                      min={SHELF_ROWS_MIN}
                      max={SHELF_ROWS_MAX}
                      step={1}
                      value={shelf.rows}
                      onChange={(e) =>
                        onTransformShelf(shelf.id, { rows: Number(e.target.value) })
                      }
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`shelf-yaw-${shelf.id}`}>
                      Yaw ({Math.round((shelf.yaw * 180) / Math.PI)}°)
                    </Label>
                    <input
                      id={`shelf-yaw-${shelf.id}`}
                      type="range"
                      min={-Math.PI}
                      max={Math.PI}
                      step={0.01}
                      value={shelf.yaw}
                      onChange={(e) =>
                        onTransformShelf(shelf.id, { yaw: Number(e.target.value) })
                      }
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={members > 0 || shelves.length <= 1}
                    onClick={() => onDeleteShelf(shelf.id)}
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

export { ShelvesView }
