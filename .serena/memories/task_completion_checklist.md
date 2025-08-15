# タスク完了時の実行項目

## 開発タスク完了後に必須で実行すること

### 1. コード品質チェック

```bash
# TypeScript型チェック
npm run type-check

# ESLint実行（警告0が必須）
npm run lint

# Prettier実行（自動フォーマット）
npm run format
```

### 2. テスト実行

```bash
# 全テスト実行
npm run test

# カバレッジチェック（100%目標）
npm run test:coverage
```

### 3. ビルド確認

```bash
# プロダクションビルドが成功することを確認
npm run build

# ビルド結果のプレビュー（任意）
npm run preview
```

### 4. Git操作（推奨）

```bash
# 変更内容確認
git status
git diff

# ステージング（husky/lint-stagedが自動実行される）
git add .

# コミット
git commit -m "適切なコミットメッセージ"

# プッシュ（CI/CDが自動実行される）
git push
```

## 特記事項

- `git commit` 時に husky が自動的に lint と format を実行
- CI/CD パイプラインでテストとビルドが自動実行される
- カバレッジ100%を目標としているため、新機能にはテストが必須
- TypeScript エラーがあるとビルドが失敗するため、型安全性を保つ

## トラブルシューティング

- lint エラーが出た場合: `npm run lint` で詳細確認後修正
- テスト失敗: `npm run test:ui` で詳細な結果をブラウザで確認
- 型エラー: `npm run type-check` で詳細確認
- Convex接続エラー: `npx convex dev` でローカルサーバー起動確認
