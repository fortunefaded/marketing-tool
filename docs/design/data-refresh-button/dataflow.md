# データフロー図

## ユーザーインタラクションフロー

### データ更新の基本フロー

```mermaid
flowchart TD
    A[ユーザー] --> B{アカウント選択済み?}
    B -->|Yes| C[データ更新ボタンをクリック]
    B -->|No| D[ボタン無効化]
    C --> E[クリックイベント処理]
    E --> F[デバッグログ出力]
    F --> G[onRefresh関数呼び出し]
    G --> H{isRefreshing?}
    H -->|Yes| I[処理をスキップ]
    H -->|No| J[更新処理開始]
    J --> K[ボタンを「更新中...」に変更]
    K --> L[Meta APIデータ取得]
    L --> M{取得成功?}
    M -->|Yes| N[Convexに保存]
    M -->|No| O[エラー表示]
    N --> P{保存成功?}
    P -->|Yes| Q[UI更新]
    P -->|No| O
    Q --> R[完了通知]
    O --> S[エラーログ記録]
    R --> T[ボタンを通常状態に戻す]
    S --> T
```

## データ処理シーケンス

### 正常系フロー

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant UI as FatigueDashboardPresentation
    participant C as FatigueDashboardContainer
    participant H as useAdFatigueSimplified
    participant API as MetaInsights Hook
    participant MA as Meta API
    participant Conv as Convex DB
    
    U->>UI: データ更新ボタンクリック
    UI->>UI: console.log(デバッグ情報)
    UI->>C: onRefresh()呼び出し
    C->>H: refetch()
    H->>H: isRefreshing確認
    H->>H: accountId確認
    H->>API: fetch()
    API->>MA: GET /insights
    MA-->>API: インサイトデータ
    API-->>H: AdInsight[]
    H->>Conv: saveToCache(insights)
    Conv-->>H: 保存完了
    H->>H: enrichInsights()
    H-->>C: 更新完了
    C-->>UI: 状態更新
    UI-->>U: UI再レンダリング
```

### エラー系フロー

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant UI as UI Component
    participant H as Hook
    participant API as Meta API
    
    U->>UI: データ更新ボタンクリック
    UI->>H: refetch()
    
    alt accountIdが空
        H-->>UI: エラー: アカウント未選択
    else トークンエラー
        H->>API: fetch()
        API-->>H: 401 Unauthorized
        H-->>UI: エラー: 認証エラー
    else ネットワークエラー
        H->>API: fetch()
        API--xH: タイムアウト
        H-->>UI: エラー: ネットワークエラー
    else Convex保存エラー
        H->>API: fetch()
        API-->>H: データ取得成功
        H->>Conv: saveToCache()
        Conv--xH: 保存失敗
        H-->>UI: エラー: データ保存失敗
    end
    
    UI-->>U: エラーメッセージ表示
```

## 状態管理フロー

```mermaid
stateDiagram-v2
    [*] --> Idle: 初期状態
    
    Idle --> AccountSelected: アカウント選択
    AccountSelected --> Refreshing: データ更新クリック
    
    Refreshing --> Success: 取得成功
    Refreshing --> Error: エラー発生
    
    Success --> Idle: 完了
    Error --> Idle: エラー表示後
    
    AccountSelected --> Idle: アカウント変更
    
    note right of Refreshing
        - isRefreshing = true
        - ボタン無効化
        - ローディング表示
    end note
    
    note right of Error
        - エラーメッセージ表示
        - 詳細ログ出力
        - 再試行オプション提供
    end note
```

## コンポーネント間のデータフロー

```mermaid
graph TB
    subgraph "Presentation Layer"
        A[FatigueDashboardPresentation]
        B[DataRefreshButton]
        C[AccountSelector]
        D[DataDisplay]
    end
    
    subgraph "Container Layer"
        E[FatigueDashboardContainer]
    end
    
    subgraph "Hook Layer"
        F[useAdFatigue]
        G[useAdFatigueSimplified]
        H[useMetaInsights]
        I[useInsightsCache]
    end
    
    subgraph "API Layer"
        J[SimpleMetaApi]
        K[SimpleTokenStore]
    end
    
    subgraph "Data Layer"
        L[Convex Database]
        M[Meta API]
    end
    
    A --> E
    B --> A
    C --> A
    D --> A
    
    E --> F
    F --> G
    G --> H
    G --> I
    
    H --> J
    J --> K
    J --> M
    
    I --> L
    L --> I
    
    %% Data flow
    M -.->|Raw Data| J
    J -.->|Processed Data| H
    H -.->|AdInsight[]| G
    G -.->|FatigueData[]| F
    F -.->|Display Data| E
    E -.->|Props| A
```

## エラーハンドリングフロー

```mermaid
flowchart TD
    A[エラー発生] --> B{エラータイプ}
    
    B -->|認証エラー| C[Token Expired/Invalid]
    B -->|ネットワーク| D[Network Error]
    B -->|データエラー| E[Data Processing Error]
    B -->|その他| F[Unknown Error]
    
    C --> G[認証エラーメッセージ]
    D --> H[接続エラーメッセージ]
    E --> I[データエラーメッセージ]
    F --> J[一般エラーメッセージ]
    
    G --> K[Meta API設定へのリンク表示]
    H --> L[再試行ボタン表示]
    I --> L
    J --> L
    
    K --> M[ユーザーアクション待機]
    L --> M
    
    M --> N{アクション}
    N -->|設定画面へ| O[Meta API設定]
    N -->|再試行| P[refetch()再実行]
    N -->|キャンセル| Q[通常状態に戻る]
```