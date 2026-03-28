import { Expense } from './database'

export interface SpendingInsight {
  id: string
  type: 'info' | 'warning' | 'success'
  title: string
  description: string
  priority: number
  iconName?: string
  insightType?: 'monthly-change' | 'top-category' | 'subscription-burden' | 'expense-frequency' | 'recent-surge' | 'payment-method'
}

export interface MonthlyComparison {
  currentMonthTotal: number
  previousMonthTotal: number
  percentageChange: number
  trend: 'up' | 'down' | 'stable'
}

export interface TopCategory {
  categoryName: string
  amount: number
  percentage: number
  transactionCount: number
}

export interface SubscriptionInsight {
  totalSubscriptions: number
  totalMonthlyCost: number
  percentageOfExpenses: number
  isHighBurden: boolean
}

export interface FinancialHealthFactors {
  consistency: number
  categoryBalance: number
  subscriptions: number
  avgExpense: number
  monthlyTrend: number
  budgetAwareness: number
}

export interface FinancialHealthScore {
  score: number
  status: 'Excellent' | 'Good' | 'Fair' | 'Needs Attention'
  summary: string
  factors: FinancialHealthFactors
}

export const getMonthlyComparisonInsight = (
  currentMonthExpenses: Expense[],
  previousMonthExpenses: Expense[]
): SpendingInsight | null => {
  const currentTotal = currentMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0)
  const previousTotal = previousMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0)

  if (previousTotal === 0) {
    return {
      id: 'monthly-change',
      type: 'info',
      title: 'First Month Tracking',
      description: `Great start! You've tracked ₹${currentTotal.toFixed(2)} in expenses this month.`,
      priority: 2
    }
  }

  const percentageChange = ((currentTotal - previousTotal) / previousTotal) * 100
  const trend = percentageChange > 10 ? 'up' : percentageChange < -10 ? 'down' : 'stable'

  let type: SpendingInsight['type'] = 'info'
  let title = ''
  let description = ''

  if (percentageChange > 10) {
    type = 'warning'
    title = 'Spending Increased'
    description = `You spent ${Math.abs(percentageChange).toFixed(1)}% more this month (₹${currentTotal.toFixed(2)}) compared to last month (₹${previousTotal.toFixed(2)}).`
  } else if (percentageChange < -10) {
    type = 'success'
    title = 'Spending Reduced'
    description = `Great job! You spent ${Math.abs(percentageChange).toFixed(1)}% less this month (₹${currentTotal.toFixed(2)}) compared to last month (₹${previousTotal.toFixed(2)}).`
  } else {
    title = 'Stable Spending'
    description = `Your spending is stable at ₹${currentTotal.toFixed(2)} this month, similar to last month's ₹${previousTotal.toFixed(2)}.`
  }

  return {
    id: 'monthly-change',
    type,
    title,
    description,
    priority: 1,
    insightType: 'monthly-change'
  }
}

export const getTopCategoryInsight = (
  expenses: Expense[],
  categories: { id: string; name: string }[]
): SpendingInsight | null => {
  if (expenses.length === 0) return null

  // Calculate total spent per category
  const categoryTotals = new Map<string, { amount: number; count: number }>()

  expenses.forEach(expense => {
    const current = categoryTotals.get(expense.category_id || 'uncategorized') || { amount: 0, count: 0 }
    categoryTotals.set(expense.category_id || 'uncategorized', {
      amount: current.amount + expense.amount,
      count: current.count + 1
    })
  })

  // Find top category
  let topCategory = { categoryName: 'Uncategorized', amount: 0, percentage: 0, transactionCount: 0 }
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0)

  categoryTotals.forEach((amount, categoryId) => {
    if (amount.amount > topCategory.amount) {
      const category = categories.find(cat => cat.id === categoryId)
      topCategory = {
        categoryName: category?.name || 'Uncategorized',
        amount: amount.amount,
        percentage: (amount.amount / totalExpenses) * 100,
        transactionCount: amount.count
      }
    }
  })

  if (totalExpenses === 0) return null

  return {
    id: 'top-category',
    type: topCategory.percentage > 40 ? 'warning' : 'info',
    title: 'Top Spending Category',
    description: `Your highest spending this month was ${topCategory.categoryName} at ₹${topCategory.amount.toFixed(2)} (${topCategory.percentage.toFixed(1)}% of total, ${topCategory.transactionCount} transactions).`,
    priority: 2,
    insightType: 'top-category'
  }
}

export const getSubscriptionInsight = (
  subscriptions: any[],
  totalMonthlyExpenses: number
): SpendingInsight | null => {
  if (subscriptions.length === 0) return null

  const totalSubscriptionCost = subscriptions.reduce((sum, sub) => sum + (sub.price || 0), 0)
  const percentageOfExpenses = totalMonthlyExpenses > 0 ? (totalSubscriptionCost / totalMonthlyExpenses) * 100 : 0
  const isHighBurden = percentageOfExpenses > 20

  return {
    id: 'subscription-burden',
    type: isHighBurden ? 'warning' : 'info',
    title: 'Subscription Costs',
    description: `Your subscriptions cost ₹${totalSubscriptionCost.toFixed(2)} per month, which is ${percentageOfExpenses.toFixed(1)}% of your total expenses.`,
    priority: 3,
    insightType: 'subscription-burden'
  }
}

export const getExpenseFrequencyInsight = (expenses: Expense[]): SpendingInsight | null => {
  if (expenses.length === 0) return null

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0)
  const averageExpense = totalExpenses / expenses.length

  return {
    id: 'expense-frequency',
    type: 'info',
    title: 'Expense Frequency',
    description: `You had ${expenses.length} expenses this month with an average of ₹${averageExpense.toFixed(2)} per transaction.`,
    priority: 4,
    insightType: 'expense-frequency'
  }
}

export const getRecentTrendInsight = (
  recentExpenses: Expense[],
  olderExpenses: Expense[]
): SpendingInsight | null => {
  if (recentExpenses.length === 0 || olderExpenses.length === 0) return null

  const recentTotal = recentExpenses.reduce((sum, exp) => sum + exp.amount, 0)
  const olderTotal = olderExpenses.reduce((sum, exp) => sum + exp.amount, 0)
  const recentAverage = recentTotal / recentExpenses.length
  const olderAverage = olderTotal / olderExpenses.length

  const percentageIncrease = recentAverage > 0 ? ((recentAverage - olderAverage) / olderAverage) * 100 : 0

  if (percentageIncrease > 50) {
    return {
      id: 'recent-surge',
      type: 'warning',
      title: 'Recent Spending Surge',
      description: `Your spending has increased sharply in the last 7 days (${percentageIncrease.toFixed(1)}% higher than previous period).`,
      priority: 1,
      insightType: 'recent-surge'
    }
  }

  return null
}

export const getMostUsedPaymentMethod = (expenses: Expense[]): SpendingInsight | null => {
  if (expenses.length === 0) return null

  const paymentMethods = new Map<string, number>()

  expenses.forEach(expense => {
    const method = expense.payment_method || 'Unknown'
    paymentMethods.set(method, (paymentMethods.get(method) || 0) + 1)
  })

  let topMethod = { method: 'Unknown', count: 0 }
  paymentMethods.forEach((count, method) => {
    if (count > topMethod.count) {
      topMethod = { method, count }
    }
  })

  return {
    id: 'payment-method',
    type: 'info',
    title: 'Most Used Payment Method',
    description: `Your most used payment method was ${topMethod.method} (${topMethod.count} transactions).`,
    priority: 5,
    insightType: 'payment-method'
  }
}
