# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RealTimeX Alchemy is a "Passive Intelligence" engine that mines browser history and extracts high-value content using a tiered extraction system and AI analysis. It runs as a hybrid local/cloud application with a React frontend and Express backend.

## Commands

### Development
```bash
npm run dev           # Start frontend dev server (Vite on :5173)
npm run dev:api       # Start backend with hot reload (tsx watch on :3012)
```

### Build
```bash
npm run build         # Full production build (UI + API)
npm run build:ui      # Build React frontend only → dist/
npm run build:api     # Compile API TypeScript only → dist/api/
```

### Production
```bash
npm run start         # Run compiled backend (serves UI from dist/)
```

### Testing Endpoints
```bash
curl http://localhost:3012/health                    # Health check
curl http://localhost:3012/api/test/mine/chrome      # Test browser mining
curl -X POST http://localhost:3012/api/test/analyze \
     -H "Content-Type: application/json" \
     -d '{"text": "...", "provider": "ollama"}'      # Test LLM analysis
```

## Architecture

### Hybrid Local/Cloud Pattern
- **Local Express API** handles file system access, browser history mining, content extraction, and AI processing.
- **Supabase Cloud** manages auth, config sync, and signal metadata storage.
- **Vector Storage**: Uses Supabase `pgvector` with HNSW indexes for high-performance semantic retrieval (supporting variable dimensions from 384 to 3072+).

### Four Core Services (api/services/)

1. **MinerService** - Polls browser history (Chrome, Edge, Brave, Safari) with cross-platform support. Copies SQLite history files to temp location to avoid database locks.

2. **RouterService** - Tiered content extraction:
   - Tier 1: Simple HTTP fetch with Axios
   - Tier 2: Puppeteer headless browser for JS-rendered pages
   - Tier 3: Agent-Browser.dev for paywalls/SPAs (requires API key)

3. **AlchemistService** - LLM-based content analysis with hybrid routing (Ollama/OpenAI/Anthropic). Scores content 0-100 based on "Information Density" and extracts summary, category, and entities.

4. **LibrarianService** - Persists signals to Supabase with retention policies (48h for low-score, 30d for high-score).

### Supporting Services
- **EventService** - Server-Sent Events (SSE) for real-time Discovery Log streaming.
- **SupabaseService** - Singleton client management and database connectivity.
- **TTSService / TTSContext** - Centralized audio controller and streaming (supports real-time `/api/tts/stream`).
- **PersonaService** - Active learning logic (User Persona building from Boost/Dismiss interactions).
- **EmbeddingService** - Dynamic vector generation with dimension auto-detection.

### Utilities (api/utils/)
- **ContentCleaner** - Cleans HTML/email content for optimal LLM processing (removes noise, converts HTML to markdown, strips quoted replies). Reduces token usage by 50-70%.

### Frontend (src/)
- React 18 + Vite + TypeScript
- Tailwind CSS with dark theme (glassmorphism aesthetic)
- Framer Motion for animations
- SSE connection for live Discovery Log

## Key Files

| Path | Purpose |
|------|---------|
| `api/index.ts` | Express server - HTTP endpoints & SSE |
| `api/config/index.ts` | Configuration & cross-platform browser paths |
| `api/routes/migrate.ts` | Database migration endpoint (`/api/migrate`) |
| `scripts/migrate.ts` | Cross-platform (Node/tsx) database migration tool |
| `src/App.tsx` | Main UI with event streaming & signals display |
| `src/context/TTSContext.tsx` | Global audio state and controller |
| `supabase/migrations/*.sql` | Database schema & `pgvector` indexes |

Copy `.env.example` to `.env` and configure:

```bash
PORT=3012                          # API port (default: 3012)
OLLAMA_HOST=http://localhost:11434 # Local LLM endpoint
OPENAI_API_KEY=                    # Optional: OpenAI for cloud LLM
ANTHROPIC_API_KEY=                 # Optional: Anthropic for cloud LLM
SUPABASE_URL=                      # Required for cloud features
SUPABASE_ANON_KEY=                 # Required for cloud features
# Zero-Config Setup requires SUPABASE_ACCESS_TOKEN during provisioning
```

## Platform Notes

- **macOS**: May require Full Disk Access for Terminal to read browser history
  - **Safari**: Requires Full Disk Access due to stricter file permissions
  - Grant access: System Settings → Privacy & Security → Full Disk Access → Add Terminal/IDE
- **Browser paths**: Defined in `api/utils/BrowserPathDetector.ts` for darwin/win32/linux
- Browser history files are copied to temp before querying to avoid SQLite locks
- **Auto-detection supports 10 browsers**:
  - **Chromium-based**: Chrome, Edge, Brave, Arc, Vivaldi, Opera, Opera GX, Chromium
  - **Firefox-based**: Firefox
  - **WebKit-based**: Safari (macOS only, requires Full Disk Access)
- All Chromium-based browsers support multiple profiles

## Database Schema

Primary table is `signals` with fields: `id`, `user_id`, `url`, `title`, `domain`, `signal_score`, `summary`, `category`, `entities`, `extraction_method`, `created_at`. Row-level security enforces user isolation.
