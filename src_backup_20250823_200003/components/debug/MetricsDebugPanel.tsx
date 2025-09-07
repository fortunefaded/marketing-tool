interface MetricsDebugPanelProps {
  data: any
  title?: string
}

export function MetricsDebugPanel({ data, title = 'API生データ' }: MetricsDebugPanelProps) {
  const debugData = {
    // 基本メトリクス
    basic_metrics: {
      spend: data.spend,
      impressions: data.impressions,
      clicks: data.clicks,
      date_start: data.date_start,
      ad_id: data.ad_id,
      campaign_name: data.campaign_name,
    },

    // コンバージョン関連の生データ
    conversion_raw_data: {
      actions: data.actions,
      action_values: data.action_values,
      cost_per_action_type: data.cost_per_action_type,
      purchase_roas: data.purchase_roas,
      website_purchase_roas: data.website_purchase_roas,
      conversions: data.conversions,
    },

    // パーサー解析結果
    parser_results: data.parser_analysis || data.parser_debug,

    // 計算されたメトリクス
    calculated_metrics: {
      conversions: data.conversions,
      conversion_value: data.conversion_value,
      roas: data.roas,
      cpa: data.cost_per_conversion,
    },
  }

  return (
    <details className="p-4 border rounded-lg bg-gray-50 mb-4">
      <summary className="cursor-pointer font-medium text-gray-700 hover:text-gray-900">
        🔍 デバッグ: {title}
      </summary>

      <div className="mt-4 space-y-4">
        {/* 基本メトリクス */}
        <div>
          <h4 className="font-semibold text-sm text-gray-800 mb-2">基本メトリクス</h4>
          <div className="bg-white p-3 rounded border text-xs">
            <div>広告費: ¥{parseFloat(data.spend || '0').toLocaleString()}</div>
            <div>インプレッション: {parseFloat(data.impressions || '0').toLocaleString()}</div>
            <div>クリック: {parseFloat(data.clicks || '0').toLocaleString()}</div>
            <div>日付: {data.date_start}</div>
          </div>
        </div>

        {/* コンバージョンデータの有無をチェック */}
        <div>
          <h4 className="font-semibold text-sm text-gray-800 mb-2">コンバージョンデータ状況</h4>
          <div className="bg-white p-3 rounded border text-xs space-y-1">
            <div className={data.actions ? 'text-green-600' : 'text-red-600'}>
              actions: {data.actions ? `${data.actions.length}件` : '❌ なし'}
            </div>
            <div className={data.action_values ? 'text-green-600' : 'text-red-600'}>
              action_values: {data.action_values ? `${data.action_values.length}件` : '❌ なし'}
            </div>
            <div className={data.cost_per_action_type ? 'text-green-600' : 'text-red-600'}>
              cost_per_action_type:{' '}
              {data.cost_per_action_type ? `${data.cost_per_action_type.length}件` : '❌ なし'}
            </div>
            <div className={data.purchase_roas ? 'text-green-600' : 'text-red-600'}>
              purchase_roas: {data.purchase_roas ? '✅ あり' : '❌ なし'}
            </div>
          </div>
        </div>

        {/* actionsの詳細 */}
        {data.actions && data.actions.length > 0 && (
          <div>
            <h4 className="font-semibold text-sm text-gray-800 mb-2">Actions詳細</h4>
            <div className="bg-white p-3 rounded border">
              {data.actions.map((action: any, index: number) => (
                <div key={index} className="text-xs border-b py-1">
                  <span className="font-mono">{action.action_type}</span>: {action.value}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 計算結果 */}
        <div>
          <h4 className="font-semibold text-sm text-gray-800 mb-2">計算結果</h4>
          <div className="bg-white p-3 rounded border text-xs space-y-1">
            <div>CV: {data.conversions || data.parser_analysis?.conversions || '0'}</div>
            <div>
              CV値: ¥
              {parseFloat(
                data.conversion_value || data.parser_analysis?.conversionValue || '0'
              ).toLocaleString()}
            </div>
            <div>ROAS: {parseFloat(data.roas || data.parser_analysis?.roas || '0').toFixed(2)}</div>
            <div>
              CPA: ¥
              {parseFloat(
                data.cost_per_conversion || data.parser_analysis?.cpa || '0'
              ).toLocaleString()}
            </div>
          </div>
        </div>

        {/* 生データ全体 */}
        <div>
          <h4 className="font-semibold text-sm text-gray-800 mb-2">生データ（JSON）</h4>
          <pre className="text-xs overflow-auto bg-white p-3 rounded border max-h-60">
            {JSON.stringify(debugData, null, 2)}
          </pre>
        </div>
      </div>
    </details>
  )
}
