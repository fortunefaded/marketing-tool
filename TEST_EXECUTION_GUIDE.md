# 🧪 Meta API 動作テスト実行ガイド

## 現在の実装状況

### ✅ 完了したタスク
1. **TASK-101**: Convexスキーマ定義
2. **TASK-102**: 3層キャッシュフック実装
3. **TASK-103**: リアルタイム同期実装
4. **TASK-201**: データ鮮度管理システム
5. **TASK-202**: 差分更新エンジン
6. **TASK-203**: Meta API統合最適化
7. **TASK-301**: Convex Scheduled Functions実装

### 🔄 テスト段階

## 実行すべきテストの順序

### 1️⃣ **ローカル単体テスト**（すぐ実行可能）

```bash
# 全単体テストを実行
npm test -- --run

# 特定のテストのみ
npm test meta-api-optimizer.test.ts -- --run
```

### 2️⃣ **開発環境での手動テスト**（すぐ実行可能）

```bash
# 開発サーバー起動
npm run dev

# ブラウザで確認
open http://localhost:5173/ad-fatigue
```

#### チェック項目：
- [ ] ページが正しく表示される
- [ ] データ取得時にエラーが出ない
- [ ] リロードしてもデータが保持される
- [ ] 更新ボタンが機能する

### 3️⃣ **Meta API接続テスト**（認証情報が必要）

#### 準備：Meta Access Tokenの取得

1. [Meta for Developers](https://developers.facebook.com/)にアクセス
2. アプリを選択（または作成）
3. Tools > Graph API Explorer
4. アクセストークンを生成
5. 必要な権限を付与:
   - `ads_read`
   - `ads_management`
   - `business_management`

#### テスト実行：

```bash
# .env.localファイルを作成
cat > .env.local << EOF
VITE_META_ACCESS_TOKEN=your_actual_token_here
VITE_META_ACCOUNT_ID=act_your_account_id
EOF

# ライブモードでテスト実行
VITE_TEST_MODE=live npm test meta-api-integration.test.ts -- --run
```

### 4️⃣ **本番環境シミュレーション**

```bash
# ビルド
npm run build

# プレビュー
npm run preview

# 本番環境と同じ条件で確認
open http://localhost:4173/ad-fatigue
```

## 🚨 問題が発生した場合

### よくあるエラーと対処法

#### 1. "Invalid OAuth 2.0 Access Token"
```bash
# 新しいトークンを取得して再設定
# Graph API Explorerで新しいトークンを生成
```

#### 2. "Rate limit exceeded"
```bash
# 1時間待機するか、別のアカウントを使用
# または、テストのバッチサイズを減らす
```

#### 3. "Data inconsistency on reload"
```bash
# Convexのデータをクリア
npx convex run --no-push clearCache

# キャッシュを再構築
npm run dev
```

## 📊 パフォーマンス測定

### 測定すべき指標

```typescript
// コンソールで実行
const startTime = performance.now()
// ページをリロード
location.reload()
// データ読み込み完了後
const endTime = performance.now()
console.log(`Load time: ${endTime - startTime}ms`)
```

### 目標値
- 初回ロード: < 2000ms
- キャッシュヒット時: < 500ms
- API呼び出し削減率: > 90%

## 🎯 段階的テスト推奨順序

1. **今すぐ実行**:
   - 単体テスト ✅
   - モック統合テスト ✅
   - 開発環境での手動確認

2. **認証情報取得後**:
   - Phase 1: 接続テスト
   - Phase 2: データ整合性テスト
   - Phase 3: エラーハンドリング

3. **本番デプロイ前**:
   - 負荷テスト
   - E2Eテスト
   - セキュリティ監査

## 📝 テスト結果記録

```markdown
### テスト実行記録

日付: 2025-09-01
実行者: [名前]
環境: [開発/ステージング/本番]

#### 単体テスト
- [ ] MetaApiOptimizer: 17/17 ✅
- [ ] DataFreshnessManager: ?/?
- [ ] DifferentialUpdateEngine: ?/?

#### 統合テスト
- [ ] Phase 1 接続: ⏭️
- [ ] Phase 2 データ: ⏭️
- [ ] Phase 3 エラー: ⏭️

#### パフォーマンス
- 初回ロード: ???ms
- キャッシュヒット: ???ms
- API削減率: ???%

#### 問題点
- なし / [詳細を記載]

#### 次のアクション
- [必要な改善点]
```

## 🚀 次のステップ

1. **まず単体テストとモックテストを実行**（今すぐ可能）
2. **開発環境で手動確認**（今すぐ可能）
3. **Meta APIの認証情報を取得**
4. **実際のAPIでテスト実行**
5. **問題があれば修正**
6. **本番環境へデプロイ**