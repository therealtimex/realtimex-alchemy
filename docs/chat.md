# Personal Knowledge Chat

RealTimeX Alchemy features a full **RAG-powered** (Retrieval-Augmented Generation) chat interface that lets you "talk" to your browser history.

## How it Works

When you ask a question in the **Chat** tab, Alchemy doesn't just rely on the AI's general training data. Instead, it follows these steps:

1.  ### Semantic Search
    Your question is converted into a vector embedding.
2.  ### Signal Retrieval
    Alchemy searches your Supabase database for the most relevant signals (Source content, summaries, and entities) matching your question.
3.  ### Contextual Answer
    The AI receives your question *plus* the relevant context from your history to formulate a precise, cited answer.

## Key Chat Features

### 1. Source Citations
The AI will explicitly mention which signals it used to generate its answer. You can click these citations to open the original source or the signal card.

### 2. Session Management
Chats are organized into sessions. Alchemy automatically generates a relevant title for your session (e.g., "Synthesizing AI Trends" or "Researching New Frameworks") based on the conversation topic.

### 3. Persistent Memory
Your chat sessions are saved to Supabase, so you can pick up a conversation where you left off on any device connected to your database.

## Tips for Better Chat Results

-   **Be Specific**: Instead of asking "What did I read today?", try "What did I read today about Ethereum Layer 2 solutions?".
-   **Ask for Summaries**: "Summarize the major news I found this week regarding competitor X."
-   **Synthesis Questions**: "Compare the three different articles I read about React Server Components and list the pros/cons mentioned."

---

> [!TIP]
> The chat interface supports **GitHub Flavored Markdown (GFM)**, making it easy to read code blocks, tables, and formatted lists in AI responses.
