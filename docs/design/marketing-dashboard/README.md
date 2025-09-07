# 広告パフォーマンス管理ダッシュボード - 技術設計

## 📋 設計概要

本ドキュメントセットは、広告パフォーマンス管理ダッシュボード（BIツール）の包括的な技術設計を提供します。

## 📁 ドキュメント構成

| ファイル名 | 概要 |
|-----------|------|
| `architecture.md` | システム全体のアーキテクチャ設計 |
| `dataflow.md` | データフロー図とシーケンス図 |
| `interfaces.ts` | TypeScript型定義・インターフェース |
| `database-schema.sql` | データベーススキーマ定義 |
| `api-endpoints.md` | REST API仕様書 |

## 🎯 主要機能

### 1. 広告疲労度分析システム
- **3つの疲労度指標**による総合評価
  - クリエイティブ疲労（CTR低下率 25%以上で危険）
  - 視聴者疲労（フリークエンシー 3.5超過で危険）
  - アルゴリズム疲労（CPM上昇率 20%以上で危険）
- **0-100スコアリング**による直感的な疲労度表示
- **リアルタイムアラート**機能

### 2. データ統合プラットフォーム
- **Meta Marketing API**統合
- **ECForce**売上データ連携
- **CSV インポート**機能
- **自動データ同期**（15分間隔）

### 3. 包括的ダッシュボード
- **ROAS/CPA/CV**などKPIの横断表示
- **キャンペーン・広告セット・広告**単位での成果比較
- **Instagram特有メトリクス**対応
- **動画広告専用分析**

## 🏗️ 技術スタック

### フロントエンド
- **React 18** + **TypeScript**
- **Convex** (リアルタイム同期)
- **Tailwind CSS** + **Heroicons**
- **React Router v6**
- **Vite** (バンドラー)

### バックエンド
- **Convex** (TypeScript)
- **Convex Auth** (OAuth2)
- **Convex Database** (Document Store)

### 外部統合
- **Meta Marketing API v19.0**
- **ECForce API**
- **CSV処理エンジン**

## 📊 データアーキテクチャ

### 主要エンティティ
- `MetaAccount` - Meta広告アカウント
- `Campaign` - キャンペーン
- `AdSet` - 広告セット  
- `Ad` - 広告
- `AdMetrics` - 広告メトリクス（日次）
- `FatigueAnalysis` - 疲労度分析結果
- `ECForceOrder` - ECForce注文データ

### データフロー
```
外部API → データ収集 → 加工・分析 → Convex DB → ダッシュボード表示
```

## 🚀 主要機能実装

### 疲労度分析アルゴリズム
```typescript
interface FatigueScore {
  total: number;        // 0-100 総合スコア
  breakdown: {
    audience: number;   // フリークエンシー基準
    creative: number;   // CTR低下率基準
    algorithm: number;  // CPM上昇率基準
  };
  status: 'healthy' | 'caution' | 'warning' | 'critical';
}
```

### リアルタイム更新
- Convex Subscriptionsによる自動データ同期
- React Query による効率的なキャッシング
- クライアントサイド最適化

## 📈 パフォーマンス目標

| 指標 | 目標値 |
|------|--------|
| 初回ロード時間 | 3秒以内 |
| データ更新レスポンス | 1秒以内 |
| 同時接続ユーザー | 100名 |
| データ保持期間 | 24ヶ月 |

## 🔒 セキュリティ

- **API トークン暗号化保存**
- **HTTPS通信強制**
- **CORS適切設定** 
- **Rate Limiting実装**
- **監査ログ記録**

## 🚦 開発フェーズ

### Phase 1: Core Infrastructure
- [ ] Convexセットアップ
- [ ] 基本認証実装
- [ ] Meta API統合

### Phase 2: Fatigue Analysis
- [ ] 疲労度計算アルゴリズム実装
- [ ] アラートシステム構築
- [ ] ダッシュボードUI開発

### Phase 3: ECForce Integration
- [ ] ECForce API連携
- [ ] 売上データ統合
- [ ] ROAS計算機能

### Phase 4: Advanced Features
- [ ] レポート自動生成
- [ ] CSVエクスポート
- [ ] システム最適化

## 📞 技術サポート

設計に関する質問や実装上の課題については、各設計ドキュメントを参照してください。

---

**生成日**: 2024-01-31  
**設計バージョン**: v1.0  
**対応要件**: 広告パフォーマンス管理ダッシュボード基本要件