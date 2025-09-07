# データフロー図

## 概要

日付範囲フィルター機能におけるデータの流れを可視化します。ユーザーインタラクションから最終的な画面表示までの全プロセスを示します。

## ユーザーインタラクションフロー

```mermaid
flowchart TD
    Start([ユーザーが日付範囲を選択]) --> Filter[DateRangeFilter Component]
    Filter --> |onChange event| Container[FatigueDashboardContainer]
    Container --> |setState| State[dateRange State更新]
    State --> Hook[useAdFatigueSimplified Hook]
    Hook --> Check{キャッシュ確認}
    Check -->|キャッシュあり| Cache[LocalCache]
    Check -->|キャッシュなし| API[useMetaInsights Hook]
    Cache --> Display[データ表示]
    API --> MetaAPI[Meta Graph API v23.0]
    MetaAPI --> Process[データ処理・集約]
    Process --> SaveCache[キャッシュ保存]
    SaveCache --> Display
    Display --> End([画面更新完了])
```

## データ処理シーケンス図

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant UI as DateRangeFilter
    participant C as Container
    participant H as useAdFatigueSimplified
    participant M as useMetaInsights
    participant Cache as LocalCache
    participant API as Meta API
    participant Agg as Aggregator

    U->>UI: 日付範囲を選択
    UI->>C: onDateRangeChange(dateRange)
    C->>C: setDateRange(dateRange)
    C->>H: props: {dateRange}
    
    H->>M: datePreset = dateRange
    M->>M: prevDatePresetと比較
    
    alt 日付範囲が変更された場合
        M->>Cache: clearCache(accountId)
        M->>M: stopAutoFetch()
        M->>API: fetch({datePresetOverride})
        
        alt キャッシュミス
            API->>API: buildAPIParams(datePreset)
            API->>API: getTimeSeriesInsights()
            API-->>M: 時系列データ
            M->>Agg: aggregateTimeSeriesData()
            Agg-->>M: 集約済みデータ
            M->>Cache: setCachedData()
        else キャッシュヒット
            Cache-->>M: キャッシュデータ
        end
        
        M-->>H: insights データ
        H->>H: useFatigueCalculation()
        H-->>C: fatigueData
        C->>UI: 更新されたデータ
        UI-->>U: 画面表示更新
    end
```

## 状態管理フロー

```mermaid
stateDiagram-v2
    [*] --> Idle: 初期状態
    Idle --> Loading: 日付範囲変更
    Loading --> CheckingCache: キャッシュ確認
    CheckingCache --> CacheHit: キャッシュあり
    CheckingCache --> CacheMiss: キャッシュなし
    CacheHit --> Displaying: データ表示
    CacheMiss --> Fetching: API呼び出し
    Fetching --> Processing: データ処理
    Processing --> Caching: キャッシュ保存
    Caching --> Displaying: データ表示
    Displaying --> Idle: 完了
    
    Fetching --> Error: エラー発生
    Error --> Retrying: リトライ
    Retrying --> Fetching: 再試行
    Error --> Idle: リトライ失敗
```

## データ変換フロー

```mermaid
flowchart LR
    subgraph Input [入力]
        DateRange[日付範囲<br/>yesterday/last_7d/etc]
    end
    
    subgraph Transform [変換処理]
        Convert[DateRangeFilter型<br/>→<br/>APIパラメータ]
        Build[パラメータ構築<br/>date_preset or time_range]
    end
    
    subgraph API [API呼び出し]
        Request[Meta API Request<br/>time_increment=1]
        Response[日別データ配列]
    end
    
    subgraph Aggregate [集約処理]
        Group[クリエイティブ名で<br/>グループ化]
        Calc[加重平均計算<br/>CTR, CPM, CPC]
        Score[疲労度スコア計算]
    end
    
    subgraph Output [出力]
        Table[テーブル表示用<br/>データ配列]
    end
    
    DateRange --> Convert
    Convert --> Build
    Build --> Request
    Request --> Response
    Response --> Group
    Group --> Calc
    Calc --> Score
    Score --> Table
```

## エラーハンドリングフロー

```mermaid
flowchart TD
    API[API呼び出し] --> Check{エラーチェック}
    Check -->|成功| Success[データ処理]
    Check -->|エラー| ErrorType{エラー種別判定}
    
    ErrorType -->|ネットワーク| Network[ネットワークエラー]
    ErrorType -->|認証| Auth[認証エラー]
    ErrorType -->|レート制限| RateLimit[レート制限]
    ErrorType -->|その他| Other[一般エラー]
    
    Network --> Retry{リトライ可能?}
    Retry -->|Yes| Wait1[待機]
    Wait1 --> API
    Retry -->|No| ShowError1[エラー表示]
    
    Auth --> RefreshToken[トークンリフレッシュ]
    RefreshToken --> CheckRefresh{成功?}
    CheckRefresh -->|Yes| API
    CheckRefresh -->|No| ReAuth[再認証画面]
    
    RateLimit --> Wait2[Retry-After待機]
    Wait2 --> API
    
    Other --> ShowError2[エラー表示]
    
    Success --> End([完了])
    ShowError1 --> End
    ShowError2 --> End
    ReAuth --> End
```

## キャッシュ管理フロー

```mermaid
flowchart TD
    Request([データ要求]) --> BuildKey[キャッシュキー生成<br/>accountId-dateRange-timestamp]
    BuildKey --> CheckCache{キャッシュ確認}
    
    CheckCache -->|存在| ValidateCache{有効期限確認}
    ValidateCache -->|有効| ReturnCache[キャッシュデータ返却]
    ValidateCache -->|期限切れ| InvalidateCache[キャッシュ削除]
    
    CheckCache -->|なし| FetchAPI[API呼び出し]
    InvalidateCache --> FetchAPI
    
    FetchAPI --> SaveCache[キャッシュ保存]
    SaveCache --> CheckSize{容量確認}
    CheckSize -->|制限内| StoreCache[localStorage保存]
    CheckSize -->|制限超過| LRU[LRU削除]
    LRU --> StoreCache
    
    StoreCache --> ReturnData[データ返却]
    ReturnCache --> End([完了])
    ReturnData --> End
```

## パフォーマンス最適化フロー

```mermaid
flowchart LR
    subgraph Initial [初期化]
        Load[ページロード]
        Check[キャッシュ確認]
    end
    
    subgraph Optimization [最適化]
        Memo[useMemo/<br/>useCallback]
        Batch[バッチ処理]
        Lazy[遅延ローディング]
    end
    
    subgraph Rendering [レンダリング]
        Virtual[仮想スクロール]
        Progressive[プログレッシブ<br/>レンダリング]
    end
    
    Load --> Check
    Check --> Memo
    Memo --> Batch
    Batch --> Lazy
    Lazy --> Virtual
    Virtual --> Progressive
```

## データ型の流れ

```mermaid
flowchart TD
    subgraph Frontend Types
        DateRange[DateRangeFilter型]
        UIState[UI State型]
        FatigueData[FatigueData型]
    end
    
    subgraph API Types
        APIParams[APIパラメータ型]
        APIResponse[APIレスポンス型]
        TimeSeriesData[時系列データ型]
    end
    
    subgraph Processed Types
        AggregatedData[集約データ型]
        EnrichedData[拡張データ型]
        DisplayData[表示データ型]
    end
    
    DateRange --> APIParams
    APIParams --> APIResponse
    APIResponse --> TimeSeriesData
    TimeSeriesData --> AggregatedData
    AggregatedData --> EnrichedData
    EnrichedData --> FatigueData
    FatigueData --> DisplayData
    DisplayData --> UIState
```

## 並行処理フロー

```mermaid
flowchart TD
    Start([複数データ要求]) --> Fork{並行処理分岐}
    
    Fork --> Task1[時系列データ取得]
    Fork --> Task2[プラットフォーム<br/>データ取得]
    Fork --> Task3[クリエイティブ<br/>情報取得]
    
    Task1 --> Promise1[Promise 1]
    Task2 --> Promise2[Promise 2]
    Task3 --> Promise3[Promise 3]
    
    Promise1 --> Wait[Promise.all()]
    Promise2 --> Wait
    Promise3 --> Wait
    
    Wait --> Merge[データ統合]
    Merge --> End([完了])
```

---

*作成日: 2024年12月*
*バージョン: 1.0*