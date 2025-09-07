# データフロー図 - 広告疲労度スコアリングシステム

## システム全体データフロー

```mermaid
flowchart TD
    User[マーケター] --> Dashboard[疲労度ダッシュボード]
    Dashboard --> FatigueEngine[疲労度計算エンジン]
    
    MetaAPI[Meta API] --> MetricsCollector[メトリクス収集器]
    InstagramAPI[Instagram API] --> MetricsCollector
    
    MetricsCollector --> DataValidator[データ検証器]
    DataValidator --> BaselineCalc[ベースライン計算]
    DataValidator --> FatigueEngine
    
    FatigueEngine --> CreativeFatigue[クリエイティブ疲労]
    FatigueEngine --> AudienceFatigue[視聴者疲労]
    FatigueEngine --> AlgorithmFatigue[アルゴリズム疲労]
    
    CreativeFatigue --> ScoreAggregator[スコア統合器]
    AudienceFatigue --> ScoreAggregator
    AlgorithmFatigue --> ScoreAggregator
    
    ScoreAggregator --> StatusDeterminer[状態判定器]
    StatusDeterminer --> RecommendationEngine[推奨エンジン]
    
    RecommendationEngine --> ConvexDB[(Convex Database)]
    StatusDeterminer --> ConvexDB
    
    ConvexDB --> Dashboard
    StatusDeterminer --> AlertSystem[アラートシステム]
    AlertSystem --> Dashboard
```

## 疲労度計算処理フロー

```mermaid
sequenceDiagram
    participant User as マーケター
    participant UI as ダッシュボードUI
    participant Engine as 疲労度エンジン
    participant MetaAPI as Meta API
    participant InstagramAPI as Instagram API
    participant DB as Convex DB
    
    User->>UI: 疲労度分析要求
    UI->>Engine: 疲労度計算開始
    
    Note over Engine: データ収集フェーズ
    Engine->>MetaAPI: 基本メトリクス取得
    MetaAPI-->>Engine: CTR, CPM, Frequency等
    
    Engine->>InstagramAPI: 特有メトリクス取得
    InstagramAPI-->>Engine: Profile Views, Engagement等
    
    Note over Engine: ベースライン計算
    Engine->>DB: 過去30日データ取得
    DB-->>Engine: 履歴データ
    Engine->>Engine: ベースライン算出
    
    Note over Engine: 疲労度計算フェーズ
    Engine->>Engine: クリエイティブ疲労計算
    Engine->>Engine: 視聴者疲労計算  
    Engine->>Engine: アルゴリズム疲労計算
    
    Engine->>Engine: 総合スコア計算
    Engine->>Engine: 状態判定（健全/注意/危険）
    Engine->>Engine: 推奨アクション生成
    
    Note over Engine: 結果保存・通知
    Engine->>DB: 疲労度結果保存
    Engine-->>UI: 疲労度スコア返却
    UI-->>User: 結果表示
    
    alt 危険水準検知
        Engine->>UI: クリティカルアラート
        UI-->>User: 緊急通知表示
    end
```

## データ検証・品質管理フロー

```mermaid
flowchart TD
    RawData[生メトリクス] --> Validator[データ検証器]
    
    Validator --> RangeCheck[範囲チェック]
    RangeCheck --> CTRCheck{CTR > 10%?}
    CTRCheck -->|Yes| ExcludeData[データ除外]
    CTRCheck -->|No| CPMCheck{CPM <= 0?}
    
    CPMCheck -->|Yes| Interpolate[前日データで補完]
    CPMCheck -->|No| FreqCheck{Frequency > 20?}
    
    FreqCheck -->|Yes| AdminNotify[管理者通知]
    FreqCheck -->|No| ValidData[有効データ]
    
    ExcludeData --> QualityScore[品質スコア算出]
    Interpolate --> QualityScore
    AdminNotify --> QualityScore
    ValidData --> QualityScore
    
    QualityScore --> ConfidenceCheck{信頼度 >= 0.7?}
    ConfidenceCheck -->|Yes| ProcessData[データ処理続行]
    ConfidenceCheck -->|No| DelayCalculation[計算延期]
    
    ProcessData --> BaselineCalc[ベースライン計算]
    DelayCalculation --> WaitMoreData[追加データ待機]
    
    BaselineCalc --> MissingDataCheck{欠損率 > 30%?}
    MissingDataCheck -->|Yes| UseIndustryAverage[業界平均使用]
    MissingDataCheck -->|No| UseHistoricalData[履歴データ使用]
    
    UseIndustryAverage --> LowConfidence[信頼度低下]
    UseHistoricalData --> HighConfidence[信頼度維持]
    
    LowConfidence --> FatigueCalculation[疲労度計算]
    HighConfidence --> FatigueCalculation
```

## 疲労度計算アルゴリズムフロー

```mermaid
flowchart TD
    Start[計算開始] --> DataInput[メトリクス入力]
    DataInput --> BaselineInput[ベースライン入力]
    
    BaselineInput --> CreativeCalc[クリエイティブ疲労計算]
    BaselineInput --> AudienceCalc[視聴者疲労計算]
    BaselineInput --> AlgorithmCalc[アルゴリズム疲労計算]
    
    subgraph CreativeSubGraph[クリエイティブ疲労]
        CreativeCalc --> CTRDecline[CTR低下率計算]
        CTRDecline --> UniqueCTRDecline[Unique CTR低下率計算]  
        UniqueCTRDecline --> LinkCTRDecline[Link CTR低下率計算]
        LinkCTRDecline --> CreativeScore[クリエイティブスコア算出]
    end
    
    subgraph AudienceSubGraph[視聴者疲労]
        AudienceCalc --> FreqImpact[Frequency影響度計算]
        FreqImpact --> FirstImpEst[初回インプレッション推定]
        FirstImpEst --> FirstImpImpact[初回インプレッション影響度]
        FirstImpImpact --> AudienceScore[視聴者スコア算出]
    end
    
    subgraph AlgorithmSubGraph[アルゴリズム疲労]
        AlgorithmCalc --> CPMIncrease[CPM上昇率計算]
        CPMIncrease --> DeliveryVolume[配信ボリューム低下率計算]
        DeliveryVolume --> AlgorithmScore[アルゴリズムスコア算出]
    end
    
    CreativeScore --> WeightedSum[重み付き合計]
    AudienceScore --> WeightedSum
    AlgorithmScore --> WeightedSum
    
    WeightedSum --> TotalScore[総合スコア: 0-100]
    TotalScore --> StatusDetermination[状態判定]
    
    StatusDetermination --> HealthyCheck{スコア >= 80?}
    HealthyCheck -->|Yes| Healthy[健全]
    HealthyCheck -->|No| WarningCheck{スコア >= 50?}
    
    WarningCheck -->|Yes| Warning[注意]
    WarningCheck -->|No| Critical[危険]
    
    Healthy --> RecommendationGen[推奨アクション生成]
    Warning --> RecommendationGen
    Critical --> RecommendationGen
    
    RecommendationGen --> Output[計算結果出力]
```

## Instagram特有メトリクス処理フロー

```mermaid
flowchart TD
    InstagramAPI[Instagram API] --> ProfileViews[Profile Views取得]
    InstagramAPI --> EngagementData[エンゲージメントデータ取得]
    InstagramAPI --> FollowerData[フォロワーデータ取得]
    
    EngagementData --> Likes[いいね数]
    EngagementData --> Comments[コメント数] 
    EngagementData --> Saves[保存数]
    EngagementData --> Shares[シェア数]
    EngagementData --> Reach[リーチ数]
    
    Likes --> EngagementSum[エンゲージメント合計]
    Comments --> EngagementSum
    Saves --> EngagementSum
    Shares --> EngagementSum
    
    EngagementSum --> EngagementRate[エンゲージメント率計算]
    Reach --> EngagementRate
    
    ProfileViews --> ProfileVisitRate[プロフィール訪問率計算]
    FollowerData --> FollowRate[フォロー率計算]
    
    EngagementRate --> AdTypeCheck{広告タイプ判定}
    AdTypeCheck -->|Reel| ReelThreshold[基準値: 1.23%]
    AdTypeCheck -->|Feed| FeedThreshold[基準値: 0.7%]
    AdTypeCheck -->|Story| StoryThreshold[基準値: 0.5%]
    
    ReelThreshold --> ThresholdComparison[閾値比較]
    FeedThreshold --> ThresholdComparison
    StoryThreshold --> ThresholdComparison
    
    ThresholdComparison --> BelowThreshold{基準値未満?}
    BelowThreshold -->|Yes| Warning[警告生成]
    BelowThreshold -->|No| Normal[正常]
    
    ProfileVisitRate --> APIError{API取得失敗?}
    APIError -->|Yes| CTRCorrelation[CTR相関から推定]
    APIError -->|No| ActualData[実データ使用]
    
    CTRCorrelation --> EstimatedValue[推定値算出]
    ActualData --> FinalMetrics[最終メトリクス]
    EstimatedValue --> FinalMetrics
    
    Warning --> FinalMetrics
    Normal --> FinalMetrics
    FinalMetrics --> IntegrationWithMeta[Meta指標と統合]
```

## ベースライン計算・管理フロー

```mermaid
flowchart TD
    Request[ベースライン計算要求] --> AccountCheck[アカウント確認]
    AccountCheck --> DataPeriod[データ期間設定: 30日]
    
    DataPeriod --> HistoricalData[履歴データ取得]
    HistoricalData --> DataSufficient{データ十分?}
    
    DataSufficient -->|No| NewAccount[新規アカウント]
    DataSufficient -->|Yes| DataContinuity[データ継続性チェック]
    
    NewAccount --> IndustryAverage[業界平均値使用]
    
    DataContinuity --> Continuous{継続配信?}
    Continuous -->|No| SparseData[断続配信パターン]
    Continuous -->|Yes| BudgetChange[予算変更チェック]
    
    SparseData --> AvailableDataOnly[利用可能データのみ]
    AvailableDataOnly --> LowConfidence[信頼度低下]
    
    BudgetChange --> SignificantChange{50%以上変更?}
    SignificantChange -->|Yes| ExtendPeriod[計算期間延長]
    SignificantChange -->|No| StandardCalc[標準計算]
    
    ExtendPeriod --> RecalcBaseline[ベースライン再計算]
    StandardCalc --> CalcMetrics[メトリクス計算]
    
    CalcMetrics --> CTRBaseline[CTRベースライン]
    CalcMetrics --> CPMBaseline[CPMベースライン]
    CalcMetrics --> FreqBaseline[Frequencyベースライン]
    CalcMetrics --> EngagementBaseline[エンゲージメントベースライン]
    
    CTRBaseline --> BaselineValidation[ベースライン検証]
    CPMBaseline --> BaselineValidation
    FreqBaseline --> BaselineValidation
    EngagementBaseline --> BaselineValidation
    
    BaselineValidation --> ReasonableRange{妥当範囲内?}
    ReasonableRange -->|No| OutlierHandling[外れ値処理]
    ReasonableRange -->|Yes| StoreBaseline[ベースライン保存]
    
    OutlierHandling --> MedianCalculation[中央値計算]
    MedianCalculation --> StoreBaseline
    
    IndustryAverage --> StoreBaseline
    RecalcBaseline --> StoreBaseline
    LowConfidence --> StoreBaseline
    
    StoreBaseline --> VersionControl[バージョン管理]
    VersionControl --> BaselineReady[ベースライン準備完了]
```

## エラーハンドリング・フォールバックフロー  

```mermaid
flowchart TD
    APICall[API呼び出し] --> APIResponse{レスポンス確認}
    
    APIResponse -->|Success| DataValidation[データ検証]
    APIResponse -->|Error| ErrorType{エラー種別}
    
    ErrorType -->|401 Unauthorized| TokenExpired[トークン期限切れ]
    ErrorType -->|403 Forbidden| PermissionError[権限エラー]
    ErrorType -->|429 Rate Limit| RateLimited[レート制限]
    ErrorType -->|500 Server Error| ServerError[サーバーエラー]
    ErrorType -->|Network| NetworkError[ネットワークエラー]
    
    TokenExpired --> TokenRefresh[トークン更新]
    TokenRefresh --> RetryAPI[API再試行]
    
    PermissionError --> PermissionAlert[権限確認アラート]
    PermissionError --> FallbackData[フォールバックデータ]
    
    RateLimited --> WaitAndRetry[待機後再試行]
    RateLimited --> CacheData[キャッシュデータ利用]
    
    ServerError --> ExponentialBackoff[指数バックオフ]
    ExponentialBackoff --> RetryAPI
    
    NetworkError --> NetworkRetry[ネットワーク再試行]
    NetworkError --> OfflineMode[オフラインモード]
    
    DataValidation --> ValidationResult{検証結果}
    ValidationResult -->|Valid| ProcessData[データ処理]
    ValidationResult -->|Invalid| ValidationError[検証エラー]
    
    ValidationError --> PartialData{部分データ利用可能?}
    PartialData -->|Yes| ProcessPartial[部分データ処理]
    PartialData -->|No| FallbackData
    
    ProcessPartial --> QualityWarning[品質警告]
    ProcessData --> NormalProcessing[正常処理]
    
    FallbackData --> HistoricalData[履歴データ使用]
    CacheData --> CachedResults[キャッシュ結果返却]
    OfflineMode --> LocalData[ローカルデータ使用]
    
    QualityWarning --> Results[結果出力]
    NormalProcessing --> Results
    HistoricalData --> Results
    CachedResults --> Results
    LocalData --> Results
    
    RetryAPI --> MaxRetries{最大試行回数?}
    MaxRetries -->|Exceeded| FallbackData
    MaxRetries -->|Continue| APICall
```

## リアルタイム更新・通知フロー

```mermaid
flowchart TD
    ScheduledJob[定期実行ジョブ] --> BatchProcess[バッチ処理開始]
    UserTrigger[ユーザー手動更新] --> BatchProcess
    
    BatchProcess --> AccountLoop[アカウント毎処理]
    AccountLoop --> CreativeLoop[クリエイティブ毎処理]
    
    CreativeLoop --> FatigueCalc[疲労度計算]
    FatigueCalc --> ScoreComparison[前回スコア比較]
    
    ScoreComparison --> SignificantChange{大幅変化?}
    SignificantChange -->|Yes| ChangeNotification[変化通知]
    SignificantChange -->|No| NormalUpdate[通常更新]
    
    ChangeNotification --> AlertLevel{アラートレベル判定}
    AlertLevel -->|Critical| CriticalAlert[クリティカルアラート]
    AlertLevel -->|Warning| WarningAlert[警告アラート]
    AlertLevel -->|Info| InfoNotification[情報通知]
    
    CriticalAlert --> ImmediateNotify[即座通知]
    WarningAlert --> ScheduledNotify[定期通知]
    InfoNotification --> LogOnly[ログ記録のみ]
    
    ImmediateNotify --> WebSocketUpdate[WebSocket更新]
    ScheduledNotify --> EmailQueue[メール通知キュー]
    LogOnly --> AuditLog[監査ログ]
    
    WebSocketUpdate --> UIUpdate[UI即時更新]
    EmailQueue --> EmailSend[メール送信]
    AuditLog --> DatabaseLog[DB記録]
    
    NormalUpdate --> DatabaseUpdate[DB更新]
    DatabaseUpdate --> ConvexSync[Convex同期]
    ConvexSync --> ClientSync[クライアント同期]
    
    UIUpdate --> UserInterface[ユーザーインターフェース]
    ClientSync --> UserInterface
    EmailSend --> UserNotification[ユーザー通知]
    
    UserInterface --> UserAction{ユーザーアクション}
    UserAction -->|View Details| DetailView[詳細表示]
    UserAction -->|Take Action| ActionPlan[アクション実行]
    UserAction -->|Dismiss| DismissAlert[アラート解除]
    
    DetailView --> RecommendationView[推奨表示]
    ActionPlan --> AdOptimization[広告最適化]
    DismissAlert --> Continue[処理継続]
```

## パフォーマンス最適化フロー

```mermaid
flowchart TD
    BatchRequest[バッチ処理要求] --> PrioritySort[優先度ソート]
    PrioritySort --> AdSpendCheck[広告費用確認]
    
    AdSpendCheck --> HighSpend[高額広告]
    AdSpendCheck --> MediumSpend[中額広告]  
    AdSpendCheck --> LowSpend[低額広告]
    
    HighSpend --> Priority1[優先度1]
    MediumSpend --> Priority2[優先度2]
    LowSpend --> Priority3[優先度3]
    
    Priority1 --> ParallelProcess[並行処理キュー]
    Priority2 --> ParallelProcess
    Priority3 --> ParallelProcess
    
    ParallelProcess --> Worker1[ワーカー1]
    ParallelProcess --> Worker2[ワーカー2]
    ParallelProcess --> Worker3[ワーカー3]
    ParallelProcess --> WorkerN[ワーカーN]
    
    Worker1 --> CacheCheck[キャッシュ確認]
    Worker2 --> CacheCheck
    Worker3 --> CacheCheck
    WorkerN --> CacheCheck
    
    CacheCheck --> CacheHit{キャッシュヒット?}
    CacheHit -->|Yes| CacheReturn[キャッシュ返却]
    CacheHit -->|No| Calculation[疲労度計算]
    
    Calculation --> ProcessTime[処理時間測定]
    ProcessTime --> TimeCheck{200ms以内?}
    
    TimeCheck -->|Yes| NormalResult[正常結果]
    TimeCheck -->|No| OptimizationFlag[最適化フラグ]
    
    OptimizationFlag --> SimpleCalc[簡易計算モード]
    SimpleCalc --> ApproximateResult[近似結果]
    
    CacheReturn --> ResultAggregation[結果統合]
    NormalResult --> ResultAggregation
    ApproximateResult --> ResultAggregation
    
    ResultAggregation --> BatchComplete[バッチ完了]
    BatchComplete --> PerformanceLog[パフォーマンスログ]
    
    PerformanceLog --> MetricsUpdate[メトリクス更新]
    MetricsUpdate --> ThresholdCheck[閾値チェック]
    
    ThresholdCheck --> SlowProcess{処理遅延?}
    SlowProcess -->|Yes| ScaleUp[スケールアップ]
    SlowProcess -->|No| Continue[処理継続]
    
    ScaleUp --> AddWorkers[ワーカー追加]
    AddWorkers --> Continue
```