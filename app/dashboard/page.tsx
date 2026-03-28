'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { StatCard } from '@/components/StatCard'
import { DashboardCard } from '@/components/DashboardCard'
import { TransactionTable } from '@/components/TransactionTable'
import BudgetAlerts from '@/components/BudgetAlerts'
import AISpendingInsights from '@/components/AISpendingInsights'
import FinancialHealthScore from '@/components/FinancialHealthScore'
import SubscriptionAlerts from '@/components/SubscriptionAlerts'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { useAuth } from '@/contexts/AuthContext'
import { useCurrency } from '@/contexts/CurrencyContext'
import { getProfile, getExpenses, getExpenseStats, getSubscriptions } from '@/lib/database'
import { generateMonthlyReport } from '@/lib/reportGenerator'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { CreditCard, TrendingUp, Wallet, ArrowUpRight, Download } from 'lucide-react'

export default function Dashboard() {
  const { user } = useAuth()
  const { formatCurrency, currency } = useCurrency()
  const [profile, setProfile] = useState<any>(null)
  const [expenses, setExpenses] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadDashboardData()
    }
  }, [user])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const [profileData, expensesData, statsData] = await Promise.all([
        getProfile(),
        getExpenses(),
        getExpenseStats()
      ])

      setProfile(profileData)
      setExpenses(expensesData.slice(0, 5)) // Show only 5 recent transactions
      setStats(statsData)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadReport = async () => {
    try {
      console.log('Downloading monthly report...')
      await generateMonthlyReport(currency)
    } catch (error) {
      console.error('Error downloading report:', error)
      alert('Failed to download report. Please try again.')
    }
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  // Prepare chart data from real expenses
  const monthlyData = stats?.category_breakdown || []
  const totalExpenses = stats?.total_expenses || 0
  const expenseCount = stats?.expense_count || 0

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-8">
          {/* Welcome Section */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Welcome back, {profile?.full_name || user?.email?.split('@')[0] || 'User'} 👋
              </h1>
              <p className="text-muted-foreground">Here's your financial overview for this month.</p>
            </div>
            <button
              onClick={handleDownloadReport}
              className="button-primary inline-flex items-center gap-2"
            >
              <Download size={20} />
              Download Monthly Report
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Total Expenses"
              value={formatCurrency(totalExpenses)}
              change={expenseCount > 0 ? 12 : 0}
              trend="up"
              icon={<Wallet className="w-5 h-5" />}
            />
            <StatCard
              title="Transactions"
              value={expenseCount.toString()}
              change={expenseCount > 0 ? 8 : 0}
              trend="up"
              icon={<CreditCard className="w-5 h-5" />}
            />
            <StatCard
              title="Average Expense"
              value={formatCurrency(stats?.avg_expense || 0)}
              change={-3}
              trend="down"
              icon={<TrendingUp className="w-5 h-5" />}
            />
            <StatCard
              title="Categories"
              value={monthlyData.length.toString()}
              change={0}
              trend="up"
              icon={<ArrowUpRight className="w-5 h-5" />}
            />
          </div>

          {/* Budget Alerts */}
          <BudgetAlerts month={new Date().getMonth() + 1} year={new Date().getFullYear()} />

          {/* Subscription Alerts */}
          <SubscriptionAlerts />

          {/* AI Spending Insights */}
          <AISpendingInsights />

          {/* Financial Health Score */}
          <FinancialHealthScore />

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Breakdown */}
            <DashboardCard title="Expense by Category" subtitle="Your spending breakdown">
              {monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={monthlyData.map((cat: any) => ({
                        name: cat.category_name,
                        value: cat.total_amount,
                        fill: cat.category_color
                      }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {monthlyData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.category_color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                  No expense data available. Start adding expenses to see your breakdown!
                </div>
              )}
            </DashboardCard>

            {/* Recent Transactions */}
            <DashboardCard title="Recent Transactions" subtitle="Your latest expenses">
              {expenses.length > 0 ? (
                <TransactionTable
                  transactions={expenses.map(exp => ({
                    id: exp.id,
                    description: exp.note || 'Expense',
                    category: exp.categories?.name || 'Uncategorized',
                    amount: exp.amount,
                    date: new Date(exp.date).toLocaleDateString(),
                    status: 'completed' as const
                  }))}
                />
              ) : (
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                  No transactions yet. Add your first expense to get started!
                </div>
              )}
            </DashboardCard>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
