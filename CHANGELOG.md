# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.22] - 2026-01-21

### Added
- **UI**: Introduced a rich "Run Summary" card in the Live Terminal. Completion events now visually aggregate stats (Signals found, URLs processed, Skipped items) into a structured, high-visibility dashboard widget.

## [1.0.21] - 2026-01-21

### Improved
- **Styling**: Standardized `SystemLogsTab` to use theme-aware variables (`--border`, `--surface`) instead of hardcoded opacity values. This ensures the logs view looks consistent and legible in both Light and Dark modes.

## [1.0.20] - 2026-01-21

### Improved
- **UI**: Applied `scrollbar-on-hover` style to the main Discovery grid for a cleaner, less cluttered interface when not actively scrolling.

## [1.0.19] - 2026-01-21

### Fixed
- **UI**: Definitely fixed clipping in `NewSignalsFeed` by dynamically toggling `overflow: visible` after the expansion animation completes. This allows hover scaling and shadows to render correctly without breaking the collapse animation.

## [1.0.18] - 2026-01-21

### Fixed
- **UI**: Increased container padding in `NewSignalsFeed` and `CategoryGrid` to completely eliminate clipping during hover scale animations.
- **Styling**: Added `z-index` management to `CategoryCard` to ensuring scaling cards always float above their neighbors.

## [1.0.17] - 2026-01-21

### Fixed
- **UI**: Resolved clipping issues in `NewSignalsFeed` and `CategoryGrid` where card hover effects were being cut off by container boundaries.
- **Animation**: Optimized `whileHover` interactions by removing vertical translation (`y`) and relying on `scale` + `z-index` to ensure cards pop out cleanly over their neighbors.
- **Styling**: Added a `scrollbar-on-hover` utility for a cleaner look in the horizontal signal feed.

## [1.0.16] - 2026-01-21

### Added
- **Features**: Implemented an in-app Changelog viewer. Users can now click the version badge in the sidebar to see a full history of updates.
- **UI**: Added a new version badge in the sidebar.
- **Tooling**: Automated copying of `CHANGELOG.md` to public assets during build and integrated `react-markdown` for rendering.

## [1.0.15] - 2026-01-21

### Improved
- **Styling**: Standardized border colors and hover states across all components using CSS variables (`--border`, `--border-hover`). This ensures consistent high-contrast borders in Light Mode and subtle separators in Dark Mode.
- **UI**: Fixed browser autofill styling to match the application theme, preventing jarring white backgrounds on input fields.

## [1.0.14] - 2026-01-21

### Improved
- **UI**: Promoted the "Sync History" button to a primary call-to-action with gradient styling, hover effects, and improved padding. This makes the core "Mining" action more prominent and accessible.
- **Styling**: Increased hit area for Sync Settings button for better usability.

## [1.0.13] - 2026-01-21

### Changed
- **UI**: Standardized category display in `SignalCard` to use Lucide icons and the unified category system. This ensures consistent iconography and color coding across the Discovery grid, Drawer, and individual Cards.

## [1.0.12] - 2026-01-21

### Fixed
- **UI**: Corrected category icon rendering in the Signal Drawer to support Lucide React components, fixing the display of category icons when drilling down into signals.

## [1.0.11] - 2026-01-21

### Added
- **UI**: Added collapsible/expandable functionality to the "New Signals" feed in the Discovery Tab.
- **UX**: Persistent feed state: The expansion/collapse state of the "New Signals" feed is now saved to `localStorage`.
- **Styling**: Refined vertical spacing and padding in the Discovery view for a tighter, more cohesive layout.

## [1.0.10] - 2026-01-21

### Added
- **Features**: Implemented dynamic category generation. High-frequency tags (3+ occurrences) now automatically become distinct categories in the Discovery view.

### Changed
- **UI**: Replaced emoji-based category icons with Lucide icons (Brain, Briefcase, Landmark, etc.) for a cleaner, more professional look.

## [1.0.9] - 2026-01-21

### Changed
- **UI**: Updated Sidebar collapse toggle icon from `Chevron` to `Chevrons` (double-line) for better visual distinction and aesthetic preference.

## [1.0.8] - 2026-01-21

### Fixed
- **UI**: Corrected alignment of Sidebar "Theme Toggle" and "Collapse" buttons. They now match the exact padding, icon width, and spacing of navigation items for a perfectly aligned layout.
- **Styling**: Replaced text-based arrows (`»`, `«`) with Lucide icons (`ChevronLeft`, `ChevronRight`) in the collapse toggle for visual consistency.

## [1.0.7] - 2026-01-21

### Improved
- **UI**: Enhanced `DiscoveryTab` with a clear button for search, better input styling, and improved category filter visibility.
- **UX**: Updated search input placeholder and focus states for better usability.

## [1.0.6] - 2026-01-21

### Improved
- **UX**: Decoupled "LLM Configuration" and "Browser Sources" saving in Alchemist Engine. Users can now save these settings independently, preventing accidental overwrites and improving feedback clarity.

## [1.0.5] - 2026-01-21

### Improved
- **Styling**: Refined Light Mode color palette for better contrast and readability.
- **UI**: Added dynamic CSS variables for glassmorphism effects, glows, and text selection, ensuring they adapt seamlessly between Light and Dark modes.

## [1.0.4] - 2026-01-21

### Added
- **UI**: Implemented Light/Dark mode toggle in the sidebar. The application now persists user theme preference.
- **Styling**: Added full light mode color palette (OKLCH) to `index.css`.

## [1.0.3] - 2026-01-21

### Fixed
- **Permissions**: Changed internal data directory from `process.cwd()/data` to the system's temporary directory (`os.tmpdir()`). This fixes `EACCES` errors when running in read-only environments (like sandboxes or global installs) where the current working directory is not writable.

## [1.0.2] - 2026-01-21

### Changed
- **UI**: Polished sidebar navigation with new collapsible design and "Alchemist" branding.
- **Account**: Moved Logout functionality to Account Settings for cleaner navigation.
- **UX**: Improved spacing and interactions in Account Settings.

## [1.0.1] - 2026-01-21

### Security
- **Dependencies**: Removed unused `sqlite3` dependency to resolve high-severity vulnerabilities in transitive dependencies (`tar`, `node-gyp`). The project uses `better-sqlite3` which is unaffected.

## [1.0.0] - 2026-01-21

### Added
- **Hybrid Architecture**: Launched hybrid local/cloud architecture combining local Express API with Supabase cloud services.
- **Passive Intelligence Engine**: Implemented `MinerService` for cross-platform browser history mining (Chrome, Edge, Brave, Safari).
- **Content Extraction**: Added `RouterService` with tiered extraction (Axios, Puppeteer, Agent-Browser) and `ContentCleaner` for noise reduction.
- **AI Analysis**: Introduced `AlchemistService` for local/cloud LLM analysis (Ollama, OpenAI, Anthropic) to score and summarize content.
- **Real-time UI**: Released React + Vite frontend with glassmorphism design, utilizing Server-Sent Events for live "Discovery Log" updates.
- **Data Persistence**: Integrated `LibrarianService` for syncing signals to Supabase with automated retention policies.
- **CLI Tool**: Added `realtimex-alchemy` binary for easy startup.


