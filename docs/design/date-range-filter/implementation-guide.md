# データ整合性確保 実装ガイド

## 概要

Meta APIとの数値乖離問題を解決し、データの整合性を確保するための実装ガイドです。

## 🎯 主要な数値乖離の原因と対策

### 1. 通貨設定の不一致

#### 原因
- アカウントの通貨設定とAPIレスポンスの通貨が異なる
- 為替レート変動の未考慮

#### 実装方法
```typescript
// API呼び出し時に通貨を明示的に指定
const apiParams = {
  fields: [
    'spend',
    'account_currency', // 通貨情報を含める
    // ...
  ]
};

// レスポンス処理時に通貨変換
const normalizedSpend = dataValidator.applyCurrencyConversion(
  parseFloat(response.spend),
  response.account_currency || 'JPY'
);
```

### 2. タイムゾーンの差異

#### 原因
- Metaアカウントのタイムゾーンとローカルタイムゾーンの不一致
- 夏時間の未考慮

#### 実装方法
```typescript
// APIパラメータでタイムゾーンを明示
const timeRange = {
  since: '2024-08-01',
  until: '2024-08-31',
  time_zone: 'Asia/Tokyo' // アカウントのタイムゾーンを指定
};

// 日付処理時のタイムゾーン考慮
const normalizedDate = dataValidator.normalizeDateWithTimezone(
  apiData.date_start,
  'Asia/Tokyo'
);
```

### 3. アトリビューション設定の違い

#### 原因
- クリック/ビューのアトリビューション期間の設定差異
- デフォルト設定の違い

#### 実装方法
```typescript
// 統一アトリビューション設定を使用
const apiParams = {
  action_attribution_windows: ['1d_click', '1d_view'],
  use_unified_attribution_setting: true
};
```

## 📊 データ検証の実装

### ステップ1: バリデータの初期化

```typescript
import { DataValidator, NumericNormalizationConfig, TimeRangeConfig, AttributionConfig } from './data-validation';

// 設定の定義
const normalizationConfig: NumericNormalizationConfig = {
  currency: {
    accountCurrency: 'JPY',
    displayCurrency: 'JPY',
    decimalPlaces: 0
  },
  percentageHandling: {
    apiFormat: 'decimal', // 0.01 = 1%
    displayFormat: 'percentage' // 1 = 1%
  },
  rounding: {
    method: 'round',
    precision: 2
  }
};

const timeRangeConfig: TimeRangeConfig = {
  timezone: 'Asia/Tokyo',
  accountTimezone: 'Asia/Tokyo',
  adjustForDST: false,
  inclusionMode: 'inclusive'
};

const attributionConfig: AttributionConfig = {
  clickWindow: '1d_click',
  viewWindow: '1d_view',
  useUnifiedAttribution: true
};

// バリデータのインスタンス化
const validator = new DataValidator(
  normalizationConfig,
  timeRangeConfig,
  attributionConfig
);
```

### ステップ2: APIレスポンスの検証

```typescript
// APIレスポンスを受信後
const validateApiResponse = (insights: AdInsight[]): void => {
  const validationResults = insights.map(insight => {
    const result = validator.validateMetrics(insight);
    
    if (!result.isValid) {
      console.error('Validation failed for ad:', insight.ad_id, result.errors);
    }
    
    if (result.warnings.length > 0) {
      console.warn('Validation warnings for ad:', insight.ad_id, result.warnings);
    }
    
    return result;
  });
  
  // デバッグ情報の記録
  saveDebugInfo({
    sessionId: generateSessionId(),
    apiRequest: { /* ... */ },
    apiResponse: { data: insights, /* ... */ },
    validationResults,
    timestamp: new Date()
  });
};
```

### ステップ3: Meta Ad Managerとの比較

```typescript
// CSVからインポートしたAd Managerデータと比較
const compareWithCSV = async (
  apiData: AdInsight[],
  csvPath: string
): Promise<ComparisonResult[]> => {
  const csvData = await parseCSV(csvPath); // CSVパース処理
  
  return apiData.map(apiInsight => {
    const matchingCSV = csvData.find(
      csv => csv.ad_id === apiInsight.ad_id &&
             csv.date === apiInsight.date_start
    );
    
    if (!matchingCSV) {
      console.warn('No matching CSV data for ad:', apiInsight.ad_id);
      return null;
    }
    
    return validator.compareWithAdManager(apiInsight, matchingCSV);
  }).filter(Boolean);
};
```

## 🔍 デバッグ機能の実装

### デバッグセッションの管理

```typescript
class DebugSession {
  private sessionId: string;
  private traces: DebugTrace[] = [];
  private startTime: Date;
  
  constructor() {
    this.sessionId = generateUUID();
    this.startTime = new Date();
  }
  
  /**
   * APIリクエストのトレース
   */
  traceApiRequest(url: string, params: any): void {
    const trace: DebugTrace = {
      traceId: generateUUID(),
      steps: [{
        name: 'API_REQUEST',
        timestamp: new Date(),
        duration: 0,
        input: { url, params },
        output: null,
        metadata: {
          sessionId: this.sessionId,
          accountId: params.accountId
        }
      }],
      status: 'success'
    };
    
    this.traces.push(trace);
    
    // ローカルストレージに保存（開発環境のみ）
    if (process.env.NODE_ENV === 'development') {
      localStorage.setItem(
        `debug-trace-${this.sessionId}`,
        JSON.stringify(this.traces)
      );
    }
  }
  
  /**
   * データ処理のトレース
   */
  traceDataProcessing(
    stage: string,
    input: any,
    output: any,
    duration: number
  ): void {
    const lastTrace = this.traces[this.traces.length - 1];
    
    if (lastTrace) {
      lastTrace.steps.push({
        name: stage,
        timestamp: new Date(),
        duration,
        input,
        output,
        metadata: {
          recordCount: Array.isArray(output) ? output.length : 1
        }
      });
    }
  }
  
  /**
   * エクスポート機能
   */
  exportDebugData(): DebugInfo {
    return {
      sessionId: this.sessionId,
      apiRequest: this.getApiRequestInfo(),
      apiResponse: this.getApiResponseInfo(),
      processedData: this.getProcessedData(),
      validationResults: this.getValidationResults(),
      performance: this.getPerformanceMetrics(),
      timestamp: new Date(),
      errors: this.getErrors()
    };
  }
  
  /**
   * コンソール出力（開発環境）
   */
  logToConsole(): void {
    if (process.env.NODE_ENV === 'development') {
      console.group(`🔍 Debug Session: ${this.sessionId}`);
      
      this.traces.forEach(trace => {
        console.group(`Trace: ${trace.traceId}`);
        
        trace.steps.forEach(step => {
          console.log(`[${step.name}]`, {
            duration: `${step.duration}ms`,
            input: step.input,
            output: step.output,
            metadata: step.metadata
          });
        });
        
        console.groupEnd();
      });
      
      console.groupEnd();
    }
  }
}
```

### デバッグ情報の可視化

```typescript
// React コンポーネント例
const DebugPanel: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  
  // 開発環境でのみ表示
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  
  return (
    <>
      {/* デバッグパネルトグルボタン */}
      <button
        className="fixed bottom-4 right-4 z-50 bg-purple-600 text-white p-2 rounded"
        onClick={() => setIsVisible(!isVisible)}
      >
        🔍 Debug
      </button>
      
      {/* デバッグパネル */}
      {isVisible && (
        <div className="fixed bottom-16 right-4 w-96 h-96 bg-white border shadow-lg rounded overflow-auto z-50 p-4">
          <h3 className="font-bold mb-2">Debug Information</h3>
          
          {debugInfo && (
            <>
              <section className="mb-4">
                <h4 className="font-semibold">API Request</h4>
                <pre className="text-xs bg-gray-100 p-2 rounded">
                  {JSON.stringify(debugInfo.apiRequest.params, null, 2)}
                </pre>
              </section>
              
              <section className="mb-4">
                <h4 className="font-semibold">Validation Results</h4>
                {debugInfo.validationResults.map((result, i) => (
                  <div key={i} className={`text-xs p-1 ${result.isValid ? 'text-green-600' : 'text-red-600'}`}>
                    {result.isValid ? '✅' : '❌'} Record {i + 1}
                    {result.errors.length > 0 && (
                      <ul className="ml-4">
                        {result.errors.map((err, j) => (
                          <li key={j}>{err.field}: {err.message}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </section>
              
              <section className="mb-4">
                <h4 className="font-semibold">Performance</h4>
                <div className="text-xs">
                  <div>API Call: {debugInfo.performance.apiCallDuration}ms</div>
                  <div>Processing: {debugInfo.performance.processingDuration}ms</div>
                  <div>Total: {debugInfo.performance.totalDuration}ms</div>
                </div>
              </section>
            </>
          )}
        </div>
      )}
    </>
  );
};
```

## 🧪 テスト実装

### 単体テスト例

```typescript
describe('DataValidator', () => {
  let validator: DataValidator;
  
  beforeEach(() => {
    validator = new DataValidator(
      mockNormalizationConfig,
      mockTimeRangeConfig,
      mockAttributionConfig
    );
  });
  
  describe('normalizeNumericValues', () => {
    it('should normalize string numbers correctly', () => {
      expect(validator.normalizeNumericValues('1,234.56')).toBe(1234.56);
      expect(validator.normalizeNumericValues('0.05')).toBe(0.05);
    });
    
    it('should handle undefined/null values', () => {
      expect(validator.normalizeNumericValues(undefined)).toBe(0);
      expect(validator.normalizeNumericValues(null)).toBe(0);
    });
  });
  
  describe('validateMetrics', () => {
    it('should validate valid metrics', () => {
      const validData: AdInsight = {
        ad_id: '123',
        ad_name: 'Test Ad',
        impressions: '1000',
        clicks: '50',
        spend: '100.50',
        ctr: '5.0'
      };
      
      const result = validator.validateMetrics(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
    
    it('should detect invalid CTR', () => {
      const invalidData: AdInsight = {
        ad_id: '123',
        ad_name: 'Test Ad',
        impressions: '1000',
        clicks: '50',
        spend: '100.50',
        ctr: '150.0' // 150% CTR is invalid
      };
      
      const result = validator.validateMetrics(invalidData);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: 'ctr',
          message: expect.stringContaining('exceeds 100%')
        })
      );
    });
  });
  
  describe('compareWithAdManager', () => {
    it('should detect currency differences', () => {
      const apiData: AdInsight = {
        ad_id: '123',
        spend: '10000', // JPY
        impressions: '1000',
        clicks: '50'
      };
      
      const csvData: AdManagerExport = {
        ad_id: '123',
        spend: 100, // USD
        impressions: 1000,
        clicks: 50
      };
      
      const result = validator.compareWithAdManager(apiData, csvData);
      expect(result.matches).toBe(false);
      expect(result.possibleCauses).toContain('Currency conversion mismatch');
    });
  });
});
```

### 統合テスト例

```typescript
describe('Date Range Filter Integration', () => {
  it('should fetch and validate data for last month', async () => {
    // デバッグセッション開始
    const debugSession = new DebugSession();
    
    // API呼び出し
    debugSession.traceApiRequest('/insights', {
      date_preset: 'last_month',
      fields: ['ad_id', 'spend', 'impressions']
    });
    
    const apiData = await fetchMetaInsights({
      datePreset: 'last_month'
    });
    
    // データ検証
    const validator = new DataValidator(config);
    const validationResults = apiData.map(d => validator.validateMetrics(d));
    
    // CSV比較（8月データ）
    const csvPath = './test-data/august-2024.csv';
    const comparisonResults = await compareWithCSV(apiData, csvPath);
    
    // アサーション
    expect(validationResults.every(r => r.isValid)).toBe(true);
    expect(comparisonResults.every(r => r.matches)).toBe(true);
    
    // デバッグ情報の出力
    debugSession.logToConsole();
  });
});
```

## 📋 チェックリスト

### 実装前の確認

- [ ] Metaアカウントのタイムゾーン設定を確認
- [ ] アカウントの通貨設定を確認
- [ ] アトリビューション設定を確認
- [ ] APIバージョン（v23.0）を確認

### 実装時の確認

- [ ] 通貨フィールドをAPIリクエストに含める
- [ ] タイムゾーンパラメータを明示的に指定
- [ ] アトリビューション設定を統一
- [ ] 数値の正規化処理を実装
- [ ] バリデーション処理を実装

### テスト時の確認

- [ ] 各日付範囲でのデータ取得テスト
- [ ] タイムゾーン変換のテスト
- [ ] 通貨変換のテスト
- [ ] CSVデータとの比較テスト
- [ ] エッジケースのテスト

### デプロイ前の確認

- [ ] デバッグ機能が本番環境で無効化されている
- [ ] ログレベルが適切に設定されている
- [ ] エラー監視が設定されている
- [ ] パフォーマンス監視が設定されている

## 🔧 トラブルシューティング

### よくある問題と解決方法

#### 1. spend値が大きく異なる

**原因**: 通貨設定の不一致
**解決方法**:
```typescript
// account_currencyフィールドを確認
console.log('Account Currency:', apiResponse.account_currency);

// 必要に応じて変換
const convertedSpend = validator.applyCurrencyConversion(
  spend,
  apiResponse.account_currency
);
```

#### 2. 日付データがずれる

**原因**: タイムゾーンの差異
**解決方法**:
```typescript
// タイムゾーンを明示的に指定
const params = {
  time_range: {
    since: '2024-08-01',
    until: '2024-08-31',
    time_zone: 'Asia/Tokyo'
  }
};
```

#### 3. CTRやFrequencyが異常値

**原因**: 計算方法の違いまたはフィルタリング
**解決方法**:
```typescript
// 生データから再計算
const recalculatedCTR = (clicks / impressions) * 100;
console.log('Original CTR:', apiData.ctr);
console.log('Recalculated CTR:', recalculatedCTR);
```

---

*作成日: 2024年12月*
*バージョン: 1.0*
*対応API: Meta Graph API v23.0*