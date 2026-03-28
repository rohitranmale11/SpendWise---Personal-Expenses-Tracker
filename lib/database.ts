import { supabase } from './supabaseClient'

// Types
export interface Profile {
  id: string
  full_name: string | null
  email: string | null
  currency: string
  created_at: string
}

export interface Category {
  id: string
  user_id: string
  name: string
  color: string
  created_at: string
}

export interface Expense {
  id: string
  user_id: string
  amount: number
  category_id: string | null
  category_name?: string
  category_color?: string
  payment_method: string
  note: string | null
  date: string
  created_at: string
}

export interface Budget {
  id: string
  user_id: string
  category_id?: string | null
  monthly_budget: number
  month: number
  year: number
  created_at: string
  name?: string // Optional display name from category
  category_name?: string // Category name from join
  category_color?: string // Category color from join
  spent?: number // Calculated spent amount
}

export interface Subscription {
  id: string
  user_id: string
  name: string
  price: number
  billing_cycle: 'monthly' | 'yearly' | 'weekly'
  next_billing_date: string
  created_at: string
}

export interface ExpenseStats {
  total_expenses: number
  expense_count: number
  avg_expense: number
  category_breakdown: Array<{
    category_name: string
    category_color: string
    total_amount: number
    expense_count: number
    percentage: number
  }>
}

// Profile functions
export const getProfile = async (): Promise<Profile | null> => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error || !data) {
    // If no profile exists, create one from user metadata
    const { data: newProfile, error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
        email: user.email,
        currency: 'INR' // Default currency
      })
      .select()
      .single()

    if (insertError) throw insertError
    return newProfile
  }

  return data
}

export const updateProfile = async (updates: Partial<Profile>): Promise<Profile> => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single()

  if (error) throw error
  return data
}

export const updateCurrency = async (currency: string): Promise<Profile> => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  console.log('Updating currency for user:', user.id, 'to:', currency)

  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({ currency })
      .eq('id', user.id)
      .select()
      .single()

    console.log('Currency update result:', { data, error })

    if (error) {
      console.error('Currency update error:', error)
      console.log('Currency will be updated in local state only')
      return {
        id: user.id,
        full_name: user.user_metadata?.full_name || null,
        email: user.email || null,
        currency,
        created_at: new Date().toISOString()
      }
    }

    return data
  } catch (error) {
    console.error('Unexpected error updating currency:', error)
    return {
      id: user.id,
      full_name: user.user_metadata?.full_name || null,
      email: user.email || null,
      currency,
      created_at: new Date().toISOString()
    }
  }
}

// Category functions
export const getCategories = async (): Promise<Category[]> => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  console.log('🔍 Fetching categories for user:', user.id)

  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .order('name')

    console.log('📋 Categories query result:', {
      data: data || [],
      dataLength: data?.length || 0,
      error
    })

    if (error) {
      console.error('❌ Categories query error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      throw new Error(`Failed to load categories: ${error.message}`)
    }

    const categories = data || []
    console.log('✅ Categories loaded successfully:', categories.length, 'categories')
    return categories

  } catch (error) {
    console.error('💥 Categories fetch failed:', error)
    throw error
  }
}

export const addCategory = async (category: Omit<Category, 'id' | 'user_id' | 'created_at'>): Promise<Category> => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await supabase
    .from('categories')
    .insert({ ...category, user_id: user.id })
    .select()
    .single()

  if (error) throw error
  return data
}

export const updateCategory = async (id: string, updates: Partial<Category>): Promise<Category> => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await supabase
    .from('categories')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) throw error
  return data
}

export const deleteCategory = async (id: string): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw error
}

// Expense functions
export const addExpense = async (expense: Omit<Expense, 'id' | 'user_id' | 'created_at'>): Promise<Expense> => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  // Convert empty string category_id to null
  const expenseData = {
    ...expense,
    category_id: expense.category_id || null,
    user_id: user.id
  }

  const { data, error } = await supabase
    .from('expenses')
    .insert(expenseData)
    .select(`
      *,
      categories(name, color)
    `)
    .single()

  if (error) throw error
  return data
}

export const getExpenses = async (startDate?: string, endDate?: string, categoryId?: string): Promise<Expense[]> => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  console.log('Fetching expenses for user:', user.id, { startDate, endDate, categoryId })

  let query = supabase
    .from('expenses')
    .select(`
      *,
      categories(name, color)
    `)
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  if (startDate) query = query.gte('date', startDate)
  if (endDate) query = query.lte('date', endDate)
  if (categoryId) query = query.eq('category_id', categoryId)

  const { data, error } = await query

  console.log('Expenses query result:', { data, error })

  if (error) {
    console.error('Expenses query error:', error)
    throw error
  }
  return data || []
}

export const updateExpense = async (id: string, updates: Partial<Expense>): Promise<Expense> => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  // Convert empty string category_id to null
  const updateData = {
    ...updates,
    category_id: updates.category_id || null
  }

  const { data, error } = await supabase
    .from('expenses')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', user.id)
    .select(`
      *,
      categories(name, color)
    `)
    .single()

  if (error) throw error
  return data
}

export const deleteExpense = async (id: string): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw error
}

export const getExpenseStats = async (month?: number, year?: number): Promise<ExpenseStats | null> => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  // Set date range
  const now = new Date()
  const targetMonth = month ?? now.getMonth() + 1
  const targetYear = year ?? now.getFullYear()

  const startDate = new Date(targetYear, targetMonth - 1, 1).toISOString().split('T')[0]
  const endDate = new Date(targetYear, targetMonth, 0).toISOString().split('T')[0]

  // Get expenses with categories for the month
  const { data: expenses, error: expensesError } = await supabase
    .from('expenses')
    .select(`
      amount,
      categories(name, color)
    `)
    .eq('user_id', user.id)
    .gte('date', startDate)
    .lte('date', endDate)

  if (expensesError) throw expensesError

  const expensesList = expenses || []
  const totalExpenses = expensesList.reduce((sum, exp) => sum + exp.amount, 0)
  const expenseCount = expensesList.length
  const avgExpense = expenseCount > 0 ? totalExpenses / expenseCount : 0

  // Group by category
  const categoryMap = new Map<string, any>()
  expensesList.forEach(exp => {
    const categoryName = (exp.categories as any)?.name || 'Uncategorized'
    const categoryColor = (exp.categories as any)?.color || '#6b7280'

    if (!categoryMap.has(categoryName)) {
      categoryMap.set(categoryName, {
        category_name: categoryName,
        category_color: categoryColor,
        total_amount: 0,
        expense_count: 0
      })
    }

    const category = categoryMap.get(categoryName)
    category.total_amount += exp.amount
    category.expense_count += 1
  })

  // Calculate percentages and convert to array
  const categoryBreakdown = Array.from(categoryMap.values()).map(cat => ({
    ...cat,
    percentage: totalExpenses > 0 ? Math.round((cat.total_amount / totalExpenses) * 100) : 0
  }))

  return {
    total_expenses: totalExpenses,
    expense_count: expenseCount,
    avg_expense: avgExpense,
    category_breakdown: categoryBreakdown
  }
}

// Budget functions
export const getBudgets = async (): Promise<Budget[]> => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  console.log('🔍 Fetching budgets for user:', user.id)

  try {
    // First fetch budgets without joining categories
    const { data: budgetsData, error: budgetsError } = await supabase
      .from('budgets')
      .select('*')
      .eq('user_id', user.id)
      .order('year', { ascending: false })
      .order('month', { ascending: false })

    if (budgetsError) {
      console.error('❌ Budgets query error:', budgetsError)
      throw budgetsError
    }

    console.log('📊 Budgets loaded:', budgetsData?.length || 0)

    // If no budgets, return empty array
    if (!budgetsData || budgetsData.length === 0) {
      console.log('✅ No budgets found, returning empty array')
      return []
    }

    // Then fetch categories separately
    const { data: categoriesData, error: categoriesError } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)

    if (categoriesError) {
      console.error('❌ Categories query error:', categoriesError)
      // Don't throw error, just continue without categories
    }

    console.log('📋 Categories loaded:', categoriesData?.length || 0)

    // Create a map of categories for easy lookup
    const categoryMap = new Map()
    if (categoriesData) {
      categoriesData.forEach(category => {
        categoryMap.set(category.id, category)
      })
    }

    // Combine budgets with their categories
    const budgetsWithCategories = budgetsData.map(budget => {
      const category = budget.category_id ? categoryMap.get(budget.category_id) : null
      return {
        ...budget,
        category_name: category?.name || null,
        category_color: category?.color || null
      }
    })

    console.log('✅ Budgets with categories combined:', budgetsWithCategories.length)
    return budgetsWithCategories

  } catch (error) {
    console.error('💥 Budgets fetch failed:', error)
    throw error
  }
}

export const addBudget = async (budget: Omit<Budget, 'id' | 'user_id' | 'created_at' | 'category_name' | 'category_color' | 'spent'>): Promise<Budget> => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  console.log('🔍 Adding budget for user:', user.id, 'Budget data:', budget)

  // Validate required fields
  if (!budget.monthly_budget || budget.monthly_budget <= 0) {
    console.error('❌ Invalid budget amount:', budget.monthly_budget)
    throw new Error('Budget amount must be greater than 0')
  }

  if (!budget.month || budget.month < 1 || budget.month > 12) {
    console.error('❌ Invalid month:', budget.month)
    throw new Error('Valid month is required')
  }

  if (!budget.year || budget.year < 2020 || budget.year > 2030) {
    console.error('❌ Invalid year:', budget.year)
    throw new Error('Valid year is required')
  }

  // Handle category_id properly - ensure null for empty strings
  const categoryId = budget.category_id && budget.category_id.trim() !== '' ? budget.category_id : null

  const insertData = {
    category_id: categoryId,
    monthly_budget: budget.monthly_budget,
    month: budget.month,
    year: budget.year,
    user_id: user.id
  }

  console.log('📝 Prepared insert data:', insertData)

  try {
    // Insert budget without joining categories
    const { data, error } = await supabase
      .from('budgets')
      .insert(insertData)
      .select('*')
      .single()

    console.log('💾 Budget insert result:', { data, error })

    if (error) {
      console.error('❌ Supabase error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })

      // Handle specific error types
      if (error.code === '23505') {
        // Unique constraint violation
        if (error.message.includes('category_id')) {
          throw new Error('A budget for this category and month already exists')
        } else {
          throw new Error('A budget for this month already exists')
        }
      } else if (error.code === '23503') {
        // Foreign key constraint violation
        throw new Error('Invalid category selected. Please choose a valid category or leave it empty for a general budget.')
      } else {
        throw new Error(`Database error: ${error.message}`)
      }
    }

    if (!data) {
      console.error('❌ No data returned from insert')
      throw new Error('Failed to create budget - no data returned')
    }

    // If category_id exists, fetch category data separately
    let categoryData = null
    if (data.category_id) {
      const { data: category, error: categoryError } = await supabase
        .from('categories')
        .select('name, color')
        .eq('id', data.category_id)
        .single()

      if (!categoryError && category) {
        categoryData = category
      }
    }

    // Combine budget with category data
    const result = {
      ...data,
      category_name: categoryData?.name || null,
      category_color: categoryData?.color || null
    }

    console.log('✅ Budget created successfully:', result)
    return result

  } catch (error) {
    console.error('💥 Budget creation failed:', error)
    throw error
  }
}

export const updateBudget = async (id: string, updates: Partial<Budget>): Promise<Budget> => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await supabase
    .from('budgets')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select(`
      *,
      categories(name, color)
    `)
    .single()

  if (error) throw error
  return data
}

export interface BudgetAlert {
  category: string
  category_id?: string
  percentage: number
  type: 'warning' | 'danger'
  spent: number
  budget: number
}

export const calculateBudgetAlerts = async (month?: number, year?: number): Promise<BudgetAlert[]> => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  // Set default month/year to current
  const now = new Date()
  const targetMonth = month ?? now.getMonth() + 1
  const targetYear = year ?? now.getFullYear()

  // Fetch budgets and expenses for the month
  const [budgetsResult, expenses] = await Promise.all([
    supabase
      .from('budgets')
      .select('*')
      .eq('user_id', user.id)
      .eq('month', targetMonth)
      .eq('year', targetYear),
    supabase
      .from('expenses')
      .select('amount, category_id')
      .eq('user_id', user.id)
      .gte('date', new Date(targetYear, targetMonth - 1, 1).toISOString().split('T')[0])
      .lte('date', new Date(targetYear, targetMonth, 0).toISOString().split('T')[0])
  ])

  const budgetsData = budgetsResult.data || []
  const expensesData = expenses.data || []

  console.log('Budget alerts calculation:', { budgetsData: budgetsData.length, expensesData: expensesData.length })

  // If no budgets, return empty array
  if (budgetsData.length === 0) {
    console.log('No budgets found for alerts calculation')
    return []
  }

  // Fetch categories separately
  let categoriesData = []
  try {
    const { data: categories } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
    categoriesData = categories || []
  } catch (error) {
    console.error('Error fetching categories for alerts:', error)
  }

  // Create category map
  const categoryMap = new Map()
  categoriesData.forEach(category => {
    categoryMap.set(category.id, category)
  })

  // Calculate alerts for each budget
  const alerts: BudgetAlert[] = []

  budgetsData.forEach(budget => {
    // Calculate total spent for this budget's category
    const spent = expensesData
      .filter(expense => expense.category_id === budget.category_id)
      .reduce((sum, expense) => sum + expense.amount, 0)

    const percentage = budget.monthly_budget > 0 ? (spent / budget.monthly_budget) * 100 : 0

    // Get category name from map
    const category = budget.category_id ? categoryMap.get(budget.category_id) : null
    const categoryName = category?.name || 'General'

    if (percentage >= 100) {
      alerts.push({
        category: categoryName,
        category_id: budget.category_id,
        percentage,
        type: 'danger',
        spent,
        budget: budget.monthly_budget
      })
    } else if (percentage >= 80) {
      alerts.push({
        category: categoryName,
        category_id: budget.category_id,
        percentage,
        type: 'warning',
        spent,
        budget: budget.monthly_budget
      })
    }
  })

  return alerts
}

export const deleteBudget = async (id: string): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { error } = await supabase
    .from('budgets')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw error
}

// Subscription functions
export const getSubscriptions = async (): Promise<Subscription[]> => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .order('next_billing_date', { ascending: true })

  if (error) throw error
  return data || []
}

export const addSubscription = async (subscription: Omit<Subscription, 'id' | 'user_id' | 'created_at'>): Promise<Subscription> => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await supabase
    .from('subscriptions')
    .insert({ ...subscription, user_id: user.id })
    .select()
    .single()

  if (error) throw error
  return data
}

export const updateSubscription = async (id: string, updates: Partial<Subscription>): Promise<Subscription> => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await supabase
    .from('subscriptions')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) throw error
  return data
}

export const deleteSubscription = async (id: string): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { error } = await supabase
    .from('subscriptions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw error
}
