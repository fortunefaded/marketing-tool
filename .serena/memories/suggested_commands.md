# 開発コマンド

## セットアップ

```bash
npm install
npm test  # 初回セットアップ確認
```

## 日常的な開発コマンド

```bash
# 開発サーバー起動
npm run dev

# テスト実行
npm run test           # 通常のテスト実行
npm run test:ui        # Vitest UI（ブラウザでテスト結果確認）
npm run test:coverage  # カバレッジレポート生成

# コード品質チェック
npm run lint           # ESLint実行
npm run format         # Prettier実行（自動フォーマット）
npm run type-check     # TypeScript型チェック

# ビルド関連
npm run build          # プロダクションビルド
npm run preview        # ビルド結果のプレビュー
```

## Convex関連

```bash
# Convex開発サーバーは別途起動が必要
npx convex dev
```

## Git/CI関連

- `husky` と `lint-staged` が設定されており、コミット時に自動的に lint と format が実行されます
- GitHub Actions による CI/CD パイプラインが設定済み

## Serena MCP関連

```bash
# プロジェクトの再インデックス化
uvx --from git+https://github.com/oraios/serena serena project index

# ログ確認
tail -f ~/.serena/logs/serena.log
```

## システムコマンド（macOS）

```bash
# 基本的なファイル操作
ls -la                 # ファイル一覧
find . -name "*.ts"    # TypeScriptファイル検索
grep -r "pattern"      # パターン検索
cd <directory>         # ディレクトリ移動

# Git操作
git status
git add .
git commit -m "message"
git push
```
