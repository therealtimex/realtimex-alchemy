# Personal Knowledge Chat

RealTimeX Alchemy features a full **RAG-powered** (Retrieval-Augmented Generation) chat interface that lets you "talk" to your browser history.

## How it Works

When you ask a question in the **Chat** tab, Alchemy doesn't just rely on the AI's general training data. Instead, it follows these steps:

1.  ### Semantic Search
    Your question is converted into a vector embedding using your preferred model.
2.  ### Enhanced Signal Retrieval
    Alchemy retrieves **full signal content and entities** instead of just summaries, providing significantly higher quality answers for narrow technical questions.
3.  ### Contextual Answer
    The AI receives the relevant context from your history. Answers now support **GitHub Flavored Markdown (GFM)** for code blocks and tables.

## Key Chat Features

### 1. Source Citations
The AI explicitly cites the signals used. Click any citation to open the source or signal card.

### 2. Text-to-Speech (TTS)
-   **Real-time Streaming**: Chat responses can be streamed as audio for a hands-free experience.
-   **Playback Controls**: Use Play/Stop icons on message bubbles to control narration.
-   **Auto-Play**: Toggle "TTS Auto-Play" in chat settings.
-   **Global Context**: A singleton audio controller prevents overlapping playback.

### 3. Session Management
Chats are saved to Supabase with **auto-generated titles** based on the conversation topic. The input area auto-expands and features a focus-aware design.

## Tips for Better Chat Results

-   **Be Specific**: Instead of asking "What did I read today?", try "What did I read today about Ethereum Layer 2 solutions?".
-   **Ask for Summaries**: "Summarize the major news I found this week regarding competitor X."
-   **Synthesis Questions**: "Compare the three different articles I read about React Server Components and list the pros/cons mentioned."

---

> [!TIP]
> The chat interface supports **GitHub Flavored Markdown (GFM)**, making it easy to read code blocks, tables, and formatted lists in AI responses.
