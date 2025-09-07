# Meta API 統合テストガイド

## 🎯 テスト戦略

### 段階的テスト実行計画

#### **Stage 1: ローカル単体テスト** ✅
```bash
# すでに実施済み
npm test meta-api-optimizer.test.ts
```

#### **Stage 2: モック統合テスト** 🟢
```bash
# デフォルトで実行（API呼び出しなし）
npm test meta-api-integration.test.ts
```

#### **Stage 3: ライブ統合テスト** 🔴
```bash
# 実際のMeta APIを使用（要認証情報）
VITE_TEST_MODE=live \
VITE_META_ACCESS_TOKEN=your_token_here \
VITE_META_ACCOUNT_ID=act_123456789 \
npm test meta-api-integration.test.ts
```

## 📊 テストチェックリスト

### 必須確認項目

- [ ] **接続性**: Meta APIへの接続が確立できるか
- [ ] **認証**: アクセストークンが有効か
- [ ] **レート制限**: 200req/h, 4800req/dayの制限内で動作するか
- [ ] **データ取得**: 広告インサイトデータが正しく取得できるか
- [ ] **エラー処理**: エラー時に適切にリカバリするか
- [ ] **キャッシュ**: 3層キャッシュが正しく機能するか
- [ ] **差分更新**: DifferentialUpdateEngineが効率的に動作するか

### パフォーマンス指標

| 指標 | 目標値 | 現在値 |
|------|--------|--------|
| API呼び出し削減率 | 90%以上 | - |
| 平均レスポンス時間 | 500ms以下 | - |
| キャッシュヒット率 | 80%以上 | - |
| エラー率 | 1%以下 | - |

## 🚀 実行手順

### 1. 環境準備

```bash
# .env.localファイルを作成
cat > .env.local << EOF
VITE_TEST_MODE=mock
VITE_META_ACCESS_TOKEN=your_token_here
VITE_META_ACCOUNT_ID=act_123456789
EOF
```

### 2. 段階的テスト実行

```bash
# Phase 1: 接続テストのみ
npm test meta-api-integration.test.ts -- -t "Phase 1"

# Phase 2: データ整合性テスト
npm test meta-api-integration.test.ts -- -t "Phase 2"

# Phase 3: エラーハンドリング
npm test meta-api-integration.test.ts -- -t "Phase 3"
```

### 3. 本番環境テスト

```bash
# /ad-fatigueページでの動作確認
npm run dev

# ブラウザで確認
# http://localhost:5173/ad-fatigue
# - データが正しく表示されるか
# - リロード時にデータが保持されるか
# - 更新ボタンが機能するか
```

## ⚠️ 注意事項

### API制限
- **時間制限**: 200リクエスト/時
- **日次制限**: 4800リクエスト/日
- **バースト制限**: 10リクエスト/秒

### テスト時の考慮事項
1. **本番トークンを使用しない**: テスト用のアカウントを使用
2. **レート制限に注意**: 大量のテストを短時間で実行しない
3. **キャッシュクリア**: テスト前にキャッシュをクリア
4. **ログ確認**: vibeloggerの出力を確認

## 📝 トラブルシューティング

### よくある問題

#### 1. 認証エラー (Error 190)
```
原因: トークンが無効または期限切れ
対処: 新しいトークンを取得して再設定
```

#### 2. レート制限エラー (Error 32/613)
```
原因: API呼び出し制限超過
対処: 1時間待機してから再実行
```

#### 3. データ不整合
```
原因: キャッシュの不整合
対処: convexのデータをクリアして再実行
```

## 🔄 継続的改善

### 次のステップ
1. **E2Eテスト追加**: Playwrightでの自動化
2. **負荷テスト**: 大量データでのパフォーマンス測定
3. **監視強化**: DatadogやSentryとの統合
4. **A/Bテスト**: キャッシュ戦略の最適化