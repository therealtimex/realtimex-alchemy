# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.54] - 2026-01-27

### Added
- **RAG Enhancement**: Major upgrade to chat retrieval. The AI now retrieves full signal content and entities instead of just summaries, providing much higher quality answers.

### Improved
- **Performance**: Optimized semantic search threshold for better recall while maintaining precision.
- **Logging**: Cleaned up internal debug logs for production.

## [1.0.53] - 2026-01-27

### Added
- **Vector Database**: Upgraded schema to support variable embedding dimensions (384, 768, 1024, 1536, 3072+), removing the vendor lock-in to OpenAI's 1536 dimensions.
- **Performance**: Added optimized partial HNSW indexes for common model dimensions (all-minilm, nomic-embed, mxbai) to maintain sub-millisecond search speeds.

### Improved
- **Flexibility**: Updated `EmbeddingService` to dynamically detect vector dimensions at runtime, allowing seamless switching between OpenAI and local Ollama models without schema changes.

## [1.0.52] - 2026-01-27

### Changed
- **Configuration**: Refactored LLM provider configuration to drop legacy fields and utilize new SDK defaults, simplifying setup.

### Fixed
- **Embeddings**: Updated `AlchemistService` to allow embedding generation without an explicit `embedding_model` setting, enabling dynamic model resolution via the SDK.

## [1.0.51] - 2026-01-27

### Added
- **Vector Storage**: Migrated embedding storage from local SDK to Supabase `pgvector`. This enables cloud-native similarity search and persistent memory across devices.
- **Database**: Added `alchemy_vectors` table and HNSW indexes for high-performance semantic retrieval.

### Improved
- **Performance**: Implemented server-side similarity search via `match_vectors` RPC function, reducing latency for RAG and deduplication.

## [1.0.50] - 2026-01-26

### Improved
- **Setup Wizard**: Added a smart check to automatically skip the migration step if the database is already initialized (`init_state` detected), streamlining the experience for existing projects.

## [1.0.49] - 2026-01-26

### Added
- **Distribution**: Included `scripts/` and `supabase/` directories in the package files to support migration tools in distributed installs.

### Improved
- **UI**: Added the year to the sync status display in the sidebar for better temporal context.

## [1.0.48] - 2026-01-26

### Fixed
- **Content Intelligence**: Improved cleaning logic to specifically strip `:root` CSS variable definitions that were leaking into processed content.

## [1.0.47] - 2026-01-26

### Added
- **Content Intelligence**: Major overhaul of the extraction pipeline to aggressively strip machine code, SPA hydration data (Next.js/Nuxt), and framework artifacts.
- **Security**: Implemented `sanitizeLLMTokens` to neutralize potential prompt injection attacks embedded in mined web content.
- **Noise Reduction**: Added logic to filter out code blocks, inline styles, and interactive elements, ensuring high-quality context for the Alchemist engine.

## [1.0.46] - 2026-01-26

### Fixed
- **Browser Mining**: Fixed Safari history extraction query and timestamp conversion (CFAbsoluteTime).
- **Browser Mining**: Updated Chrome/Edge timestamp logic to use BigInt for high-precision microsecond conversion, resolving potential checkpoint drift.
- **Sync Logic**: Switched history extraction order to Ascending (oldest first) to ensure checkpoints correctly advance from the start date.

## [1.0.45] - 2026-01-26

### Security
- **Migration Tool**: Enforced Access Token authentication for the `POST /api/migrate` endpoint and `migrate.sh` script. Database passwords are no longer accepted as a security hardening measure.

## [1.0.44] - 2026-01-26

### Added
- **Setup Wizard**: Added a UI-based migration tool to streamline the initial setup. Users can now run database migrations directly from the setup interface.
- **Migration**: Added `POST /api/migrate` endpoint to trigger database migrations from the frontend, streaming real-time logs via SSE.

### Improved
- **Scripts**: Enhanced `migrate.sh` to support non-interactive authentication (via Access Tokens or DB Passwords) and automatic `TOKEN_ENCRYPTION_KEY` generation for Edge Functions.

## [1.0.43] - 2026-01-26

### Added
- **Settings**: Added personalized "Blocked Tags" management in the Intelligence Engine settings, allowing users to override default filters.

### Improved
- **Transmute Engine**: Optimized automatic engine creation to only generate newsletter pipelines for active categories (excluding "Other"), significantly reducing noise.

## [1.0.42] - 2026-01-26

### Added
- **Transmute Engine**: Implemented the Transmute Engine with a new service, UI components, and database schema, enabling users to transform mined content into actionable formats.
- **Discovery**: Filtered signals are now displayed directly in the DiscoveryTab upon category selection for faster access.
- **Discovery**: Added aggregated signal category counts to the CategoryGrid for better high-level visibility.
- **Content Intelligence**: Ported `ContentCleaner` to the main codebase and added support for handling gated web content, improving LLM processing reliability.

### Improved
- **Architecture**: Moved shared types to `src/lib/types.ts` for better code organization.
- **SDK**: Updated `sdk.system.get_app_data_dir` calls to the standardized `sdk.getAppDataDir`.

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