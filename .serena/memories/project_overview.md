# Marketing Tool プロジェクト概要

## プロジェクトの目的

TDD（テスト駆動開発）で構築されたマーケティングツール。人間が読みやすい日本語ログシステム（Vibelogger）を特徴とする。

## 技術スタック

- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: Convex (リアルタイムデータベース)
- **Styling**: Tailwind CSS
- **Testing**: Vitest (カバレッジ100%目標)
- **Linting**: ESLint
- **Formatting**: Prettier
- **Type Checking**: TypeScript
- **Build**: Vite
- **Git Hooks**: Husky + lint-staged
- **CI/CD**: GitHub Actions
- **AI Integration**: Serena MCP (Claude Desktop/Code連携)
- **Logging**: Vibelogger (独自の日本語ログシステム)

## プロジェクト構造

```
src/
├── App.tsx              # メインアプリケーション
├── main.tsx             # エントリーポイント
├── styles/              # スタイルファイル
├── components/          # React コンポーネント
├── hooks/               # カスタムフック
├── lib/                 # ユーティリティライブラリ
│   ├── vibelogger.ts   # 日本語ログシステム
│   ├── calculator.ts   # 計算ユーティリティ
│   └── convex-helpers.ts # Convex ヘルパー
├── routes/             # ページルート
│   ├── Dashboard.tsx
│   ├── Campaigns.tsx
│   └── Tasks.tsx
└── __tests__/          # テストファイル
    ├── unit/
    ├── integration/
    └── e2e/

convex/
├── schema.ts           # データベーススキーマ
├── campaigns.ts        # キャンペーン関連API
└── tasks.ts           # タスク関連API
```

## 主要な特徴

- 100% TypeScript
- テストカバレッジ100%目標
- 人間が読みやすい日本語ログシステム
- Serena MCP統合による効率的なAI支援開発
- リアルタイムデータベース（Convex）
