# Bookshelf Roadmap

The strongest next step is turning the visual demo into a bookshelf people can genuinely use.

## Current progress

- [x] Add, edit, and remove books with browser-local persistence and legacy-data migration.
- [x] Search by title, author, or tag and filter by reading status.
- [x] Look up ISBN-10 and ISBN-13 metadata and cover art through Open Library.
- [x] Autocomplete titles and authors with acclaim-ranked Open Library suggestions.
- [x] Track ratings, start and finish dates, page progress, tags, and notes.
- [x] Browse the library in a searchable list and focus the matching book on the 3D shelf.
- [x] Import and export library data as JSON.
- [x] Add author, tag, and rating filters plus favorite quotes.
- [ ] Add accessibility, performance, testing, fallback, and release infrastructure.

## Priorities

1. **User-managed books**
   - Completed: add, edit, remove, and search books.
   - Completed: ISBN lookup and cover art through Open Library.
   - Completed: acclaim-ranked title and author autocomplete through Open Library.
   - Completed: preserve the procedural spine when no cover is available.

2. **Portable library data**
   - Completed: export and import JSON.
   - Consider optional cloud sync later.
   - This removes the limitation of status and notes living only in browser storage.

3. **Richer reading tracking**
   - Completed: star ratings, dates started and finished, page progress, tags, and notes.
   - Completed: favorite quotes.
   - Completed: dedicated status, author, tag, and rating filters.

4. **A library view alongside the 3D scene**
   - Completed: provide a searchable list for efficient management.
   - Completed: selecting a result moves the view to the corresponding physical book.
   - Keep 3D as the delightful primary experience, not the only interface.

5. **Performance and accessibility controls**
   - Reduced-motion mode.
   - Low, medium, and high graphics-quality presets.
   - Keyboard book navigation and visible focus states.
   - Mobile-friendly collapsed controls.

6. **Engineering foundations**
   - Tests for persistence and shelf layout.
   - Browser smoke tests for selecting, editing, and mode switching.
   - GitHub Actions for lint, tests, and build.
   - An error boundary and a WebGL-unavailable fallback.

7. **Presentation polish**
   - Live demo deployment.
   - Screenshots or a short GIF in the README.
   - License, contribution guide, and roadmap.

## Recommended next release: Personal Library v1

Finish the release with JSON import/export and broader author, tag, and rating filters. Add/remove/edit, search, status filtering, ISBN lookup, acclaim-ranked autocomplete, cover art, reading metadata, and list-to-shelf navigation are already implemented.
