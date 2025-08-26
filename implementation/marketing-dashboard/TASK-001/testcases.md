# TASK-001: 型定義の統合とクリーンアップ - テストケース

## テスト戦略
型定義のテストは主にTypeScriptコンパイラレベルでの型チェックと、ランタイムでの型ガード関数のテストを実施する。

## 1. 型定義構造テスト

### TC-001: 基本エンティティ型の正当性テスト
```typescript
// MetaAccount型の基本構造テスト
type MetaAccountRequiredFields = 'accountId' | 'name' | 'currency' | 'timezone' | 'status';
type MetaAccountTest = Required<Pick<MetaAccount, MetaAccountRequiredFields>>;

// Campaign型の基本構造テスト  
type CampaignRequiredFields = 'campaignId' | 'accountId' | 'name' | 'objective' | 'status';
type CampaignTest = Required<Pick<Campaign, CampaignRequiredFields>>;

// Ad型の基本構造テスト
type AdRequiredFields = 'adId' | 'adSetId' | 'campaignId' | 'name' | 'status' | 'creative';
type AdTest = Required<Pick<Ad, AdRequiredFields>>;
```

### TC-002: メトリクス型の数値型チェック
```typescript
// AdMetrics型の数値フィールドテスト
type NumericMetricsFields = {
  [K in keyof AdMetrics]: AdMetrics[K] extends number ? K : never;
}[keyof AdMetrics];

// 必須数値フィールドの検証
type RequiredNumericFields = 'impressions' | 'clicks' | 'spend' | 'conversions' | 'frequency' | 'reach';
type NumericFieldsTest = Record<RequiredNumericFields, number>;
```

### TC-003: 疲労度関連型の制約テスト
```typescript
// FatigueScore範囲制約テスト (0-100)
type ValidFatigueScore = FatigueScore['total'] extends number ? 
  FatigueScore['total'] extends infer T ? 
    T extends 0 | 100 ? T : 
    T extends number ? T : never 
  : never : never;

// FatigueLevel列挙値テスト
type ValidFatigueLevel = FatigueLevel extends 'healthy' | 'caution' | 'warning' | 'critical' ? true : false;
```

## 2. API型互換性テスト

### TC-101: Meta APIレスポンス型テスト
```typescript
// MetaInsightsResponse型の構造テスト
interface TestMetaResponse {
  data: AdMetrics[];
  paging?: {
    cursors?: { before: string; after: string; };
    next?: string;
  };
}

// ApiResponse<T>ジェネリック型テスト
type TestApiResponse = ApiResponse<AdMetrics[]>;
type SuccessResponseTest = TestApiResponse extends { success: true; data: AdMetrics[] } ? true : false;
type ErrorResponseTest = TestApiResponse extends { success: false; error: { code: string; message: string } } ? true : false;
```

### TC-102: ECForce型統合テスト
```typescript
// ECForceOrder型とAdMetrics型の連携テスト
interface OrderMetricsJoin {
  order: ECForceOrder;
  metrics: AdMetrics[];
  attribution: {
    matchedCampaigns: string[];
    confidence: number;
  };
}

// ECForceCustomer型のセグメント制約テスト
type ValidCustomerSegment = ECForceCustomer['segment'] extends 'new' | 'returning' | 'vip' | 'at_risk' ? true : false;
```

## 3. 型ガード関数テスト

### TC-201: isValidMetaAccount型ガードテスト
```typescript
describe('isValidMetaAccount', () => {
  it('完全なMetaAccountオブジェクトを正しく検証する', () => {
    const validAccount: MetaAccount = {
      accountId: 'act_123456789',
      name: 'Test Account',
      currency: 'JPY',
      timezone: 'Asia/Tokyo',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    expect(isValidMetaAccount(validAccount)).toBe(true);
  });

  it('必須フィールドが不足している場合はfalseを返す', () => {
    const invalidAccount = {
      accountId: 'act_123456789',
      // name が不足
      currency: 'JPY'
    };
    expect(isValidMetaAccount(invalidAccount)).toBe(false);
  });

  it('不正なstatusを持つ場合はfalseを返す', () => {
    const invalidAccount: Partial<MetaAccount> = {
      accountId: 'act_123456789',
      name: 'Test Account',
      status: 'invalid_status' as any
    };
    expect(isValidMetaAccount(invalidAccount)).toBe(false);
  });
});
```

### TC-202: isFatigueScore型ガードテスト
```typescript
describe('isFatigueScore', () => {
  it('有効な疲労度スコアオブジェクトを正しく検証する', () => {
    const validScore: FatigueScore = {
      total: 75,
      breakdown: {
        audience: 80,
        creative: 70,
        algorithm: 75
      },
      primaryIssue: 'audience',
      status: 'warning',
      calculatedAt: new Date()
    };
    expect(isFatigueScore(validScore)).toBe(true);
  });

  it('範囲外のスコア値を持つ場合はfalseを返す', () => {
    const invalidScore = {
      total: 150, // 範囲外
      breakdown: {
        audience: 80,
        creative: 70,
        algorithm: 75
      },
      primaryIssue: 'audience',
      status: 'warning'
    };
    expect(isFatigueScore(invalidScore)).toBe(false);
  });
});
```

## 4. 後方互換性テスト

### TC-301: レガシー型エイリアステスト
```typescript
// 既存のAdInsight型との互換性テスト
type LegacyAdInsight = {
  ad_id: string;
  ad_name: string;
  impressions: number;
  ctr: number;
};

// 新しいAdMetrics型との互換性確認
type BackwardCompatibilityTest = LegacyAdInsight extends Pick<AdMetrics, 'adId' | 'impressions' | 'ctr'> ? true : false;
```

### TC-302: インポートパステスト
```typescript
// 新しいインポートパスのテスト
import { MetaAccount, Campaign, AdMetrics } from '@/types/core/entities';
import { FatigueScore, FatigueAnalysis } from '@/types/features/fatigue';
import { ApiResponse } from '@/types/api/responses';

// 旧インポートパスとの互換性テスト（型エイリアス経由）
import { MetaAccount as LegacyMetaAccount } from '@/types/meta-api';
type ImportCompatibilityTest = MetaAccount extends LegacyMetaAccount ? true : false;
```

## 5. パフォーマンステスト

### TC-401: TypeScriptコンパイルパフォーマンステスト
```bash
# コンパイル時間測定テスト
npm run test:compile-performance

# 型チェック時間測定
npm run test:type-check-performance
```

### TC-402: 型推論性能テスト
```typescript
// 深いネスト構造での型推論テスト
type DeepDashboardData = {
  summary: DashboardData['summary'];
  campaigns: DashboardData['campaigns'];
  metrics: DashboardData['metrics'][0]['creative']['assets'][0];
};

// 条件付き型での性能テスト
type ConditionalTypeTest<T> = T extends AdMetrics ? 
  T extends { revenue: infer R } ? 
    R extends number ? 'has-revenue' : 'no-revenue'
  : 'no-metrics' : 'not-ad-metrics';
```

## 6. エラーケーステスト

### TC-501: 不正な型定義の検出テスト
```typescript
// 存在しないフィールドアクセステスト
// @ts-expect-error - この行は意図的にエラーになるべき
const invalidAccess: MetaAccount['nonExistentField'];

// 不正な値の代入テスト  
// @ts-expect-error - この行は意図的にエラーになるべき
const invalidStatus: MetaAccount = { status: 'invalid' };
```

### TC-502: 循環参照検出テスト
```typescript
// 型定義間の循環参照がないことを確認
type CircularReferenceTest = MetaAccount extends Campaign ? never : 
  Campaign extends MetaAccount ? never : 'no-circular-reference';
```

## 7. 統合テスト

### TC-601: 実際の使用シナリオテスト
```typescript
describe('Type Integration Tests', () => {
  it('ダッシュボードデータの完全なフローで型安全性を保つ', async () => {
    // Meta APIからのデータ取得
    const apiResponse: ApiResponse<AdMetrics[]> = await fetchAdMetrics();
    
    // 疲労度分析の実行
    const fatigueAnalysis: FatigueAnalysis = calculateFatigue(apiResponse.data[0]);
    
    // ダッシュボードデータの構築
    const dashboardData: DashboardData = {
      summary: calculateSummary(apiResponse.data),
      fatigueAnalysis: [fatigueAnalysis],
      // ... 他のフィールド
    };
    
    // 全ての型が正しく推論されることを確認
    expect(typeof dashboardData.summary.totalSpend).toBe('number');
    expect(fatigueAnalysis.score.total).toBeGreaterThanOrEqual(0);
    expect(fatigueAnalysis.score.total).toBeLessThanOrEqual(100);
  });
});
```

## テスト実行計画

### Phase 1: 基本型定義テスト
1. TC-001〜TC-003を実行
2. コンパイルエラーの解決
3. 基本構造の確認

### Phase 2: API統合テスト  
1. TC-101〜TC-102を実行
2. 外部API型との互換性確認
3. レスポンス型の検証

### Phase 3: ランタイムテスト
1. TC-201〜TC-202を実行
2. 型ガード関数の動作確認
3. バリデーション機能の検証

### Phase 4: 互換性・性能テスト
1. TC-301〜TC-402を実行
2. 後方互換性の確認
3. パフォーマンス測定

### Phase 5: 統合テスト
1. TC-501〜TC-601を実行
2. エラーケースの処理確認
3. 実使用シナリオの検証

## 成功基準
- 全てのTypeScriptコンパイルテストが成功
- 型ガード関数テストの成功率100%
- 後方互換性テストの成功率100%
- コンパイル時間が現状の120%以下
- ゼロランタイム型エラー