# Intelligence & Active Learning

RealTimeX Alchemy isn't just a search engine; it's a dynamic training system for your personal AI.

## The Alchemist Scoring System

Every time the Miner finds a URL, the **Alchemist Service** analyzes the content and assigns a score (0-100). This score determines how prominently the signal appears in your Discovery tab.

### Scoring Criteria Examples:
-   **High Impact (80-100)**: Critical market news, major technology releases, significant product changes.
-   **Medium Impact (50-79)**: Thought-provoking blog posts, high-quality technical tutorials, detailed industry analysis.
-   **Low Impact (< 50)**: General news, social media noise, landing pages without deep content.

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

## The User Persona

Alchemy builds a mathematical model of your interests. You can think of this as your "Intelligence Digital Twin".
-   **Interests**: Topics you frequently Boost or engage with.
-   **Anti-patterns**: Topics or domains you consistently Dismiss.

The **Transmute Engine** uses this persona to filter your digests, ensuring you only spend time on high-density insights that matter to you.

---

> [!NOTE]
> Even "Low Score" signals are persisted in your history (visible in System Logs). This allows you to "Rescue" them if you feel the Alchemist miscalculated their value.
