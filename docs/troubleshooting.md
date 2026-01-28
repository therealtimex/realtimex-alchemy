# Troubleshooting & Support

If you encounter issues with RealTimeX Alchemy, this guide will help you diagnose and resolve common problems.

## 1. Database Connection Errors

-   **"Failed to connect to Supabase"**: Check your internet connection and verify your `SUPABASE_URL` and `SUPABASE_KEY` (Service Role or Anon) in the Setup Wizard or `.env` file.
-   **"Table 'xyz' does not exist"**: You might have missed a migration. Go to the Setup Wizard and click **"Run Migrations"** again.

## 2. Browser Mining Issues

-   **"Extraction failed: History file is locked"**: This happens if your browser (Chrome/Edge/Brave) is currently open and has a strict lock on its history database. Try closing the browser and running the sync again.
-   **"Permission Denied" (Safari)**: On macOS, Safari history is protected. You must grant **Full Disk Access** to the Alchemy app (or the Terminal/IDE you are running it from) in *System Settings > Privacy & Security > Full Disk Access*.
-   **"No history found"**: Ensure you have set the **"Sync From"** date to a period where you have browsing history.

## 3. Intelligence / AI Errors (SDK Integration)

Since Alchemy uses the **RealTimeX SDK**, most AI errors are related to your **RealTimeX Desktop** global settings.

-   **"AI Provider not found"**: Ensure that an AI provider (like OpenAI or Ollama) is configured and active in the **RealTimeX Desktop** app's global settings.
-   **"SDK connection failed"**: Verify that Alchemy is running as a **Local App** within RealTimeX Desktop. Standalone instances cannot access the SDK services.
-   **"Ollama unreachable"**: If using Ollama, ensure it is running (`ollama serve`) and the model you selected in RealTimeX Desktop is downloaded.
-   **"Low accuracy / weird answers"**: Alchemy uses RAG. Ensure you have "Boosted" some signals to give the AI context. Also, check the **System Logs** to see if the Alchemist service is experiencing errors during scoring.

## 4. Reading System Logs

For deeper technical troubleshooting, visit the **System Logs** tab:
-   **Live Terminal**: Watch the raw process logs as they happen.
-   **Recent Errors**: View an aggregated list of failures during sync or analysis.
-   **Action Center**: Check for blacklist suggestions or total signal counts to see if the engine is "choking" on too much noise.

## 5. Getting Support

If your issue is not covered here:
-   Check the [Changelog](../CHANGELOG.md) to see if you are on the latest version.
-   Visit the [GitHub Repository](https://github.com/therealtimex/realtimex-alchemy) for discussions and issue tracking.

---

> [!CAUTION]
> Never share your Supabase Service Role Key or API Keys in public forums or issue reports.
