import { LineChart, Line, YAxis, ResponsiveContainer, ReferenceLine } from 'recharts'

interface MiniFrequencyChartProps {
  data?: Array<{ date: string; value: number }>
  currentValue: number
  threshold?: number
}

export function MiniFrequencyChart({ 
  data, 
  currentValue, 
  threshold = 3.5 
}: MiniFrequencyChartProps) {
  // ダミーデータ生成（実際のデータがない場合）
  const chartData = data || generateDummyData(currentValue)
  
  // 現在の値に基づいて線の色を決定
  const getLineColor = () => {
    if (currentValue >= threshold) return '#ef4444' // red-500
    if (currentValue >= threshold * 0.8) return '#f59e0b' // amber-500
    return '#10b981' // emerald-500
  }
  
  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={40}>
        <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
          <YAxis hide domain={[0, 5]} />
          <ReferenceLine y={threshold} stroke="#ef4444" strokeWidth={1} strokeDasharray="3 3" />
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke={getLineColor()}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ダミーデータ生成関数（デモ用）
function generateDummyData(currentValue: number, days: number = 7): Array<{ date: string; value: number }> {
  const data = []
  const baseValue = currentValue * 0.7 // 7日前の値
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    
    // 徐々に上昇するトレンドを生成
    const progress = (days - i) / days
    const value = baseValue + (currentValue - baseValue) * progress + (Math.random() - 0.5) * 0.2
    
    data.push({
      date: date.toISOString().split('T')[0],
      value: Math.max(0.5, Math.min(5, value)) // 0.5-5の範囲に制限
    })
  }
  
  return data
}