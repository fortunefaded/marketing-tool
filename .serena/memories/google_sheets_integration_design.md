# Google Sheets Integration設計書

## 概要
複数の広告代理店から異なるフォーマットのGoogle Spreadsheetsデータを統合管理するシステム

## 要件
1. Google OAuth2認証によるプライベートシートへのアクセス
2. 複数の代理店フォーマットに対応（mogumo/prisma、標準Google Ads、標準Meta等）
3. 初回は過去データ一括インポート、以降は日次同期
4. 統一フォーマットへの変換と保存

## アーキテクチャ
### ディレクトリ構造
```
src/features/google-sheets/
├── types/               # 型定義
├── parsers/            # フォーマット別パーサー
├── components/         # UIコンポーネント
├── hooks/             # カスタムフック
├── utils/             # ユーティリティ
└── pages/             # ページコンポーネント

convex/
├── googleSheets.ts    # Convex関数
└── schema.ts         # スキーマ定義（追加済み）
```

## データベース設計
### テーブル
- googleAuthTokens: OAuth2トークン管理
- googleSheetConfigs: スプレッドシート設定
- unifiedAdPerformance: 統合広告パフォーマンスデータ
- googleSheetImports: インポート履歴

## パーサー設計
- BaseParser: 基底クラス（共通処理）
- MogumoPrismaParser: mogumo形式専用
- StandardGoogleParser: Google Ads標準形式
- StandardMetaParser: Meta広告標準形式
- ParserFactory: フォーマット自動判定

## 実装済み
1. 型定義（types/index.ts, agency-formats.ts）
2. 基底パーサー（parsers/base-parser.ts）
3. mogumo形式パーサー（parsers/mogumo-parser.ts）
4. Convexスキーマ（schema.ts更新済み）
5. Convex関数の一部（googleSheets.ts）

## 未実装
1. Google OAuth2認証フロー
2. Google Sheets API統合
3. UIコンポーネント
4. 他フォーマットのパーサー
5. 自動同期スケジューラー
