# データフロー図

## 1. 全体データフロー

```mermaid
flowchart TB
    subgraph External["外部システム"]
        META[Meta Marketing API]
        CONVEX[(Convex DB)]
    end
    
    subgraph DataLayer["データ取得層"]
        FETCHER[useMetaApiFetcher]
        CACHE[ConvexDataCache]
        LOCAL[LocalCache]
    end
    
    subgraph Processing["データ処理層"]
        VALIDATOR[DataValidator]
        AGGREGATOR[AdDataAggregator]
        CALCULATOR[FatigueCalculator]
        TIMELINE[TimelineAnalyzer]
    end
    
    subgraph Presentation["表示層"]
        DASHBOARD[FatigueDashboard]
        TABLE[CreativeTable]
        CHART[TimelineChart]
    end
    
    META -->|Raw Insights| FETCHER
    FETCHER -->|Validate| VALIDATOR
    VALIDATOR -->|Clean Data| AGGREGATOR
    AGGREGATOR -->|Structured Data| CALCULATOR
    CALCULATOR -->|Fatigue Scores| TIMELINE
    TIMELINE -->|Analysis Results| CACHE
    CACHE <-->|Read/Write| CONVEX
    CACHE -->|Cached Data| LOCAL
    LOCAL -->|Display Data| DASHBOARD
    LOCAL -->|Display Data| TABLE
    LOCAL -->|Display Data| CHART
```

## 2. データ集約プロセス

```mermaid
sequenceDiagram
    participant User
    participant UI as Dashboard UI
    participant Hook as useAdFatigue
    participant Fetcher as MetaApiFetcher
    participant API as Meta API
    participant Agg as AdDataAggregator
    participant Cache as ConvexCache
    
    User->>UI: データ更新要求
    UI->>Hook: fetchData()
    Hook->>Fetcher: getInsights(30days)
    
    alt キャッシュ有効
        Fetcher->>Cache: getCachedData()
        Cache-->>Fetcher: Cached Insights
    else キャッシュ無効
        Fetcher->>API: GET /insights
        Note over API: breakdowns=platform<br/>time_increment=1
        API-->>Fetcher: Raw Data (90,000行)
    end
    
    Fetcher->>Agg: aggregate(rawInsights)
    
    Note over Agg: Step 1: ad_idでグループ化<br/>Step 2: 日付でグループ化<br/>Step 3: プラットフォームで分類
    
    Agg->>Agg: calculateSummary()
    Agg->>Agg: calculateDailyBreakdown()
    Agg->>Agg: calculatePlatformBreakdown()
    
    Agg-->>Fetcher: AdPerformanceData[]
    Fetcher->>Cache: saveToCache()
    Fetcher-->>Hook: Structured Data
    Hook-->>UI: Update Display
    UI-->>User: 集約済みデータ表示
```

## 3. 疲労度計算フロー

```mermaid
flowchart LR
    subgraph Input["入力データ"]
        DAILY[日別メトリクス]
        CONFIG[閾値設定]
    end
    
    subgraph Analysis["分析処理"]
        TREND[トレンド計算]
        MA[移動平均]
        BASELINE[ベースライン比較]
    end
    
    subgraph Scoring["スコアリング"]
        CTR_SCORE[CTR疲労度]
        FREQ_SCORE[頻度疲労度]
        CPM_SCORE[CPM疲労度]
        TOTAL[総合スコア]
    end
    
    subgraph Output["出力"]
        SCORE[疲労度スコア 0-100]
        STATUS[ステータス]
        PREDICT[予測値]
    end
    
    DAILY --> TREND
    DAILY --> MA
    CONFIG --> BASELINE
    
    TREND --> CTR_SCORE
    MA --> FREQ_SCORE
    BASELINE --> CPM_SCORE
    
    CTR_SCORE --> TOTAL
    FREQ_SCORE --> TOTAL
    CPM_SCORE --> TOTAL
    
    TOTAL --> SCORE
    TOTAL --> STATUS
    MA --> PREDICT
```

## 4. リアルタイム更新フロー

```mermaid
sequenceDiagram
    participant Browser
    participant React as React Component
    participant Convex as Convex Subscription
    participant DB as Convex Database
    participant Worker as Background Worker
    
    Browser->>React: Component Mount
    React->>Convex: Subscribe to changes
    Convex->>DB: Watch collection
    
    Note over Worker: 定期実行（1時間毎）
    
    Worker->>DB: New data available
    DB-->>Convex: Data change event
    Convex-->>React: Real-time update
    React-->>Browser: Re-render UI
    
    alt Manual Refresh
        Browser->>React: Refresh button click
        React->>Worker: Trigger immediate update
        Worker->>DB: Force data fetch
    end
```

## 5. エラーハンドリングフロー

```mermaid
stateDiagram-v2
    [*] --> Fetching: Start
    Fetching --> Validating: Data Retrieved
    Fetching --> RetryFetch: API Error
    
    Validating --> Aggregating: Valid Data
    Validating --> PartialProcessing: Partial Data
    Validating --> ErrorState: Invalid Data
    
    Aggregating --> Calculating: Aggregated
    Aggregating --> PartialResult: Partial Success
    
    Calculating --> Success: Complete
    Calculating --> Warning: With Issues
    
    RetryFetch --> Fetching: Retry < 3
    RetryFetch --> ErrorState: Max Retries
    
    PartialProcessing --> PartialResult: Process Available
    PartialResult --> Warning: Display with Warning
    
    Success --> [*]: Display Data
    Warning --> [*]: Display with Alert
    ErrorState --> [*]: Show Error Message
```

## 6. キャッシュ戦略フロー

```mermaid
flowchart TD
    REQUEST[データ要求] --> CHECK{キャッシュ確認}
    
    CHECK -->|L1キャッシュHit| MEMORY[メモリキャッシュ]
    CHECK -->|L1ミス・L2Hit| CONVEX[Convexキャッシュ]
    CHECK -->|全ミス| API[Meta API]
    
    MEMORY --> RETURN[データ返却]
    
    CONVEX --> UPDATE_L1[L1キャッシュ更新]
    UPDATE_L1 --> RETURN
    
    API --> PROCESS[データ処理]
    PROCESS --> UPDATE_L2[L2キャッシュ更新]
    UPDATE_L2 --> UPDATE_L1
    
    RETURN --> CHECK_AGE{有効期限確認}
    CHECK_AGE -->|期限内| DISPLAY[表示]
    CHECK_AGE -->|期限切れ| BG_REFRESH[バックグラウンド更新]
    BG_REFRESH -.->|非同期| API
```

## 7. 期間フィルタリングフロー

```mermaid
flowchart LR
    subgraph Storage["データストレージ"]
        FULL[30日分データ<br/>AdPerformanceData[]]
    end
    
    subgraph Filter["フィルタリング"]
        RANGE[期間選択<br/>7d/14d/30d]
        FILTER_FN[filterByDateRange()]
    end
    
    subgraph Display["表示処理"]
        SUMMARY[サマリー再計算]
        DAILY[日別データ抽出]
        RENDER[UI更新]
    end
    
    FULL --> RANGE
    RANGE --> FILTER_FN
    FILTER_FN --> SUMMARY
    FILTER_FN --> DAILY
    SUMMARY --> RENDER
    DAILY --> RENDER
```

## 8. バッチ処理フロー（大量データ対応）

```mermaid
sequenceDiagram
    participant API as Meta API
    participant Fetcher
    participant Queue as Processing Queue
    participant Worker1 as Worker 1
    participant Worker2 as Worker 2
    participant Aggregator
    participant UI
    
    Fetcher->>API: Request 1000 ads data
    API-->>Fetcher: Response (90,000 rows)
    
    Fetcher->>Queue: Split into batches (100 ads each)
    
    par Parallel Processing
        Queue->>Worker1: Batch 1-5
        Worker1->>Aggregator: Process
        and
        Queue->>Worker2: Batch 6-10
        Worker2->>Aggregator: Process
    end
    
    Aggregator->>Aggregator: Merge results
    Aggregator-->>UI: Progressive update
    
    Note over UI: 処理済みデータから<br/>順次表示更新
```

## 9. データ変換パイプライン

```mermaid
flowchart TB
    subgraph Raw["生データ (AdInsight[])"]
        R1[ad_id: "123"<br/>date: "2025-01-01"<br/>platform: "facebook"<br/>impressions: 1000]
        R2[ad_id: "123"<br/>date: "2025-01-01"<br/>platform: "instagram"<br/>impressions: 500]
        R3[ad_id: "123"<br/>date: "2025-01-02"<br/>platform: "facebook"<br/>impressions: 1200]
    end
    
    subgraph Transform["変換処理"]
        GROUP[Group by ad_id]
        PIVOT[Pivot by date/platform]
        CALC[Calculate aggregates]
    end
    
    subgraph Structured["構造化データ (AdPerformanceData)"]
        S1[ad_id: "123"<br/>summary: {total: 2700}<br/>dailyBreakdown: [...]<br/>platformBreakdown: {...}]
    end
    
    Raw --> GROUP
    GROUP --> PIVOT
    PIVOT --> CALC
    CALC --> Structured
```

---

作成日: 2025-08-27
バージョン: 1.0.0