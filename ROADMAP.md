# Bookshelf Roadmap

Personal Library v1 is complete. The next focus is making large libraries feel like a place, not a page.

## Current progress

- [x] Add, edit, and remove books with browser-local persistence and legacy-data migration.
- [x] Search by title, author, or tag and filter by reading status.
- [x] Look up ISBN-10 and ISBN-13 metadata and cover art through Open Library.
- [x] Autocomplete titles and authors with acclaim-ranked Open Library suggestions.
- [x] Track ratings, start and finish dates, page progress, tags, and notes.
- [x] Browse the library in a searchable list and focus the matching book on the 3D shelf.
- [x] Import and export library data as JSON.
- [x] Import Goodreads-style CSV and export library data.
- [x] Add author, tag, and rating filters plus favorite quotes.
- [x] Show library stats (finished this year, pages read, ratings).
- [x] Add reduced-motion, graphics-quality, keyboard navigation, focus, and mobile control options.
- [x] Add accessibility and performance controls, automated tests, and resilient fallbacks.
- [x] Add CI/CD, GitHub Pages deploy, and release infrastructure.
- [x] Settings panel for galaxy style, graphics quality, and reduced motion.

## Completed priorities

1. **User-managed books**
   - Completed: add, edit, remove, and search books.
   - Completed: ISBN lookup and cover art through Open Library.
   - Completed: acclaim-ranked title and author autocomplete through Open Library.
   - Completed: preserve the procedural spine when no cover is available.

2. **Portable library data**
   - Completed: export and import JSON.
   - Completed: Goodreads CSV import.
   - Consider optional cloud sync later.
   - Local-first durability (backup reminders, merge import) remains open.

3. **Richer reading tracking**
   - Completed: star ratings, dates started and finished, page progress, tags, and notes.
   - Completed: favorite quotes.
   - Completed: dedicated status, author, tag, and rating filters.
   - Completed: library stats for finished-this-year, pages, and ratings.

4. **A library view alongside the 3D scene**
   - Completed: provide a searchable list for efficient management.
   - Completed: selecting a result moves the view to the corresponding physical book.
   - Keep 3D as the delightful primary experience, not the only interface.

5. **Performance and accessibility controls**
   - Completed: reduced-motion mode.
   - Completed: low, medium, and high graphics-quality presets.
   - Completed: keyboard book navigation and visible focus states.
   - Completed: mobile-friendly collapsed controls.

6. **Engineering foundations**
   - Completed: tests for persistence and shelf layout.
   - Completed: browser smoke tests for selecting, editing, and mode switching.
   - Completed: GitHub Actions for lint, unit tests, browser smoke tests, and production builds.
   - Completed: an error boundary and a WebGL-unavailable fallback.
   - Completed: deploy successful `main` builds to GitHub Pages.

## Recommended next release: Multi-shelf library spaces

Today the app pages every 40 books into a single fixed case. Turn that into a library people can organize spatially.

### Scope

1. **Named shelves / cases**
   - Let users create and rename shelves (for example Fiction, Currently reading, To-read).
   - Assign books to a shelf; default new and imported books to a sensible shelf.
   - Browse by shelf in the library panel and on the 3D scene (replace flat page index with named cases where possible).

2. **Persistent book order on the shelf**
   - Store per-shelf order in the library model and in JSON export/import.
   - Let users reorder books (list controls first; 3D drag-to-reorder if it stays reliable).
   - Keep automatic packing of spine widths so reordered rows still sit cleanly on the wood.

3. **Scale beyond one bay**
   - Support more books without feeling like “page 3 of 7.”
   - Prefer multiple named cases or a taller multi-bay unit over anonymous pagination.
   - Keep Play mode and selection focus working across the active shelf.

### Out of scope for this release

- Full cloud sync or accounts.
- Reading goals / year-in-review (candidate after multi-shelf).
- Shareable public shelf links.

### Success criteria

- A library larger than one case is organized by named shelves, not only by page number.
- Shelf membership and book order survive reload, JSON export, and JSON import.
- List selection still focuses the matching physical book on the correct shelf.
- Existing libraries migrate cleanly (for example a default “Library” shelf with current order).
