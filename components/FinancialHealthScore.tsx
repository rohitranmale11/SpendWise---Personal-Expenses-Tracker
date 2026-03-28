'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, AlertTriangle, Heart, Activity } from 'lucide-react'
import { getExpenses, getCategories, getBudgets } from '@/lib/database'
import { useAuth } from '@/contexts/AuthContext'
import { useCurrency } from '@/contexts/CurrencyContext'
import { calculateFinancialHealthScore, type FinancialHealthScore, type FinancialHealthFactors } from '@/lib/financial-health'
import { DashboardCard } from '@/components/DashboardCard'

export default function FinancialHealthScore() {
  const { user } = useAuth()
  const { formatCurrency } = useCurrency()
  const [healthScore, setHealthScore] = useState<FinancialHealthScore | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadHealthScore()
    }
  }, [user])

  const loadHealthScore = async () => {
    try {
      setLoading(true)

      // Fetch required data
      const [expenses, categories, budgets] = await Promise.all([
        getExpenses(),
        getCategories(),
        getBudgets()
      ])

      // Calculate health score
      const score = await calculateFinancialHealthScore(user!.id, expenses, [], budgets)
      setHealthScore(score)

    } catch (error) {
      console.error('Error loading financial health score:', error)
      setHealthScore(null)
    } finally {
      setLoading(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600'
    if (score >= 70) return 'text-blue-600'
    if (score >= 50) return 'text-orange-600'
    return 'text-red-600'
  }

  const getScoreBgColor = (score: number) => {
    if (score >= 85) return 'bg-green-50 border-green-200'
    if (score >= 70) return 'bg-blue-50 border-blue-200'
    if (score >= 50) return 'bg-orange-50 border-orange-200'
    return 'bg-red-50 border-red-200'
  }

  const getStatusIcon = (status: FinancialHealthScore['status']) => {
    switch (status) {
      case 'Excellent':
        return <Heart className="w-6 h-6 text-green-600" />
      case 'Good':
        return <Activity className="w-6 h-6 text-blue-600" />
      case 'Fair':
        return <AlertTriangle className="w-6 h-6 text-orange-600" />
      case 'Needs Attention':
        return <TrendingUp className="w-6 h-6 text-red-600" />
      default:
        return <Activity className="w-6 h-6 text-gray-600" />
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
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

  if (!healthScore) {
    return (
      <div className="space-y-6">
        <DashboardCard title="Financial Health Score" subtitle="Overall financial wellness assessment">
          <div className="text-center py-12">
            <Heart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">Unable to calculate score</h3>
            <p className="text-muted-foreground text-sm">
              Add more financial activity to get your personalized health score.
            </p>
          </div>
        </DashboardCard>
      </div>
    )
  }

  const { score, status, summary, factors } = healthScore

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Financial Health Score</h2>
          <p className="text-muted-foreground">Overall financial wellness assessment</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Score Card */}
        <div className="lg:col-span-1">
          <DashboardCard title="Your Score" subtitle="Based on your financial habits">
            <div className={`text-center p-8 rounded-lg border-2 ${getScoreBgColor(score)}`}>
              <div className={`text-6xl font-bold mb-2 ${getScoreColor(score)}`}>
                {score}
              </div>
              <div className={`text-2xl font-semibold mb-2 ${getScoreColor(score)}`}>
                {status}
              </div>
              <div className="text-sm text-muted-foreground">
                {summary}
              </div>
            </div>
          </DashboardCard>
        </div>

        {/* Score Breakdown */}
        <div className="lg:col-span-2">
          <DashboardCard title="Score Factors" subtitle="How your score is calculated">
            <div className="space-y-4">
              {/* Spending Consistency */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-800 text-sm font-medium">C</span>
                  </div>
                  <span className="text-sm font-medium">Consistency</span>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${getScoreColor(factors.consistency)}`}>
                    {factors.consistency}/20
                  </div>
                  <div className="text-xs text-muted-foreground">Points</div>
                </div>
              </div>

              {/* Category Balance */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-800 text-sm font-medium">B</span>
                  </div>
                  <span className="text-sm font-medium">Category Balance</span>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${getScoreColor(factors.categoryBalance)}`}>
                    {factors.categoryBalance}/20
                  </div>
                  <div className="text-xs text-muted-foreground">Points</div>
                </div>
              </div>

              {/* Subscription Burden */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                    <span className="text-yellow-800 text-sm font-medium">S</span>
                  </div>
                  <span className="text-sm font-medium">Subscriptions</span>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${getScoreColor(factors.subscriptions)}`}>
                    {factors.subscriptions}/15
                  </div>
                  <div className="text-xs text-muted-foreground">Points</div>
                </div>
              </div>

              {/* Average Expense */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-800 text-sm font-medium">E</span>
                  </div>
                  <span className="text-sm font-medium">Expense Control</span>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${getScoreColor(factors.avgExpense)}`}>
                    {factors.avgExpense}/15
                  </div>
                  <div className="text-xs text-muted-foreground">Points</div>
                </div>
              </div>

              {/* Monthly Trend */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                    <span className="text-indigo-800 text-sm font-medium">T</span>
                  </div>
                  <span className="text-sm font-medium">Monthly Trend</span>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${getScoreColor(factors.monthlyTrend)}`}>
                    {factors.monthlyTrend}/15
                  </div>
                  <div className="text-xs text-muted-foreground">Points</div>
                </div>
              </div>

              {/* Budget Awareness */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                    <span className="text-red-800 text-sm font-medium">B</span>
                  </div>
                  <span className="text-sm font-medium">Budget Awareness</span>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${getScoreColor(factors.budgetAwareness)}`}>
                    {factors.budgetAwareness}/15
                  </div>
                  <div className="text-xs text-muted-foreground">Points</div>
                </div>
              </div>
            </div>
          </DashboardCard>
        </div>

        {/* Progress Visualization */}
        <div className="lg:col-span-3">
          <DashboardCard title="Score Range" subtitle="Where you stand">
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">85-100</span>
                <div className="flex items-center gap-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: `${Math.min(100, score)}%` }}></div>
                  </div>
                  <span className="text-green-600 font-medium">Excellent</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">70-84</span>
                <div className="flex items-center gap-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${Math.min(100, score)}%` }}></div>
                  </div>
                  <span className="text-blue-600 font-medium">Good</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">50-69</span>
                <div className="flex items-center gap-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-orange-500 h-2 rounded-full" style={{ width: `${Math.min(100, score)}%` }}></div>
                  </div>
                  <span className="text-orange-600 font-medium">Fair</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">0-49</span>
                <div className="flex items-center gap-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-red-500 h-2 rounded-full" style={{ width: `${Math.min(100, score)}%` }}></div>
                  </div>
                  <span className="text-red-600 font-medium">Needs Attention</span>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>💡 Tip:</strong> Your score is calculated based on spending consistency, category balance, subscription burden, expense control, monthly trends, and budget awareness. Improve these areas to increase your score.
              </p>
            </div>
          </DashboardCard>
        </div>
      </div>
    </div>
  )
}
