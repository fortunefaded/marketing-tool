/**
 * データ検証・正規化インターフェース定義
 * Meta APIとの数値乖離問題を解決するための型定義
 * @version 1.0
 * @date 2024-12
 */

// ============================================
// データ検証関連
// ============================================

/**
 * データ検証インターフェース
 */
export interface DataValidation {
  /**
   * APIレスポンスの検証
   */
  validateMetrics(data: AdInsight): ValidationResult;
  
  /**
   * 数値の正規化
   */
  normalizeNumericValues(value: string | number | undefined): number;
  
  /**
   * 通貨変換（円表示の場合）
   */
  applyCurrencyConversion(amount: number, currency: string): number;
  
  /**
   * パーセンテージ値の正規化
   */
  normalizePercentage(value: string | number): number;
  
  /**
   * 日付の正規化とタイムゾーン調整
   */
  normalizeDateWithTimezone(date: string, timezone: string): Date;
}

/**
 * 検証結果
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  metadata?: {
    validatedAt: Date;
    validationRules: string[];
    dataSource: string;
  };
}

/**
 * 検証エラー
 */
export interface ValidationError {
  field: string;
  value: any;
  expectedType: string;
  actualType: string;
  message: string;
  severity: 'critical' | 'error';
  suggestion?: string;
}

/**
 * 検証警告
 */
export interface ValidationWarning {
  field: string;
  value: any;
  message: string;
  threshold?: number;
  actualValue?: number;
  possibleCause?: string;
}

// ============================================
// 時系列データの整合性
// ============================================

/**
 * タイムレンジ設定
 */
export interface TimeRangeConfig {
  /**
   * アプリケーションのタイムゾーン
   */
  timezone: string; // 'Asia/Tokyo' | 'America/Los_Angeles' など
  
  /**
   * Metaアカウントのタイムゾーン
   */
  accountTimezone: string;
  
  /**
   * 夏時間調整
   */
  adjustForDST: boolean;
  
  /**
   * タイムゾーンオフセット（分単位）
   */
  timezoneOffset?: number;
  
  /**
   * 日付範囲の包含設定
   */
  inclusionMode: 'inclusive' | 'exclusive';
}

/**
 * アトリビューション設定
 */
export interface AttributionConfig {
  /**
   * クリックアトリビューション期間
   */
  clickWindow: '1d_click' | '7d_click' | '28d_click';
  
  /**
   * ビューアトリビューション期間
   */
  viewWindow: '1d_view' | '7d_view' | '28d_view';
  
  /**
   * 統一アトリビューション設定を使用
   */
  useUnifiedAttribution: boolean;
  
  /**
   * デフォルトアトリビューション設定
   */
  defaultSettings?: {
    click: string;
    view: string;
  };
}

// ============================================
// デバッグ機能
// ============================================

/**
 * デバッグ情報
 */
export interface DebugInfo {
  /**
   * セッションID（トレース用）
   */
  sessionId: string;
  
  /**
   * APIリクエスト情報
   */
  apiRequest: {
    url: string;
    params: ApiDateParams & {
      fields?: string[];
      action_attribution_windows?: string[];
      use_unified_attribution_setting?: boolean;
    };
    headers: Record<string, string>;
    timestamp: Date;
  };
  
  /**
   * APIレスポンス情報
   */
  apiResponse: {
    data: AdInsight[];
    headers: Record<string, string>;
    statusCode: number;
    timestamp: Date;
    latency: number;
  };
  
  /**
   * 処理されたデータ
   */
  processedData: {
    original: AdInsight[];
    normalized: FatigueData[];
    aggregated: AggregatedInsight[];
  };
  
  /**
   * 検証結果
   */
  validationResults: ValidationResult[];
  
  /**
   * パフォーマンス指標
   */
  performance: {
    apiCallDuration: number;
    processingDuration: number;
    totalDuration: number;
  };
  
  /**
   * タイムスタンプ
   */
  timestamp: Date;
  
  /**
   * エラー情報（もしあれば）
   */
  errors?: Array<{
    stage: 'request' | 'response' | 'processing' | 'validation';
    error: Error;
    context: any;
  }>;
}

/**
 * デバッグトレース
 */
export interface DebugTrace {
  /**
   * トレースID
   */
  traceId: string;
  
  /**
   * ステップ情報
   */
  steps: Array<{
    name: string;
    timestamp: Date;
    duration: number;
    input: any;
    output: any;
    metadata?: Record<string, any>;
  }>;
  
  /**
   * 完了ステータス
   */
  status: 'success' | 'partial' | 'failed';
}

// ============================================
// 数値正規化
// ============================================

/**
 * 通貨設定
 */
export interface CurrencyConfig {
  /**
   * アカウントの通貨
   */
  accountCurrency: string; // 'JPY', 'USD', etc.
  
  /**
   * 表示通貨
   */
  displayCurrency: string;
  
  /**
   * 為替レート
   */
  exchangeRates?: Record<string, number>;
  
  /**
   * 更新日時
   */
  ratesUpdatedAt?: Date;
  
  /**
   * 小数点以下の桁数
   */
  decimalPlaces: number;
}

/**
 * 数値正規化設定
 */
export interface NumericNormalizationConfig {
  /**
   * 通貨設定
   */
  currency: CurrencyConfig;
  
  /**
   * パーセンテージの処理
   */
  percentageHandling: {
    /**
     * APIが返す形式（0.01 or 1 for 1%）
     */
    apiFormat: 'decimal' | 'percentage';
    
    /**
     * 表示形式
     */
    displayFormat: 'decimal' | 'percentage';
  };
  
  /**
   * 丸め処理
   */
  rounding: {
    method: 'round' | 'floor' | 'ceil';
    precision: number;
  };
}

// ============================================
// データ比較
// ============================================

/**
 * Ad Managerエクスポートデータ
 */
export interface AdManagerExport {
  ad_id: string;
  ad_name: string;
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpm: number;
  cpc: number;
  frequency: number;
  reach: number;
  conversions?: number;
  roas?: number;
}

/**
 * 比較結果
 */
export interface ComparisonResult {
  /**
   * 許容範囲内でマッチするか
   */
  matches: boolean;
  
  /**
   * 各メトリクスの差異
   */
  differences: Record<string, DifferenceDetail>;
  
  /**
   * 差異の可能な原因
   */
  possibleCauses: string[];
  
  /**
   * 推奨アクション
   */
  recommendations: string[];
  
  /**
   * 詳細レポート
   */
  detailedReport?: {
    apiData: any;
    managerData: any;
    normalizedApiData: any;
    normalizedManagerData: any;
  };
}

/**
 * 差異の詳細
 */
export interface DifferenceDetail {
  apiValue: number;
  managerValue: number;
  difference: number;
  percentageDiff: number;
  withinTolerance: boolean;
  tolerance: number;
}

// ============================================
// 監査ログ
// ============================================

/**
 * 監査ログエントリ
 */
export interface AuditLogEntry {
  /**
   * イベントタイプ
   */
  eventType: 'data_fetch' | 'validation' | 'normalization' | 'comparison';
  
  /**
   * タイムスタンプ
   */
  timestamp: Date;
  
  /**
   * ユーザー情報
   */
  user?: {
    id: string;
    accountId: string;
  };
  
  /**
   * 操作詳細
   */
  action: {
    type: string;
    parameters: Record<string, any>;
    result: 'success' | 'failure' | 'partial';
  };
  
  /**
   * データ詳細
   */
  data?: {
    before?: any;
    after?: any;
    changes?: any;
  };
  
  /**
   * メタデータ
   */
  metadata?: {
    sessionId: string;
    traceId: string;
    environment: string;
    version: string;
  };
}

// ============================================
// データ検証実装
// ============================================

/**
 * データバリデータクラス
 */
export class DataValidator implements DataValidation {
  private config: NumericNormalizationConfig;
  private timeRangeConfig: TimeRangeConfig;
  private attributionConfig: AttributionConfig;

  constructor(
    config: NumericNormalizationConfig,
    timeRangeConfig: TimeRangeConfig,
    attributionConfig: AttributionConfig
  ) {
    this.config = config;
    this.timeRangeConfig = timeRangeConfig;
    this.attributionConfig = attributionConfig;
  }

  /**
   * メトリクスの検証
   */
  validateMetrics(data: AdInsight): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // 必須フィールドのチェック
    if (!data.ad_id) {
      errors.push({
        field: 'ad_id',
        value: data.ad_id,
        expectedType: 'string',
        actualType: typeof data.ad_id,
        message: 'ad_id is required',
        severity: 'critical'
      });
    }

    // 数値フィールドの検証
    const numericFields = ['impressions', 'clicks', 'spend'];
    for (const field of numericFields) {
      const value = data[field as keyof AdInsight];
      if (value !== undefined && value !== null) {
        const normalized = this.normalizeNumericValues(value);
        if (isNaN(normalized)) {
          errors.push({
            field,
            value,
            expectedType: 'number',
            actualType: typeof value,
            message: `Invalid numeric value for ${field}`,
            severity: 'error',
            suggestion: 'Check if the API response format has changed'
          });
        }
      }
    }

    // CTRの妥当性チェック
    if (data.ctr) {
      const ctr = this.normalizePercentage(data.ctr);
      if (ctr > 100) {
        warnings.push({
          field: 'ctr',
          value: data.ctr,
          message: 'CTR exceeds 100%',
          threshold: 100,
          actualValue: ctr,
          possibleCause: 'Incorrect percentage format or calculation error'
        });
      }
    }

    // Frequencyの妥当性チェック
    if (data.frequency) {
      const freq = this.normalizeNumericValues(data.frequency);
      if (freq > 50) {
        warnings.push({
          field: 'frequency',
          value: data.frequency,
          message: 'Unusually high frequency',
          threshold: 50,
          actualValue: freq,
          possibleCause: 'Very narrow audience or long time period'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      metadata: {
        validatedAt: new Date(),
        validationRules: ['required_fields', 'numeric_validation', 'range_checks'],
        dataSource: 'Meta Graph API v23.0'
      }
    };
  }

  /**
   * 数値の正規化
   */
  normalizeNumericValues(value: string | number | undefined): number {
    if (value === undefined || value === null) {
      return 0;
    }

    let normalized: number;
    
    if (typeof value === 'string') {
      // カンマを除去
      const cleaned = value.replace(/,/g, '');
      normalized = parseFloat(cleaned);
    } else {
      normalized = value;
    }

    // 丸め処理
    if (!isNaN(normalized) && this.config.rounding) {
      const factor = Math.pow(10, this.config.rounding.precision);
      switch (this.config.rounding.method) {
        case 'floor':
          normalized = Math.floor(normalized * factor) / factor;
          break;
        case 'ceil':
          normalized = Math.ceil(normalized * factor) / factor;
          break;
        default:
          normalized = Math.round(normalized * factor) / factor;
      }
    }

    return normalized;
  }

  /**
   * 通貨変換
   */
  applyCurrencyConversion(amount: number, currency: string): number {
    if (currency === this.config.currency.displayCurrency) {
      return amount;
    }

    const rate = this.config.currency.exchangeRates?.[currency];
    if (!rate) {
      console.warn(`Exchange rate not found for ${currency}`);
      return amount;
    }

    return amount * rate;
  }

  /**
   * パーセンテージの正規化
   */
  normalizePercentage(value: string | number): number {
    const numeric = this.normalizeNumericValues(value);
    
    if (this.config.percentageHandling.apiFormat === 'decimal' &&
        this.config.percentageHandling.displayFormat === 'percentage') {
      return numeric * 100;
    } else if (this.config.percentageHandling.apiFormat === 'percentage' &&
               this.config.percentageHandling.displayFormat === 'decimal') {
      return numeric / 100;
    }
    
    return numeric;
  }

  /**
   * 日付のタイムゾーン調整
   */
  normalizeDateWithTimezone(date: string, timezone: string): Date {
    // ISO 8601形式の日付をパース
    const parsed = new Date(date);
    
    // タイムゾーンオフセットを適用
    if (this.timeRangeConfig.timezoneOffset) {
      parsed.setMinutes(parsed.getMinutes() + this.timeRangeConfig.timezoneOffset);
    }
    
    // 夏時間調整
    if (this.timeRangeConfig.adjustForDST) {
      // 夏時間のロジックを実装
      // 注: 実際の実装では moment-timezone や date-fns-tz を使用推奨
    }
    
    return parsed;
  }

  /**
   * Meta Ad Managerとの比較
   */
  compareWithAdManager(
    apiData: AdInsight,
    adManagerData: AdManagerExport
  ): ComparisonResult {
    const differences: Record<string, DifferenceDetail> = {};
    const tolerance = 0.01; // 1%の許容誤差

    // 各メトリクスを比較
    const metricsToCompare = ['spend', 'impressions', 'clicks', 'ctr', 'cpm', 'cpc'];
    
    for (const metric of metricsToCompare) {
      const apiValue = this.normalizeNumericValues(apiData[metric as keyof AdInsight]);
      const managerValue = adManagerData[metric as keyof AdManagerExport] || 0;
      
      const difference = Math.abs(apiValue - managerValue);
      const percentageDiff = managerValue !== 0 
        ? (difference / managerValue) * 100 
        : (apiValue !== 0 ? 100 : 0);

      differences[metric] = {
        apiValue,
        managerValue,
        difference,
        percentageDiff,
        withinTolerance: percentageDiff <= tolerance * 100,
        tolerance: tolerance * 100
      };
    }

    // 差異の原因を分析
    const possibleCauses = this.analyzeDifferences(differences);
    const matches = Object.values(differences).every(d => d.withinTolerance);

    return {
      matches,
      differences,
      possibleCauses,
      recommendations: this.generateRecommendations(differences, possibleCauses),
      detailedReport: {
        apiData,
        managerData: adManagerData,
        normalizedApiData: this.normalizeAllMetrics(apiData),
        normalizedManagerData: adManagerData
      }
    };
  }

  /**
   * 差異の原因分析
   */
  private analyzeDifferences(differences: Record<string, DifferenceDetail>): string[] {
    const causes: string[] = [];

    // 支出の差異が大きい場合
    if (differences.spend && !differences.spend.withinTolerance) {
      causes.push('Currency conversion mismatch');
      causes.push('Different attribution windows');
    }

    // インプレッションの差異
    if (differences.impressions && !differences.impressions.withinTolerance) {
      causes.push('Timezone difference in data aggregation');
      causes.push('Data processing delay');
    }

    // CTRの差異
    if (differences.ctr && !differences.ctr.withinTolerance) {
      causes.push('Different calculation methods for CTR');
      causes.push('Filtered or invalid clicks excluded');
    }

    return [...new Set(causes)];
  }

  /**
   * 推奨アクションの生成
   */
  private generateRecommendations(
    differences: Record<string, DifferenceDetail>,
    causes: string[]
  ): string[] {
    const recommendations: string[] = [];

    if (causes.includes('Currency conversion mismatch')) {
      recommendations.push('Verify account currency settings in Meta Business Manager');
      recommendations.push('Check if exchange rates are up to date');
    }

    if (causes.includes('Timezone difference in data aggregation')) {
      recommendations.push('Align timezone settings between API and Ad Manager');
      recommendations.push('Use explicit timezone parameters in API calls');
    }

    if (causes.includes('Different attribution windows')) {
      recommendations.push('Set consistent attribution windows in API parameters');
      recommendations.push('Use use_unified_attribution_setting parameter');
    }

    return recommendations;
  }

  /**
   * 全メトリクスの正規化
   */
  private normalizeAllMetrics(data: AdInsight): Record<string, number> {
    return {
      impressions: this.normalizeNumericValues(data.impressions),
      clicks: this.normalizeNumericValues(data.clicks),
      spend: this.normalizeNumericValues(data.spend),
      ctr: this.normalizePercentage(data.ctr || '0'),
      cpm: this.normalizeNumericValues(data.cpm),
      cpc: this.normalizeNumericValues(data.cpc),
      frequency: this.normalizeNumericValues(data.frequency),
      reach: this.normalizeNumericValues(data.reach)
    };
  }
}

// ============================================
// エクスポート
// ============================================

export type {
  AdInsight,
  FatigueData,
  AggregatedInsight,
  ApiDateParams
} from './interfaces';