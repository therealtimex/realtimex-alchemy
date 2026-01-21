# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-01-21

### Added
- **Hybrid Architecture**: Launched hybrid local/cloud architecture combining local Express API with Supabase cloud services.
- **Passive Intelligence Engine**: Implemented `MinerService` for cross-platform browser history mining (Chrome, Edge, Brave, Safari).
- **Content Extraction**: Added `RouterService` with tiered extraction (Axios, Puppeteer, Agent-Browser) and `ContentCleaner` for noise reduction.
- **AI Analysis**: Introduced `AlchemistService` for local/cloud LLM analysis (Ollama, OpenAI, Anthropic) to score and summarize content.
- **Real-time UI**: Released React + Vite frontend with glassmorphism design, utilizing Server-Sent Events for live "Discovery Log" updates.
- **Data Persistence**: Integrated `LibrarianService` for syncing signals to Supabase with automated retention policies.
- **CLI Tool**: Added `realtimex-alchemy` binary for easy startup.


