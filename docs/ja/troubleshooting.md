# トラブルシューティングとサポート

RealTimeX Alchemy で問題が発生した場合は、このガイドを使用して問題の診断と解決に役立ててください。

## 1. データベース接続エラー

-   **「Failed to connect to Supabase」**: インターネット接続を確認し、セットアップ・ウィザードまたは `.env` ファイル内の `SUPABASE_URL` と `SUPABASE_KEY` (Service Role または Anon) を確認してください。
-   **「Table 'xyz' does not exist」**: マイグレーションを忘れている可能性があります。セットアップ・ウィザードに移動して、再度 **「Run Migrations」** をクリックしてください。

## 2. ブラウザ探索の問題

-   **「Extraction failed: History file is locked」**: これは、ブラウザ（Chrome/Edge/Brave）が開いており、履歴データベースを独占的にロックしている場合に発生します。ブラウザを閉じてから再度同期を実行してください。
-   **「Permission Denied」 (Safari)**: macOS では、Safari の履歴は保護されています。システム構成の *[プライバシーとセキュリティ] ＞ [フルディスクアクセス]* で、Alchemy アプリ（またはそれを実行しているターミナル/IDE）に **「フルディスクアクセス」** を許可する必要があります。
-   **「No history found」**: 閲覧履歴がある期間に **「Sync From」** の日付が設定されていることを確認してください。

## 3. インテリジェンス / AI エラー (SDK 統合)

Alchemy は **RealTimeX SDK** を使用しているため、ほとんどの AI エラーは **RealTimeX Desktop** のグローバル設定に関連しています。

-   **「AI Provider not found」**: AI プロバイダー（OpenAI や Ollama など）が **RealTimeX Desktop** アプリのグローバル設定で設定され、アクティブであることを確認してください。
-   **「SDK connection failed」**: Alchemy が RealTimeX Desktop 内で **Local App（ローカルアプリ）** として実行されていることを確認してください。スタンドアロンのインスタンスは SDK サービスにアクセスできません。
-   **「Ollama unreachable」**: Ollama を使用している場合は、実行されていること (`ollama serve`)、および RealTimeX Desktop で選択したモデルがダウンロードされていることを確認してください。
-   **「精度が低い / 回答が不自然」**: Alchemy は RAG を使用しています。AI に何が重要であるかの文脈を与えるために、いくつかのシグナルを「ブースト」しているか確認してください。また、**システム・ログ**を確認して、Alchemist サービスがスコアリング中にエラーに遭遇していないか確認してください。

## 4. システム・ログの読み方

より詳細な技術的トラブルシューティングについては、**System Logs** タブを参照してください。
-   **Live Terminal**: 発生中の生のプロセス・ログを監視します。
-   **Recent Errors**: 同期または分析中に発生したエラーの集約リストを表示します。
-   **Action Center**: ブラックリストの提案や、エンジンがノイズで「窒息」していないかを確認するための総シグナル数を確認します。

## 5. ヘルプの入手

ここで解決しない場合：
-   [Changelog](../CHANGELOG.md) を確認して、最新バージョンを使用しているか確認してください。
-   ディスカッションや問題の追跡については、[GitHub リポジトリ](https://github.com/therealtimex/realtimex-alchemy)にアクセスしてください。

---

> [!CAUTION]
> Supabase の Service Role Key や API キーを、公開フォーラムや問題レポートで共有しないでください。
