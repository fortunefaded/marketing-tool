import { useState, useEffect } from 'react'
import { useQuery, useAction } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { ChevronDownIcon, ChevronRightIcon, InformationCircleIcon } from '@heroicons/react/24/outline'

interface DataSection {
  title: string
  description: string
  fields: Field[]
  expanded: boolean
}

interface Field {
  name: string
  apiField: string
  type: string
  description: string
  example?: string | number | boolean
}

export function GoogleAdsAnalysis() {
  const config = useQuery(api.googleAds.getConfig)
  const testConnectionAction = useAction(api.googleAds.testConnection)

  const [isConnected, setIsConnected] = useState(false)
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [connectionMessage, setConnectionMessage] = useState('')
  const [dataSections, setDataSections] = useState<DataSection[]>([
    {
      title: '📋 基本情報',
      description: '広告アカウントの基本的な情報',
      expanded: true,
      fields: [
        { name: 'アカウントID', apiField: 'customer.id', type: 'string', description: '一意の広告アカウント識別子', example: '1234567890' },
        { name: 'アカウント名', apiField: 'customer.descriptive_name', type: 'string', description: '広告アカウントの表示名', example: 'マーケティングアカウント' },
        { name: '通貨', apiField: 'customer.currency_code', type: 'string', description: '使用通貨コード', example: 'JPY' },
        { name: 'タイムゾーン', apiField: 'customer.time_zone', type: 'string', description: 'アカウントのタイムゾーン', example: 'Asia/Tokyo' },
        { name: 'アカウントステータス', apiField: 'customer.status', type: 'enum', description: 'ENABLED, PAUSED, SUSPENDED, CLOSED, CANCELED', example: 'ENABLED' },
        { name: 'テストアカウント', apiField: 'customer.test_account', type: 'boolean', description: 'テストアカウントフラグ', example: false },
        { name: 'マネージャー', apiField: 'customer.manager', type: 'boolean', description: 'MCCアカウントフラグ', example: false },
        { name: '作成日時', apiField: 'customer.created_date', type: 'date', description: 'アカウント作成日', example: '2023-01-15' },
      ]
    },
    {
      title: '🎯 キャンペーン',
      description: '広告キャンペーンの詳細情報',
      expanded: false,
      fields: [
        { name: 'キャンペーンID', apiField: 'campaign.id', type: 'string', description: '一意のキャンペーン識別子', example: '123456789' },
        { name: 'キャンペーン名', apiField: 'campaign.name', type: 'string', description: 'キャンペーンの表示名', example: '夏季セールキャンペーン' },
        { name: 'ステータス', apiField: 'campaign.status', type: 'enum', description: 'ENABLED, PAUSED, REMOVED', example: 'ENABLED' },
        { name: 'キャンペーンタイプ', apiField: 'campaign.advertising_channel_type', type: 'enum', description: 'SEARCH, DISPLAY, SHOPPING, VIDEO, MULTI_CHANNEL, PERFORMANCE_MAX', example: 'SEARCH' },
        { name: '予算ID', apiField: 'campaign.campaign_budget', type: 'string', description: '関連する予算のリソース名', example: 'customers/1234567890/campaignBudgets/987654321' },
        { name: '入札戦略タイプ', apiField: 'campaign.bidding_strategy_type', type: 'enum', description: 'TARGET_CPA, TARGET_ROAS, MAXIMIZE_CLICKS等', example: 'TARGET_CPA' },
        { name: '開始日', apiField: 'campaign.start_date', type: 'date', description: 'キャンペーン開始日', example: '2024-01-01' },
        { name: '終了日', apiField: 'campaign.end_date', type: 'date', description: 'キャンペーン終了日', example: '2024-12-31' },
        { name: 'ネットワーク設定', apiField: 'campaign.network_settings', type: 'object', description: '検索ネットワーク、ディスプレイネットワークの設定' },
        { name: '地域ターゲティング', apiField: 'campaign.geo_target_type_setting', type: 'object', description: '地域ターゲティングの設定' },
      ]
    },
    {
      title: '📊 パフォーマンス指標',
      description: '広告パフォーマンスの測定指標',
      expanded: false,
      fields: [
        { name: 'インプレッション', apiField: 'metrics.impressions', type: 'number', description: '広告の表示回数', example: 26072 },
        { name: 'クリック数', apiField: 'metrics.clicks', type: 'number', description: '広告がクリックされた総回数', example: 810 },
        { name: 'CTR', apiField: 'metrics.ctr', type: 'number', description: 'クリック率（clicks ÷ impressions × 100）', example: 3.11 },
        { name: 'CPC', apiField: 'metrics.average_cpc', type: 'number', description: '平均クリック単価（マイクロ単位）', example: 53000000 },
        { name: 'コスト', apiField: 'metrics.cost_micros', type: 'number', description: '消化金額（マイクロ単位、÷1,000,000で円）', example: 43225000000 },
        { name: 'コンバージョン', apiField: 'metrics.conversions', type: 'number', description: 'コンバージョン数', example: 2 },
        { name: 'コンバージョン率', apiField: 'metrics.conversion_rate', type: 'number', description: 'コンバージョン率', example: 0.25 },
        { name: 'CPA', apiField: 'metrics.cost_per_conversion', type: 'number', description: 'コンバージョン単価（マイクロ単位）', example: 21612500000 },
        { name: 'コンバージョン価値', apiField: 'metrics.conversions_value', type: 'number', description: 'コンバージョンの価値', example: 50000 },
        { name: '全コンバージョン', apiField: 'metrics.all_conversions', type: 'number', description: 'ビュースルーコンバージョンを含む全コンバージョン', example: 5 },
      ]
    },
    {
      title: '👥 オーディエンス指標',
      description: 'リーチとフリークエンシー関連の指標',
      expanded: false,
      fields: [
        { name: 'リーチ', apiField: 'metrics.reach', type: 'number', description: '広告を少なくとも1回見たユニークユーザー数', example: 17086 },
        { name: 'フリークエンシー', apiField: 'metrics.frequency', type: 'number', description: '1人あたりの平均表示回数（impressions ÷ reach）', example: 1.53 },
        { name: 'ユニークCTR', apiField: 'metrics.unique_ctr', type: 'number', description: 'ユニークユーザーのCTR', example: 3.11 },
        { name: 'エンゲージメント', apiField: 'metrics.engagements', type: 'number', description: '広告へのエンゲージメント数' },
        { name: 'エンゲージメント率', apiField: 'metrics.engagement_rate', type: 'number', description: 'エンゲージメント率' },
        { name: 'インタラクション', apiField: 'metrics.interactions', type: 'number', description: 'ユーザーのインタラクション数' },
        { name: 'インタラクション率', apiField: 'metrics.interaction_rate', type: 'number', description: 'インタラクション率' },
      ]
    },
    {
      title: '🎨 広告グループ',
      description: '広告グループレベルの情報',
      expanded: false,
      fields: [
        { name: '広告グループID', apiField: 'ad_group.id', type: 'string', description: '一意の広告グループ識別子', example: '987654321' },
        { name: '広告グループ名', apiField: 'ad_group.name', type: 'string', description: '広告グループの表示名', example: 'ブランドキーワード' },
        { name: 'ステータス', apiField: 'ad_group.status', type: 'enum', description: 'ENABLED, PAUSED, REMOVED', example: 'ENABLED' },
        { name: 'タイプ', apiField: 'ad_group.type', type: 'enum', description: 'STANDARD, DISPLAY_STANDARD等', example: 'STANDARD' },
        { name: 'CPC入札', apiField: 'ad_group.cpc_bid_micros', type: 'number', description: 'CPC入札額（マイクロ単位）', example: 100000000 },
        { name: 'CPM入札', apiField: 'ad_group.cpm_bid_micros', type: 'number', description: 'CPM入札額（マイクロ単位）' },
        { name: 'ターゲットCPA', apiField: 'ad_group.target_cpa_micros', type: 'number', description: 'ターゲットCPA（マイクロ単位）' },
        { name: 'ターゲットROAS', apiField: 'ad_group.target_roas', type: 'number', description: 'ターゲットROAS' },
      ]
    },
    {
      title: '📝 広告',
      description: '個別広告の詳細情報',
      expanded: false,
      fields: [
        { name: '広告ID', apiField: 'ad.id', type: 'string', description: '一意の広告識別子', example: '112233445566' },
        { name: '広告名', apiField: 'ad.name', type: 'string', description: '広告の表示名（管理用）', example: '夏季セール広告A' },
        { name: '最終URL', apiField: 'ad.final_urls', type: 'array', description: 'クリック後の遷移先URL', example: ['https://example.com/sale'] },
        { name: 'タイプ', apiField: 'ad.type', type: 'enum', description: 'TEXT_AD, RESPONSIVE_SEARCH_AD, RESPONSIVE_DISPLAY_AD等', example: 'RESPONSIVE_SEARCH_AD' },
        { name: 'ヘッドライン', apiField: 'ad.responsive_search_ad.headlines', type: 'array', description: 'レスポンシブ検索広告のヘッドライン' },
        { name: '説明文', apiField: 'ad.responsive_search_ad.descriptions', type: 'array', description: 'レスポンシブ検索広告の説明文' },
        { name: '広告強度', apiField: 'ad_group_ad.ad_strength', type: 'enum', description: 'EXCELLENT, GOOD, AVERAGE, POOR', example: 'GOOD' },
        { name: 'ポリシーサマリー', apiField: 'ad_group_ad.policy_summary', type: 'object', description: '広告ポリシー違反の概要' },
      ]
    },
    {
      title: '🔍 キーワード',
      description: '検索キーワード関連のデータ',
      expanded: false,
      fields: [
        { name: 'キーワードID', apiField: 'keyword.id', type: 'string', description: '一意のキーワード識別子' },
        { name: 'キーワードテキスト', apiField: 'keyword.text', type: 'string', description: 'キーワード文字列', example: '夏 セール' },
        { name: 'マッチタイプ', apiField: 'keyword.match_type', type: 'enum', description: 'EXACT, PHRASE, BROAD', example: 'BROAD' },
        { name: '品質スコア', apiField: 'keyword.quality_score', type: 'number', description: '1-10の品質スコア', example: 7 },
        { name: 'CPC入札', apiField: 'keyword.cpc_bid_micros', type: 'number', description: 'キーワードCPC入札額' },
        { name: 'インプレッション', apiField: 'metrics.impressions', type: 'number', description: 'キーワードごとのインプレッション' },
        { name: 'クリック数', apiField: 'metrics.clicks', type: 'number', description: 'キーワードごとのクリック' },
        { name: '検索インプレッションシェア', apiField: 'metrics.search_impression_share', type: 'number', description: '検索結果での表示シェア', example: 0.65 },
      ]
    },
    {
      title: '💰 予算',
      description: 'キャンペーン予算の設定',
      expanded: false,
      fields: [
        { name: '予算ID', apiField: 'campaign_budget.id', type: 'string', description: '一意の予算識別子' },
        { name: '予算名', apiField: 'campaign_budget.name', type: 'string', description: '予算の表示名', example: '月間予算' },
        { name: '金額', apiField: 'campaign_budget.amount_micros', type: 'number', description: '予算金額（マイクロ単位）', example: 10000000000 },
        { name: '配信方法', apiField: 'campaign_budget.delivery_method', type: 'enum', description: 'STANDARD（標準）, ACCELERATED（集中化）', example: 'STANDARD' },
        { name: '共有設定', apiField: 'campaign_budget.explicitly_shared', type: 'boolean', description: '複数キャンペーンで共有', example: false },
        { name: '期間', apiField: 'campaign_budget.period', type: 'enum', description: 'DAILY（日次）, CUSTOM（カスタム）', example: 'DAILY' },
        { name: '推奨予算', apiField: 'campaign_budget.recommended_budget_amount_micros', type: 'number', description: 'Googleが推奨する予算' },
      ]
    },
    {
      title: '🎯 コンバージョン',
      description: 'コンバージョン追跡の詳細',
      expanded: false,
      fields: [
        { name: 'コンバージョンアクション', apiField: 'conversion_action.name', type: 'string', description: 'コンバージョンアクション名', example: '購入完了' },
        { name: 'カテゴリ', apiField: 'conversion_action.category', type: 'enum', description: 'PURCHASE, LEAD, SIGNUP, PAGE_VIEW等', example: 'PURCHASE' },
        { name: '計測期間', apiField: 'conversion_action.counting_type', type: 'enum', description: 'ONE_PER_CLICK, MANY_PER_CLICK', example: 'ONE_PER_CLICK' },
        { name: 'ビュースルー期間', apiField: 'conversion_action.view_through_lookback_window_days', type: 'number', description: 'ビュースルー計測期間（日）', example: 1 },
        { name: 'クリックスルー期間', apiField: 'conversion_action.click_through_lookback_window_days', type: 'number', description: 'クリックスルー計測期間（日）', example: 30 },
        { name: 'デフォルト値', apiField: 'conversion_action.default_value', type: 'number', description: 'コンバージョンのデフォルト値' },
        { name: 'アトリビューション', apiField: 'conversion_action.attribution_model_settings', type: 'object', description: 'アトリビューションモデル設定' },
      ]
    },
    {
      title: '📈 セグメント',
      description: 'データセグメント（期間、デバイス等）',
      expanded: false,
      fields: [
        { name: '日付', apiField: 'segments.date', type: 'date', description: 'レポート日付', example: '2024-09-18' },
        { name: '曜日', apiField: 'segments.day_of_week', type: 'enum', description: 'MONDAY, TUESDAY...SUNDAY', example: 'WEDNESDAY' },
        { name: '時間', apiField: 'segments.hour', type: 'number', description: '0-23の時間', example: 14 },
        { name: 'デバイス', apiField: 'segments.device', type: 'enum', description: 'MOBILE, DESKTOP, TABLET, TV, OTHER', example: 'MOBILE' },
        { name: 'ネットワーク', apiField: 'segments.ad_network_type', type: 'enum', description: 'SEARCH, DISPLAY, YOUTUBE等', example: 'SEARCH' },
        { name: '年齢層', apiField: 'segments.age_range', type: 'enum', description: 'AGE_RANGE_18_24, AGE_RANGE_25_34等' },
        { name: '性別', apiField: 'segments.gender', type: 'enum', description: 'MALE, FEMALE, UNDETERMINED' },
      ]
    }
  ])

  const toggleSection = (index: number) => {
    setDataSections(prev =>
      prev.map((section, i) =>
        i === index ? { ...section, expanded: !section.expanded } : section
      )
    )
  }

  const testConnection = async () => {
    setIsTestingConnection(true)
    setConnectionMessage('')

    try {
      const result = await testConnectionAction({})
      setIsConnected(result.success)
      setConnectionMessage(result.message)
    } catch (error) {
      setConnectionMessage('接続テストに失敗しました')
    } finally {
      setIsTestingConnection(false)
    }
  }

  useEffect(() => {
    if (config?.isConnected) {
      setIsConnected(true)
    }
  }, [config])

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Google Ads API データ探索</h1>
        <p className="text-gray-600">
          Google Ads API v21から取得可能なデータフィールドの完全リファレンス
        </p>
      </div>

      {/* 接続状態 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-300'}`} />
            <span className="font-medium text-gray-900">
              接続状態: {isConnected ? '接続済み' : '未接続'}
            </span>
            {config?.customerId && (
              <span className="text-sm text-gray-500">
                (Customer ID: {config.customerId})
              </span>
            )}
          </div>
          <button
            onClick={testConnection}
            disabled={isTestingConnection}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isTestingConnection ? '接続テスト中...' : '接続テスト'}
          </button>
        </div>
        {connectionMessage && (
          <div className={`mt-3 p-3 rounded-lg text-sm ${
            isConnected
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {connectionMessage}
          </div>
        )}
      </div>

      {/* API情報 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-2">
          <InformationCircleIcon className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">Google Ads API v21 について</p>
            <ul className="space-y-1">
              <li>• エンドポイント: https://googleads.googleapis.com/v21/</li>
              <li>• 認証: OAuth 2.0 + Developer Token</li>
              <li>• クエリ言語: Google Ads Query Language (GAQL)</li>
              <li>• データ形式: JSON (REST) / Protocol Buffers (gRPC)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* データセクション */}
      <div className="space-y-4">
        {dataSections.map((section, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200">
            <button
              onClick={() => toggleSection(index)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{section.title}</span>
                <span className="text-sm text-gray-500">{section.description}</span>
                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md">
                  {section.fields.length} フィールド
                </span>
              </div>
              {section.expanded ? (
                <ChevronDownIcon className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronRightIcon className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {section.expanded && (
              <div className="border-t border-gray-200">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          項目名
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          APIフィールド
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          データ型
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          説明
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          値の例
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {section.fields.map((field, fieldIndex) => (
                        <tr key={fieldIndex} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {field.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded text-blue-600">
                              {field.apiField}
                            </code>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                              ${field.type === 'string' ? 'bg-green-100 text-green-800' : ''}
                              ${field.type === 'number' ? 'bg-blue-100 text-blue-800' : ''}
                              ${field.type === 'boolean' ? 'bg-purple-100 text-purple-800' : ''}
                              ${field.type === 'enum' ? 'bg-yellow-100 text-yellow-800' : ''}
                              ${field.type === 'object' ? 'bg-pink-100 text-pink-800' : ''}
                              ${field.type === 'array' ? 'bg-indigo-100 text-indigo-800' : ''}
                              ${field.type === 'date' ? 'bg-gray-100 text-gray-800' : ''}
                            `}>
                              {field.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {field.description}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-400">
                            {field.example !== undefined ? (
                              <code className="text-xs bg-gray-50 px-2 py-1 rounded">
                                {typeof field.example === 'object'
                                  ? JSON.stringify(field.example)
                                  : String(field.example)
                                }
                              </code>
                            ) : (
                              '-'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* サンプルクエリ */}
      <div className="mt-8 bg-gray-50 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">サンプルGAQLクエリ</h2>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-2">キャンペーンのパフォーマンスデータ取得：</p>
            <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
{`SELECT
  campaign.id,
  campaign.name,
  campaign.status,
  metrics.impressions,
  metrics.clicks,
  metrics.cost_micros,
  metrics.conversions
FROM campaign
WHERE segments.date DURING LAST_30_DAYS
  AND campaign.status = 'ENABLED'
ORDER BY metrics.impressions DESC`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}