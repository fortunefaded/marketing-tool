# Meta API データ取得フロー設計

## 現在の問題のあるフロー

```mermaid
sequenceDiagram
    participant UI as React UI
    participant Hook as useMetaInsights
    participant Client as api-client.ts
    participant API as Meta Graph API
    
    UI->>Hook: データ取得要求 (30日分)
    Hook->>Client: fetchAdInsights(30日間)
    Client->>API: GET /insights (1回のみ)
    API-->>Client: Page 1 (1-6日分のみ)
    Note over Client: ページネーション未実装
    Client-->>Hook: 不完全なデータ
    Hook-->>UI: 1-6日分のみ表示
    Note over UI: ユーザーは問題に気づかない
```

## 修正後の完全データ取得フロー

```mermaid
sequenceDiagram
    participant UI as React UI
    participant Hook as useMetaInsights
    participant Client as api-client.ts
    participant API as Meta Graph API
    participant Log as Console Log
    
    UI->>Hook: データ取得要求 (30日分)
    Hook->>Client: fetchPaginatedData(params)
    
    loop 全ページ取得
        Client->>API: GET /insights (Page N)
        API-->>Client: Page N + paging.next
        Client->>Log: "Page N取得: X件"
        
        alt paging.nextが存在
            Note over Client: 次ページ取得継続
        else 最終ページ
            Note over Client: 全データ取得完了
        end
    end
    
    Client->>Client: 実配信日数を計算
    Client->>Log: "総取得: Y件, Z日分配信"
    Client-->>Hook: 完全なデータ + 配信日数
    Hook-->>UI: 30日分完全表示 + "Z日/30日配信"
```

## エラーハンドリングフロー

```mermaid
sequenceDiagram
    participant Client as api-client.ts
    participant API as Meta Graph API
    participant Retry as Retry Logic
    participant Log as Error Log
    
    Client->>API: GET /insights
    
    alt API成功
        API-->>Client: データ返却
    else APIエラー
        API-->>Client: Error Response
        Client->>Retry: リトライ判定
        
        loop 最大3回
            Retry->>API: リトライ実行
            
            alt リトライ成功
                API-->>Retry: データ返却
                Retry-->>Client: 成功データ
            else リトライ失敗
                API-->>Retry: エラー継続
                
                alt 3回目の失敗
                    Retry->>Log: "最終エラー記録"
                    Retry-->>Client: エラー + 部分データ
                else まだリトライ可能
                    Note over Retry: 次回リトライへ
                end
            end
        end
    end
```

## データ処理フロー

```mermaid
flowchart TD
    A[Meta API Response] --> B{paging.next存在？}
    B -->|Yes| C[次ページ取得]
    B -->|No| D[全データ結合]
    C --> A
    
    D --> E[配信日数算出]
    E --> F[日割り平均計算]
    F --> G[表示データ構築]
    
    G --> H["表示: X日/30日配信"]
    G --> I[ログ出力: 取得詳細]
    
    subgraph "新規追加処理"
    E
    F
    H
    I
    end
```

## UI更新フロー

```mermaid
stateDiagram-v2
    [*] --> Loading : データ取得開始
    Loading --> Processing : API応答受信
    Processing --> Processing : ページネーション継続
    Processing --> Success : 全データ取得完了
    Processing --> PartialSuccess : エラー発生、部分データあり
    Processing --> Error : 完全失敗
    
    Success --> [*] : 完全データ表示
    PartialSuccess --> [*] : 部分データ + 警告表示
    Error --> [*] : エラーメッセージ表示
    
    state Success {
        [*] --> ShowFullData
        ShowFullData --> ShowDeliveryDays
        ShowDeliveryDays --> ShowLogs
    }
```

## レート制限対応フロー

```mermaid
sequenceDiagram
    participant Client as api-client.ts
    participant RateLimit as Rate Limiter
    participant API as Meta Graph API
    participant Wait as Wait Logic
    
    Client->>RateLimit: API呼び出し要求
    RateLimit->>RateLimit: 制限チェック
    
    alt 制限内
        RateLimit->>API: API実行
        API-->>RateLimit: 結果返却
        RateLimit-->>Client: 成功結果
    else 制限到達
        RateLimit->>Wait: 待機開始
        Note over Wait: レート制限回復まで待機
        Wait->>RateLimit: 待機完了
        RateLimit->>API: API再実行
        API-->>RateLimit: 結果返却
        RateLimit-->>Client: 遅延結果
    end
```

## ログ出力フロー

```mermaid
flowchart LR
    A[API呼び出し] --> B[ページ取得ログ]
    B --> C[データ件数ログ]
    C --> D[配信日数ログ]
    D --> E[エラーログ]
    E --> F[完了サマリーログ]
    
    B --> G["Page X: Y件取得"]
    C --> H["総データ: Z件"]
    D --> I["配信: A日/30日"]
    E --> J["エラー: 詳細情報"]
    F --> K["取得完了: 時間/件数"]
```

## データフロー要点

### 修正前の問題点
1. **単一ページ取得のみ** → 1-6日分のデータ不足
2. **エラーハンドリング不備** → 失敗時の対処不能
3. **取得状況不明** → デバッグ困難

### 修正後の改善点
1. **完全ページネーション** → 30日分確実取得
2. **3回リトライ機構** → 一時的エラーに対応
3. **詳細ログ出力** → 透明性と診断性向上
4. **配信日数表示** → ユーザーの理解促進

この設計により、「正しいデータ取得」という要件を確実に満たしながら、実装の複雑性は最小限に抑制する。