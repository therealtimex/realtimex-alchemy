# Intelligence & Active Learning

RealTimeX Alchemy isn't just a search engine; it's a dynamic training system for your personal AI.

## The Alchemist Scoring System

Every time the Miner finds a URL, the **Alchemist Service** analyzes the content and assigns a score (0-100). This score determines how prominently the signal appears in your Discovery tab.

### Alchemist's Distillation
During analysis, the AI actively cleanses content:
-   **Noise Removal**: Strips navigation, ads, SPA hydration data (Next.js/Nuxt), and machine code.
-   **Verbatim Core**: Preserves the core text while neutralizing potential prompt injection attacks.
-   **High Ceiling**: Supports content up to **200,000 characters** for deep-dive analysis.

### Scoring Criteria:
-   **High Impact (80-100)**: Critical market news, significant industry shifts (Mergers, IPOs), major technology releases.
-   **Medium Impact (50-79)**: Thought-provoking blog posts, high-quality tutorials, detailed industry analysis.
-   **Low Impact (< 50)**: General news, social media noise, landing pages. All low-score items are persisted and can be "rescued" from System Logs.

## Active Learning: Training Your AI

Alchemy learns from your behavior through the **Persona Service**.

### 1. Boost (Strong Interest)
When you **"Boost"** a signal, the following happens:
-   The AI records your interest in the signal's categories and tags.
-   A **Vector Embedding** is generated/prioritized for that signal, improving its retrieval in Chat.
-   Similar content will be scored higher in future syncs.

### 2. Dismiss (Not Interested)
When you **"Dismiss"** a signal:
-   The signal is hidden from your main feed.
-   The AI learns that this type of content is "noise" for you.
-   Scores for similar URLs or topics will be penalized in future syncs.

## Variable Embedding Dimensions
Alchemy now supports a wide range of vector dimensions (384, 768, 1024, 1536, 3072+).
-   **Vendor Independence**: You are no longer locked into OpenAI-specific dimensions.
-   **High Performance**: Uses optimized **HNSW indexes** in Supabase `pgvector` for sub-millisecond search speeds across different model types (nomic, mxbai, etc.).

The **Transmute Engine** uses this persona and vector retrieval to filter your digests, ensuring you only spend time on high-density insights.

---

> [!NOTE]
> Even "Low Score" signals are persisted in your history (visible in System Logs). This allows you to "Rescue" them if you feel the Alchemist miscalculated their value.
