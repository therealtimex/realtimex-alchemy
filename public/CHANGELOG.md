# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.41] - 2026-01-24

### Added
- **Active Learning**: Implemented "Boost-to-Embed" workflow. Boosting a signal in the UI now triggers the backend to generate a vector embedding for that signal, actively improving the AI's future context retrieval.
- **Deduplication**: Enhanced deduplication engine with Title-based heuristics to catch duplicates across different URLs (e.g., tracking links) and added explicit exact-URL matching.

### Improved
- **Data Retention**: The Alchemist engine now persists *all* mined signals, including low-scoring ones (marked as auto-dismissed). This allows users to review and rescue missed opportunities via the new System Logs filters.
- **RAG**: Tuned Chat retrieval parameters (Lowered threshold to 0.55, Increased limit to 10) to significantly improve the recall of relevant historical context during conversations.
- **UI**: Connected the System Logs "Boost" action to the new API endpoint, ensuring immediate feedback loops for the AI.

## [1.0.40] - 2026-01-24

### Improved
- **UI**: Standardized the styling of disabled input fields in Account Settings (Email field) to match the new `bg-black/5` convention, ensuring consistent visual language and readability across the app.

## [1.0.39] - 2026-01-24

### Fixed
- **UI**: Fixed visibility issues with search inputs and dropdowns in the System Logs "Found Signals" view. Inputs now use a distinct background (`bg-black/5`) and explicit text color to ensure readability in all themes, especially Light Mode.

## [1.0.38] - 2026-01-24

### Added
- **System Logs**: Added "Score Filter" to the Found Signals view. Users can now filter historical signals by "High Impact" (80%+), "Medium", or "Low" scores to quickly identify critical insights or noise.

## [1.0.37] - 2026-01-24

### Added
- **System Logs**: Overhauled the "Found Signals" modal in the System Logs tab into a full-featured signal management interface.
- **Search & Filter**: Added powerful search and category filtering to the System Logs signal viewer, allowing users to easily find specific past signals.
- **Interactions**: Users can now Boost, Dismiss, Favorite, and add Notes to signals directly from the System Logs history view.
- **Pagination**: Implemented server-side pagination for efficient browsing of large signal histories.

## [1.0.36] - 2026-01-24

### Improved
- **Stability**: Added a 60-second timeout to SDK provider fetches to prevent API hangs when the local SDK is unresponsive or indexing large model libraries.
- **Performance**: Implemented caching for LLM provider lists (60s TTL), significantly reducing redundant SDK calls and improving UI responsiveness.
- **Resilience**: Enhanced error handling in API routes; failures to fetch providers now return empty lists instead of 500 errors, ensuring the application remains usable.

## [1.0.35] - 2026-01-24

### Improved
- **UI**: Removed the "Shift + Enter" hint text from the Chat Interface input area for a cleaner, less cluttered look.

## [1.0.34] - 2026-01-24

### Improved
- **UX**: Implemented dynamic positioning for the Live Terminal button. It now automatically "lifts up" when the Chat tab is active to avoid overlapping with the message input area.
- **UI**: Polished the Chat Interface input area with a cleaner, focus-aware design. The textarea now auto-expands smoothly and maintains better alignment with the send button.

## [1.0.33] - 2026-01-24

### Added
- **Chat System**: Introduced a full RAG-powered chat interface. Users can now "talk" to their browser history, asking questions that are answered using semantically relevant signals mined from their reading.
- **RAG (Retrieval-Augmented Generation)**: Integrated `ChatService` with the `EmbeddingService` to automatically retrieve and cite relevant sources from the user's history during chat sessions.
- **Session Management**: Implemented persistent chat sessions with auto-generated titles based on conversation content.
- **Database**: Added `chat_sessions` and `chat_messages` tables with row-level security (RLS) to support the new chat system.

## [1.0.32] - 2026-01-24

### Improved
- **Analysis**: Updated Alchemist scoring criteria to explicitly include "Significant Industry News (Mergers, IPOs, Major Releases)" as a Medium Score (50-79) category, ensuring critical market updates aren't filtered out as noise.

## [1.0.31] - 2026-01-24

### Changed
- **Database**: Dropped legacy embedding tables (`embedding_jobs`, `signal_embeddings`) and functions; migrated fully to RealTimeX SDK vector storage.
- **UI**: Removed `HighConfidenceIndicator` from Signal Cards to reduce visual clutter.
- **Maintenance**: Reduced console log noise in API and Alchemist Engine for cleaner debugging.

## [1.0.30] - 2026-01-24

### Added
- **Active Learning**: Introduced `PersonaService` to automatically analyze user interactions (Boosts, Dismissals) and build a dynamic "User Persona" (Interests & Anti-patterns) for personalized content filtering.
- **Interactions**: Added "Boost" (Strong Interest) and "Dismiss" (Not Interested) actions to Signals, providing explicit feedback loops for the AI.
- **Notes**: Users can now attach private notes to any signal for personal knowledge management.
- **Database**: Added `user_persona` table and new signal columns (`is_boosted`, `is_dismissed`, `user_notes`) to support active learning.

### Improved
- **SDK**: Updated `@realtimex/sdk` to v1.1.3 for enhanced stability.

## [1.0.29] - 2026-01-23

### Added
- **UI**: Enhanced the "Run Summary" card in Live Terminal to include a direct link to error logs when failures occur.
- **UX**: Improved the visibility of error states in the terminal feed with cleaner typography and layout.

## [1.0.28] - 2026-01-23

### Added
- **System Logs**: Added an interactive "Action Center" with overview cards for Blacklist Suggestions, Recent Errors, and Total Signals.
- **System Logs**: Implemented detailed modals for reviewing Blacklist candidates, debugging Errors, and browsing recent Signals.
- **Live Terminal**: Added "Deep Links" that allow users to jump directly from a terminal event (like a low-score warning) to the relevant management view in System Logs.
- **Navigation**: Improved app-wide navigation state to support context-aware jumping between tabs.

## [1.0.27] - 2026-01-23

### Added
- **Browser Sources**: Added granular control over browser sources. Users can now select specific browser profiles to mine from.
- **Analysis**: Introduced `HighConfidenceIndicator` to visually highlight signals with high relevance scores.
- **Tagging**: Implemented a tagging system for signals to improve categorization and filtering.
- **Sync**: Added "Sync Mode" configuration to control how historical data is processed.
- **Deduplication**: Enhanced deduplication logic to prevent redundant signals from cluttering the feed.

## [1.0.26] - 2026-01-23

### Added
- **SDK**: Integrated the official `@realtimex/sdk` for standardized API interactions and type safety.

## [1.0.25] - 2026-01-22

### Added
- **Intelligence**: Implemented semantic embeddings for deeper content understanding and similarity matching.
- **Data Quality**: Added smart deduplication to merge similar signals based on semantic proximity.

## [1.0.24] - 2026-01-22

### Added
- **Configuration**: Added dynamic blacklist domain management to filter out unwanted sources.
- **Debugging**: Enhanced debug logging for better troubleshooting of extraction pipelines.

## [1.0.23] - 2026-01-21

### Improved
- **UX**: The "Sync Settings" button now always displays sync status, showing "All time" if no specific start date or checkpoint is set.
- **UI**: Improved the "Sync From" configuration logic to automatically fallback to the last successful checkpoint as the default start date, providing a more intuitive experience when re-configuring synchronization.

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