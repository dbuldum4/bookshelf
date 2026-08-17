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
- [x] Reading goals and year-in-review (progress bars, monthly finishes, top ratings).
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
   - Completed: merge import (id / ISBN / title+author) alongside replace.
   - Completed: backup reminder after 7 days without export (dismissible).
   - Consider optional cloud sync later.

3. **Richer reading tracking**
   - Completed: star ratings, dates started and finished, page progress, tags, and notes.
   - Completed: favorite quotes.
   - Completed: dedicated status, author, tag, and rating filters.
   - Completed: library stats for finished-this-year, pages, and ratings.
   - Completed: yearly reading goals (books / pages) with progress bars.
   - Completed: year-in-review (monthly finishes, year ratings, top-rated list, YoY compare).

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

## Multi-shelf library spaces

Named cases live together in one walkable room. Books belong to exactly one shelf; shelves can be placed, rotated (yaw), and resized with hard capacity.

### Completed in this release

1. **Named shelves / cases**
   - Create, rename, and delete empty shelves (never the last one).
   - Assign books to a shelf; new/imported books default to “Library.”
   - Filter and browse by shelf in the library panel; every case is present in the 3D scene.

2. **Persistent book order on the shelf**
   - Per-shelf order is the library array order among shelf members; survives reload and JSON export/import (v2).
   - List controls and book details can reorder books on a shelf.
   - Spine packing keeps rows within the case width (scale-to-fit if needed for display).

3. **Spatial library room**
   - Semi-free furniture: translate on the floor, yaw, width + row-count resize with min/max bounds.
   - Dedicated **Arrange** mode (not Play) for placing cases; Walk/Play use WASD + drag-to-look.
   - Hard capacity: refuse shrink/add when books would not fit; no silent reflow.
   - Migration: existing libraries land on one default “Library” shelf.
   - Completed: room presets (Wall, L-shape, Gallery) that reposition existing cases.
   - Completed: 3D name plaques on each case.
   - Completed: 3D drag-to-reorder spines (walk/orbit modes); order auto-saves to localStorage with the library.

### Out of scope (later)

- Full cloud sync or accounts.
- Shareable public shelf links.
- Pointer-lock FPS; tilt/pitch of cases.
