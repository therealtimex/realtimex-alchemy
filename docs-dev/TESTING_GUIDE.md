# Local Testing Guide: RealTimeX Alchemy 🧪

Follow these steps to get your Alchemy engine running and verify the "Passive Intelligence" pipeline.

## 1. Prerequisites
- **Node.js**: v18+ recommended.
- **Ollama** (Optional but recommended): For local AI processing. [Download here](https://ollama.com).
    - Run `ollama run llama3` to ensure the model is available.

## 2. Backend Setup
Navigate to the backend directory and prepare the environment.

```bash
cd backend
npm install
cp .env.example .env
```

**Edit `.env`**: At minimum, ensure `OLLAMA_HOST` is set to `http://localhost:11434`. If using cloud providers, add your `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`.

**Run the Backend**:
```bash
npm run dev
```
- The API will start on `http://localhost:3000`.
- Verify with `curl http://localhost:3000/health`.

## 3. Frontend Setup
Open a new terminal window.

```bash
cd frontend
npm install
npm run dev
```
- The UI will start on `http://localhost:5173`.

## 4. Guided Testing Flow

### Step A: Verify Real-time Connection
1. Open `http://localhost:5173` in your browser.
2. Look at the bottom **Discovery Log**. It should show a green "Event-Stream Active" indicator.
3. You should see an initial log entry like `[SYSTEM] History sync standby`.

### Step B: Trigger Mining
1. Click the **"Sync History"** button in the top right.
2. Watch the **Discovery Log**:
   - You should see `[MINER] Scanning Chrome History...`.
   - Then `[ROUTER] Tier 1/2 Attempt` as it extracts content from your recent URLs.
   - Then `[ALCHEMIST] Analyzing Signal...`.

### Step C: Check Discovered Signals
1. Once analysis is complete, if a URL has an "Information Density" score > 70, it will appear in the **Signal Stream**.
2. High-score signals (e.g., 90+) will glow gold.
3. Check the `data/` directory in the backend to see the saved `.md` files.

### Step D: Manual Ingestion (Optional)
If you want to test a specific URL without waiting for history polling, use the test endpoint:
```bash
# In a terminal
curl -X POST http://localhost:3000/test/ingest \
     -H "Content-Type: application/json" \
     -d '{"url": "https://simonwillison.net/2024/Jan/23/agentic-workflows/", "title": "Agentic Workflows"}'
```
Wait for the response and see it appear in the UI!

## Troubleshooting
- **No History Found**: Ensure your browser (Chrome/Edge/Safari) is closed or has been used recently. On macOS, the backend might need "Full Disk Access" for the Terminal app.
- **AI Analysis Failed**: Check if Ollama is running (`ollama serve`).
- **SSE Connection Drops**: Refresh the browser to reconnect the event stream.
