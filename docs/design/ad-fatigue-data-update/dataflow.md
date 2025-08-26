# データフロー図

## システム全体データフロー

```mermaid
flowchart TD
    User[マーケター] --> Dashboard[FatigueDashboard]
    Dashboard --> UpdateBtn[UpdateButton]
    UpdateBtn --> AdFatigue[useAdFatigue Hook]
    
    AdFatigue --> Fetcher[useMetaApiFetcher]
    AdFatigue --> Cache[useConvexCache]
    
    Fetcher --> ConvexAction[Convex HTTP Action]
    ConvexAction --> MetaAPI[Meta Graph API]
    
    MetaAPI --> DataProcess[Data Processing]
    DataProcess --> Calculator[FatigueCalculator]
    Calculator --> ConvexDB[(Convex Database)]
    
    ConvexDB --> Cache
    Cache --> Dashboard
    
    DataProcess --> ErrorHandler[Error Handler]
    ErrorHandler --> AlertUI[Alert Component]
    AlertUI --> Dashboard
```

## ユーザーインタラクションフロー

```mermaid
sequenceDiagram
    participant U as マーケター
    participant D as ダッシュボード
    participant B as 更新ボタン
    participant H as useAdFatigue
    participant API as Meta API
    participant DB as Convex DB
    
    U->>D: ページアクセス
    D->>H: 初期データ取得
    H->>DB: キャッシュ確認
    DB-->>H: キャッシュデータ
    H-->>D: 表示データ
    D-->>U: ダッシュボード表示
    
    Note over U,D: ユーザーが更新を実行
    U->>B: 更新ボタンクリック
    B->>H: refetch()実行
    
    Note over H: 更新処理開始
    H->>D: ローディング状態
    D-->>U: スピナー表示
    
    H->>API: 最新データリクエスト
    API-->>H: 広告データ
    H->>H: 疲労度計算
    H->>DB: データ保存
    H->>D: 更新完了
    D-->>U: 新しいデータ表示
```

## データ更新処理フロー

```mermaid
flowchart TD
    Start([更新開始]) --> CheckAccount{アカウント選択済み?}
    CheckAccount -->|No| HideButton[ボタン非表示]
    CheckAccount -->|Yes| CheckRunning{実行中?}
    
    CheckRunning -->|Yes| DisableButton[ボタン無効化]
    CheckRunning -->|No| SetLoading[ローディング状態設定]
    
    SetLoading --> CheckCache{キャッシュ有効?}
    CheckCache -->|Yes| UseCache[キャッシュデータ表示]
    CheckCache -->|No| FetchAPI[Meta API呼び出し]
    
    UseCache --> FetchAPI
    
    FetchAPI --> CheckAuth{認証OK?}
    CheckAuth -->|No| AuthError[認証エラー処理]
    CheckAuth -->|Yes| CheckNetwork{ネットワークOK?}
    
    CheckNetwork -->|No| NetworkError[ネットワークエラー]
    CheckNetwork -->|Yes| ValidateData{データ有効?}
    
    ValidateData -->|No| DataError[データエラー]
    ValidateData -->|Yes| Calculate[疲労度計算]
    
    Calculate --> UpdateCache[キャッシュ更新]
    UpdateCache --> UpdateUI[UI更新]
    UpdateUI --> Success([更新完了])
    
    AuthError --> ShowAuthAlert[認証エラーアラート]
    NetworkError --> ShowNetworkAlert[ネットワークエラーアラート]
    DataError --> ShowDataAlert[データエラーアラート]
    
    ShowAuthAlert --> End([終了])
    ShowNetworkAlert --> End
    ShowDataAlert --> End
    Success --> End
```

## エラーハンドリングフロー

```mermaid
flowchart TD
    Error[エラー発生] --> ClassifyError{エラー分類}
    
    ClassifyError -->|Token Invalid| TokenError[トークンエラー]
    ClassifyError -->|Network Fail| NetworkFail[ネットワーク障害]
    ClassifyError -->|API Rate Limit| RateLimit[レート制限]
    ClassifyError -->|Data Invalid| DataInvalid[データ不正]
    ClassifyError -->|API Maintenance| Maintenance[メンテナンス]
    
    TokenError --> ShowTokenAlert[トークン再設定リンク表示]
    NetworkFail --> ShowRetryOption[再試行オプション表示]
    RateLimit --> ShowWaitMessage[待機メッセージ表示]
    DataInvalid --> ShowValidationError[検証エラー表示]
    Maintenance --> FallbackCache[キャッシュフォールバック]
    
    ShowTokenAlert --> UserAction{ユーザーアクション}
    ShowRetryOption --> UserAction
    ShowWaitMessage --> AutoRetry[自動再試行]
    ShowValidationError --> LogError[エラーログ記録]
    FallbackCache --> ShowCacheMessage[キャッシュ利用通知]
    
    UserAction -->|Link Click| RedirectSetup[設定画面遷移]
    UserAction -->|Retry Click| RetryFetch[再取得実行]
    UserAction -->|Cancel| CancelUpdate[更新キャンセル]
    
    AutoRetry --> RetryFetch
    LogError --> End([終了])
    ShowCacheMessage --> End
    RedirectSetup --> End
    RetryFetch --> Start([再試行開始])
    CancelUpdate --> End
```

## 疲労度計算データフロー

```mermaid
flowchart TD
    RawData[Meta API生データ] --> Validator[データ検証]
    Validator --> ValidData[有効データ]
    Validator --> InvalidData[無効データ]
    
    InvalidData --> ErrorLog[エラーログ]
    ValidData --> Extractor[メトリクス抽出]
    
    Extractor --> BasicMetrics[基本メトリクス]
    BasicMetrics --> CTR[CTR]
    BasicMetrics --> CPM[CPM]  
    BasicMetrics --> Frequency[Frequency]
    BasicMetrics --> Impressions[Impressions]
    BasicMetrics --> Clicks[Clicks]
    
    CTR --> CreativeFatigue[クリエイティブ疲労度]
    CPM --> AlgorithmFatigue[アルゴリズム疲労度]
    Frequency --> AudienceFatigue[オーディエンス疲労度]
    
    CreativeFatigue --> Calculator[疲労度計算エンジン]
    AlgorithmFatigue --> Calculator
    AudienceFatigue --> Calculator
    
    Calculator --> ScoreCalc[スコア計算 0-100]
    ScoreCalc --> StatusDetermination[ステータス判定]
    
    StatusDetermination --> Healthy[Healthy: 80-100]
    StatusDetermination --> Warning[Warning: 50-79]
    StatusDetermination --> Critical[Critical: 0-49]
    
    Healthy --> FinalData[最終データ]
    Warning --> FinalData
    Critical --> FinalData
    
    FinalData --> CacheUpdate[キャッシュ更新]
    FinalData --> UIUpdate[UI更新]
    
    ErrorLog --> End([終了])
    CacheUpdate --> End
    UIUpdate --> End
```

## キャッシュ戦略フロー

```mermaid
flowchart TD
    DataRequest[データリクエスト] --> CheckCache{キャッシュ確認}
    
    CheckCache -->|Hit & Valid| CacheData[キャッシュデータ]
    CheckCache -->|Miss| FetchFresh[新規取得]
    CheckCache -->|Hit & Expired| CheckStale{Stale許可?}
    
    CheckStale -->|Yes| StaleData[期限切れデータ]
    CheckStale -->|No| FetchFresh
    
    CacheData --> SetDataSource[データソース: キャッシュ]
    StaleData --> SetDataSource
    FetchFresh --> APICall[API呼び出し]
    
    APICall --> APISuccess{API成功?}
    APISuccess -->|Yes| FreshData[最新データ]
    APISuccess -->|No| CheckFallback{フォールバック可能?}
    
    CheckFallback -->|Yes| FallbackCache[キャッシュフォールバック]
    CheckFallback -->|No| ErrorResponse[エラーレスポンス]
    
    FreshData --> UpdateCache[キャッシュ更新]
    FreshData --> SetDataSourceAPI[データソース: API]
    FallbackCache --> SetDataSourceCache[データソース: キャッシュ(Fallback)]
    
    UpdateCache --> CacheData
    SetDataSource --> DisplayData[データ表示]
    SetDataSourceAPI --> DisplayData
    SetDataSourceCache --> DisplayData
    ErrorResponse --> ErrorDisplay[エラー表示]
    
    DisplayData --> End([完了])
    ErrorDisplay --> End
```

## 同時実行制御フロー

```mermaid
flowchart TD
    Request[更新リクエスト] --> CheckLock{実行ロック確認}
    
    CheckLock -->|Locked| WaitingState[待機状態]
    CheckLock -->|Unlocked| AcquireLock[ロック取得]
    
    WaitingState --> CheckTimeout{タイムアウト?}
    CheckTimeout -->|No| CheckLock
    CheckTimeout -->|Yes| TimeoutError[タイムアウトエラー]
    
    AcquireLock --> ExecuteUpdate[更新実行]
    ExecuteUpdate --> ProcessData[データ処理]
    
    ProcessData --> Success{処理成功?}
    Success -->|Yes| UpdateResult[結果更新]
    Success -->|No| ErrorResult[エラー結果]
    
    UpdateResult --> ReleaseLock[ロック解放]
    ErrorResult --> ReleaseLock
    TimeoutError --> ReleaseLock
    
    ReleaseLock --> NotifyWaiting[待機中リクエスト通知]
    NotifyWaiting --> End([完了])
```

## レート制限管理フロー

```mermaid
flowchart TD
    APIRequest[API リクエスト] --> CheckRate{レート制限チェック}
    
    CheckRate -->|OK| ExecuteRequest[リクエスト実行]
    CheckRate -->|Near Limit| ShowWarning[制限警告表示]
    CheckRate -->|Exceeded| BlockRequest[リクエストブロック]
    
    ShowWarning --> ExecuteRequest
    BlockRequest --> CalculateWait[待機時間計算]
    
    ExecuteRequest --> UpdateCounter[カウンター更新]
    CalculateWait --> ShowWaitMessage[待機メッセージ]
    
    UpdateCounter --> APICall[Meta API 呼び出し]
    ShowWaitMessage --> WaitTimer[待機タイマー]
    
    APICall --> APIResponse[API レスポンス]
    WaitTimer --> TimerEnd{タイマー終了?}
    
    TimerEnd -->|No| WaitTimer
    TimerEnd -->|Yes| EnableRetry[再試行有効化]
    
    APIResponse --> CheckStatus{ステータス確認}
    EnableRetry --> RetryButton[再試行ボタン表示]
    
    CheckStatus -->|200| Success[成功]
    CheckStatus -->|429| RateLimited[レート制限応答]
    CheckStatus -->|Error| APIError[APIエラー]
    
    RateLimited --> ExtendWait[待機時間延長]
    ExtendWait --> WaitTimer
    
    Success --> End([完了])
    APIError --> End
    RetryButton --> End
```