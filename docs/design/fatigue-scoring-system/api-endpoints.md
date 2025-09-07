# API エンドポイント仕様 - 広告疲労度スコアリングシステム

## 概要

広告疲労度スコアリングシステムで使用するAPIエンドポイントの詳細仕様。Meta/ECforceデータ集約、画像・動画・テキスト別成果集計、ROAS/CPA/CV等のKPI横断表示、広告主・媒体・キャンペーン単位の成果比較機能を提供する。

## 認証・セキュリティ

### 認証方式
- **内部API**: Convex Auth + JWT Token
- **Meta API**: OAuth2 App Access Token (暗号化保存)
- **ECforce API**: API Key認証
- **通信方式**: HTTPS強制、CORS設定済み

### レート制限
- **Meta Graph API**: 200リクエスト/時間/アカウント
- **内部API**: 1000リクエスト/分/ユーザー
- **バッチ処理**: 100広告/バッチ、最大同時10バッチ

---

## 疲労度分析 API

### 単一広告疲労度分析

#### POST /api/fatigue/analyze
特定広告の疲労度分析実行

**リクエスト:**
```json
{
  "adId": "123456789",
  "accountId": "act_123456789",
  "config": {
    "includeInstagram": true,
    "forceRefresh": false,
    "customWeights": {
      "creative": 0.4,
      "audience": 0.35, 
      "algorithm": 0.25
    }
  }
}
```

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "analysisId": "analysis_abc123",
    "adId": "123456789",
    "adName": "夏季キャンペーン_動画A",
    "campaignName": "Summer Campaign 2024",
    "adType": "video",
    "platform": ["facebook", "instagram"],
    
    "fatigueScore": {
      "totalScore": 72,
      "creativeScore": 85,
      "audienceScore": 70,
      "algorithmScore": 45,
      "status": "warning",
      "primaryIssue": "algorithm",
      "confidence": 0.89
    },
    
    "detailedAnalysis": {
      "creativeAnalysis": {
        "metrics": {
          "baselineCtr": 2.5,
          "currentCtr": 1.8,
          "ctrDeclineRate": 28,
          "ctrImpact": 15
        },
        "score": 85,
        "issues": ["CTR低下が見られます"],
        "recommendations": ["新しいクリエイティブのテストを検討"]
      },
      "audienceAnalysis": {
        "metrics": {
          "currentFrequency": 3.2,
          "frequencyImpact": 0,
          "firstImpressionRatio": 0.4,
          "firstImpressionImpact": 30
        },
        "score": 70,
        "issues": ["初回インプレッション比率が低下"],
        "recommendations": ["ターゲティング範囲の拡大を検討"]
      },
      "algorithmAnalysis": {
        "metrics": {
          "baselineCpm": 450,
          "currentCpm": 680,
          "cpmIncreaseRate": 51,
          "deliveryHealth": 0.6
        },
        "score": 45,
        "issues": ["CPM大幅上昇、配信ボリューム低下"],
        "recommendations": ["入札戦略の見直し", "オーディエンス拡張"]
      }
    },
    
    "instagramAnalysis": {
      "metrics": {
        "profileViews": 1245,
        "engagementRate": 1.8,
        "profileVisitRate": 0.8,
        "followRate": 0.12
      },
      "performanceBenchmark": {
        "engagementRate": 1.23,
        "profileVisitRate": 0.5,
        "followRate": 0.1
      },
      "issues": [],
      "recommendations": ["エンゲージメント率は基準値を上回っています"]
    },
    
    "alerts": [
      {
        "level": "warning",
        "message": "CPM上昇率が警告レベルに達しています",
        "metric": "cpm_increase_rate",
        "value": 51,
        "threshold": 20
      }
    ],
    
    "overallRecommendations": [
      "優先度1: 入札戦略の最適化でCPM上昇を抑制",
      "優先度2: オーディエンス拡張で初回リーチ向上",
      "優先度3: 新クリエイティブのA/Bテスト実施"
    ],
    
    "processingMetrics": {
      "duration": 1250,
      "apiCalls": 5,
      "cacheHits": 3,
      "dataQuality": 0.92
    }
  }
}
```

#### GET /api/fatigue/analysis/{analysisId}
分析結果の取得

#### GET /api/fatigue/history/{adId}
広告の疲労度履歴取得

**クエリパラメーター:**
- `period`: `week` | `month` | `quarter` (デフォルト: month)
- `includeEvents`: イベント情報を含めるか

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "adId": "123456789",
    "records": [
      {
        "date": "2024-01-31",
        "fatigueScore": {
          "totalScore": 72,
          "creativeScore": 85,
          "audienceScore": 70,
          "algorithmScore": 45
        },
        "events": [
          {
            "type": "budget_increase",
            "description": "日予算を50%増額",
            "timestamp": "2024-01-31T10:00:00Z"
          }
        ]
      }
    ],
    "trends": {
      "scoreChange": -8.5,
      "trendDirection": "declining",
      "volatility": 0.15
    },
    "insights": {
      "bestPerformingPeriod": {
        "start": "2024-01-15",
        "end": "2024-01-22",
        "averageScore": 89
      }
    }
  }
}
```

### バッチ疲労度分析

#### POST /api/fatigue/batch-analyze
複数広告の疲労度分析実行

**リクエスト:**
```json
{
  "accountId": "act_123456789",
  "adIds": ["123456", "789012", "345678"],
  "config": {
    "includeInstagram": true,
    "prioritization": "spend",
    "maxConcurrency": 10
  }
}
```

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "batchId": "batch_def456",
    "totalAds": 3,
    "processedAds": 3,
    "successfulAds": 2,
    "failedAds": 1,
    
    "results": [
      {
        "adId": "123456",
        "success": true,
        "analysis": { /* 分析結果 */ }
      },
      {
        "adId": "789012", 
        "success": false,
        "error": {
          "code": "INSUFFICIENT_DATA",
          "message": "ベースライン計算に必要なデータが不足しています"
        }
      }
    ],
    
    "summary": {
      "averageScore": 68.5,
      "statusBreakdown": {
        "healthy": 0,
        "warning": 2,
        "critical": 0
      },
      "topIssues": [
        {"issue": "algorithm", "count": 2, "percentage": 100}
      ]
    },
    
    "processingMetrics": {
      "totalDuration": 3540,
      "averageDurationPerAd": 1180,
      "totalApiCalls": 15,
      "cacheHitRate": 0.4
    }
  }
}
```

---

## KPI集約・分析 API

### クリエイティブ種別別パフォーマンス

#### GET /api/kpi/creative-performance
画像・動画・テキスト別成果集計

**クエリパラメーター:**
- `accountId`: アカウントID（必須）
- `campaignId`: キャンペーンID（オプション）
- `period`: 集計期間 `7d` | `30d` | `90d` | `custom`
- `startDate`: 開始日（period=customの場合）
- `endDate`: 終了日（period=customの場合）
- `metrics`: 取得メトリクス配列

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalSpend": 1250000,
      "totalConversions": 485,
      "totalRevenue": 2890000,
      "overallRoas": 2.31,
      "overallCpa": 2577
    },
    
    "creativeTypeBreakdown": [
      {
        "creativeType": "video",
        "adCount": 25,
        "spend": 750000,
        "impressions": 2450000,
        "clicks": 18900,
        "conversions": 320,
        "conversionValue": 1980000,
        "ctr": 0.0077,
        "cpc": 39.68,
        "cpm": 306.12,
        "cpa": 2343.75,
        "roas": 2.64,
        "avgFatigueScore": 72.8,
        "healthyAds": 15,
        "warningAds": 8,
        "criticalAds": 2
      },
      {
        "creativeType": "image", 
        "adCount": 18,
        "spend": 300000,
        "impressions": 1200000,
        "clicks": 9600,
        "conversions": 110,
        "conversionValue": 550000,
        "ctr": 0.008,
        "cpc": 31.25,
        "cpm": 250.0,
        "cpa": 2727.27,
        "roas": 1.83,
        "avgFatigueScore": 68.2,
        "healthyAds": 8,
        "warningAds": 7,
        "criticalAds": 3
      },
      {
        "creativeType": "carousel",
        "adCount": 12,
        "spend": 200000,
        "impressions": 980000,
        "clicks": 8820,
        "conversions": 55,
        "conversionValue": 360000,
        "ctr": 0.009,
        "cpc": 22.68,
        "cpm": 204.08,
        "cpa": 3636.36,
        "roas": 1.8,
        "avgFatigueScore": 65.5,
        "healthyAds": 5,
        "warningAds": 5,
        "criticalAds": 2
      }
    ],
    
    "topPerformingAds": [
      {
        "adId": "123456",
        "adName": "動画A_夏季限定",
        "creativeType": "video",
        "spend": 45000,
        "roas": 4.2,
        "cpa": 1890,
        "fatigueScore": 89
      }
    ],
    
    "period": {
      "startDate": "2024-01-01",
      "endDate": "2024-01-31",
      "days": 31
    }
  }
}
```

### キャンペーン横断KPI

#### GET /api/kpi/cross-campaign
キャンペーン単位の成果比較

**リクエスト例:**
```
GET /api/kpi/cross-campaign?accountId=act_123456789&period=30d&sortBy=roas&sortOrder=desc
```

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "campaigns": [
      {
        "campaignId": "123456789",
        "campaignName": "Summer Campaign 2024",
        "objective": "CONVERSIONS",
        "status": "ACTIVE",
        
        "kpis": {
          "spend": 450000,
          "impressions": 1800000,
          "clicks": 14400,
          "conversions": 180,
          "conversionValue": 1260000,
          "ctr": 0.008,
          "cpc": 31.25,
          "cpm": 250.0,
          "cpa": 2500,
          "roas": 2.8
        },
        
        "creativeBreakdown": {
          "video": {"spend": 270000, "conversions": 120, "roas": 3.1},
          "image": {"spend": 135000, "conversions": 45, "roas": 2.3},
          "carousel": {"spend": 45000, "conversions": 15, "roas": 2.0}
        },
        
        "fatigueMetrics": {
          "avgFatigueScore": 75.2,
          "healthyAds": 8,
          "warningAds": 5,
          "criticalAds": 2
        },
        
        "ecforceAttribution": {
          "attributedOrders": 165,
          "attributedRevenue": 1890000,
          "ecforceRoas": 4.2
        }
      }
    ],
    
    "accountSummary": {
      "totalCampaigns": 5,
      "activeCampaigns": 4,
      "totalSpend": 1250000,
      "totalRevenue": 3200000,
      "overallRoas": 2.56
    }
  }
}
```

### アカウント横断比較

#### GET /api/kpi/cross-account
広告主・媒体単位の成果比較

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "accounts": [
      {
        "accountId": "act_123456789",
        "accountName": "Company A広告アカウント",
        "industry": "EC",
        
        "kpis": {
          "spend": 2500000,
          "conversions": 850,
          "revenue": 6800000,
          "roas": 2.72,
          "cpa": 2941
        },
        
        "creativeTypePerformance": {
          "video": {"spend": 1500000, "roas": 3.1, "share": 60},
          "image": {"spend": 750000, "roas": 2.2, "share": 30},
          "text": {"spend": 250000, "roas": 1.8, "share": 10}
        },
        
        "fatigueHealth": {
          "avgScore": 71.5,
          "healthyRatio": 0.45,
          "warningRatio": 0.4,
          "criticalRatio": 0.15
        },
        
        "platformBreakdown": {
          "facebook": {"spend": 1500000, "roas": 2.5},
          "instagram": {"spend": 1000000, "roas": 3.1}
        }
      }
    ],
    
    "benchmarks": {
      "industryAverage": {
        "roas": 2.1,
        "cpa": 3200,
        "fatigueScore": 68
      },
      "platformBenchmarks": {
        "facebook": {"avgRoas": 2.3, "avgCpa": 3100},
        "instagram": {"avgRoas": 2.8, "avgCpa": 2800}
      }
    }
  }
}
```

---

## Meta API統合

### Meta データ同期

#### POST /api/meta/sync
Meta APIからデータ同期実行

**リクエスト:**
```json
{
  "accountId": "act_123456789",
  "syncType": "incremental",
  "dateRange": {
    "start": "2024-01-01",
    "end": "2024-01-31"
  },
  "entities": ["campaigns", "ads", "insights"],
  "includeInstagram": true
}
```

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "syncId": "sync_789012",
    "status": "running",
    "progress": {
      "totalSteps": 4,
      "currentStep": 2,
      "stepName": "広告データ取得",
      "percentage": 50
    },
    "estimatedCompletion": "2024-01-31T12:15:00Z"
  }
}
```

#### GET /api/meta/sync/{syncId}
同期ステータス確認

#### GET /api/meta/accounts/{accountId}/insights
Meta Insights データ取得

**クエリパラメーター:**
- `level`: `account` | `campaign` | `adset` | `ad`
- `fields`: 取得フィールド配列
- `dateRange`: 期間指定
- `breakdown`: 分解軸指定

---

## ECforce統合 API

### ECforce データインポート

#### POST /api/ecforce/import
ECforceデータのインポート実行

**リクエスト:**
```json
{
  "importType": "orders",
  "dataSource": "api",
  "config": {
    "apiEndpoint": "https://api.ecforce.com/orders",
    "apiKey": "encrypted_api_key",
    "dateRange": {
      "start": "2024-01-01",
      "end": "2024-01-31"
    }
  },
  "fieldMapping": {
    "orderId": "order_id",
    "customerId": "customer_id", 
    "orderDate": "created_at",
    "totalAmount": "total_price",
    "fbClickId": "fb_click_id"
  }
}
```

#### POST /api/ecforce/import/csv
CSVファイルからのインポート

**リクエスト（multipart/form-data）:**
- `file`: CSVファイル
- `mapping`: フィールドマッピング設定

### ECforce アトリビューション分析

#### POST /api/attribution/analyze
広告とECforce売上の紐付け分析

**リクエスト:**
```json
{
  "accountId": "act_123456789",
  "attributionWindow": 28,
  "conversionWindow": 7,
  "dateRange": {
    "start": "2024-01-01", 
    "end": "2024-01-31"
  }
}
```

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "attributionResults": [
      {
        "adId": "123456789",
        "adName": "夏季キャンペーン_動画A",
        "metaConversions": 45,
        "metaRevenue": 225000,
        "ecforceAttributedOrders": 52,
        "ecforceAttributedRevenue": 286000,
        "attributionRate": 1.16,
        "incrementalRevenue": 61000,
        "trueRoas": 2.54
      }
    ],
    
    "summary": {
      "totalMetaRevenue": 1500000,
      "totalEcforceAttributed": 1890000,
      "overallAttributionRate": 1.26,
      "incrementalValue": 390000
    }
  }
}
```

---

## アラート・通知 API

### アラート管理

#### GET /api/alerts
アクティブアラート一覧取得

**クエリパラメーター:**
- `accountId`: アカウントフィルター
- `level`: `info` | `warning` | `critical`
- `status`: `active` | `acknowledged` | `resolved`

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "alerts": [
      {
        "alertId": "alert_123",
        "adId": "123456789",
        "level": "critical",
        "title": "疲労度スコア危険レベル",
        "message": "広告の疲労度スコアが危険レベル（45点）に達しました",
        "triggeredBy": {
          "metric": "fatigue_score",
          "currentValue": 45,
          "thresholdValue": 50
        },
        "recommendations": [
          "新しいクリエイティブの追加",
          "ターゲティングの見直し"
        ],
        "status": "active",
        "triggeredAt": "2024-01-31T10:30:00Z"
      }
    ],
    "summary": {
      "total": 15,
      "critical": 3,
      "warning": 8,
      "info": 4
    }
  }
}
```

#### POST /api/alerts/{alertId}/acknowledge
アラート確認

#### POST /api/alerts/{alertId}/resolve
アラート解決

---

## レポート・エクスポート API

### データエクスポート

#### POST /api/export/fatigue-report
疲労度レポートエクスポート

**リクエスト:**
```json
{
  "accountId": "act_123456789",
  "format": "excel",
  "period": {
    "start": "2024-01-01",
    "end": "2024-01-31"
  },
  "includeCharts": true,
  "sections": [
    "summary",
    "fatigue_analysis", 
    "kpi_breakdown",
    "recommendations"
  ]
}
```

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "exportId": "export_456",
    "fileUrl": "https://storage.example.com/exports/fatigue_report_20240131.xlsx",
    "filename": "fatigue_report_20240131.xlsx",
    "size": 2048576,
    "expiresAt": "2024-02-07T23:59:59Z"
  }
}
```

#### POST /api/export/kpi-dashboard
KPIダッシュボードエクスポート

---

## システム管理 API

### 設定管理

#### GET /api/config/fatigue
疲労度計算設定取得

#### PUT /api/config/fatigue
疲労度計算設定更新

#### GET /api/system/health
システムヘルスチェック

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "services": {
      "database": "healthy",
      "metaApi": "healthy",
      "ecforceApi": "healthy",
      "fatigueEngine": "healthy"
    },
    "metrics": {
      "activeBatchJobs": 2,
      "queuedAnalyses": 15,
      "avgProcessingTime": 1250,
      "errorRate": 0.02
    },
    "lastChecked": "2024-01-31T12:00:00Z"
  }
}
```

---

## エラーハンドリング

### 共通エラー形式

```json
{
  "success": false,
  "error": {
    "code": "FATIGUE_CALCULATION_ERROR",
    "message": "疲労度計算でエラーが発生しました",
    "details": {
      "adId": "123456789",
      "issue": "insufficient_baseline_data",
      "minimumDays": 7,
      "availableDays": 3
    },
    "recoverable": true,
    "retryAfter": 86400,
    "userAction": {
      "label": "データ蓄積後に再実行",
      "action": "wait_and_retry"
    }
  },
  "metadata": {
    "timestamp": "2024-01-31T12:00:00Z",
    "requestId": "req_def456",
    "version": "1.0"
  }
}
```

### エラーコード一覧

| コード | 説明 | 対処法 |
|--------|------|--------|
| `INSUFFICIENT_DATA` | 分析に必要なデータ不足 | データ蓄積を待つ |
| `BASELINE_CALCULATION_FAILED` | ベースライン計算失敗 | 期間延長または業界平均使用 |
| `META_API_ERROR` | Meta API呼び出しエラー | トークン確認・再試行 |
| `ECFORCE_INTEGRATION_ERROR` | ECforce連携エラー | 設定確認・再試行 |
| `BATCH_PROCESSING_TIMEOUT` | バッチ処理タイムアウト | 処理分割・再実行 |
| `INVALID_CONFIGURATION` | 設定値エラー | 設定値修正 |

---

## パフォーマンス最適化

### バッチ処理最適化

- **並行処理**: 最大10広告同時処理
- **優先度制御**: 広告費用順での処理優先付け
- **キャッシュ活用**: 計算済み結果の24時間キャッシュ
- **分割処理**: 大量データの段階的処理

### API応答最適化

- **フィールド選択**: 必要フィールドのみ返却
- **ページネーション**: 大量結果の分割返却  
- **圧縮**: gzip圧縮によるデータサイズ削減
- **CDN**: 静的リソースの配信最適化