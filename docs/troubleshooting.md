# Troubleshooting & Support

If you encounter issues with RealTimeX Alchemy, this guide will help you diagnose and resolve common problems.

## 1. Database Connection Errors

-   **"Failed to connect to Supabase"**: Check your internet connection and verify your **Supabase URL** and **Anon Public Key** in the Setup Wizard or `.env` file. Do NOT use the Service Role Key for standard connections.
-   **"Table 'xyz' does not exist"**: You might have missed a migration. Go to the Setup Wizard and click **"Run Migrations"** again. You will need your **Supabase Access Token** for this step.

## 2. Browser Mining Issues

-   **"Extraction failed: History file is locked"**: Try closing your browser and running the sync again.
-   **"Permission Denied" (Safari)**: On macOS, verify **Full Disk Access** for Alchemy in *System Settings > Privacy & Security > Full Disk Access*. If errors persist, Alchemy will now flag specific profiles with an instruction message instead of failing silently.
-   **"No history found"**: Ensure your **"Sync From"** date is set correctly. Alchemy now defaults to the last successful checkpoint if no date is manually set.

## 3. Intelligence / AI Errors (SDK Integration)

Since Alchemy uses the **RealTimeX SDK**, most AI errors are related to your **RealTimeX Desktop** global settings.

-   **"AI Provider not found"**: Ensure that an AI provider (like OpenAI or Ollama) is configured and active in the **RealTimeX Desktop** app's global settings.
-   **"SDK connection failed"**: Verify that Alchemy is running as a **Local App** within RealTimeX Desktop. Standalone instances cannot access the SDK services.
-   **"Ollama unreachable"**: If using Ollama, ensure it is running (`ollama serve`) and the model you selected in RealTimeX Desktop is downloaded.
-   **"Low accuracy / weird answers"**: Alchemy uses RAG. Ensure you have "Boosted" some signals to give the AI context. Also, check the **System Logs** to see if the Intelligence service is experiencing errors during scoring.

## 4. Reading System Logs

For deeper technical troubleshooting, visit the **System Logs** tab:
-   **Live Terminal**: Watch raw logs in real-time. It now opens immediately when a sync starts and includes **Deep Links** to management views.
-   **Action Center**: Check overview cards for **Blacklist Suggestions**, Recent Errors, and Total Signals.
-   **Found Signals**: A full management interface where you can search, filter (by score), and interact with historical signals (Boost, Dismiss, Add Notes).

## 5. Getting Support

If your issue is not covered here:
-   Check the [Changelog](../CHANGELog.md) to see if you are on the latest version.
-   Visit the [GitHub Repository](https://github.com/therealtimex/realtimex-alchemy) for discussions and issue tracking.

---

> [!CAUTION]
> Never share your Supabase Access Token or API Keys in public forums or issue reports.
