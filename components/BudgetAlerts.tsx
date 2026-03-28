'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, TrendingUp } from 'lucide-react'
import { calculateBudgetAlerts, BudgetAlert } from '@/lib/database'
import { useCurrency } from '@/contexts/CurrencyContext'

interface BudgetAlertsProps {
  month?: number
  year?: number
}

export default function BudgetAlerts({ month, year }: BudgetAlertsProps) {
  const [alerts, setAlerts] = useState<BudgetAlert[]>([])
  const [loading, setLoading] = useState(true)
  const { formatCurrency } = useCurrency()

  useEffect(() => {
    loadAlerts()
  }, [month, year])

  const loadAlerts = async () => {
    try {
      setLoading(true)
      const budgetAlerts = await calculateBudgetAlerts(month, year)
      console.log('Budget alerts loaded:', budgetAlerts)
      setAlerts(budgetAlerts)
    } catch (error) {
      console.error('Error loading budget alerts:', error)
      // Don't show error to user, just handle gracefully
      setAlerts([])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-2 bg-muted rounded w-32"></div>
        </div>
      </div>
    )
  }

  if (alerts.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-600" />
          <div>
            <h3 className="font-semibold text-green-800">All Budgets on Track</h3>
            <p className="text-sm text-green-600">Great job managing your spending this month!</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {alerts.map((alert, index) => (
        <div
          key={index}
          className={`border rounded-lg p-4 ${alert.type === 'danger'
            ? 'bg-red-50 border-red-200'
            : 'bg-yellow-50 border-yellow-200'
            }`}
        >
          <div className="flex items-start gap-3">
            <div className="shrink-0">
              {alert.type === 'danger' ? (
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <span className="text-red-600 text-lg">🚨</span>
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                  <span className="text-yellow-600 text-lg">⚠️</span>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-foreground">
                  {alert.category} Budget
                </h3>
                <span className={`text-sm font-medium px-2 py-1 rounded-full ${alert.type === 'danger'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-yellow-100 text-yellow-700'
                  }`}>
                  {alert.type === 'danger' ? 'Exceeded' : 'Warning'}
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Spent</span>
                  <span className="font-medium text-foreground">
                    {formatCurrency(alert.spent)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Budget</span>
                  <span className="font-medium text-foreground">
                    {formatCurrency(alert.budget)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Usage</span>
                  <span className={`font-medium ${alert.type === 'danger' ? 'text-red-600' : 'text-yellow-600'
                    }`}>
                    {alert.percentage.toFixed(0)}% used
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-3">
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${alert.type === 'danger' ? 'bg-red-500' : 'bg-yellow-500'
                      }`}
                    style={{ width: `${Math.min(alert.percentage, 100)}%` }}
                  />
                </div>
              </div>

              {/* Alert Message */}
              <div className={`mt-3 text-sm p-3 rounded-md ${alert.type === 'danger'
                ? 'bg-red-100 text-red-700'
                : 'bg-yellow-100 text-yellow-700'
                }`}>
                {alert.type === 'danger' ? (
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="font-medium">
                      {alert.category} budget exceeded by ${(alert.spent - alert.budget).toFixed(2)}!
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="font-medium">
                      You have used {alert.percentage.toFixed(0)}% of your {alert.category} budget
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
