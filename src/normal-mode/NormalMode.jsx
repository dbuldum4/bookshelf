import { useEffect, useState } from 'react'
import { BookOpen, Box, Download, Layers, Settings, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BookList } from './BookList'
import { BookSheet } from './BookSheet'
import { ImportExportView } from './ImportExportView'
import { SettingsView } from './SettingsView'
import { ShelvesView } from './ShelvesView'
import { StatsView } from './StatsView'

const TABS = [
  { value: 'books', label: 'Books', icon: BookOpen },
  { value: 'shelves', label: 'Shelves', icon: Layers },
  { value: 'stats', label: 'Stats', icon: SlidersHorizontal },
  { value: 'import', label: 'Import / Export', icon: Download },
  { value: 'settings', label: 'Settings', icon: Settings },
]

function NormalMode({
  library,
  shelves,
  selectedBookId,
  selectedShelfId,
  onSelectBook,
  onSelectShelf,
  bulkBookIds,
  onToggleBulkBook,
  onSetBulkBooks,
  onClearBulkBooks,
  onBulkStatus,
  onBulkTag,
  onBulkMove,
  onAddBook,
  onUpdateSelectedBook,
  onDeleteSelectedBook,
  onReplaceLibrary,
  onMergeLibrary,
  onRenameShelf,
  onTransformShelf,
  onAddShelf,
  onDeleteShelf,
  onApplyRoomPreset,
  onExport,
  onToggle3D,
  onStatus,
  reducedMotion,
  setReducedMotion,
  graphicsQuality,
  setGraphicsQuality,
  galaxyMode,
  setGalaxyMode,
}) {
  const [activeTab, setActiveTab] = useState('books')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetMode, setSheetMode] = useState('add')

  const selectedBook = library.find((book) => book.id === selectedBookId)

  useEffect(() => {
    if (selectedBook && !sheetOpen && activeTab === 'books') {
      setSheetMode('edit')
      setSheetOpen(true)
    }
  }, [selectedBookId, activeTab, selectedBook, sheetOpen])

  const handleSelectBook = (id) => {
    onSelectBook(id)
    if (id) {
      setActiveTab('books')
      setSheetMode('edit')
      setSheetOpen(true)
    }
  }

  const handleAddBook = () => {
    onSelectBook(null)
    setSheetMode('add')
    setSheetOpen(true)
  }

  const handleSheetOpenChange = (open) => {
    setSheetOpen(open)
    if (!open) {
      if (sheetMode === 'edit') onSelectBook(null)
    }
  }

  const handleAddBookSubmit = (draft) => {
    const added = onAddBook(draft)
    if (added) onSelectBook(null)
    return added
  }

  const handleTabChange = (value) => {
    setActiveTab(value)
    if (value !== 'books') {
      setSheetOpen(false)
      onSelectBook(null)
    }
  }

  return (
    <div className="flex h-[100dvh] w-screen flex-col bg-background text-foreground">
      <header className="flex items-center justify-between border-b bg-card px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <Box className="h-6 w-6" />
          <h1 className="font-serif text-xl font-semibold tracking-tight">Bookshelf</h1>
        </div>
        <Button variant="outline" onClick={onToggle3D}>
          <Box className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">3D view</span>
        </Button>
      </header>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="flex flex-1 overflow-hidden">
        <div className="flex min-h-0 w-full flex-1 flex-col">
          <div className="overflow-x-auto border-b bg-card px-4 pt-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <TabsList className="inline-flex h-auto bg-transparent p-0">
              {TABS.map((tab) => {
                const Icon = tab.icon
                return (
                  <TabsTrigger key={tab.value} value={tab.value} className="gap-2 rounded-t-md border-b-2 border-transparent px-3 py-2 data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none">
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </TabsTrigger>
                )
              })}
            </TabsList>
          </div>

          <div className="flex-1 overflow-hidden p-4">
            <TabsContent value="books" className="h-full">
              <BookList
                library={library}
                shelves={shelves}
                selectedBookId={selectedBookId}
                onSelectBook={handleSelectBook}
                onAddBook={handleAddBook}
                bulkBookIds={bulkBookIds}
                onToggleBulkBook={onToggleBulkBook}
                onSetBulkBooks={onSetBulkBooks}
                onClearBulkBooks={onClearBulkBooks}
                onBulkStatus={onBulkStatus}
                onBulkTag={onBulkTag}
                onBulkMove={onBulkMove}
              />
            </TabsContent>

            <TabsContent value="shelves" className="h-full overflow-y-auto">
              <ShelvesView
                library={library}
                shelves={shelves}
                selectedShelfId={selectedShelfId}
                onSelectShelf={onSelectShelf}
                onRenameShelf={onRenameShelf}
                onTransformShelf={onTransformShelf}
                onAddShelf={onAddShelf}
                onDeleteShelf={onDeleteShelf}
                onApplyRoomPreset={onApplyRoomPreset}
              />
            </TabsContent>

            <TabsContent value="stats" className="h-full overflow-y-auto">
              <StatsView library={library} />
            </TabsContent>

            <TabsContent value="import" className="h-full overflow-y-auto">
              <ImportExportView
                library={library}
                shelves={shelves}
                onReplaceLibrary={onReplaceLibrary}
                onMergeLibrary={onMergeLibrary}
                onExport={onExport}
                onStatus={onStatus}
              />
            </TabsContent>

            <TabsContent value="settings" className="h-full overflow-y-auto">
              <SettingsView
                reducedMotion={reducedMotion}
                setReducedMotion={setReducedMotion}
                graphicsQuality={graphicsQuality}
                setGraphicsQuality={setGraphicsQuality}
                galaxyMode={galaxyMode}
                setGalaxyMode={setGalaxyMode}
                onStatus={onStatus}
              />
            </TabsContent>
          </div>
        </div>
      </Tabs>

      <BookSheet
        book={sheetMode === 'edit' ? selectedBook : null}
        shelves={shelves}
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        onAddBook={handleAddBookSubmit}
        onUpdateBook={onUpdateSelectedBook}
        onDeleteBook={onDeleteSelectedBook}
        onStatus={onStatus}
      />
    </div>
  )
}

export default NormalMode
