import { useState } from 'react'
import { ExclamationTriangleIcon, CheckCircleIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface DataValidationAlertProps {
  data: any[]
  onRevalidate?: () => void
  isValidating?: boolean
}

interface ValidationIssue {
  type: 'warning' | 'error' | 'info'
  field: string
  message: string
  count: number
  affectedAds: string[]
}

export function DataValidationAlert({ data, onRevalidate, isValidating }: DataValidationAlertProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  // データ検証ロジック
  const validateData = (): ValidationIssue[] => {
    const issues: ValidationIssue[] = []
    
    if (!data || data.length === 0) {
      return [{
        type: 'warning',
        field: 'データ全体',
        message: 'データが取得されていません',
        count: 0,
        affectedAds: []
      }]
    }

    // 1. 数値フィールドの妥当性チェック
    const numericFields = [
      { field: 'impressions', min: 0, max: 100000000 },
      { field: 'clicks', min: 0, max: 10000000 },
      { field: 'spend', min: 0, max: 1000000 },
      { field: 'ctr', min: 0, max: 100 },
      { field: 'cpm', min: 0, max: 10000 },
      { field: 'frequency', min: 0, max: 50 }
    ]
    
    numericFields.forEach(({ field, min, max }) => {
      const invalidAds = data.filter(ad => {
        const value = ad.metrics?.[field] ?? ad[field]
        return value !== undefined && (isNaN(value) || value < min || value > max)
      })
      
      if (invalidAds.length > 0) {
        issues.push({
          type: 'error',
          field,
          message: `${field}の値が異常範囲です（${min}-${max}の範囲外）`,
          count: invalidAds.length,
          affectedAds: invalidAds.map(ad => ad.adName || ad.ad_name).slice(0, 5)
        })
      }
    })

    // 2. ゼロ値の多い指標をチェック
    const zeroValueFields = ['impressions', 'clicks', 'spend']
    zeroValueFields.forEach(field => {
      const zeroAds = data.filter(ad => {
        const value = ad.metrics?.[field] ?? ad[field]
        return value === 0
      })
      
      const zeroPercentage = (zeroAds.length / data.length) * 100
      if (zeroPercentage > 30) {
        issues.push({
          type: 'warning',
          field,
          message: `${field}が0の広告が${zeroPercentage.toFixed(1)}%あります`,
          count: zeroAds.length,
          affectedAds: zeroAds.map(ad => ad.adName || ad.ad_name).slice(0, 3)
        })
      }
    })

    // 3. Meta広告マネージャとの一致性確認推奨
    const highSpendAds = data.filter(ad => {
      const spend = ad.metrics?.spend ?? ad.spend
      return spend > 1000
    })
    
    if (highSpendAds.length > 0) {
      issues.push({
        type: 'info',
        field: '高支出広告',
        message: `高支出広告（¥1000+）が${highSpendAds.length}件あります。Meta広告マネージャでの数値と比較することを推奨します`,
        count: highSpendAds.length,
        affectedAds: highSpendAds.map(ad => ad.adName || ad.ad_name).slice(0, 3)
      })
    }

    // 4. Instagram メトリクスの検証
    const instagramAds = data.filter(ad => 
      ad.metrics?.instagram_metrics && 
      ad.metrics.instagram_metrics.publisher_platform?.includes('instagram')
    )
    
    if (instagramAds.length > 0) {
      const noEngagementAds = instagramAds.filter(ad => 
        ad.metrics.instagram_metrics.engagement_rate === 0
      )
      
      if (noEngagementAds.length > 0) {
        issues.push({
          type: 'warning',
          field: 'Instagramエンゲージメント',
          message: `Instagram広告でエンゲージメント率が0%の広告があります`,
          count: noEngagementAds.length,
          affectedAds: noEngagementAds.map(ad => ad.adName || ad.ad_name).slice(0, 3)
        })
      }
    }

    return issues
  }

  const validationIssues = validateData()
  const hasErrors = validationIssues.some(issue => issue.type === 'error')
  const hasWarnings = validationIssues.some(issue => issue.type === 'warning')
  
  if (validationIssues.length === 0 || (validationIssues.length === 1 && validationIssues[0].type === 'info' && data.length > 0)) {
    return (
      <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center">
          <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
          <span className="text-sm font-medium text-green-800">
            データ検証完了: {data.length}件の広告データが正常に取得されました
          </span>
          {validationIssues.length === 1 && validationIssues[0].type === 'info' && (
            <div className="ml-auto">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-xs text-green-600 hover:text-green-800"
              >
                推奨事項を表示
              </button>
            </div>
          )}
        </div>
        
        {isExpanded && validationIssues[0]?.type === 'info' && (
          <div className="mt-2 p-2 bg-green-25 rounded text-xs text-green-700">
            {validationIssues[0].message}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`mb-4 border rounded-lg ${
      hasErrors ? 'bg-red-50 border-red-200' : 
      hasWarnings ? 'bg-yellow-50 border-yellow-200' : 
      'bg-blue-50 border-blue-200'
    }`}>
      <div className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {hasErrors ? (
              <XMarkIcon className="h-5 w-5 text-red-500 mr-2" />
            ) : (
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 mr-2" />
            )}
            <span className={`text-sm font-medium ${
              hasErrors ? 'text-red-800' : 
              hasWarnings ? 'text-yellow-800' : 
              'text-blue-800'
            }`}>
              データ検証: {validationIssues.length}件の問題が検出されました
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {onRevalidate && (
              <button
                onClick={onRevalidate}
                disabled={isValidating}
                className={`px-3 py-1 text-xs rounded ${
                  hasErrors ? 'bg-red-100 text-red-700 hover:bg-red-200' :
                  'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                } disabled:opacity-50`}
              >
                {isValidating ? '再取得中...' : 'データ再取得'}
              </button>
            )}
            
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={`text-xs ${
                hasErrors ? 'text-red-600 hover:text-red-800' :
                hasWarnings ? 'text-yellow-600 hover:text-yellow-800' :
                'text-blue-600 hover:text-blue-800'
              }`}
            >
              {isExpanded ? '詳細を隠す' : '詳細を表示'}
            </button>
          </div>
        </div>
        
        {isExpanded && (
          <div className="mt-3 space-y-2">
            {validationIssues.map((issue, index) => (
              <div key={index} className={`p-2 rounded text-xs ${
                issue.type === 'error' ? 'bg-red-100' :
                issue.type === 'warning' ? 'bg-yellow-100' :
                'bg-blue-100'
              }`}>
                <div className="font-medium">
                  [{issue.type === 'error' ? 'エラー' : issue.type === 'warning' ? '警告' : '情報'}] 
                  {issue.field}: {issue.message}
                </div>
                {issue.count > 0 && (
                  <div className="mt-1">
                    影響を受ける広告数: {issue.count}件
                    {issue.affectedAds.length > 0 && (
                      <div className="text-gray-600">
                        例: {issue.affectedAds.join(', ')}
                        {issue.count > issue.affectedAds.length && ` 他${issue.count - issue.affectedAds.length}件`}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            
            <div className={`p-2 rounded text-xs ${
              hasErrors ? 'bg-red-100' : 'bg-yellow-100'
            }`}>
              <strong>推奨アクション:</strong>
              <ul className="mt-1 list-disc list-inside space-y-1">
                {hasErrors && (
                  <li>エラーが検出されました。「データ再取得」を試すか、Meta APIの設定を確認してください。</li>
                )}
                <li>Meta広告マネージャで同じ日付範囲のデータと比較してください（過去30日）。</li>
                <li>アトリビューションウィンドウ: 7日クリック、1日ビューで統一されています。</li>
                <li>数値の差異がある場合は、データ更新のタイミングやAPIの更新遅延を考慮してください。</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}