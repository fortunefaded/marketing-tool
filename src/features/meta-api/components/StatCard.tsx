interface StatCardProps {
  title: string
  value: number
  color?: 'red' | 'yellow' | 'green' | 'gray'
  subtitle?: string
}

export function StatCard({ title, value, color = 'gray', subtitle }: StatCardProps) {
  const colorClass = {
    red: 'text-red-600',
    yellow: 'text-yellow-600', 
    green: 'text-green-600',
    gray: 'text-gray-900'
  }[color]
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <p className="text-sm text-gray-600">{title}</p>
      <p className={`text-3xl font-bold ${colorClass}`}>{value}</p>
      {subtitle && (
        <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
      )}
    </div>
  )
}