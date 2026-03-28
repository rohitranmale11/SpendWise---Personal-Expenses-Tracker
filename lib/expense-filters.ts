import { supabase } from './supabaseClient'
import { Expense } from './database'

export interface ExpenseFilters {
  search?: string
  categoryId?: string
  paymentMethod?: string
  startDate?: string
  endDate?: string
  minAmount?: number
  maxAmount?: number
}

export interface FilteredExpensesResult {
  expenses: Expense[]
  totalCount: number
  hasMore: boolean
}

export const getFilteredExpenses = async (
  filters: ExpenseFilters,
  page: number = 1,
  limit: number = 50
): Promise<FilteredExpensesResult> => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Start with base query
    let query = supabase
      .from('expenses')
      .select(`
        *,
        categories(name, color)
      `, { count: 'exact' })
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    // Apply filters dynamically
    if (filters.search && filters.search.trim()) {
      query = query.ilike('note', `%${filters.search.trim()}%`)
    }

    if (filters.categoryId) {
      query = query.eq('category_id', filters.categoryId)
    }

    if (filters.paymentMethod) {
      query = query.eq('payment_method', filters.paymentMethod)
    }

    if (filters.startDate) {
      query = query.gte('date', filters.startDate)
    }

    if (filters.endDate) {
      query = query.lte('date', filters.endDate)
    }

    if (filters.minAmount !== undefined && filters.minAmount >= 0) {
      query = query.gte('amount', filters.minAmount)
    }

    if (filters.maxAmount !== undefined && filters.maxAmount >= 0) {
      query = query.lte('amount', filters.maxAmount)
    }

    const { data, error, count } = await query

    if (error) throw error

    const expenses = data || []
    const totalCount = count || 0
    const hasMore = page * limit < totalCount

    return {
      expenses,
      totalCount,
      hasMore
    }
  } catch (error) {
    console.error('Error fetching filtered expenses:', error)
    throw error
  }
}

export const getExpensePaymentMethods = async (): Promise<string[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
      .from('expenses')
      .select('payment_method')
      .eq('user_id', user.id)
      .not('payment_method', 'is', null)

    if (error) throw error

    // Get unique payment methods
    const paymentMethods = [...new Set((data || []).map(exp => exp.payment_method).filter(Boolean))]
    return paymentMethods.sort()
  } catch (error) {
    console.error('Error fetching payment methods:', error)
    return []
  }
}

export const getExpenseDateRange = async (): Promise<{ minDate: string; maxDate: string }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { minDate: '', maxDate: '' }

    const { data, error } = await supabase
      .from('expenses')
      .select('date')
      .eq('user_id', user.id)
      .not('date', 'is', null)
      .order('date', { ascending: true })
      .limit(1)

    const { data: maxData, error: maxError } = await supabase
      .from('expenses')
      .select('date')
      .eq('user_id', user.id)
      .not('date', 'is', null)
      .order('date', { ascending: false })
      .limit(1)

    if (error || maxError) throw error || maxError

    const minDate = (data && data.length > 0) ? data[0].date : ''
    const maxDate = (maxData && maxData.length > 0) ? maxData[0].date : ''

    return { minDate, maxDate }
  } catch (error) {
    console.error('Error fetching expense date range:', error)
    return { minDate: '', maxDate: '' }
  }
}

export const getExpenseAmountRange = async (): Promise<{ minAmount: number; maxAmount: number }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { minAmount: 0, maxAmount: 0 }

    const { data, error } = await supabase
      .from('expenses')
      .select('amount')
      .eq('user_id', user.id)
      .order('amount', { ascending: true })
      .limit(1)

    const { data: maxData, error: maxError } = await supabase
      .from('expenses')
      .select('amount')
      .eq('user_id', user.id)
      .order('amount', { ascending: false })
      .limit(1)

    if (error || maxError) throw error || maxError

    const minAmount = (data && data.length > 0) ? data[0].amount : 0
    const maxAmount = (maxData && maxData.length > 0) ? maxData[0].amount : 0

    return { minAmount, maxAmount }
  } catch (error) {
    console.error('Error fetching expense amount range:', error)
    return { minAmount: 0, maxAmount: 0 }
  }
}

export const hasActiveFilters = (filters: ExpenseFilters): boolean => {
  return !!(
    filters.search?.trim() ||
    filters.categoryId ||
    filters.paymentMethod ||
    filters.startDate ||
    filters.endDate ||
    (filters.minAmount !== undefined && filters.minAmount >= 0) ||
    (filters.maxAmount !== undefined && filters.maxAmount >= 0)
  )
}

export const clearFilters = (): ExpenseFilters => {
  return {}
}

export const formatFilterSummary = (filters: ExpenseFilters): string => {
  const activeFilters = []

  if (filters.search?.trim()) {
    activeFilters.push(`Search: "${filters.search.trim()}"`)
  }

  if (filters.categoryId) {
    activeFilters.push('Category selected')
  }

  if (filters.paymentMethod) {
    activeFilters.push(`Payment: ${filters.paymentMethod}`)
  }

  if (filters.startDate || filters.endDate) {
    if (filters.startDate && filters.endDate) {
      activeFilters.push(`Date: ${filters.startDate} to ${filters.endDate}`)
    } else if (filters.startDate) {
      activeFilters.push(`From: ${filters.startDate}`)
    } else {
      activeFilters.push(`Until: ${filters.endDate}`)
    }
  }

  if (filters.minAmount !== undefined || filters.maxAmount !== undefined) {
    if (filters.minAmount !== undefined && filters.maxAmount !== undefined) {
      activeFilters.push(`Amount: ₹${filters.minAmount} - ₹${filters.maxAmount}`)
    } else if (filters.minAmount !== undefined) {
      activeFilters.push(`Min: ₹${filters.minAmount}`)
    } else {
      activeFilters.push(`Max: ₹${filters.maxAmount}`)
    }
  }

  return activeFilters.join(', ')
}
