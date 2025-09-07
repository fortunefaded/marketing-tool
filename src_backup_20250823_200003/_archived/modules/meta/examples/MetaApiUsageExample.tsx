import React from 'react'
import { 
  useMetaInsights, 
  useMetaInsightsInfinite,
  useMetaCampaigns,
  useMetaAdsBatch 
} from '../hooks/useMetaApi'

// 設定はenvから取得
const metaConfig = {
  accessToken: import.meta.env.VITE_META_ACCESS_TOKEN,
  accountId: import.meta.env.VITE_META_ACCOUNT_ID,
  apiVersion: 'v23.0'
}

/**
 * シンプルなインサイトデータ表示
 */
export function SimpleInsightsExample() {
  const { data, isLoading, error } = useMetaInsights(metaConfig, {
    level: 'ad',
    dateRange: {
      since: '2024-01-01',
      until: '2024-01-31'
    }
  })

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <div>
      <h2>Ad Insights</h2>
      {data?.data.map(insight => (
        <div key={insight.ad_id} className="p-4 border rounded mb-2">
          <h3>{insight.ad_name}</h3>
          <p>Impressions: {insight.impressions.toLocaleString()}</p>
          <p>Clicks: {insight.clicks.toLocaleString()}</p>
          <p>CTR: {insight.ctr.toFixed(2)}%</p>
        </div>
      ))}
    </div>
  )
}

/**
 * 無限スクロール対応
 */
export function InfiniteScrollInsights() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useMetaInsightsInfinite(metaConfig, {
    level: 'ad',
    limit: 50
  })

  const insights = data?.pages.flatMap(page => page.data) || []

  return (
    <div>
      <h2>All Insights (Infinite Scroll)</h2>
      
      {insights.map(insight => (
        <div key={insight.ad_id} className="p-4 border rounded mb-2">
          <h3>{insight.ad_name}</h3>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <span>Spend: ${insight.spend.toFixed(2)}</span>
            <span>Reach: {insight.reach.toLocaleString()}</span>
            <span>Frequency: {insight.frequency.toFixed(2)}</span>
          </div>
        </div>
      ))}
      
      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-400"
        >
          {isFetchingNextPage ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  )
}

/**
 * キャンペーンとインサイトの組み合わせ
 */
export function CampaignInsightsDashboard() {
  const { data: campaigns } = useMetaCampaigns(metaConfig)
  const [selectedCampaign, setSelectedCampaign] = React.useState<string>()
  
  const { data: insights } = useMetaInsights(
    metaConfig,
    {
      level: 'ad',
      dateRange: {
        since: '2024-01-01',
        until: '2024-01-31'
      }
    },
    {
      enabled: !!selectedCampaign
    }
  )

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="col-span-1">
        <h3 className="font-bold mb-2">Campaigns</h3>
        {campaigns?.data.map(campaign => (
          <button
            key={campaign.id}
            onClick={() => setSelectedCampaign(campaign.id)}
            className={`w-full text-left p-2 rounded mb-1 ${
              selectedCampaign === campaign.id 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            {campaign.name}
          </button>
        ))}
      </div>
      
      <div className="col-span-2">
        <h3 className="font-bold mb-2">Campaign Insights</h3>
        {selectedCampaign ? (
          insights?.data
            .filter(i => i.campaign_id === selectedCampaign)
            .map(insight => (
              <div key={insight.ad_id} className="p-3 border rounded mb-2">
                <p className="font-medium">{insight.ad_name}</p>
                <div className="grid grid-cols-4 gap-2 mt-2 text-sm">
                  <div>
                    <span className="text-gray-500">Spend:</span>
                    <p className="font-bold">${insight.spend.toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">CTR:</span>
                    <p className="font-bold">{insight.ctr.toFixed(2)}%</p>
                  </div>
                  <div>
                    <span className="text-gray-500">CPC:</span>
                    <p className="font-bold">${insight.cpc.toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">CPM:</span>
                    <p className="font-bold">${insight.cpm.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            ))
        ) : (
          <p className="text-gray-500">Select a campaign to view insights</p>
        )}
      </div>
    </div>
  )
}

/**
 * バッチリクエストの例
 */
export function BatchRequestExample() {
  const adIds = ['123456789', '987654321', '456789123']
  const { data, isLoading } = useMetaAdsBatch(metaConfig, adIds)

  if (isLoading) return <div>Loading batch data...</div>

  return (
    <div>
      <h2>Batch Request Results</h2>
      {data?.map((ad: any) => (
        <div key={ad.id} className="p-4 border rounded mb-2">
          <h3>{ad.name}</h3>
          <p>Status: {ad.status}</p>
        </div>
      ))}
    </div>
  )
}

/**
 * エラーハンドリングの例
 */
export function ErrorHandlingExample() {
  const { data, error, refetch, isRefetching } = useMetaInsights(
    metaConfig,
    { level: 'ad' },
    {
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      onError: (error) => {
        // Sentryなどにエラーを送信
        console.error('Meta API Error:', error)
      }
    }
  )

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded">
        <h3 className="text-red-800 font-bold">Error occurred</h3>
        <p className="text-red-600">{error.message}</p>
        <button
          onClick={() => refetch()}
          disabled={isRefetching}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400"
        >
          {isRefetching ? 'Retrying...' : 'Retry'}
        </button>
      </div>
    )
  }

  return <div>{/* Normal content */}</div>
}