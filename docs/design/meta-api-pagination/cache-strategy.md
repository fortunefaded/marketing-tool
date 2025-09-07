# インテリジェントキャッシュ戦略設計

## 概要

Meta API制限（200コール/時間）を効率的に活用し、パフォーマンスを向上させるため、3層キャッシュアーキテクチャを実装する。

## 3層キャッシュアーキテクチャ

### Layer 1: Memory Cache (メモリキャッシュ)
- **技術**: React state + Map/WeakMap
- **用途**: 現在セッション内の高速アクセス
- **TTL**: 5分
- **容量**: 50MB以下
- **特徴**: 
  - 最高速アクセス (1ms以下)
  - アプリケーション終了で消失
  - リアルタイムデータに最適

### Layer 2: LocalStorage Cache (ブラウザキャッシュ)
- **技術**: IndexedDB (大容量対応)
- **用途**: ブラウザセッション間での永続化
- **TTL**: 1-24時間 (データ種別により可変)
- **容量**: 500MB以下
- **特徴**:
  - ブラウザ再起動後も利用可能
  - 差分更新データの一時保存
  - オフライン対応

### Layer 3: Convex Cache (DB永続キャッシュ)
- **技術**: Convex データベース
- **用途**: 全ユーザー共有・長期保存
- **TTL**: 差分更新による部分無効化
- **容量**: 無制限 (Convex制限内)
- **特徴**:
  - マルチデバイス・マルチユーザー共有
  - 履歴データの永続保存
  - バックアップ・復旧対応

## TTL (Time To Live) 管理戦略

### データ種別による可変TTL

#### リアルタイムデータ (本日分)
```typescript
const REALTIME_TTL = {
  memory: 5 * 60 * 1000,      // 5分
  localStorage: 15 * 60 * 1000, // 15分
  convex: 30 * 60 * 1000      // 30分
}
```

#### 直近データ (過去7日)
```typescript
const RECENT_TTL = {
  memory: 15 * 60 * 1000,     // 15分
  localStorage: 60 * 60 * 1000, // 1時間
  convex: 6 * 60 * 60 * 1000  // 6時間
}
```

#### 履歴データ (7日以前)
```typescript
const HISTORICAL_TTL = {
  memory: 60 * 60 * 1000,     // 1時間
  localStorage: 24 * 60 * 60 * 1000, // 24時間
  convex: Infinity            // 差分更新のみ
}
```

## 差分更新メカニズム

### 1. 増分データ取得
```typescript
interface IncrementalUpdateConfig {
  lastUpdateTimestamp: number;
  newDataOnly: boolean;
  mergeStrategy: 'append' | 'replace' | 'merge';
}

// 前回更新以降の新規データのみ取得
const fetchIncremental = async (config: IncrementalUpdateConfig) => {
  const params = {
    time_range: {
      since: new Date(config.lastUpdateTimestamp).toISOString().split('T')[0],
      until: new Date().toISOString().split('T')[0]
    }
  };
  
  return await apiClient.fetchPaginatedData(params);
};
```

### 2. スマートマージ処理
```typescript
interface MergeResult {
  mergedData: AdInsight[];
  newItemsCount: number;
  updatedItemsCount: number;
  duplicatesRemoved: number;
}

const mergeDataIntelligently = (
  existingData: AdInsight[],
  newData: AdInsight[]
): MergeResult => {
  // 1. 重複除去 (ad_id + date_start による)
  // 2. 更新データの識別
  // 3. 新規データの追加
  // 4. 統計情報の生成
};
```

## キャッシュ無効化ルール

### 時間ベース無効化
```typescript
interface TimeBasedInvalidation {
  // 日付が変わった時点で前日以前を無効化
  dailyInvalidation: boolean;
  
  // 営業時間外の自動更新 (API制限回避)
  offHoursRefresh: {
    enabled: boolean;
    schedule: string; // cron形式
  };
}
```

### イベントベース無効化
```typescript
interface EventBasedInvalidation {
  // ユーザー明示的リフレッシュ
  userRefresh: boolean;
  
  // データ不整合検出時
  consistencyCheck: {
    enabled: boolean;
    threshold: number; // 差異の許容範囲
  };
  
  // API エラー回復時
  errorRecovery: boolean;
}
```

## キャッシュ管理インターフェース

### CacheManager クラス設計
```typescript
interface CacheManagerConfig {
  layers: {
    memory: MemoryCacheConfig;
    localStorage: LocalStorageCacheConfig;
    convex: ConvexCacheConfig;
  };
  ttlStrategy: TTLStrategy;
  invalidationRules: InvalidationRules;
}

class IntelligentCacheManager {
  private memoryCache: Map<string, CachedItem>;
  private localStorageAdapter: IndexedDBAdapter;
  private convexAdapter: ConvexCacheAdapter;
  
  // キャッシュ階層を自動判断して最適なデータ取得
  async get<T>(key: string): Promise<CacheResult<T>> {
    // 1. Memory Cache をチェック
    // 2. LocalStorage Cache をチェック
    // 3. Convex Cache をチェック
    // 4. すべて miss なら API 呼び出し
  }
  
  // 差分更新による効率的なキャッシュ更新
  async updateIncremental(
    key: string, 
    config: IncrementalUpdateConfig
  ): Promise<UpdateResult> {
    // 1. 前回更新時刻の取得
    // 2. 新規データのみ API 取得
    // 3. 既存データとマージ
    // 4. 全階層に反映
  }
  
  // キャッシュヒット率などの統計情報
  getStatistics(): CacheStatistics {
    return {
      hitRate: this.calculateHitRate(),
      apiCallsSaved: this.getApiCallsSaved(),
      storageUsage: this.getStorageUsage(),
      performanceMetrics: this.getPerformanceMetrics()
    };
  }
}
```

## 実装戦略

### Phase 1: 基本キャッシュ実装
```typescript
// 1. Memory Cache の実装
const useMemoryCache = () => {
  const [cache, setCache] = useState(new Map());
  
  const get = useCallback((key: string) => {
    const item = cache.get(key);
    if (!item || isExpired(item)) return null;
    return item.data;
  }, [cache]);
  
  const set = useCallback((key: string, data: any, ttl: number) => {
    setCache(prev => new Map(prev.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })));
  }, []);
  
  return { get, set };
};
```

### Phase 2: LocalStorage統合
```typescript
// IndexedDB による大容量ストレージ
class IndexedDBCache {
  private db: IDBDatabase;
  
  async init() {
    this.db = await openDB('meta-api-cache', 1, {
      upgrade(db) {
        const store = db.createObjectStore('cache', {
          keyPath: 'key'
        });
        store.createIndex('timestamp', 'timestamp');
        store.createIndex('ttl', 'expiresAt');
      }
    });
  }
  
  async get(key: string): Promise<any | null> {
    const item = await this.db.get('cache', key);
    if (!item || Date.now() > item.expiresAt) {
      return null;
    }
    return item.data;
  }
  
  async set(key: string, data: any, ttl: number): Promise<void> {
    await this.db.put('cache', {
      key,
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl
    });
  }
}
```

### Phase 3: Convex Cache統合
```typescript
// Convex functions for cache management
// convex/cache.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getCachedData = query({
  args: { 
    key: v.string(),
    accountId: v.string()
  },
  handler: async (ctx, { key, accountId }) => {
    const cached = await ctx.db
      .query("cache")
      .filter(q => q.and(
        q.eq(q.field("key"), key),
        q.eq(q.field("accountId"), accountId),
        q.gt(q.field("expiresAt"), Date.now())
      ))
      .first();
      
    return cached?.data || null;
  },
});

export const setCachedData = mutation({
  args: { 
    key: v.string(),
    data: v.any(),
    ttl: v.number(),
    accountId: v.string()
  },
  handler: async (ctx, { key, data, ttl, accountId }) => {
    await ctx.db.insert("cache", {
      key,
      data,
      accountId,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl
    });
  },
});
```

## パフォーマンス最適化

### 1. 予測的キャッシュウォームアップ
```typescript
interface PredictiveCaching {
  // ユーザーの行動パターンから予測して事前キャッシュ
  userBehaviorPrediction: boolean;
  
  // 営業時間前の自動データ更新
  businessHoursPreload: {
    enabled: boolean;
    startTime: string; // "08:00"
    dataRange: number; // 日数
  };
}
```

### 2. 圧縮・最適化
```typescript
interface CacheOptimization {
  // データ圧縮 (gzip/lz4)
  compression: {
    algorithm: 'gzip' | 'lz4' | 'none';
    threshold: number; // 圧縮開始サイズ (bytes)
  };
  
  // 不要フィールド除去
  fieldFiltering: {
    enabled: boolean;
    essentialFields: string[];
  };
}
```

## 監視・メトリクス

### キャッシュパフォーマンス指標
```typescript
interface CacheMetrics {
  // ヒット率
  hitRates: {
    memory: number;      // 95%以上目標
    localStorage: number; // 80%以上目標
    convex: number;      // 60%以上目標
    overall: number;     // 80%以上目標
  };
  
  // API呼び出し削減効果
  apiCallsSaved: {
    daily: number;
    monthly: number;
    percentage: number;  // 70%以上削減目標
  };
  
  // レスポンス時間改善
  responseTime: {
    cached: number;      // <100ms目標
    uncached: number;    // <2s目標
    improvement: number; // 80%以上改善目標
  };
}
```

### 異常検知・アラート
```typescript
interface CacheHealthMonitoring {
  // キャッシュサイズ監視
  sizeThresholds: {
    memory: number;      // 50MB
    localStorage: number; // 500MB
    warning: number;     // 80%使用時警告
  };
  
  // ヒット率低下検知
  hitRateAlert: {
    threshold: number;   // 60%を下回った場合
    duration: number;    // 10分継続でアラート
  };
}
```

## 成功指標

### 定量的目標
- **キャッシュヒット率**: 80%以上
- **API呼び出し削減**: 70%以上
- **初回読み込み**: 2秒以内
- **キャッシュヒット時**: 100ms以内

### 定性的目標  
- ユーザーが体感できるパフォーマンス向上
- Meta API制限に余裕を持った運用
- オフライン耐性の向上
- システム安定性の向上

この3層キャッシュ戦略により、Meta API制限下での効率的な広告データ管理を実現する。