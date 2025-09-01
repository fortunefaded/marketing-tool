/**
 * Convexベースキャッシュシステム 高度機能拡張
 *
 * バックプレッシャー対策、キャッシュウォーミング、データ圧縮、
 * エラーリカバリーの詳細実装を含む拡張機能定義
 */

// =============================================================================
// 1. バックプレッシャー対策
// =============================================================================

/**
 * バックプレッシャー制御設定
 * システム過負荷を防ぐための流量制御機構
 */
export interface BackpressureConfig {
  // 基本制限
  maxConcurrentRequests: number // 同時リクエスト上限 (デフォルト: 10)
  queueSize: number // 待機キューサイズ (デフォルト: 100)
  timeoutMs: number // タイムアウト時間 (デフォルト: 30000)

  // サーキットブレーカー
  circuitBreakerThreshold: number // エラー率閾値 (デフォルト: 0.5)
  circuitBreakerWindowMs: number // 監視ウィンドウ (デフォルト: 60000)
  circuitBreakerCooldownMs: number // クールダウン期間 (デフォルト: 30000)

  // アダプティブ制御
  adaptiveScaling: {
    enabled: boolean // 動的スケーリング有効化
    targetLatencyMs: number // 目標レイテンシ
    scaleUpThreshold: number // スケールアップ閾値
    scaleDownThreshold: number // スケールダウン閾値
  }

  // 優先度制御
  priorityLevels: {
    critical: number // 最重要リクエストの割当て比率
    high: number // 高優先度の割当て比率
    normal: number // 通常優先度の割当て比率
    low: number // 低優先度の割当て比率
  }
}

/**
 * デフォルトのバックプレッシャー設定
 */
export const DEFAULT_BACKPRESSURE_CONFIG: BackpressureConfig = {
  maxConcurrentRequests: 10,
  queueSize: 100,
  timeoutMs: 30000,
  circuitBreakerThreshold: 0.5,
  circuitBreakerWindowMs: 60000,
  circuitBreakerCooldownMs: 30000,
  adaptiveScaling: {
    enabled: true,
    targetLatencyMs: 100,
    scaleUpThreshold: 0.8,
    scaleDownThreshold: 0.3,
  },
  priorityLevels: {
    critical: 0.4,
    high: 0.3,
    normal: 0.2,
    low: 0.1,
  },
}

/**
 * バックプレッシャー状態管理
 */
export interface BackpressureState {
  currentConcurrentRequests: number
  queuedRequests: number
  circuitBreakerState: 'closed' | 'open' | 'half-open'
  lastCircuitBreakerTrip?: Date
  errorRate: number
  averageLatency: number
  systemLoad: number
}

/**
 * リクエスト優先度
 */
export type RequestPriority = 'critical' | 'high' | 'normal' | 'low'

/**
 * キューイングされたリクエスト
 */
export interface QueuedRequest {
  id: string
  priority: RequestPriority
  enqueuedAt: Date
  timeoutAt: Date
  retryCount: number
  callback: () => Promise<any>
  reject: (error: Error) => void
}

// =============================================================================
// 2. キャッシュウォーミング戦略
// =============================================================================

/**
 * キャッシュウォーミング戦略設定
 * システム起動時やオフピーク時にキャッシュを事前準備
 */
export interface CacheWarmingStrategy {
  // 基本設定
  enabled: boolean // ウォーミング有効化
  preloadPatterns: DateRangePreset[] // 事前読み込みパターン
  warmingSchedule: string // Cron形式 (例: "0 3 * * *")
  priority: 'low' | 'medium' | 'high' // ウォーミング優先度

  // 詳細設定
  accounts: {
    includeAll: boolean // 全アカウント対象
    specificAccountIds?: string[] // 特定アカウントのみ
    excludeAccountIds?: string[] // 除外アカウント
  }

  // 段階的ウォーミング
  progressive: {
    enabled: boolean // 段階的ウォーミング有効化
    batchSize: number // バッチサイズ
    delayBetweenBatchesMs: number // バッチ間隔
    maxParallelBatches: number // 並列バッチ数
  }

  // スマートウォーミング
  intelligent: {
    enabled: boolean // AI予測ベースウォーミング
    usagePatternAnalysis: boolean // 使用パターン分析
    predictivePreloading: boolean // 予測的プリロード
    historicalDataDays: number // 分析用履歴日数
  }

  // リソース管理
  resourceLimits: {
    maxMemoryMb: number // 最大メモリ使用量
    maxApiCallsPerHour: number // 時間あたりAPI呼び出し上限
    cpuThreshold: number // CPU使用率閾値
  }
}

/**
 * デフォルトのキャッシュウォーミング戦略
 */
export const DEFAULT_WARMING_STRATEGY: CacheWarmingStrategy = {
  enabled: true,
  preloadPatterns: ['yesterday', 'last_7d', 'last_30d'],
  warmingSchedule: '0 3 * * *', // 毎日午前3時
  priority: 'low',
  accounts: {
    includeAll: true,
  },
  progressive: {
    enabled: true,
    batchSize: 5,
    delayBetweenBatchesMs: 5000,
    maxParallelBatches: 2,
  },
  intelligent: {
    enabled: false,
    usagePatternAnalysis: true,
    predictivePreloading: true,
    historicalDataDays: 30,
  },
  resourceLimits: {
    maxMemoryMb: 200,
    maxApiCallsPerHour: 100,
    cpuThreshold: 0.7,
  },
}

/**
 * ウォーミングジョブ状態
 */
export interface WarmingJobStatus {
  jobId: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  startedAt?: Date
  completedAt?: Date
  progress: {
    totalItems: number
    processedItems: number
    successCount: number
    errorCount: number
  }
  estimatedTimeRemaining?: number
  errors?: string[]
}

// =============================================================================
// 3. データ圧縮設定
// =============================================================================

/**
 * データ圧縮設定
 * 大量データの効率的な保存と転送のための圧縮機構
 */
export interface CompressionConfig {
  // 基本設定
  enabled: boolean // 圧縮有効化
  algorithm: 'gzip' | 'brotli' | 'lz4' // 圧縮アルゴリズム
  threshold: number // 圧縮対象サイズ閾値 (bytes)

  // アルゴリズム別設定
  algorithmOptions: {
    gzip?: {
      level: number // 圧縮レベル (1-9)
      memLevel: number // メモリレベル (1-9)
      strategy: number // 圧縮戦略
    }
    brotli?: {
      quality: number // 品質 (0-11)
      lgWin: number // ウィンドウサイズ
      mode: 'generic' | 'text' | 'font'
    }
    lz4?: {
      level: number // 圧縮レベル
      blockMaxSize: number // ブロック最大サイズ
    }
  }

  // 選択的圧縮
  selective: {
    enabled: boolean // 選択的圧縮有効化
    includePatterns?: string[] // 圧縮対象パターン
    excludePatterns?: string[] // 圧縮除外パターン
    mimeTypes?: string[] // 対象MIMEタイプ
  }

  // パフォーマンス設定
  performance: {
    asyncCompression: boolean // 非同期圧縮
    compressionWorkers: number // 圧縮ワーカー数
    decompressionCache: boolean // 展開キャッシュ
    cacheSize: number // キャッシュサイズ
  }

  // 統計収集
  metrics: {
    trackCompressionRatio: boolean // 圧縮率追跡
    trackProcessingTime: boolean // 処理時間追跡
    reportingInterval: number // レポート間隔 (ms)
  }
}

/**
 * デフォルトの圧縮設定
 */
export const DEFAULT_COMPRESSION_CONFIG: CompressionConfig = {
  enabled: true,
  algorithm: 'gzip',
  threshold: 10240, // 10KB
  algorithmOptions: {
    gzip: {
      level: 6,
      memLevel: 8,
      strategy: 0,
    },
  },
  selective: {
    enabled: true,
    includePatterns: ['*.json', '*.txt'],
    mimeTypes: ['application/json', 'text/plain'],
  },
  performance: {
    asyncCompression: true,
    compressionWorkers: 2,
    decompressionCache: true,
    cacheSize: 100,
  },
  metrics: {
    trackCompressionRatio: true,
    trackProcessingTime: true,
    reportingInterval: 60000,
  },
}

/**
 * 圧縮統計
 */
export interface CompressionStats {
  totalCompressed: number
  totalDecompressed: number
  averageCompressionRatio: number
  averageCompressionTimeMs: number
  averageDecompressionTimeMs: number
  bytesSaved: number
  compressionErrors: number
}

// =============================================================================
// 4. エラーリカバリー戦略（詳細化）
// =============================================================================

/**
 * エラーリカバリー戦略
 * 障害発生時の自動回復メカニズムの詳細定義
 */
export interface ErrorRecoveryStrategy {
  // リトライポリシー
  retryPolicy: {
    maxAttempts: number // 最大リトライ回数
    initialDelayMs: number // 初回遅延
    backoffMultiplier: number // バックオフ乗数
    maxBackoffMs: number // 最大バックオフ時間
    jitterEnabled: boolean // ジッター有効化
    retryableErrors: string[] // リトライ可能エラーコード
  }

  // フォールバックチェーン
  fallbackChain: Array<{
    source: 'memory' | 'convex' | 'api'
    condition?: (error: Error) => boolean
    timeout?: number
  }>

  // アラート設定
  alerting: {
    enabled: boolean
    alertThreshold: number // アラート閾値（エラー数）
    alertWindowMs: number // 監視ウィンドウ
    channels: Array<{
      type: 'slack' | 'email' | 'webhook'
      config: Record<string, any>
      severity: ('info' | 'warning' | 'error' | 'critical')[]
    }>
  }

  // 自動修復
  autoHealing: {
    enabled: boolean
    strategies: Array<{
      errorPattern: RegExp // エラーパターン
      action: 'cache_clear' | 'token_refresh' | 'restart' | 'custom'
      customAction?: () => Promise<void>
      cooldownMs: number // 実行後のクールダウン
    }>
  }

  // データ整合性保護
  dataIntegrity: {
    checksumValidation: boolean // チェックサム検証
    duplicateDetection: boolean // 重複検出
    corruptionRecovery: boolean // 破損データ回復
    backupFallback: boolean // バックアップフォールバック
  }

  // 障害分離
  faultIsolation: {
    enabled: boolean
    isolationDurationMs: number // 分離期間
    healthCheckInterval: number // ヘルスチェック間隔
    recoveryThreshold: number // 回復閾値（成功率）
  }
}

/**
 * デフォルトのエラーリカバリー戦略
 */
export const DEFAULT_ERROR_RECOVERY_STRATEGY: ErrorRecoveryStrategy = {
  retryPolicy: {
    maxAttempts: 3,
    initialDelayMs: 1000,
    backoffMultiplier: 2,
    maxBackoffMs: 30000,
    jitterEnabled: true,
    retryableErrors: ['NETWORK_ERROR', 'TIMEOUT', 'RATE_LIMIT'],
  },
  fallbackChain: [
    { source: 'memory', timeout: 50 },
    { source: 'convex', timeout: 1000 },
    { source: 'api', timeout: 30000 },
  ],
  alerting: {
    enabled: true,
    alertThreshold: 10,
    alertWindowMs: 300000, // 5分
    channels: [
      {
        type: 'slack',
        config: { webhookUrl: process.env.SLACK_WEBHOOK_URL },
        severity: ['error', 'critical'],
      },
    ],
  },
  autoHealing: {
    enabled: true,
    strategies: [
      {
        errorPattern: /TOKEN_EXPIRED/,
        action: 'token_refresh',
        cooldownMs: 60000,
      },
      {
        errorPattern: /CACHE_CORRUPTION/,
        action: 'cache_clear',
        cooldownMs: 300000,
      },
    ],
  },
  dataIntegrity: {
    checksumValidation: true,
    duplicateDetection: true,
    corruptionRecovery: true,
    backupFallback: true,
  },
  faultIsolation: {
    enabled: true,
    isolationDurationMs: 300000, // 5分
    healthCheckInterval: 30000, // 30秒
    recoveryThreshold: 0.8, // 80%成功率
  },
}

// =============================================================================
// 5. Convex制限への対応
// =============================================================================

/**
 * Convex プラットフォーム制限
 * 実装時に考慮すべき制限事項
 */
export const CONVEX_LIMITS = {
  // データサイズ制限
  maxDocumentSize: 1_048_576, // 1MB per document
  maxTotalRequestSize: 16_777_216, // 16MB per request
  maxTotalResponseSize: 16_777_216, // 16MB per response

  // 実行時間制限
  maxFunctionDuration: 60_000, // 60秒
  maxActionDuration: 600_000, // 10分 (Actions)

  // 並行性制限
  maxConcurrentFunctions: 1000, // 同時実行関数数
  maxConcurrentMutations: 100, // 同時実行ミューテーション

  // レート制限（無料プラン）
  monthlyRequestLimit: 1_000_000, // 月間リクエスト数
  monthlyBandwidthGb: 5, // 月間転送量
  monthlyStorageGb: 1, // ストレージ容量

  // レート制限（Proプラン）
  proMonthlyRequestLimit: 25_000_000, // 月間リクエスト数
  proMonthlyBandwidthGb: 100, // 月間転送量
  proMonthlyStorageGb: 10, // ストレージ容量

  // その他の制限
  maxIndexesPerTable: 16, // テーブルあたりインデックス数
  maxFieldsPerDocument: 1024, // ドキュメントあたりフィールド数
  maxArrayLength: 8192, // 配列の最大長
  maxStringLength: 1_048_576, // 文字列の最大長

  // WebSocket制限
  maxConcurrentWebSockets: 10_000, // 同時WebSocket接続数
  maxWebSocketMessageSize: 1_048_576, // WebSocketメッセージサイズ

  // スケジューラー制限
  minScheduleInterval: 60_000, // 最小スケジュール間隔（1分）
  maxScheduledFunctions: 100, // スケジュールド関数数
}

/**
 * 制限チェックユーティリティ
 */
export class ConvexLimitChecker {
  /**
   * ドキュメントサイズチェック
   */
  static checkDocumentSize(doc: any): { valid: boolean; size: number; limit: number } {
    const size = new Blob([JSON.stringify(doc)]).size
    return {
      valid: size <= CONVEX_LIMITS.maxDocumentSize,
      size,
      limit: CONVEX_LIMITS.maxDocumentSize,
    }
  }

  /**
   * リクエストサイズチェック
   */
  static checkRequestSize(data: any[]): { valid: boolean; size: number; limit: number } {
    const size = new Blob([JSON.stringify(data)]).size
    return {
      valid: size <= CONVEX_LIMITS.maxTotalRequestSize,
      size,
      limit: CONVEX_LIMITS.maxTotalRequestSize,
    }
  }

  /**
   * データ分割が必要かチェック
   */
  static needsChunking(data: any[], chunkSize: number = 100): boolean {
    const totalSize = new Blob([JSON.stringify(data)]).size
    return totalSize > CONVEX_LIMITS.maxTotalRequestSize || data.length > chunkSize
  }

  /**
   * データをチャンクに分割
   */
  static chunkData<T>(data: T[], chunkSize: number = 100): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < data.length; i += chunkSize) {
      chunks.push(data.slice(i, i + chunkSize))
    }
    return chunks
  }
}

// =============================================================================
// 6. 統合設定インターフェース
// =============================================================================

/**
 * 高度機能統合設定
 * すべての拡張機能を統合した設定インターフェース
 */
export interface AdvancedCacheConfig {
  backpressure: BackpressureConfig
  warming: CacheWarmingStrategy
  compression: CompressionConfig
  errorRecovery: ErrorRecoveryStrategy

  // 機能フラグ
  features: {
    enableBackpressure: boolean
    enableWarmingStrategy: boolean
    enableCompression: boolean
    enableAdvancedRecovery: boolean
    enableMetricsCollection: boolean
  }

  // パフォーマンスプロファイル
  performanceProfile: 'aggressive' | 'balanced' | 'conservative'

  // 環境別設定
  environment: 'development' | 'staging' | 'production'
}

/**
 * デフォルトの高度機能設定
 */
export const DEFAULT_ADVANCED_CONFIG: AdvancedCacheConfig = {
  backpressure: DEFAULT_BACKPRESSURE_CONFIG,
  warming: DEFAULT_WARMING_STRATEGY,
  compression: DEFAULT_COMPRESSION_CONFIG,
  errorRecovery: DEFAULT_ERROR_RECOVERY_STRATEGY,
  features: {
    enableBackpressure: true,
    enableWarmingStrategy: true,
    enableCompression: true,
    enableAdvancedRecovery: true,
    enableMetricsCollection: true,
  },
  performanceProfile: 'balanced',
  environment: 'production',
}

// =============================================================================
// 7. 実装ヘルパー関数
// =============================================================================

/**
 * バックプレッシャーマネージャー
 */
export class BackpressureManager {
  private config: BackpressureConfig
  private state: BackpressureState
  private queue: QueuedRequest[] = []

  constructor(config: BackpressureConfig = DEFAULT_BACKPRESSURE_CONFIG) {
    this.config = config
    this.state = {
      currentConcurrentRequests: 0,
      queuedRequests: 0,
      circuitBreakerState: 'closed',
      errorRate: 0,
      averageLatency: 0,
      systemLoad: 0,
    }
  }

  /**
   * リクエストを実行またはキューに追加
   */
  async execute<T>(fn: () => Promise<T>, priority: RequestPriority = 'normal'): Promise<T> {
    // サーキットブレーカーチェック
    if (this.state.circuitBreakerState === 'open') {
      throw new Error('Circuit breaker is open')
    }

    // 同時実行数チェック
    if (this.state.currentConcurrentRequests >= this.config.maxConcurrentRequests) {
      // キューサイズチェック
      if (this.queue.length >= this.config.queueSize) {
        throw new Error('Request queue is full')
      }

      // キューに追加
      return this.enqueue(fn, priority)
    }

    // 即座に実行
    return this.executeNow(fn)
  }

  private async enqueue<T>(fn: () => Promise<T>, priority: RequestPriority): Promise<T> {
    return new Promise((resolve, reject) => {
      const request: QueuedRequest = {
        id: crypto.randomUUID(),
        priority,
        enqueuedAt: new Date(),
        timeoutAt: new Date(Date.now() + this.config.timeoutMs),
        retryCount: 0,
        callback: fn,
        reject,
      }

      // 優先度に基づいて適切な位置に挿入
      const insertIndex = this.findInsertIndex(priority)
      this.queue.splice(insertIndex, 0, request)
      this.state.queuedRequests++

      // タイムアウト設定
      setTimeout(() => {
        const index = this.queue.findIndex((r) => r.id === request.id)
        if (index !== -1) {
          this.queue.splice(index, 1)
          this.state.queuedRequests--
          reject(new Error('Request timeout in queue'))
        }
      }, this.config.timeoutMs)
    })
  }

  private findInsertIndex(priority: RequestPriority): number {
    const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 }
    const targetPriority = priorityOrder[priority]

    for (let i = 0; i < this.queue.length; i++) {
      if (priorityOrder[this.queue[i].priority] > targetPriority) {
        return i
      }
    }

    return this.queue.length
  }

  private async executeNow<T>(fn: () => Promise<T>): Promise<T> {
    this.state.currentConcurrentRequests++
    const startTime = Date.now()

    try {
      const result = await fn()
      this.updateLatency(Date.now() - startTime)
      this.processQueue()
      return result
    } catch (error) {
      this.handleError(error as Error)
      throw error
    } finally {
      this.state.currentConcurrentRequests--
    }
  }

  private updateLatency(latency: number): void {
    // 指数移動平均で更新
    const alpha = 0.2
    this.state.averageLatency = alpha * latency + (1 - alpha) * this.state.averageLatency
  }

  private handleError(error: Error): void {
    // エラー率更新
    this.state.errorRate = Math.min(1, this.state.errorRate + 0.1)

    // サーキットブレーカー判定
    if (this.state.errorRate > this.config.circuitBreakerThreshold) {
      this.tripCircuitBreaker()
    }
  }

  private tripCircuitBreaker(): void {
    this.state.circuitBreakerState = 'open'
    this.state.lastCircuitBreakerTrip = new Date()

    // クールダウン後に半開状態へ
    setTimeout(() => {
      this.state.circuitBreakerState = 'half-open'
    }, this.config.circuitBreakerCooldownMs)
  }

  private processQueue(): void {
    if (this.queue.length === 0) return
    if (this.state.currentConcurrentRequests >= this.config.maxConcurrentRequests) return

    const request = this.queue.shift()
    if (request) {
      this.state.queuedRequests--
      this.executeNow(request.callback).catch(request.reject)
    }
  }
}

// =============================================================================
// エクスポート
// =============================================================================

export { BackpressureManager, ConvexLimitChecker }

// 型エクスポート
export type { BackpressureState, QueuedRequest, WarmingJobStatus, CompressionStats }
