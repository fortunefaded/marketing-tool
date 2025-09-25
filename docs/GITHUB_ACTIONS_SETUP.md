# GitHub Actions 自動化設定ガイド

このドキュメントでは、Google Sheetsデータの毎日自動インポートを設定する方法を説明します。

## 概要

GitHub Actionsにより、毎日日本時間午前9時（UTC 0時）に自動的にGoogle Sheetsから昨日分のデータを取得・保存します。

## 必要なGitHubシークレット設定

GitHubリポジトリの設定で以下のシークレットを設定してください：

### 設定手順

1. GitHubリポジトリのページで **Settings** → **Secrets and variables** → **Actions** を開く
2. **New repository secret** をクリック
3. 以下のシークレットを追加：

#### CONVEX_URL
- **Name**: `CONVEX_URL`
- **Secret**: Convexプロジェクトの本番URL
- **例**: `https://your-project-name.convex.cloud`

#### CONVEX_DEPLOY_KEY
- **Name**: `CONVEX_DEPLOY_KEY`
- **Secret**: Convexデプロイキー
- **取得方法**:
  1. Convexダッシュボードで該当プロジェクトを開く
  2. **Settings** → **Deploy Keys** から作成
  3. 生成されたキーをコピー

## ワークフローファイル

`.github/workflows/daily-google-sheets-import.yml` ファイルが自動実行の設定です。

## 実行されるConvex関数

`api.googleSheets.dailyImportGoogleSheetsData`関数が実行されます。この関数は：

1. 設定済みのスプレッドシートURLを取得
2. スプレッドシートIDを抽出
3. 昨日の日付に対応する年月シートからデータを取得
4. 取得したデータをConvexデータベースに保存

## 手動実行

GitHub Actionsワークフローは手動でも実行できます：

1. GitHubリポジトリの **Actions** タブを開く
2. **毎日のGoogle Sheetsデータインポート** ワークフローを選択
3. **Run workflow** をクリック
4. **Run workflow** ボタンを押して実行

## ログ確認

実行結果は以下で確認できます：

1. GitHubリポジトリの **Actions** タブ
2. 該当ワークフローの実行履歴
3. 各ステップの詳細ログ

## トラブルシューティング

### よくあるエラー

1. **CONVEX_URL/CONVEX_DEPLOY_KEYが設定されていない**
   - GitHubシークレットの設定を確認

2. **スプレッドシートURLが設定されていない**
   - アプリの設定画面でスプレッドシートURLを設定

3. **Google認証が期限切れ**
   - アプリでGoogle認証を再実行

4. **対象日付のデータが見つからない**
   - スプレッドシートの年月シート名を確認（例：`2025-09`）
   - データ行に実際の数値が入力されているか確認

### ローカルテスト

本番環境にデプロイする前に、ローカルでテスト機能を使用して動作確認をしてください：

1. `http://localhost:3000/settings/google-sheets/import` を開く
2. **GitHub Actions統合テスト** ボタンをクリック
3. テスト結果で動作を確認

## セキュリティ注意事項

- ConvexデプロイキーはGitHubシークレットとして安全に保存してください
- リポジトリが公開されている場合、シークレット情報が漏洩しないよう注意してください
- 定期的にアクセスログを確認してください