# Pre-commit フックガイド

## 概要
このプロジェクトでは、コミット時の効率性を重視した軽量なpre-commitフックを使用しています。

## 主な特徴

1. **スマートなファイルフィルタリング**
   - アーカイブファイル（`_archived`）は自動的に除外
   - テストファイル（`__tests__`, `*.test.*`, `*.spec.*`）は除外
   - 生成ファイル（`convex/_generated`）は除外
   - バックアップディレクトリ（`src_backup_*`）は除外

2. **段階的チェック戦略**
   - クリティカルファイルのみ厳密にチェック
     - `features/meta-api/core/`
     - `services/core/`
     - `hooks/core/`
   - その他のファイルは警告のみ

3. **自動フォーマット**
   - Prettierが自動的にファイルをフォーマット
   - フォーマット後のファイルは自動的にステージングに追加

## 環境変数による制御

### フック全体をスキップ
```bash
# pre-commitフックを完全にスキップ
SKIP_PRECOMMIT=1 git commit -m "message"

# または
SKIP_HOOKS=1 git commit -m "message"
```

### 追加チェックの有効化
```bash
# ESLintチェックを有効化（デフォルトは無効）
CHECK_ESLINT=1 git commit -m "message"

# ビルドチェックを強制実行（デフォルトは無効）
FORCE_BUILD_CHECK=1 git commit -m "message"
```

## トラブルシューティング

### TypeScriptエラーが多すぎる場合
```bash
# 一時的にスキップ
SKIP_PRECOMMIT=1 git commit -m "temporary: skip type checks"

# または git hookを無視
git commit --no-verify -m "message"
```

### クリティカルファイルでエラーが出る場合
クリティカルファイル（core/ディレクトリ内）でエラーが出る場合は、必ず修正してからコミットしてください。
これらのファイルはシステムの中核部分であり、型安全性が重要です。

### ビルドが遅い場合
デフォルトではビルドチェックは無効になっています。必要な場合のみ有効化してください：
```bash
FORCE_BUILD_CHECK=1 git commit -m "build check enabled"
```

## パフォーマンス最適化

### インクリメンタルビルド
TypeScriptのインクリメンタルビルド機能を使用して、チェック時間を短縮しています。
`.tsbuildinfo.precommit`ファイルがキャッシュとして使用されます。

### 並列処理
可能な限り処理を並列化して、全体的な実行時間を短縮しています。

## 設定のカスタマイズ

### tsconfig.precommit.json
pre-commit専用のTypeScript設定ファイルで、以下の特徴があります：
- strictモードを無効化
- 未使用変数の警告を無効化
- アーカイブ/テストファイルを除外

### .husky/pre-commit
フックの動作を変更したい場合は、このファイルを編集してください。