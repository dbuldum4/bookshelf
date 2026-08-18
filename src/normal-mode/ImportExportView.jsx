import { useRef, useState } from 'react'
import { Download, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { downloadLibraryCsv, parseLibraryFile } from '../library'

const MAX_IMPORT_BYTES = 5_000_000

function ImportExportView({
  library,
  shelves,
  onReplaceLibrary,
  onMergeLibrary,
  onExport,
  onStatus,
}) {
  const [pendingImport, setPendingImport] = useState(null)
  const [importing, setImporting] = useState(false)
  const importInputRef = useRef(null)

  const openImport = () => {
    setPendingImport(null)
    importInputRef.current?.click()
  }

  const handleImport = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setImporting(true)
    setPendingImport(null)
    try {
      if (file.size > MAX_IMPORT_BYTES) {
        onStatus?.('That file is too large to import (max 5 MB).')
        return
      }
      const text = await file.text()
      const parsed = parseLibraryFile(text, file.name)
      const payload = { books: parsed.books, shelves: parsed.shelves }

      if (!library.length) {
        onReplaceLibrary(payload)
        onStatus?.(`Imported ${parsed.count} book${parsed.count === 1 ? '' : 's'} from ${file.name}.`)
        return
      }

      setPendingImport({ payload, count: parsed.count, kind: parsed.format === 'csv' ? 'CSV' : 'JSON', fileName: file.name })
    } catch (error) {
      onStatus?.(error instanceof Error ? error.message : 'Could not import that library file.')
    } finally {
      setImporting(false)
    }
  }

  const confirmMerge = () => {
    if (!pendingImport) return
    const { payload, count, fileName } = pendingImport
    const result = onMergeLibrary(payload)
    setPendingImport(null)
    if (result && typeof result === 'object') {
      const { added = 0, updated = 0, total = 0 } = result
      onStatus?.(`Merged import: ${added} added, ${updated} updated (${total} total).`)
    } else {
      onStatus?.(`Merged ${count} book${count === 1 ? '' : 's'} from ${fileName}.`)
    }
  }

  const confirmReplace = () => {
    if (!pendingImport) return
    const { payload, count, fileName } = pendingImport
    const confirmed = window.confirm(
      `Replace your entire library (${library.length} book${library.length === 1 ? '' : 's'}) ` +
        `with ${count} imported book${count === 1 ? '' : 's'}?\n\n` +
        'This cannot be undone unless you export a backup first.'
    )
    if (!confirmed) return
    onReplaceLibrary(payload)
    setPendingImport(null)
    onStatus?.(`Replaced library with ${count} book${count === 1 ? '' : 's'} from ${fileName}.`)
  }

  const handleExport = () => {
    try {
      if (!library.length) {
        onStatus?.('Add at least one book before exporting.')
        return
      }
      onExport()
      onStatus?.('Library exported.')
    } catch (error) {
      onStatus?.(error instanceof Error ? error.message : 'Could not export your library.')
    }
  }

  const handleExportCsv = () => {
    try {
      if (!library.length) {
        onStatus?.('Add at least one book before exporting.')
        return
      }
      const { count, filename } = downloadLibraryCsv({ books: library, shelves })
      onStatus?.(`Exported ${count} book${count === 1 ? '' : 's'} to ${filename}.`)
    } catch (error) {
      onStatus?.(error instanceof Error ? error.message : 'Could not export your library.')
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Export library</CardTitle>
          <CardDescription>Download a JSON or CSV backup of your books and shelves.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export JSON
          </Button>
          <Button onClick={handleExportCsv} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Import library</CardTitle>
          <CardDescription>Import a JSON backup or a Goodreads-style CSV.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            ref={importInputRef}
            type="file"
            accept=".json,.csv"
            onChange={handleImport}
            className="hidden"
          />
          <Button onClick={openImport} disabled={importing}>
            <Upload className="mr-2 h-4 w-4" />
            {importing ? 'Importing…' : 'Choose file'}
          </Button>

          {pendingImport && (
            <div className="rounded-md border p-4">
              <p className="text-sm">
                Import {pendingImport.count} {pendingImport.kind} book
                {pendingImport.count === 1 ? '' : 's'} from {pendingImport.fileName}.
              </p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={confirmMerge}>
                  Merge
                </Button>
                <Button size="sm" variant="outline" onClick={confirmReplace}>
                  Replace
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setPendingImport(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export { ImportExportView }
