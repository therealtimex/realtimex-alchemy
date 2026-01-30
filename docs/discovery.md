# Discovery: Exploring Your Intelligence Feed

The **Discovery** tab is where you browse the insights "transmuted" from your reading history.

## The Discovery Tab Layout

### 1. New Signals Feed
At the top, you'll find a horizontal feed of the most recently discovered signals.
-   **Collapsible**: This feed is collapsible to save space and its state is persisted to your local settings.
-   **Hover Effects**: Cards in the feed now feature smooth hover scale and shadow animations.

![New Signals Feed](images/new-signals-feed.png)
*Figure 1: The collapsible horizontal feed of recently discovered signals.*

### 2. Category Grid
Signals are automatically categorized. You'll see cards for common categories like:
-   **Internal Product Strategy**: Technical decisions, roadmaps.
-   **Competitor Intel**: News about rivals.
-   **Macro Trends**: Industry-wide shifts.
-   **Technology Breakthroughs**: New tools or scientific papers.

### 3. Filters and Search
-   **Search Bar**: Search through signal titles, summaries, and tags with real-time feedback.
-   **Category Filter**: Click a category in the grid to see only signals in that group.
-   **Score Filter**: In the **System Logs > Found Signals** view, you can filter historical data by "High Impact" (80%+), "Medium", or "Low" scores.

## Managing Signals

Each signal card provides a snapshot of the content. Clicking a card opens the **Signal Drawer**:

-   **Executive Summary**: A concise, AI-generated breakdown of the source.
-   **Entities**: People, companies, and technologies mentioned, extracted during analysis.
-   **Boost (Strong Interest)**: Highlighting a signal triggers the generation of a vector embedding for better RAG retrieval and trains the AI to prioritize similar content.
-   **Dismiss (Not Interested)**: Hides the signal and trains the AI to penalize similar "noise" in the future.
-   **Favorite & Notes**: Keep signals for permanent reference and attach private notes for knowledge management.
-   **External Link**: Jump to the original source URL.

## Automatic Category Generation

Alchemy is smart. If you encounter a specific topic frequently (e.g., "Quantum Computing" or "React Server Components"), it will automatically promote that tag into a top-level category in your Discovery grid.

---

> [!NOTE]
> High-confidence signals (Score > 80) are prioritized in your feed to ensure you see the most important news first.
