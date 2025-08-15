#!/bin/bash

# Pre-push チェックスクリプト
# このスクリプトはpush前にGitHub Actionsと同じチェックを実行します

set -e

echo "🔍 Pre-push チェックを開始します..."

# 1. TypeScript型チェック
echo "📘 TypeScript型チェック..."
npm run type-check
if [ $? -ne 0 ]; then
    echo "❌ TypeScript型チェックに失敗しました"
    exit 1
fi
echo "✅ TypeScript型チェック完了"

# 2. ESLintチェック
echo "📘 ESLintチェック..."
npm run lint
if [ $? -ne 0 ]; then
    echo "❌ ESLintチェックに失敗しました"
    exit 1
fi
echo "✅ ESLintチェック完了"

# 3. テスト実行
echo "📘 テスト実行..."
npm test -- --run
if [ $? -ne 0 ]; then
    echo "❌ テストに失敗しました"
    exit 1
fi
echo "✅ テスト完了"

# 4. ビルドチェック
echo "📘 ビルドチェック..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ ビルドに失敗しました"
    exit 1
fi
echo "✅ ビルド完了"

echo "🎉 すべてのチェックが成功しました！pushしても安全です。"