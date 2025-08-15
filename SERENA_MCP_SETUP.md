# Serena MCP セットアップガイド

このプロジェクトはSerena MCPを使用してClaude DesktopおよびClaude Codeから効率的に操作できるように設定されています。

## セットアップ手順

### 1. uvのインストール

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
source $HOME/.local/bin/env
```

### 2. Claude Desktop設定

Claude Desktopの設定ファイルは既に作成済みです：
`~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "serena": {
      "command": "/Users/rakewonno/.local/bin/uvx",
      "args": [
        "--from",
        "git+https://github.com/oraios/serena",
        "serena",
        "start-mcp-server",
        "--context",
        "ide-assistant",
        "--project",
        "/Users/rakewonno/Documents/marketing-tool"
      ]
    }
  }
}
```

### 3. プロジェクトのインデックス化

プロジェクトは既にインデックス化されています。再インデックス化が必要な場合：

```bash
uvx --from git+https://github.com/oraios/serena serena project index
```

### 4. Claude Desktopの再起動

設定を反映させるためにClaude Desktopを再起動してください。

## 使用方法

Claude DesktopまたはClaude Codeで以下のようなコマンドを使用できます：

- ファイル検索: 「marketing-toolプロジェクトのCampaigns.tsxを探して」
- シンボル検索: 「useVibeLoggerフックの定義を見せて」
- コード編集: 「Dashboardコンポーネントに新しい統計を追加して」

## 設定ファイル

プロジェクト固有の設定は `.serena/serena_config.yml` で管理されています：

- **検索設定**: TypeScript/React関連ファイルを優先
- **除外パターン**: node_modules, ビルド成果物を除外
- **機能**: 自動補完、コードナビゲーション、シンボル検索を有効化

## トラブルシューティング

### Serenaが動作しない場合

1. uvが正しくインストールされているか確認：

   ```bash
   which uv
   ```

2. Claude Desktopを完全に終了して再起動

3. プロジェクトを再インデックス化：
   ```bash
   uvx --from git+https://github.com/oraios/serena serena project index
   ```

### ログの確認

Serenaのログは以下で確認できます：

```bash
tail -f ~/.serena/logs/serena.log
```
