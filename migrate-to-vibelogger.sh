#!/bin/bash

# Vibelogger移行スクリプト
echo "🎵 Vibelogger移行を開始します..."

# Phase 1: console使用ファイルのリスト作成
echo "📋 Phase 1: console使用ファイルの検出"
FILES=$(find src -type f \( -name "*.ts" -o -name "*.tsx" \) \
  -not -path "*/_archived/*" \
  -not -path "*/node_modules/*" \
  -not -path "*/vibelogger.ts" \
  -exec grep -l "console\.\(log\|error\|warn\)" {} \;)

echo "✅ 対象ファイル数: $(echo "$FILES" | wc -l)"

# Phase 2: 各ファイルを処理
echo "🔄 Phase 2: Vibeloggerへの置換開始"

for file in $FILES; do
  echo "📝 処理中: $file"
  
  # すでにvibeがインポートされているかチェック
  if ! grep -q "import.*vibe.*from.*vibelogger" "$file"; then
    # ファイルの最初のimport文を見つけて、その後にvibeのインポートを追加
    if grep -q "^import" "$file"; then
      # 最初のimport文の後に追加
      sed -i '' '/^import.*from/!b; /^import.*from/{ 
        a\
import { vibe } from "@/lib/vibelogger"
        :loop
        n
        b loop
      }' "$file"
    else
      # import文がない場合は先頭に追加
      sed -i '' '1i\
import { vibe } from "@/lib/vibelogger"
' "$file"
    fi
    echo "  ✅ vibeインポートを追加"
  fi
  
  # console.logの置換
  # デバッグ系のログをvibe.debugに
  sed -i '' 's/console\.log(\(.*[Dd]ebug.*\))/vibe.debug(\1)/g' "$file"
  sed -i '' 's/console\.log(\(.*\[DEBUG\].*\))/vibe.debug(\1)/g' "$file"
  
  # 成功系のログをvibe.goodに
  sed -i '' 's/console\.log(\(.*[Ss]uccess.*\))/vibe.good(\1)/g' "$file"
  sed -i '' 's/console\.log(\(.*✅.*\))/vibe.good(\1)/g' "$file"
  sed -i '' 's/console\.log(\(.*成功.*\))/vibe.good(\1)/g' "$file"
  
  # 情報系のログをvibe.infoに
  sed -i '' 's/console\.log(\(.*[Ii]nfo.*\))/vibe.info(\1)/g' "$file"
  sed -i '' 's/console\.log(\(.*開始.*\))/vibe.info(\1)/g' "$file"
  sed -i '' 's/console\.log(\(.*処理中.*\))/vibe.info(\1)/g' "$file"
  
  # エラーをvibe.badに
  sed -i '' 's/console\.error(/vibe.bad(/g' "$file"
  
  # 警告をvibe.warnに
  sed -i '' 's/console\.warn(/vibe.warn(/g' "$file"
  
  # その他のconsole.logをvibe.vibeに
  sed -i '' 's/console\.log(/vibe.vibe(/g' "$file"
  
  echo "  ✅ console呼び出しを置換"
done

echo "🎉 移行が完了しました！"

# Phase 3: 型チェック
echo "🔍 Phase 3: 型チェック"
npm run type-check

echo "✨ Vibelogger移行完了！"