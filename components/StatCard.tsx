import { ReactNode } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  change?: number
  icon?: ReactNode
  trend?: 'up' | 'down'
}

export function StatCard({ title, value, change, icon, trend = 'up' }: StatCardProps) {
  const isPositive = trend === 'up'

  return (
    <div className="card-premium p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        {icon && <div className="text-primary">{icon}</div>}
      </div>

      <div className="space-y-2">
        <div className="text-3xl font-bold text-foreground">{value}</div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            {Math.abs(change)}% from last month
          </div>
        )}
      </div>
    </div>
  )
}
