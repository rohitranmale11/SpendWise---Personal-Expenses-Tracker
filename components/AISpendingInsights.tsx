'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle, ShoppingCart, CreditCard, Calendar } from 'lucide-react'
import { getExpenses, getCategories, getSubscriptions } from '@/lib/database'
import { useAuth } from '@/contexts/AuthContext'
import { useCurrency } from '@/contexts/CurrencyContext'
import {
  getMonthlyComparisonInsight,
  getTopCategoryInsight,
  getSubscriptionInsight,
  getExpenseFrequencyInsight,
  getRecentTrendInsight,
  getMostUsedPaymentMethod,
  type SpendingInsight
} from '@/lib/insights'
import { DashboardCard } from '@/components/DashboardCard'

export default function AISpendingInsights() {
  const { user } = useAuth()
  const { formatCurrency } = useCurrency()
  const [insights, setInsights] = useState<SpendingInsight[]>([])
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [previousMonth, setPreviousMonth] = useState(new Date())

  useEffect(() => {
    if (user) {
      loadInsights()
    }
  }, [user])

  const loadInsights = async () => {
    try {
      setLoading(true)

      // Set date ranges
      const now = new Date()
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

      const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

      setCurrentMonth(currentMonthStart)
      setPreviousMonth(previousMonthStart)

      // Fetch data
      const [currentMonthExpenses, categories, subscriptions, previousMonthExpenses] = await Promise.all([
        getExpenses(
          currentMonthStart.toISOString().split('T')[0],
          currentMonthEnd.toISOString().split('T')[0]
        ),
        getCategories(),
        getSubscriptions(),
        getExpenses(
          previousMonthStart.toISOString().split('T')[0],
          previousMonthEnd.toISOString().split('T')[0]
        )
      ])

      // Generate insights
      const newInsights: SpendingInsight[] = []

      // Monthly comparison
      const monthlyComparison = getMonthlyComparisonInsight(currentMonthExpenses, previousMonthExpenses)
      if (monthlyComparison) newInsights.push(monthlyComparison)

      // Top category
      const topCategory = getTopCategoryInsight(currentMonthExpenses, categories)
      if (topCategory) newInsights.push(topCategory)

      // Subscription burden
      const subscriptionInsight = getSubscriptionInsight(subscriptions,
        currentMonthExpenses.reduce((sum: number, exp: any) => sum + exp.amount, 0))
      if (subscriptionInsight) newInsights.push(subscriptionInsight)

      // Expense frequency
      const frequencyInsight = getExpenseFrequencyInsight(currentMonthExpenses)
      if (frequencyInsight) newInsights.push(frequencyInsight)

      // Sort insights by priority
      newInsights.sort((a, b) => b.priority - a.priority)

      setInsights(newInsights.slice(0, 6)) // Top 6 insights

    } catch (error) {
      console.error('Error loading insights:', error)
      setInsights([])
    } finally {
      setLoading(false)
    }
  }

  const getInsightIcon = (insight: SpendingInsight) => {
    switch (insight.insightType) {
      case 'monthly-change':
        return <TrendingUp className={insight.type === 'success' ? 'text-green-600' : 'text-orange-600'} />
      case 'top-category':
        return <ShoppingCart className="text-purple-600" />
      case 'subscription-burden':
        return <AlertTriangle className="text-yellow-600" />
      case 'expense-frequency':
        return <Calendar className="text-blue-600" />
      case 'recent-surge':
        return <TrendingDown className="text-red-600" />
      case 'payment-method':
        return <CreditCard className="text-indigo-600" />
      default:
        return <DollarSign className="text-gray-600" />
    }
  }

  const getInsightColor = (type: SpendingInsight['type']) => {
    switch (type) {
      case 'warning':
        return 'border-orange-200 bg-orange-50'
      case 'success':
        return 'border-green-200 bg-green-50'
      case 'info':
      default:
        return 'border-blue-200 bg-blue-50'
    }
  }

  const formatMonth = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-lg border p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-3"></div>
              <div className="space-y-2">
                <div className="h-2 bg-gray-200 rounded w-3/4"></div>
                <div className="h-2 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (insights.length === 0) {
    return (
      <div className="space-y-6">
        <DashboardCard title="AI Spending Insights" subtitle="Intelligent financial analysis">
          <div className="text-center py-12">
            <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">No insights available</h3>
            <p className="text-muted-foreground text-sm">
              Add more expenses to unlock AI-powered insights about your spending patterns.
            </p>
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-800 text-sm">
                <strong>💡 Tip:</strong> Start tracking expenses regularly to receive personalized insights about your spending habits, top categories, and ways to save money.
              </p>
            </div>
          </div>
        </DashboardCard>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">AI Spending Insights</h2>
          <p className="text-muted-foreground">Intelligent analysis of your spending patterns</p>
        </div>
        <div className="text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>{formatMonth(currentMonth)}</span>
            <span className="mx-2">vs</span>
            <span>{formatMonth(previousMonth)}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {insights.map((insight) => (
          <div key={insight.id} className={`bg-white rounded-lg border p-6 hover:shadow-md transition-shadow ${getInsightColor(insight.type)}`}>
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-full ${getInsightColor(insight.type)}`}>
                {getInsightIcon(insight)}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  {insight.title}
                  <span className={`text-xs px-2 py-1 rounded-full ${insight.type === 'warning' ? 'bg-orange-100 text-orange-800' :
                    insight.type === 'success' ? 'bg-green-100 text-green-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                    Priority {insight.priority}
                  </span>
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {insight.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {insights.length > 0 && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-800 text-sm">
            <strong>💡 How it works:</strong> These insights are generated using your actual spending data and financial rules. No external AI API is used - your privacy is protected.
          </p>
        </div>
      )}
    </div>
  )
}
