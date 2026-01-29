# Configuration and Sources

The **Configuration** tab is your command center for controlling what Alchemy explores and how its intelligence is applied.

## 1. Desktop App Configuration

RealTimeX Alchemy must be added as a **Local App** within **RealTimeX Desktop** to function correctly and access AI services.

1.  In RealTimeX Desktop, go to **Local Apps**.
2.  Click **Add Local App**.
3.  Paste the following configuration:

```json
{
  "command": "npx",
  "args": [
    "@realtimex/realtimex-alchemy@latest",
    "--port",
    "3024"
  ]
}
```

This will automatically pull the latest version of Alchemy and start it on port 3024.

## 2. Browser Sources

Alchemy supports cross-platform mining for the following browsers:
-   **Chrome**: Supports multiple profiles.
-   **Microsoft Edge**: Supports multiple profiles.
-   **Safari**: (macOS only) Requires Full Disk Access permissions.
-   **Brave**: Supports multiple profiles.

### Setup Tips:
-   Ensure your browser is NOT open with the history file locked exclusively if you encounter extraction errors.
-   On macOS, if mining Safari, ensure the Alchemy app (or terminal) has **Full Disk Access** in System Settings.

## 3. AI Providers (Managed by Desktop)

Alchemy does **not** manage its own AI provider keys. Instead, it utilizes the **RealTimeX SDK** to access the providers configured in your **RealTimeX Desktop** application.

-   **LLM Providers**: Managed via the Desktop App (supports OpenAI, Anthropic, Ollama, etc.).
-   **Embedder Providers**: Managed via the Desktop App.

To change which model Alchemy uses, update your global settings in the RealTimeX Desktop app.

## 4. Engine Settings

### Sync Window
-   **Sync From**: Determines how far back in your history Alchemy will search.
-   **Sync Frequency**: Control how often the Miner runs in the background.

### Intelligence Settings
-   **Blocked Tags**: Manually define keywords or domains that should always be ignored.
-   **Persona**: Your active learning profile (Boost/Dismiss) that guides the AI's scoring logic.

## 5. Account Settings (Supabase Connection)

-   **Profile**: Manage your name and avatar.
-   **Supabase Connection**: Update your **Supabase URL** and **Anon Public Key** if you move your database.
-   **Database Migrations**: When updating your schema via the Setup Wizard, you will be prompted for your **Supabase Access Token**.
-   **Sound & Haptics**: Toggle audio feedback for new discoveries or AI alerts.

---

> [!TIP]
> If Alchemy is not scoring signals, check your **RealTimeX Desktop** global settings to ensure an AI provider (like Ollama or OpenAI) is active and connected.
