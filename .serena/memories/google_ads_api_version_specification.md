# Google Ads API バージョン仕様

## 使用バージョン
**Google Ads API v21**

## 決定日
2025年9月18日

## 決定理由
1. **最新バージョン** - 2025年8月リリースの最新版
2. **v18は廃止済み** - 2025年8月20日にサンセット
3. **AI機能の充実** - AI Max for Searchキャンペーン対応
4. **透明性の向上** - Performance Maxの検索語句レポート改善

## エンドポイント
```
https://googleads.googleapis.com/v21/customers/{customerId}/googleAds:searchStream
```

## 必要な認証情報
- Client ID
- Client Secret 
- Developer Token
- Customer ID
- Manager Account ID（任意）
- OAuth 2.0 Refresh Token

## 主要機能
- AI Max for Searchキャンペーン（`ai_max_setting.enable_ai_max`）
- キャンペーン検索語句ビュー（`campaign_search_term_view`）
- Performance Max負のキーワード（v20から継承）
- ブランドガイドライン自動有効化
- プロモーションアセットのQRコード・バーコード対応

## 注意事項
- **v23は存在しない** - Meta API (v23.0)と混同しないこと
- **v18は使用不可** - 2025年8月20日に廃止済み
- **クライアントライブラリ更新必須** - v21の新機能を使用するには更新が必要

## CLAUDE.mdへの記載
claude.mdファイルの「## API VERSION」セクションにGoogle Ads API v21の使用を明記済み