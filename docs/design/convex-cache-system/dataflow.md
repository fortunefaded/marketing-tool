# データフロー図

## システム全体のデータフロー

```mermaid
graph TB
    subgraph "Frontend Layer"
        A[React Component] --> B[3-Layer Cache Manager]
        B --> C[Memory Cache L1]
        B --> D[Convex Cache L2]
        B --> E[Meta API L3]
    end
    
    subgraph "Convex Layer" 
        F[Convex Database]
        G[Scheduled Functions]
        H[Reactive Queries]
        F <--> H
        G --> F
    end
    
    subgraph "External APIs"
        I[Meta Graph API v23.0]
        J[Meta Authentication]
    end
    
    subgraph "Background Processing"
        K[Data Freshness Monitor]
        L[Differential Update Engine]
        M[Error Recovery System]
    end
    
    %% Data Flow
    C -.->|Miss| D
    D -.->|Miss| E
    E --> I
    D <--> F
    H -.->|Real-time| A
    
    %% Background Processing
    G --> K
    K --> L
    L --> I
    L --> F
    M --> L
    
    %% Authentication
    E --> J
    
    classDef cache fill:#e1f5fe
    classDef convex fill:#f3e5f5
    classDef api fill:#fff3e0
    classDef bg fill:#e8f5e8
    
    class C,D,E cache
    class F,G,H convex
    class I,J api
    class K,L,M bg
```

## ユーザーインタラクションフロー

```mermaid
sequenceDiagram
    participant U as User
    participant RC as React Component
    participant CM as Cache Manager
    participant L1 as Memory Cache
    participant L2 as Convex DB
    participant L3 as Meta API
    participant WS as WebSocket

    Note over U,WS: 通常のデータ取得フロー
    
    U->>RC: Load /ad-fatigue page
    RC->>CM: Request insights data
    CM->>L1: Check memory cache
    
    alt Cache Hit (L1)
        L1-->>CM: Return cached data (< 10ms)
        CM-->>RC: Data available
        RC-->>U: Display data instantly
    else Cache Miss (L1)
        CM->>L2: Query Convex DB
        
        alt Cache Hit (L2)
            L2-->>CM: Return persisted data (< 100ms)
            CM->>L1: Update memory cache
            CM-->>RC: Data available
            RC-->>U: Display data quickly
        else Cache Miss (L2)
            CM->>L3: Call Meta API
            L3->>Meta API: Fetch fresh data
            Meta API-->>L3: Return insights
            L3-->>CM: Fresh data (< 3s)
            CM->>L2: Store in Convex
            CM->>L1: Update memory cache
            CM-->>RC: Data available
            RC-->>U: Display data
        end
    end
    
    Note over U,WS: リアルタイム更新
    WS->>RC: Data updated notification
    RC-->>U: Auto-refresh display
```

## 差分更新メカニズム

```mermaid
sequenceDiagram
    participant S as Scheduler
    participant FM as Freshness Monitor
    participant DE as Differential Engine
    participant MA as Meta API
    participant DB as Convex DB
    participant C as All Clients

    Note over S,C: 10分間隔の自動更新

    S->>FM: Check data freshness
    FM->>DB: Get last update timestamps
    DB-->>FM: Timestamp data
    
    FM->>FM: Analyze freshness by date range
    Note over FM: Day 0: 3h threshold<br/>Day 1-2: 6h threshold<br/>Day 2-3: 24h threshold<br/>Day 3+: No update needed
    
    alt Data needs update
        FM->>DE: Trigger differential update
        DE->>DE: Calculate required date ranges
        Note over DE: Smart range calculation:<br/>last_30d → only update Day 28-30<br/>90% API call reduction
        
        DE->>MA: Fetch only stale data
        MA->>Meta API: API calls (minimal)
        Meta API-->>MA: Fresh insights
        MA-->>DE: Updated data
        
        DE->>DB: Upsert new data
        DB->>C: WebSocket broadcast (< 100ms)
        C-->>Users: Real-time UI update
        
    else Data is fresh
        FM->>S: No update needed
        S->>S: Sleep until next cycle
    end
```

## エラー処理とフォールバックフロー

```mermaid
graph TD
    A[API Request] --> B{Request Success?}
    
    B -->|Yes| C[Update Cache Layers]
    B -->|No| D{Error Type?}
    
    D -->|Rate Limit| E[Exponential Backoff]
    D -->|Network Error| F[Retry Logic]
    D -->|Auth Error| G[Token Refresh]
    D -->|Unknown Error| H[Log & Alert]
    
    E --> I{Backoff Complete?}
    I -->|Yes| A
    I -->|No| J[Wait & Retry]
    J --> A
    
    F --> K{Retry Count < 3?}
    K -->|Yes| L[Wait 2^n seconds]
    K -->|No| M[Fallback to Cache]
    L --> A
    
    G --> N[Refresh Meta Token]
    N --> O{Token Valid?}
    O -->|Yes| A
    O -->|No| P[Admin Notification]
    
    M --> Q[Display Cached Data]
    Q --> R[Show Offline Warning]
    
    C --> S[Success Response]
    P --> T[Error Response]
    R --> U[Degraded Mode]
    
    classDef success fill:#c8e6c9
    classDef error fill:#ffcdd2
    classDef warning fill:#fff3c4
    classDef process fill:#e1f5fe
    
    class C,S success
    class D,H,P,T error
    class E,F,G,M,Q,R,U warning
    class I,K,N,O process
```

## データ鮮度管理フロー

```mermaid
graph TD
    subgraph "Data Maturity Lifecycle"
        A[Day 0: Realtime] --> B[Day 1-2: Near-Realtime]
        B --> C[Day 2-3: Stabilizing]
        C --> D[Day 3+: Finalized]
    end
    
    subgraph "Update Frequency"
        A --> E[3 hours interval]
        B --> F[6 hours interval] 
        C --> G[24 hours interval]
        D --> H[No updates needed]
    end
    
    subgraph "Update Priority"
        E --> I[High Priority]
        F --> J[Medium Priority]
        G --> K[Low Priority]
        H --> L[Archived]
    end
    
    subgraph "API Strategy"
        I --> M[Direct Meta API]
        J --> N[Differential API]
        K --> O[Batch Update]
        L --> P[Convex Only]
    end
    
    classDef realtime fill:#ffebee
    classDef near fill:#fff3e0
    classDef stable fill:#e8f5e8
    classDef final fill:#f3e5f5
    
    class A,E,I,M realtime
    class B,F,J,N near
    class C,G,K,O stable
    class D,H,L,P final
```

## キャッシュ戦略とデータフロー

```mermaid
graph LR
    subgraph "L1: Memory Cache (React)"
        A1[Component State]
        A2[useRef Map]
        A3[Session Only]
        A1 --> A2 --> A3
    end
    
    subgraph "L2: Convex Cache (Persistent)"
        B1[metaInsights Table]
        B2[Real-time Sync]
        B3[Cross-device Share]
        B1 --> B2 --> B3
    end
    
    subgraph "L3: Meta API (Source of Truth)"
        C1[Graph API v23.0]
        C2[Differential Fetch]
        C3[Rate Limited]
        C1 --> C2 --> C3
    end
    
    A3 -.->|Miss < 10ms| B1
    B3 -.->|Miss < 100ms| C1
    C3 -->|Fresh Data < 3s| B1
    B1 -->|Update < 100ms| A1
    
    subgraph "Performance Metrics"
        D1[Cache Hit Rate: 95%]
        D2[API Reduction: 90%]
        D3[Response Time: < 100ms]
    end
    
    classDef memory fill:#e3f2fd
    classDef convex fill:#f1f8e9
    classDef api fill:#fff8e1
    classDef metrics fill:#fce4ec
    
    class A1,A2,A3 memory
    class B1,B2,B3 convex
    class C1,C2,C3 api
    class D1,D2,D3 metrics
```

## リアルタイム同期メカニズム

```mermaid
sequenceDiagram
    participant U1 as User 1
    participant U2 as User 2
    participant C1 as Client 1
    participant C2 as Client 2
    participant WS as WebSocket Server
    participant DB as Convex DB
    participant API as Meta API

    Note over U1,API: リアルタイム同期シナリオ
    
    U1->>C1: Trigger data refresh
    C1->>API: Fetch latest data
    API-->>C1: Fresh insights
    C1->>DB: Update database
    
    DB->>WS: Data change event
    WS->>C1: Confirm update (< 50ms)
    WS->>C2: Broadcast update (< 100ms)
    
    C1-->>U1: Show updated data
    C2-->>U2: Auto-refresh display
    
    Note over U1,API: 楽観的更新
    
    U1->>C1: Request data change
    C1-->>U1: Immediate UI update
    C1->>DB: Optimistic write
    
    alt Write Success
        DB->>WS: Success confirmation
        WS->>C1: Confirm success
        WS->>C2: Broadcast change
    else Write Failure
        DB->>WS: Error notification
        WS->>C1: Rollback signal
        C1-->>U1: Revert UI changes
        C1-->>U1: Show error message
    end
```

## バックグラウンド処理フロー

```mermaid
graph TD
    subgraph "Convex Scheduled Functions"
        A[Every 10 minutes] --> B[Data Freshness Check]
        C[Every 1 hour] --> D[Cache Cleanup]
        E[Every 6 hours] --> F[Health Check]
        G[Every 24 hours] --> H[Data Integrity Verification]
    end
    
    B --> I{Data Stale?}
    I -->|Yes| J[Queue Update Job]
    I -->|No| K[Skip Update]
    
    J --> L[Differential API Call]
    L --> M[Update Database]
    M --> N[Notify Clients]
    
    D --> O[Remove Expired Entries]
    O --> P[Optimize Memory Usage]
    
    F --> Q[Check API Connectivity]
    Q --> R{System Healthy?}
    R -->|No| S[Alert Administrator]
    R -->|Yes| T[Log Status]
    
    H --> U[Compare Data Checksums]
    U --> V{Integrity OK?}
    V -->|No| W[Auto-repair from Backup]
    V -->|Yes| X[Archive Old Data]
    
    classDef scheduler fill:#e8eaf6
    classDef check fill:#f3e5f5
    classDef action fill:#e0f2f1
    classDef alert fill:#ffebee
    
    class A,C,E,G scheduler
    class B,D,F,H,I,Q,U,V check
    class J,L,M,N,O,P,X action
    class S,W alert
```

このデータフローにより、要件で定義された全ての機能（データ一貫性、高速レスポンス、API削減、リアルタイム同期）を実現し、システム全体の信頼性とパフォーマンスを保証する。