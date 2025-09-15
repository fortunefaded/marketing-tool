import React, { useState, useEffect } from 'react'
import { ChevronRight, ChevronDown, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react'

interface ComprehensiveDataTabsProps {
  adId: string
  accessToken: string
  accountId: string
  adsetId?: string
  campaignId?: string
}

type DataTabType = 'ad_object' | 'ad_insights' | 'creative' | 'targeting' | 'delivery' | 'all_data'

interface FieldDefinition {
  endpoint: string
  fields: string[]
  params?: Record<string, any>
  description: string
}

// Meta Ads API v23.0で有効なdate_preset値の参考情報
// 参考: https://developers.facebook.com/docs/marketing-api/insights/parameters
// 'today', 'yesterday', 'this_month', 'last_month', 'this_quarter', 'maximum' など

const TAB_DEFINITIONS: Record<DataTabType, FieldDefinition> = {
  ad_object: {
    endpoint: '/{adId}',
    fields: [
      // 基本識別情報
      'id',
      'name',
      'status', // 広告の設定状態
      'effective_status', // 実際の配信状態
      'created_time',
      'updated_time',

      // 配信診断情報
      'recommendations', // Metaからの最適化提案
      'issues_info', // 配信に関する問題

      // 入札設定
      'bid_type',
      'bid_amount',
      'bid_info',

      // その他の広告設定
      'source_ad_id', // コピー元の広告ID
      'preview_shareable_link', // プレビューリンク
      'configured_status', // 設定されたステータス
      'last_updated_by_app_id', // 最終更新アプリID
      'tracking_specs', // トラッキング設定
      'conversion_specs', // コンバージョン設定

      // 階層構造から予算情報を取得
      'adset{id,name,optimization_goal,billing_event,daily_budget,lifetime_budget,budget_remaining,bid_strategy}',
      'campaign{id,name,objective,buying_type,daily_budget,lifetime_budget,budget_remaining,spend_cap}',
    ],
    description: '広告オブジェクトの基本情報',
  },
  ad_insights: {
    endpoint: '/{adId}/insights',
    fields: [
      // 基本メトリクス
      'impressions',
      'clicks',
      'spend',
      'reach',
      'frequency',
      'ctr',
      'cpc',
      'cpm',
      'cpp',

      // 品質指標
      'quality_ranking',
      'engagement_rate_ranking',
      'conversion_rate_ranking',

      // リンククリック詳細
      'inline_link_clicks',
      'inline_link_click_ctr',
      'inline_post_engagement',
      'unique_inline_link_clicks',
      'unique_inline_link_click_ctr',
      'outbound_clicks',
      'outbound_clicks_ctr',
      'unique_outbound_clicks',
      'unique_outbound_clicks_ctr',

      // ソーシャルメトリクス（v23.0では利用不可）
      'social_spend',

      // 動画メトリクス
      'video_play_actions',
      'video_p25_watched_actions',
      'video_p50_watched_actions',
      'video_p75_watched_actions',
      'video_p95_watched_actions',
      'video_p100_watched_actions',
      'video_avg_time_watched_actions',
      'video_play_curve_actions',
      'video_thruplay_watched_actions',
      'video_30_sec_watched_actions',
      'video_15_sec_watched_actions',
      'video_continuous_2_sec_watched_actions',
      'cost_per_thruplay',
      'cost_per_15_sec_video_view',

      // Canvas/Collection
      'canvas_avg_view_time',
      'canvas_avg_view_percent',

      // Instant Experience
      'instant_experience_clicks_to_open',
      'instant_experience_clicks_to_start',
      'instant_experience_outbound_clicks',

      // 配信インサイト
      'auction_bid',
      'auction_competitiveness',
      'auction_max_competitor_bid',
      'buying_type',
      'objective',

      // エンゲージメント
      // engagement_rateはv23.0では利用不可
      'unique_clicks',
      'unique_ctr',

      // アクション関連
      'actions',
      'action_values',
      'unique_actions',
      'cost_per_action_type',
      'cost_per_unique_action_type',
      'website_ctr',

      // ROAS
      'purchase_roas',
      'website_purchase_roas',
      'mobile_app_purchase_roas',

      // その他の重要メトリクス
      // estimated_ad_recall_rate関連はv19.0以降削除された
      'catalog_segment_actions',
      'catalog_segment_value',
      'catalog_segment_value_mobile_purchase_roas',
      'catalog_segment_value_omni_purchase_roas',
      'catalog_segment_value_website_purchase_roas',
      // conversion_rateはv23.0では利用不可
      'conversion_values',
      'conversions',
      'converted_product_quantity',
      'converted_product_value',
      // cost_per_estimated_ad_recallersもv19.0以降削除
      'cost_per_unique_inline_link_click',
      'dda_results',
      'full_view_impressions',
      'full_view_reach',
      // location_actions, location_valuesはv23.0では利用不可
      'optimization_goal',
      'place_page_name',
      'qualifying_question_qualify_answer_rate',
    ],
    params: {
      // lifetimeは無効、正しい値はmaximum
      date_preset: 'maximum',
    },
    description: '広告パフォーマンスの詳細インサイト',
  },
  creative: {
    endpoint: '/{adId}/adcreatives',
    fields: [
      'id',
      'name',
      'status',
      'body',
      'title',
      'call_to_action_type',
      'image_url',
      'image_hash',
      'image_crops',
      'thumbnail_url',
      'video_id',
      'link_url',
      'link_destination_display_url',
      'object_id',
      'object_type',
      'object_url',
      'object_story_spec',
      'object_story_id',
      'degrees_of_freedom_spec',
      'asset_feed_spec',
      'template_url',
      'url_tags',
      'use_page_actor_override',
      'instagram_actor_id',
      'instagram_permalink_url',
      'instagram_story_id',
      'instagram_user_id',
      'place_page_set_id',
      'platform_customizations',
      'product_set_id',
      'recommender_settings',
    ],
    description: 'クリエイティブアセットの詳細',
  },
  targeting: {
    endpoint: '/{adId}/targetingsentencelines',
    fields: [],
    description: 'ターゲティング設定の詳細',
  },
  delivery: {
    // delivery_estimateエンドポイントは広告レベルでは存在しない
    // 代わりにAdSetレベルのdelivery_estimateか、reachestimateを使用
    endpoint: '/{adId}',
    fields: [
      'bid_amount',
      'bid_type',
      'bid_info',
      'targeting',
      // promoted_objectはAdSetレベルのフィールド
      'adset{id,name,promoted_object,delivery_estimate,daily_budget,lifetime_budget,optimization_goal,billing_event,budget_remaining}',
    ],
    description: '配信設定と最適化情報',
  },
  all_data: {
    endpoint: '',
    fields: [],
    description: 'すべてのAPIデータの統合ビュー',
  },
}

export const ComprehensiveDataTabs: React.FC<ComprehensiveDataTabsProps> = ({
  adId,
  accessToken,
  accountId,
  adsetId,
  campaignId,
}) => {
  const [activeDataTab, setActiveDataTab] = useState<DataTabType>('ad_object')
  const [dataCache, setDataCache] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  // エンドポイントURLを構築
  const buildEndpointUrl = (endpoint: string): string => {
    return endpoint
      .replace('{adId}', adId)
      .replace('{adsetId}', adsetId || '')
      .replace('{campaignId}', campaignId || '')
      .replace('{accountId}', accountId)
  }

  // データ取得関数
  const fetchEndpointData = async (tabType: DataTabType) => {
    const definition = TAB_DEFINITIONS[tabType]
    if (!definition.endpoint) return null

    const cacheKey = tabType

    // キャッシュチェック
    if (dataCache[cacheKey]) {
      return dataCache[cacheKey]
    }

    setLoading((prev) => ({ ...prev, [cacheKey]: true }))
    setErrors((prev) => ({ ...prev, [cacheKey]: '' }))

    try {
      const endpoint = buildEndpointUrl(definition.endpoint)
      const url = new URL(`https://graph.facebook.com/v23.0${endpoint}`)
      url.searchParams.append('access_token', accessToken)

      if (definition.fields.length > 0) {
        url.searchParams.append('fields', definition.fields.join(','))
      }

      if (definition.params) {
        Object.entries(definition.params).forEach(([key, value]) => {
          url.searchParams.append(
            key,
            typeof value === 'object' ? JSON.stringify(value) : String(value)
          )
        })
      }

      console.log(`📡 Fetching ${tabType}:`, url.toString())

      const response = await fetch(url.toString())
      const data = await response.json()

      if (data.error) {
        // 無効なフィールドのエラーをパース
        const errorMessage = data.error.message
        const invalidFieldsMatch = errorMessage.match(
          /([^,]+) (?:are|is) not valid for fields param/
        )
        if (invalidFieldsMatch) {
          const invalidFields = invalidFieldsMatch[1].split(', ').map((f: string) => f.trim())
          setFieldErrors((prev) => ({ ...prev, [cacheKey]: invalidFields }))

          // 無効なフィールドを除外して再試行
          const validFields = definition.fields.filter((f) => {
            // フィールド名を抽出（ネストされたフィールドの場合も対応）
            const fieldName = f.split('{')[0]
            return !invalidFields.includes(fieldName)
          })

          if (validFields.length > 0 && validFields.length < definition.fields.length) {
            // 再試行
            const retryUrl = new URL(`https://graph.facebook.com/v23.0${endpoint}`)
            retryUrl.searchParams.append('access_token', accessToken)
            retryUrl.searchParams.append('fields', validFields.join(','))

            if (definition.params) {
              Object.entries(definition.params).forEach(([key, value]) => {
                retryUrl.searchParams.append(
                  key,
                  typeof value === 'object' ? JSON.stringify(value) : String(value)
                )
              })
            }

            console.log(`🔄 Retrying ${tabType} with valid fields:`, validFields)
            const retryResponse = await fetch(retryUrl.toString())
            const retryData = await retryResponse.json()

            if (!retryData.error) {
              setDataCache((prev) => ({ ...prev, [cacheKey]: retryData }))
              return retryData
            }
          }
        }
        throw new Error(data.error.message)
      }

      // 追加のエンドポイントを並列で取得
      if (tabType === 'targeting' && adsetId) {
        const adsetUrl = new URL(`https://graph.facebook.com/v23.0/${adsetId}`)
        adsetUrl.searchParams.append('access_token', accessToken)
        adsetUrl.searchParams.append('fields', 'targeting')

        const adsetResponse = await fetch(adsetUrl.toString())
        const adsetData = await adsetResponse.json()

        data.adset_targeting = adsetData.targeting || null
      }

      setDataCache((prev) => ({ ...prev, [cacheKey]: data }))
      return data
    } catch (error: any) {
      console.error(`❌ Error fetching ${tabType}:`, error)
      setErrors((prev) => ({ ...prev, [cacheKey]: error.message }))
      return null
    } finally {
      setLoading((prev) => ({ ...prev, [cacheKey]: false }))
    }
  }

  // タブ変更時にデータを取得
  useEffect(() => {
    if (activeDataTab !== 'all_data') {
      fetchEndpointData(activeDataTab)
    } else {
      // すべてのデータを取得
      Object.keys(TAB_DEFINITIONS).forEach((tabType) => {
        if (tabType !== 'all_data') {
          fetchEndpointData(tabType as DataTabType)
        }
      })
    }
  }, [activeDataTab])

  // セクションの展開/折りたたみ
  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  // 値の表示形式を整形
  const formatValue = (value: any): React.ReactElement => {
    if (value === null || value === undefined) {
      return <span className="text-red-500 font-mono">N/A</span>
    }

    if (typeof value === 'boolean') {
      return (
        <span className={`font-mono ${value ? 'text-green-600' : 'text-gray-500'}`}>
          {value ? '✓ true' : '✗ false'}
        </span>
      )
    }

    if (typeof value === 'number') {
      return <span className="font-mono text-blue-600">{value.toLocaleString()}</span>
    }

    if (typeof value === 'string') {
      // 日付の場合
      if (value.match(/^\d{4}-\d{2}-\d{2}T/)) {
        return (
          <span className="font-mono text-purple-600">
            {new Date(value).toLocaleString('ja-JP')}
          </span>
        )
      }
      // URLの場合
      if (value.startsWith('http')) {
        return (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 underline break-all"
          >
            {value}
          </a>
        )
      }
      return <span className="font-mono">{value}</span>
    }

    if (Array.isArray(value)) {
      return (
        <div>
          <span className="text-gray-600">Array[{value.length}]</span>
          {value.length > 0 && (
            <details className="mt-1">
              <summary className="cursor-pointer text-blue-600 text-sm">詳細を表示</summary>
              <pre className="text-xs mt-2 bg-gray-50 p-2 rounded overflow-auto max-h-60">
                {JSON.stringify(value, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )
    }

    if (typeof value === 'object') {
      const keys = Object.keys(value)
      return (
        <div>
          <span className="text-gray-600">Object ({keys.length} keys)</span>
          <details className="mt-1">
            <summary className="cursor-pointer text-blue-600 text-sm">詳細を表示</summary>
            <pre className="text-xs mt-2 bg-gray-50 p-2 rounded overflow-auto max-h-60">
              {JSON.stringify(value, null, 2)}
            </pre>
          </details>
        </div>
      )
    }

    return <span className="font-mono">{String(value)}</span>
  }

  // データ表示コンポーネント
  const DataDisplay = ({ data, title, tabType }: { data: any; title: string; tabType: string }) => {
    if (loading[tabType]) {
      return (
        <div className="flex items-center justify-center p-8">
          <Clock className="w-6 h-6 animate-spin text-blue-500 mr-2" />
          <span>データを取得中...</span>
        </div>
      )
    }

    if (errors[tabType]) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <XCircle className="w-5 h-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
            <div>
              <p className="font-semibold text-red-800">エラーが発生しました</p>
              <p className="text-sm text-red-600 mt-1">{errors[tabType]}</p>
              {fieldErrors[tabType] && fieldErrors[tabType].length > 0 && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-xs font-semibold text-yellow-800">
                    API v23.0で利用できないフィールド:
                  </p>
                  <ul className="text-xs text-yellow-700 mt-1">
                    {fieldErrors[tabType].map((field) => (
                      <li key={field}>• {field}</li>
                    ))}
                  </ul>
                  <p className="text-xs text-yellow-600 mt-2">
                    これらのフィールドは除外して再取得を試みています
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )
    }

    if (!data) {
      return <div className="text-gray-500 p-4">データが取得されていません</div>
    }

    // データまたはdata.dataを処理
    const processedData = data.data ? (Array.isArray(data.data) ? data.data[0] : data.data) : data

    // フィールドをカテゴリ別に分類
    const categorizeFields = (obj: any) => {
      const categories: Record<string, Record<string, any>> = {
        基本情報: {},
        '予算・入札': {},
        'ステータス・設定': {},
        メトリクス: {},
        アクション: {},
        動画関連: {},
        品質スコア: {},
        その他: {},
      }

      Object.entries(obj).forEach(([key, value]) => {
        if (['id', 'name', 'created_time', 'updated_time'].includes(key)) {
          categories['基本情報'][key] = value
        } else if (
          key.includes('budget') ||
          key.includes('bid') ||
          key.includes('spend') ||
          key.includes('cost')
        ) {
          categories['予算・入札'][key] = value
        } else if (key.includes('status') || key.includes('effective')) {
          categories['ステータス・設定'][key] = value
        } else if (
          key.includes('impressions') ||
          key.includes('clicks') ||
          key.includes('reach') ||
          key.includes('ctr') ||
          key.includes('cpm')
        ) {
          categories['メトリクス'][key] = value
        } else if (key.includes('action')) {
          categories['アクション'][key] = value
        } else if (key.includes('video')) {
          categories['動画関連'][key] = value
        } else if (key.includes('ranking')) {
          categories['品質スコア'][key] = value
        } else {
          categories['その他'][key] = value
        }
      })

      // 空のカテゴリを削除
      return Object.fromEntries(
        Object.entries(categories).filter(([_, fields]) => Object.keys(fields).length > 0)
      )
    }

    const categorizedData = categorizeFields(processedData)

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">{title}</h3>
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-sm text-gray-600">
              {Object.keys(processedData).length} フィールド取得済み
            </span>
          </div>
        </div>

        {Object.entries(categorizedData).map(([category, fields]) => {
          const isExpanded = expandedSections[`${tabType}_${category}`] !== false

          return (
            <div key={category} className="border rounded-lg">
              <button
                onClick={() => toggleSection(`${tabType}_${category}`)}
                className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center">
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 mr-2" />
                  ) : (
                    <ChevronRight className="w-4 h-4 mr-2" />
                  )}
                  <span className="font-semibold">{category}</span>
                  <span className="ml-2 text-sm text-gray-500">({Object.keys(fields).length})</span>
                </div>
              </button>

              {isExpanded && (
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(fields).map(([key, value]) => (
                    <div key={key} className="border-b pb-2">
                      <div className="text-xs text-gray-600 mb-1">{key}</div>
                      <div className="text-sm">{formatValue(value)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {/* 生データ表示オプション */}
        <details className="mt-6">
          <summary className="cursor-pointer text-blue-600 text-sm font-semibold">
            生のJSONレスポンスを表示
          </summary>
          <pre className="text-xs mt-2 bg-gray-900 text-gray-100 p-4 rounded overflow-auto max-h-96">
            {JSON.stringify(data, null, 2)}
          </pre>
        </details>
      </div>
    )
  }

  // 全データタブの表示
  const AllDataDisplay = () => {
    const allTabs = Object.keys(TAB_DEFINITIONS).filter((t) => t !== 'all_data') as DataTabType[]
    const loadedCount = allTabs.filter((t) => dataCache[t]).length
    const errorCount = allTabs.filter((t) => errors[t]).length
    const loadingCount = allTabs.filter((t) => loading[t]).length

    return (
      <div className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-blue-600 mr-2" />
              <span className="font-semibold">データ取得状況</span>
            </div>
            <div className="flex space-x-4 text-sm">
              <span className="text-green-600">✓ 成功: {loadedCount}</span>
              <span className="text-yellow-600">⏳ 取得中: {loadingCount}</span>
              <span className="text-red-600">✗ エラー: {errorCount}</span>
            </div>
          </div>
        </div>

        {allTabs.map((tabType) => {
          const definition = TAB_DEFINITIONS[tabType]
          const data = dataCache[tabType]

          return (
            <div key={tabType} className="border rounded-lg p-4">
              <h4 className="font-bold mb-2">{definition.description}</h4>
              <DataDisplay
                data={data}
                title={`Endpoint: ${definition.endpoint}`}
                tabType={tabType}
              />
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="mt-6">
      {/* API情報バナー */}
      <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <AlertCircle className="w-4 h-4 text-gray-600 mr-2" />
            <span className="text-sm text-gray-700">Meta Graph API v23.0 を使用中</span>
          </div>
          <a
            href="https://developers.facebook.com/docs/graph-api/changelog/version23.0/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:text-blue-800 underline"
          >
            APIドキュメント →
          </a>
        </div>
        {Object.keys(fieldErrors).length > 0 && (
          <div className="mt-2 text-xs text-orange-600">
            ⚠️ 一部のフィールドはv23.0で廃止されています
          </div>
        )}
      </div>

      {/* タブナビゲーション */}
      <div className="flex space-x-2 border-b overflow-x-auto">
        {Object.entries(TAB_DEFINITIONS).map(([id, def]) => (
          <button
            key={id}
            onClick={() => setActiveDataTab(id as DataTabType)}
            className={`px-4 py-2 whitespace-nowrap flex items-center space-x-1 ${
              activeDataTab === id
                ? 'border-b-2 border-blue-500 text-blue-600 font-semibold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span>{def.description}</span>
            {loading[id] && <Clock className="w-3 h-3 animate-spin" />}
            {errors[id] && <XCircle className="w-3 h-3 text-red-500" />}
            {dataCache[id] && !loading[id] && !errors[id] && (
              <CheckCircle className="w-3 h-3 text-green-500" />
            )}
          </button>
        ))}
      </div>

      {/* タブコンテンツ */}
      <div className="mt-4">
        {activeDataTab === 'all_data' ? (
          <AllDataDisplay />
        ) : (
          <DataDisplay
            data={dataCache[activeDataTab]}
            title={TAB_DEFINITIONS[activeDataTab].description}
            tabType={activeDataTab}
          />
        )}
      </div>
    </div>
  )
}
