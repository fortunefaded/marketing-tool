# コードスタイル・規約

## TypeScript設定

- 厳密なTypeScript設定
- JSX: React JSX
- ES2022 target
- strict mode 有効

## Prettier設定（.prettierrc）

```json
{
  "semi": false, // セミコロンなし
  "singleQuote": true, // シングルクォート使用
  "tabWidth": 2, // タブ幅2スペース
  "trailingComma": "es5", // ES5準拠のトレイリングカンマ
  "printWidth": 100, // 行の最大幅100文字
  "bracketSpacing": true, // オブジェクトの括弧内にスペース
  "arrowParens": "always", // アロー関数の引数を常に括弧で囲む
  "endOfLine": "lf" // LF改行
}
```

## ESLint設定

- TypeScript対応
- React hooks ルール
- 未使用変数の警告
- 最大警告数: 0（警告でもビルド失敗）

## ファイル命名規則

- コンポーネント: PascalCase (例: `Dashboard.tsx`)
- ユーティリティ: camelCase (例: `vibelogger.ts`)
- テストファイル: `*.test.ts` または `*.test.tsx`
- フック: `use` プレフィックス (例: `useVibeLogger.ts`)

## インポート順序

1. React関連
2. 外部ライブラリ
3. 内部モジュール（相対パス）

## コンポーネント設計原則

- 関数コンポーネント使用
- TypeScript厳密型付け
- テストファーストアプローチ
- 単一責任原則

## ログ記録

- Vibeloggerを使用した人間が読みやすい日本語ログ
- 構造化ログより可読性を優先

## ディレクトリ構造規則

- `src/components/`: 再利用可能なコンポーネント
- `src/routes/`: ページレベルコンポーネント
- `src/lib/`: ユーティリティとヘルパー関数
- `src/hooks/`: カスタムフック
- `src/__tests__/`: テスト（unit/integration/e2e）

## Git規則

- コミット前に自動lint/format実行
- 明確なコミットメッセージ
- 機能ブランチ使用推奨
