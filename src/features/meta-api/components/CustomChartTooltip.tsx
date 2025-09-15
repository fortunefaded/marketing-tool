interface CustomChartTooltipProps {
  active?: boolean
  payload?: any[]
  label?: string
  metricType?: string
  unit?: string
  chartData?: Array<{ date: string; value: number }> // 全データ（平均計算用）
}

// メトリクスタイプごとのラベルと色を定義
const METRIC_LABELS: { [key: string]: string } = {
  spend: '広告費用',
  impressions: 'インプレッション',
  frequency: 'フリークエンシー',
  clicks: 'クリック数',
  conversions: 'コンバージョン',
  ctr: 'CTR',
  cpm: 'CPM',
  cpc: 'CPC',
  engagement: 'エンゲージメント率',
}

const METRIC_UNITS: { [key: string]: string } = {
  spend: '¥',
  cpm: '¥',
  cpc: '¥',
  ctr: '%',
  frequency: '',
  impressions: '',
  clicks: '',
  conversions: '件',
  engagement: '%',
}

export function CustomChartTooltip({
  active,
  payload,
  label,
  metricType = '',
  unit,
  chartData,
}: CustomChartTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null
  }

  const data = payload[0]
  const value = data.value
  const actualUnit = unit || METRIC_UNITS[metricType] || ''
  const metricLabel = METRIC_LABELS[metricType] || metricType
  // originalDateがある場合はそれを使用、なければlabelを使用
  const dateStr = data.payload?.originalDate || label

  // 値のフォーマット
  const formatValue = (val: number) => {
    if (actualUnit === '¥') {
      return `¥${val.toLocaleString('ja-JP', { maximumFractionDigits: 0 })}`
    }
    if (actualUnit === '%' || metricType === 'ctr' || metricType === 'engagement') {
      return `${val.toFixed(2)}%`
    }
    if (metricType === 'frequency') {
      return val.toFixed(2)
    }
    return val.toLocaleString('ja-JP')
  }

  // 期間平均を計算してベースラインからの乖離率を計算
  let deviationPercent = 0
  let deviationLabel = ''
  let averageValue = 0

  // チャートデータまたはペイロードから平均を計算
  const allData = chartData || data.payload?.chartData || []
  if (allData.length > 0) {
    const values = allData.map((item: any) => item.value || 0).filter((v: number) => !isNaN(v))
    if (values.length > 0) {
      averageValue = values.reduce((sum: number, v: number) => sum + v, 0) / values.length

      if (averageValue !== 0) {
        deviationPercent = ((value - averageValue) / averageValue) * 100
        if (deviationPercent > 0) {
          deviationLabel = `+${deviationPercent.toFixed(1)}%`
        } else {
          deviationLabel = `${deviationPercent.toFixed(1)}%`
        }
      }
    }
  }

  // 危険水準のチェック（期間平均ベース）
  const getStatusColor = () => {
    if (metricType === 'frequency' && value > 3.5) return 'text-red-600'
    if (metricType === 'ctr' && deviationPercent < -25) return 'text-red-600'
    if (metricType === 'cpm' && deviationPercent > 20) return 'text-red-600'
    if (deviationPercent > 15) return 'text-green-600'
    if (deviationPercent < -15) return 'text-red-600'
    return 'text-gray-600'
  }

  // 日付のフォーマット（正しい日付解析）
  const formatDate = (dateStr: string) => {
    try {
      // ISO形式またはYYYY-MM-DD形式の日付を解析
      let date: Date
      if (dateStr.includes('T')) {
        // ISO形式
        date = new Date(dateStr)
      } else if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // YYYY-MM-DD形式
        const [year, month, day] = dateStr.split('-').map(Number)
        date = new Date(year, month - 1, day) // monthは0ベースなので-1
      } else {
        // その他の形式
        date = new Date(dateStr)
      }

      // 有効な日付かチェック
      if (isNaN(date.getTime())) {
        return dateStr
      }

      return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        weekday: 'short',
      })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
      <p className="text-xs font-medium text-gray-500 mb-1">{formatDate(dateStr || '')}</p>
      <div className="flex items-baseline gap-2">
        <p className="text-sm font-semibold text-gray-900">{metricLabel}</p>
        <p className="text-sm font-bold text-gray-900">{formatValue(value)}</p>
      </div>
      {deviationLabel && (
        <p className={`text-xs mt-1 ${getStatusColor()}`}>期間平均比: {deviationLabel}</p>
      )}
      {averageValue > 0 && (
        <p className="text-xs text-gray-400 mt-0.5">平均: {formatValue(averageValue)}</p>
      )}
      {/* 危険水準の警告 */}
      {metricType === 'frequency' && value > 3.5 && (
        <p className="text-xs text-red-600 mt-1">⚠️ 危険水準超過</p>
      )}
      {metricType === 'ctr' && deviationPercent < -25 && (
        <p className="text-xs text-red-600 mt-1">⚠️ 平均から-25%以下</p>
      )}
      {metricType === 'cpm' && deviationPercent > 20 && (
        <p className="text-xs text-red-600 mt-1">⚠️ 平均から+20%以上</p>
      )}
    </div>
  )
}
