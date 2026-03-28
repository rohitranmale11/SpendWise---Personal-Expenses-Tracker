import { Expense } from './database'

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

export const calculateFinancialHealthScore = async (
  userId: string,
  expenses: Expense[],
  subscriptions: any[],
  budgets: any[]
): Promise<FinancialHealthScore> => {
  // Initialize factors
  const factors: FinancialHealthFactors = {
    consistency: 0,
    categoryBalance: 0,
    subscriptions: 0,
    avgExpense: 0,
    monthlyTrend: 0,
    budgetAwareness: 0
  }

  try {
    // 1. Spending Consistency (0-20 points)
    // Calculate weekly spending patterns
    const weeklyExpenses = new Map<string, number[]>()
    expenses.forEach(expense => {
      const weekKey = expense.date.substring(0, 7) // Simple week grouping
      if (!weeklyExpenses.has(weekKey)) {
        weeklyExpenses.set(weekKey, [])
      }
      weeklyExpenses.get(weekKey)!.push(expense.amount)
    })

    const weeklyTotals = Array.from(weeklyExpenses.values()).map(week =>
      week.reduce((sum, amount) => sum + amount, 0)
    )

    if (weeklyTotals.length > 1) {
      const average = weeklyTotals.reduce((sum, total) => sum + total, 0) / weeklyTotals.length
      const variance = weeklyTotals.reduce((sum, total) => sum + Math.pow(total - average, 2), 0) / weeklyTotals.length
      const standardDeviation = Math.sqrt(variance)
      const coefficientOfVariation = (standardDeviation / average) * 100

      if (coefficientOfVariation < 30) {
        factors.consistency = 20 // Excellent consistency
      } else if (coefficientOfVariation < 50) {
        factors.consistency = 15 // Good consistency
      } else if (coefficientOfVariation < 70) {
        factors.consistency = 10 // Fair consistency
      } else {
        factors.consistency = 5 // Poor consistency
      }
    } else {
      factors.consistency = 10 // Neutral for insufficient data
    }

    // 2. Category Balance (0-20 points)
    const categoryTotals = new Map<string, number>()
    expenses.forEach(expense => {
      const categoryId = expense.category_id || 'uncategorized'
      categoryTotals.set(categoryId, (categoryTotals.get(categoryId) || 0) + expense.amount)
    })

    if (categoryTotals.size > 1) {
      const totals = Array.from(categoryTotals.values()).sort((a, b) => b - a)
      const highest = totals[totals.length - 1]
      const total = totals.reduce((sum, amount) => sum + amount, 0)
      const highestPercentage = (highest / total) * 100

      if (highestPercentage < 40) {
        factors.categoryBalance = 20 // Excellent balance
      } else if (highestPercentage < 60) {
        factors.categoryBalance = 15 // Good balance
      } else if (highestPercentage < 80) {
        factors.categoryBalance = 10 // Fair balance
      } else {
        factors.categoryBalance = 5 // Poor balance
      }
    } else {
      factors.categoryBalance = 15 // Neutral for single category
    }

    // 3. Subscription Burden (0-15 points)
    const totalSubscriptionCost = subscriptions.reduce((sum, sub) => sum + (sub.price || 0), 0)
    const totalMonthlyExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0)
    const subscriptionPercentage = totalMonthlyExpenses > 0 ? (totalSubscriptionCost / totalMonthlyExpenses) * 100 : 0

    if (subscriptionPercentage > 25) {
      factors.subscriptions = 0 // High burden
    } else if (subscriptionPercentage > 15) {
      factors.subscriptions = 5 // Moderate burden
    } else if (subscriptionPercentage > 5) {
      factors.subscriptions = 10 // Low burden
    } else {
      factors.subscriptions = 15 // Minimal burden
    }

    // 4. Average Expense Control (0-15 points)
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0)
    const averageExpense = totalExpenses / expenses.length

    // Check if average expense is reasonable (this is a simplified approach)
    if (expenses.length > 0) {
      if (averageExpense < 1000) {
        factors.avgExpense = 15 // Excellent control
      } else if (averageExpense < 2500) {
        factors.avgExpense = 12 // Good control
      } else if (averageExpense < 5000) {
        factors.avgExpense = 8 // Fair control
      } else {
        factors.avgExpense = 4 // Poor control
      }
    } else {
      factors.avgExpense = 10 // Neutral
    }

    // 5. Month-over-Month Trend (0-15 points)
    if (expenses.length >= 30) { // Need at least a month of data
      const sortedExpenses = [...expenses].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      const recentHalf = sortedExpenses.slice(0, Math.floor(expenses.length / 2))
      const olderHalf = sortedExpenses.slice(Math.floor(expenses.length / 2))

      const recentTotal = recentHalf.reduce((sum, exp) => sum + exp.amount, 0)
      const olderTotal = olderHalf.reduce((sum, exp) => sum + exp.amount, 0)

      const recentAverage = recentTotal / recentHalf.length
      const olderAverage = olderTotal / olderHalf.length

      if (recentAverage > olderAverage * 1.2) {
        factors.monthlyTrend = 0 // Increasing significantly
      } else if (recentAverage > olderAverage * 1.1) {
        factors.monthlyTrend = 5 // Increasing moderately
      } else if (recentAverage < olderAverage * 0.9) {
        factors.monthlyTrend = 10 // Decreasing
      } else {
        factors.monthlyTrend = 15 // Stable
      }
    } else {
      factors.monthlyTrend = 10 // Neutral
    }

    // 6. Budget Awareness (0-15 points)
    if (budgets && budgets.length > 0) {
      const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0)
      const totalBudgets = budgets.reduce((sum, budget) => sum + budget.monthly_budget, 0)

      const budgetUtilization = totalBudgets > 0 ? (totalExpenses / totalBudgets) * 100 : 0

      if (budgetUtilization < 60) {
        factors.budgetAwareness = 15 // Excellent budget awareness
      } else if (budgetUtilization < 80) {
        factors.budgetAwareness = 12 // Good budget awareness
      } else if (budgetUtilization < 100) {
        factors.budgetAwareness = 8 // Fair budget awareness
      } else {
        factors.budgetAwareness = 5 // Poor budget awareness
      }
    } else {
      factors.budgetAwareness = 5 // No budgets
    }

    // Calculate final score
    const totalScore = factors.consistency + factors.categoryBalance + factors.subscriptions + factors.avgExpense + factors.monthlyTrend + factors.budgetAwareness

    // Determine status
    let status: FinancialHealthScore['status']
    let summary = ''

    if (totalScore >= 85) {
      status = 'Excellent'
      summary = 'Your financial habits are excellent. Keep up the great work!'
    } else if (totalScore >= 70) {
      status = 'Good'
      summary = 'You have good financial habits with room for improvement.'
    } else if (totalScore >= 50) {
      status = 'Fair'
      summary = 'Your financial habits need attention. Consider creating budgets and tracking expenses more carefully.'
    } else {
      status = 'Needs Attention'
      summary = 'Your financial habits need significant improvement. Start with basic budgeting and expense tracking.'
    }

    return {
      score: Math.min(100, Math.max(0, totalScore)),
      status,
      summary,
      factors
    }

  } catch (error) {
    console.error('Error calculating financial health score:', error)
    // Return a neutral score if calculation fails
    return {
      score: 50,
      status: 'Fair',
      summary: 'Unable to calculate detailed score. Please try again.',
      factors
    }
  }
}
