# はじめに: RealTimeX Alchemy のセットアップ

このガイドでは、RealTimeX Alchemy を初めてセットアップする際の手順を説明します。

## 1. インストールとデスクトップ統合

RealTimeX Alchemy は、**RealTimeX Desktop** 環境内の **Local App（ローカルアプリ）** として動作するように設計されています。この統合により、Alchemy は Desktop アプリの強力な AI 機能と Node.js 環境を活用することができます。

### ステップ 1: RealTimeX Desktop のインストール
1.  **ダウンロードとインストール**: [realtimex.ai](https://realtimex.ai) から RealTimeX Desktop アプリを入手します。
2.  **RealTimeX Desktop を開きます**。

### ステップ 2: Marketplace から Alchemy をインストールする
Alchemy をインストールする最も簡単な方法は、統合された Marketplace を利用することです。
1.  RealTimeX Desktop で **Marketplace** タブに移動します。
2.  **"Alchemy"** を検索します。
3.  **Purchase**（または Install）をクリックします。

![Alchemy の購入](../images/purchase-alchemy-app.png)

> [!TIP]
> **手動インストール（上級者向け）**: スクリプト経由でインストールしたい場合は、**Local Apps** タブで **Add Local App** をクリックし、以下の設定を使用してください。
> ```json
> {
>   "command": "npx",
>   "args": ["@realtimex/realtimex-alchemy@latest", "--port", "3024"]
> }
> ```
> （注：「"3024"」は、必要に応じて利用可能な任意のポート番号に変更できます）。

> [!IMPORTANT]
> Alchemy が RealTimeX SDK にアクセスするには、**必ず**ローカルアプリとして実行する必要があります。CLI によるスタンドアロン実行は高度なデバッグ専用であり、手動で設定しない限り AI プロバイダーへのアクセス権はありません。

### 前提条件
-   **RealTimeX Desktop**: LLM および Embedding サービス、ならびに基盤となる Node.js サーバー環境を提供するために実行中である必要があります。
-   **Supabase アカウント**: **「自分のデータベースを所有する」** プライバシーモデルに必要です。

## 2. 初期設定

RealTimeX Desktop 経由で Alchemy を起動すると、自動的に **RealTimeX SDK** に接続されます。

### ステップ 1: データベース接続
**Supabase URL** と **Anon Public Key** を入力します。この安全な接続により、Alchemy は抽出されたシグナル、チャット履歴、および埋め込み（embeddings）を保存および取得できるようになります。

### ステップ 2: マイグレーションの実行
セットアップ・ウィザードは、データベースの初期化が必要かどうかを自動的に検出します。必要なテーブルとリアルタイム関数をセットアップするには、**Supabase Access Token**（Supabase ダッシュボードから生成）を入力する必要があります。

### AI プロバイダー (自動設定)
スタンドアロンアプリとは異なり、Alchemy 内で **API キー（OpenAI や Anthropic など）を設定する必要はありません**。Alchemy は、SDK を介して **RealTimeX Desktop** の設定からこれらのプロバイダーを直接継承します。

## 3. ブラウザソースの接続

Alchemy はブラウザの履歴を探索して「シグナル」を見つけます。
1.  **Configuration** タブに移動します。
2.  探索したいブラウザ（Chrome, Edge, Safari, Brave）を有効にします。
3.  **「Sync From」** の日付を設定します。Alchemy はその時点以降の履歴を処理します。

## 4. 初回の同期

サイドバーの **「Sync History」** ボタンをクリックします。**Live Terminal** を見ると、統合された AI プロバイダーによって URL が発見され、リアルタイムでスコアリングされている様子を確認できます。

---

> [!TIP]
> AI 処理は RealTimeX Desktop によって行われるため、同期を開始する前に、**Desktop アプリのグローバル設定**でプロバイダー（Ollama や OpenAI など）が設定されていることを確認してください。
