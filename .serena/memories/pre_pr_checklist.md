# プルリクエスト作成前チェックリスト

## 必須チェック項目

プルリクエストを作成する前に、**必ず以下をローカルで実行**してエラーがないことを確認してください：

### 1. 型チェック

```bash
npm run type-check
```

**エラー例**: `Type 'string' is not assignable to type 'Id<"users">'`

### 2. ESLintチェック

```bash
npm run lint
```

**エラー例**: `A 'const' assertions can only be applied to...`

### 3. テスト実行

```bash
npm run test
```

### 4. ビルド確認

```bash
npm run build
```

### 5. 全てまとめて実行（推奨）

```bash
npm run type-check && npm run lint && npm run test && npm run build
```

## Git Hooks

### Huskyの初期化

初回セットアップ時または設定が動作しない場合：

```bash
npm run prepare
```

### 自動実行される項目

`git commit` 時に以下が自動実行されます：

- `eslint --fix` (ESLint + 自動修正)
- `prettier --write` (Prettier)

## 開発中の継続的チェック

### VSCode拡張機能（推奨）

- **TypeScript**: 自動で型エラー表示
- **ESLint**: リアルタイムでlintエラー表示
- **Prettier**: 保存時に自動フォーマット

### watchモード

```bash
npm run test -- --watch     # テストをwatchモードで実行
npm run type-check -- --watch # 型チェックをwatchモードで実行
```

## CI/CD失敗を防ぐ

GitHub Actionsで実行されるのと同じチェックをローカルで実行：

```bash
# 完全なCI/CD相当のチェック
npm ci                       # 依存関係の再インストール
npm run type-check          # 型チェック
npm run lint                # ESLint
npm run test                # テスト実行
npm run build               # ビルド確認
```

## トラブルシューティング

### Git Hooksが動作しない場合

```bash
# Huskyの再初期化
rm -rf .git/hooks
npm run prepare

# 権限確認
ls -la .git/hooks/
```

### キャッシュ問題

```bash
# npm キャッシュクリア
npm ci

# TypeScriptキャッシュクリア
npx tsc --build --clean
```

**重要**: これらのチェックを怠ると、CI/CDでの失敗やレビュー時間の増加につながります。
