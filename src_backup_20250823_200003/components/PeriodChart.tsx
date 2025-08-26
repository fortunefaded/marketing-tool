import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

interface DataPoint {
  date: string
  [key: string]: number | string
}

interface PeriodChartProps {
  data: DataPoint[]
  series: {
    dataKey: string
    name: string
    color: string
  }[]
  height?: number
}

export default function PeriodChart({ data, series, height = 300 }: PeriodChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <defs>
          {series.map((s, index) => (
            <linearGradient key={s.dataKey} id={`color${index}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={s.color} stopOpacity={0.8} />
              <stop offset="95%" stopColor={s.color} stopOpacity={0.1} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11 }}
          tickFormatter={(value) => {
            const date = new Date(value)
            return `${date.getMonth() + 1}/${date.getDate()}`
          }}
        />
        <YAxis
          tick={{ fontSize: 11 }}
          tickFormatter={(value) => {
            if (value >= 10000) {
              return `${value / 1000}k`
            }
            return value.toString()
          }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid #ccc',
            borderRadius: '4px',
          }}
          labelFormatter={(value) => {
            const date = new Date(value)
            return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
          }}
        />
        <Legend
          verticalAlign="top"
          height={36}
          iconType="circle"
          wrapperStyle={{ fontSize: '12px' }}
        />
        {series.map((s, index) => (
          <Area
            key={s.dataKey}
            type="monotone"
            dataKey={s.dataKey}
            name={s.name}
            stroke={s.color}
            fillOpacity={1}
            fill={`url(#color${index})`}
            strokeWidth={2}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  )
}
