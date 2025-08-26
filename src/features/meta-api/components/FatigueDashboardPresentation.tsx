import { useMemo } from 'react'
import { AccountSelector } from '../account/AccountSelector'
import { StatCard } from './StatCard'
import { FatigueAccordion } from './FatigueAccordion'
import { AggregatedFatigueTable } from './AggregatedFatigueTable'
import { CreativeTableTab } from './CreativeTableTab'
import { Alert } from './Alert'
import { DataValidationAlert } from './DataValidationAlert'
import { MetaAccount, FatigueData } from '@/types'
import { aggregateByLevel } from '../utils/aggregation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface FatigueDashboardPresentationProps {
  // アカウント関連
  accounts: MetaAccount[]
  selectedAccountId: string | null
  isLoadingAccounts: boolean
  onAccountSelect: (accountId: string) => void
  
  // データ関連
  data: FatigueData[]
  insights: any[]
  isLoading: boolean
  isRefreshing: boolean
  error: Error | null
  
  // アクション
  onRefresh: (options?: { clearCache?: boolean }) => Promise<void>
  
  // メタ情報
  dataSource: 'cache' | 'api' | null
  lastUpdateTime: Date | null
}

/**
 * FatigueDashboard のプレゼンテーションコンポーネント
 * 責務: UI の表示とユーザーインタラクションのみ
 */
export function FatigueDashboardPresentation({
  accounts,
  selectedAccountId,
  isLoadingAccounts,
  onAccountSelect,
  data,
  insights,
  isLoading,
  isRefreshing,
  error,
  onRefresh,
  dataSource,
  lastUpdateTime
}: FatigueDashboardPresentationProps) {
  
  // 集計データをメモ化
  const aggregatedData = useMemo(() => {
    if (!insights || insights.length === 0) return { campaign: [], adset: [] }
    
    return {
      campaign: aggregateByLevel(insights, 'campaign'),
      adset: aggregateByLevel(insights, 'adset')
    }
  }, [insights])
  
  // 日時フォーマット関数
  const formatDateTime = (date: Date | null) => {
    if (!date) return '不明'
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }
  
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="w-full max-w-none">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Simple Ad Fatigue Dashboard
          </h1>
          
          {selectedAccountId && (
            <div className="flex items-center gap-4">
              {dataSource && (
                <div className="text-sm text-gray-600">
                  <div>データソース: {dataSource === 'cache' ? 'キャッシュ' : 'Meta API'}</div>
                  <div className="text-xs">最終更新: {formatDateTime(lastUpdateTime)}</div>
                </div>
              )}
              
              <button
                onClick={() => onRefresh()}
                disabled={isLoading || isRefreshing}
                className={`px-4 py-2 rounded-lg text-white transition-colors ${
                  isRefreshing 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-indigo-600 hover:bg-indigo-700'
                } disabled:opacity-50`}
              >
                {isRefreshing ? '更新中...' : isLoading ? '読み込み中...' : 'データ更新'}
              </button>
            </div>
          )}
        </div>
        
        <AccountSelector
          accounts={accounts}
          selectedAccountId={selectedAccountId}
          onSelect={onAccountSelect}
          isLoading={isLoadingAccounts}
        />
        
        {error && (
          <Alert
            type="error"
            title="データ取得エラー"
            message={
              error.message.includes('Token expired or invalid')
                ? 'Meta広告のアクセストークンが期限切れです。再度接続設定を行ってください。'
                : error.message.includes('No token found')
                ? 'Meta広告アカウントが接続されていません。'
                : error.message.includes('API Error: 401')
                ? 'Meta広告APIの認証に失敗しました。トークンを更新してください。'
                : error.message
            }
            action={
              error.message.includes('Token expired or invalid') ||
              error.message.includes('No token found') ||
              error.message.includes('API Error: 401')
                ? { label: 'Meta API設定を開く', href: '/meta-api-setup' }
                : undefined
            }
          />
        )}
        
        {selectedAccountId && !error && !isLoading && data.length === 0 && (
          <Alert
            type="warning"
            title="広告データが見つかりません"
            message="このアカウントには表示可能な広告データがありません。"
            action={{ label: '再度取得を試す', onClick: () => onRefresh() }}
          />
        )}
        
        {selectedAccountId && !error && (
          <>
            {isLoading && !data.length ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading fatigue data...</p>
              </div>
            ) : (
              <>
                {data.length > 0 && (
                  <>
                    {/* データ検証アラート */}
                    <DataValidationAlert 
                      data={data} 
                      onRevalidate={() => onRefresh()}
                      isValidating={isLoading}
                    />
                    
                    <div className="relative">
                      {/* 更新中のオーバーレイ */}
                      {isRefreshing && (
                        <div className="absolute inset-0 bg-white bg-opacity-75 z-10 flex items-center justify-center">
                          <div className="bg-white rounded-lg shadow-lg p-6 flex items-center space-x-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                            <span className="text-gray-700">データを更新中...</span>
                          </div>
                        </div>
                      )}
                      
                      <Tabs defaultValue="creative" className="w-full">
                        <TabsList className="grid w-full grid-cols-4 mb-6">
                          <TabsTrigger value="creative">クリエイティブ</TabsTrigger>
                          <TabsTrigger value="creative-table">クリエイティブ（テーブル）</TabsTrigger>
                          <TabsTrigger value="adset">広告セット</TabsTrigger>
                          <TabsTrigger value="campaign">キャンペーン</TabsTrigger>
                        </TabsList>
                      
                      <TabsContent value="creative">
                        <div className="grid grid-cols-4 gap-4 mb-8">
                          <StatCard title="Total" value={data.length} />
                          <StatCard title="Critical" value={data.filter(d => d.status === 'critical').length} color="red" />
                          <StatCard title="Warning" value={data.filter(d => d.status === 'warning').length} color="yellow" />
                          <StatCard title="Healthy" value={data.filter(d => d.status === 'healthy').length} color="green" />
                        </div>
                        
                        <FatigueAccordion data={data} insights={insights} />
                      </TabsContent>
                      
                      <TabsContent value="creative-table">
                        <CreativeTableTab 
                          data={data}
                          insights={insights}
                          selectedAccountId={selectedAccountId}
                          isLoading={isLoading}
                        />
                      </TabsContent>
                      
                      <TabsContent value="adset">
                        <div className="grid grid-cols-4 gap-4 mb-8">
                          <StatCard title="Total" value={aggregatedData.adset.length} />
                          <StatCard title="Critical" value={aggregatedData.adset.filter(d => d.fatigueStatus === 'critical').length} color="red" />
                          <StatCard title="Warning" value={aggregatedData.adset.filter(d => d.fatigueStatus === 'warning').length} color="yellow" />
                          <StatCard title="Healthy" value={aggregatedData.adset.filter(d => d.fatigueStatus === 'healthy').length} color="green" />
                        </div>
                        
                        <AggregatedFatigueTable data={aggregatedData.adset} level="adset" />
                      </TabsContent>
                      
                      <TabsContent value="campaign">
                        <div className="grid grid-cols-4 gap-4 mb-8">
                          <StatCard title="Total" value={aggregatedData.campaign.length} />
                          <StatCard title="Critical" value={aggregatedData.campaign.filter(d => d.fatigueStatus === 'critical').length} color="red" />
                          <StatCard title="Warning" value={aggregatedData.campaign.filter(d => d.fatigueStatus === 'warning').length} color="yellow" />
                          <StatCard title="Healthy" value={aggregatedData.campaign.filter(d => d.fatigueStatus === 'healthy').length} color="green" />
                        </div>
                        
                        <AggregatedFatigueTable data={aggregatedData.campaign} level="campaign" />
                      </TabsContent>
                    </Tabs>
                  </div>
                  </>
                )}
              </>
            )}
          </>
        )}
        
        {!selectedAccountId && !isLoadingAccounts && (
          <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500">
            Please select an account to view fatigue data
          </div>
        )}
      </div>
    </div>
  )
}