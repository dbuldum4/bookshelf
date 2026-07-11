# Bookshelf Roadmap

The strongest next step is turning the visual demo into a bookshelf people can genuinely use.

## Priorities

1. **User-managed books**
   - Add, edit, remove, and search books.
   - Support ISBN lookup and cover art through Open Library.
   - Preserve the procedural spine when no cover is available.

2. **Portable library data**
   - Export and import JSON.
   - Consider optional cloud sync later.
   - This removes the limitation of status and notes living only in browser storage.

3. **Richer reading tracking**
   - Star ratings, dates started and finished, page progress, tags, and favorite quotes.
   - Filter the physical shelf by status, author, tag, or rating.

4. **A library view alongside the 3D scene**
   - Provide a searchable grid or list for efficient management.
   - Selecting a result should move the view to the corresponding physical book.
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

Ship a coherent first release with add/remove books, search and filters, ISBN lookup, and JSON import/export. This creates substantially more value than another galaxy or physics effect while preserving the project’s distinctive 3D character.
