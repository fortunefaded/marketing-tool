# Convex機能テストチェックリスト

## 1. アカウントセットアップ

- [ ] アプリ起動時にテストアカウントが自動作成される
- [ ] コンソールに`Test account setup completed`が表示される
- [ ] MetaAccountManagerでアクティブアカウントが設定される

## 2. 疲労度分析機能

- [ ] `/meta-dashboard`の疲労度分析タブが開ける
- [ ] `ArgumentValidationError`が発生しない
- [ ] 疲労度スコアカードが表示される
- [ ] 推奨アクション一覧が表示される

## 3. クリエイティブ分析機能

- [ ] クリエイティブ一覧が表示される
- [ ] クリエイティブ詳細モーダルが開ける
- [ ] インサイトタブでエラーが発生しない
- [ ] 疲労度分析結果が表示される

## 4. データ永続化

- [ ] ページをリロードしてもデータが保持される
- [ ] Convexダッシュボードでデータが確認できる

## 5. エラーハンドリング

- [ ] ネットワークエラー時に適切なメッセージが表示される
- [ ] 無効なデータでクラッシュしない

## テストコマンド

### Convexの状態確認

```bash
npx convex function:list
npx convex data:export
```

### ログ確認

```bash
npx convex logs
```

### データリセット（必要な場合）

```bash
npx convex run --no-push tasks:clearAll
```
