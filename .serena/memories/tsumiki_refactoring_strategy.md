# Tsumikiを使った大規模リファクタリング戦略

## Tsumikiとは
クラスメソッド社が開発したAI支援型テスト駆動開発（AITDD）フレームワーク。
Claude Codeのスラッシュコマンドとして動作し、要件定義から実装まで体系的に支援。

## 主要コマンド
1. **Kairoコマンド** - 要件定義から実装までの包括的な開発フロー
2. **TDDコマンド** - テスト駆動開発の個別実行  
3. **Revコマンド** - 既存コードのリバースエンジニアリング（設計書・要件定義書の生成）

## リファクタリング手順

### Phase 1: Tsumikiのインストール
```bash
npx tsumiki install
```
これにより`.claude/commands/`にスラッシュコマンドが追加される

### Phase 2: 現状分析（Revコマンド使用）
1. `/rev-analyze` - 既存コードの分析
2. `/rev-docs` - ドキュメント生成
3. `/rev-architecture` - アーキテクチャ図の生成

### Phase 3: 要件の再定義
現在の機能を2つのルートに絞り込む：
- `/` (MainDashboard)
- `/settings` (SettingsManagement)

### Phase 4: リファクタリング実行
1. 依存関係の分析
2. 不要コードの削除
3. TypeScriptエラーの解消
4. テストの更新

## Claude Codeへの指示例

```
# Step 1: Tsumikiインストール後の現状分析
/rev-analyze src/
現在のコードベースを分析し、MainDashboardとSettingsManagementページの
依存関係を完全に把握してください。

# Step 2: リバースエンジニアリング
/rev-docs src/pages/MainDashboard.tsx
/rev-docs src/pages/SettingsManagement.tsx
これら2つのページの要件定義書を生成してください。

# Step 3: 削減計画の作成
/kairo-requirements
以下の要件でリファクタリングを実施：
- 必要なルートは2つのみ（/ と /settings）
- MainDashboardとSettingsManagementの機能は維持
- それ以外の全ページ・ルート・未使用コンポーネントを削除
- Meta API統合（src/features/meta-api/）は保護
- TypeScriptエラーを0にする

# Step 4: タスク分割
/kairo-tasks
リファクタリングタスクを細分化し、依存関係を明確にしてください。

# Step 5: 実装
/tdd-red 依存関係分析
/tdd-green 不要ファイル削除
/tdd-refactor クリーンアップ
```

## 重要な注意事項

1. **Meta API統合の保護**
   - `src/features/meta-api/`は絶対に壊さない
   - トークン管理・認証機能は維持

2. **段階的実行**
   - 各フェーズごとにコミット
   - 動作確認を頻繁に実施

3. **ドキュメント重視**
   - Tsumikiが生成する要件定義書・設計書を活用
   - 削除前に機能の完全な把握を確認