# System Logs & Management

The **System Logs** tab is the technical command center for RealTimeX Alchemy, providing transparency and granular control over the mining and analysis process.

## 1. Live Terminal

The **Live Terminal** provides a real-time feed of AI processing events.
-   **Instant Feedback**: Opens automatically when a sync is triggered.
-   **Event Types**: Tracks Analysis (Thinking), Actions (Scoring/Scraping), and Errors.
-   **Sync Control**: Features a pill-shaped **"Stop Sync"** button to gracefully interrupt the process.

![Live Terminal with Stop Sync](images/live-terminal-sync.png)
*Figure 1: Monitoring real-time events and controlling sync from the Live Terminal.*
-   **Deep Linking**: Clickable links within the terminal (e.g., low-score warnings) jump directly to the relevant view in the Action Center.

## 2. Action Center

The **Action Center** aggregates technical health metrics into interactive widgets:
-   **Blacklist Suggestions**: Identifies frequently encountered domains that might be noise and suggests adding them to your blacklist.
-   **Recent Errors**: A dedicated view for debugging sync failures or extraction timeouts.
-   **Total Signals**: High-level stats on your intelligence library.

## 3. Found Signals (History Browser)

Overhauled into a full signal management interface:
-   **Search & Filter**: Find specific past signals using keywords or category filters.
-   **Score Filtering**: Filter by "High Impact" (80%+), "Medium", or "Low" scores to separate critical insights from historical noise.
-   **Mass Interactions**: Review historical data and apply **Boost**, **Dismiss**, **Favorite**, or **Notes** to any signal in your library.
-   **Deduplication**: Visual feedback on signals that were semantically merged to prevent clutter.

---

> [!TIP]
> Use the **Action Center** regularly to prune your sources by accepting Blacklist suggestions, ensuring your Intelligence Engine stays focused on high-density content.
