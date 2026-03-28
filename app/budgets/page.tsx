'use client'

import { DashboardLayout } from '@/components/DashboardLayout'
import { DashboardCard } from '@/components/DashboardCard'
import { Modal } from '@/components/Modal'
import { StatCard } from '@/components/StatCard'
import { useState, useEffect } from 'react'
import { Plus, AlertCircle, TrendingDown, Edit2, Trash2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useCurrency } from '@/contexts/CurrencyContext'
import { getBudgets, addBudget, updateBudget, deleteBudget } from '@/lib/database'
import { getCategories } from '@/lib/database'
import { getExpenses } from '@/lib/database'

export default function BudgetsPage() {
  const { user } = useAuth()
  const { formatCurrency } = useCurrency()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [budgets, setBudgets] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    category_id: '',
    monthly_budget: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  })
  const [editingBudget, setEditingBudget] = useState<any>(null)

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  const loadData = async () => {
    try {
      setLoading(true)
      console.log('🔄 Starting to load budgets data...')

      const [budgetsData, categoriesData, expensesData] = await Promise.all([
        getBudgets(),
        getCategories(),
        getExpenses()
      ])

      console.log('📊 Fetched data:', {
        budgets: budgetsData?.length || 0,
        categories: categoriesData?.length || 0,
        expenses: expensesData?.length || 0
      })

      // Calculate spending for each budget
      const budgetsWithSpending = budgetsData.map((budget: any) => {
        const budgetStartDate = new Date(budget.year, budget.month - 1, 1)
        const budgetEndDate = new Date(budget.year, budget.month, 0)

        const budgetExpenses = expensesData.filter((expense: any) => {
          const expenseDate = new Date(expense.date)
          return expenseDate >= budgetStartDate && expenseDate <= budgetEndDate
        })

        const totalSpent = budgetExpenses.reduce((sum: number, exp: any) => sum + exp.amount, 0)

        return {
          ...budget,
          spent: totalSpent
        }
      })

      console.log('💰 Budgets with spending calculated:', budgetsWithSpending)
      setBudgets(budgetsWithSpending)
      setCategories(categoriesData)

    } catch (error) {
      console.error('💥 Error loading budget data:', error)
      // Show user-friendly error
      alert(`Failed to load budget data: ${error instanceof Error ? error.message : 'Please try again.'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (isSubmitting) return

    try {
      setIsSubmitting(true)
      console.log('📝 Submitting budget form:', formData)

      // Validation
      if (!formData.monthly_budget || parseFloat(formData.monthly_budget) <= 0) {
        console.error('❌ Invalid budget amount:', formData.monthly_budget)
        alert('Please enter a valid budget amount greater than 0')
        setIsSubmitting(false)
        return
      }

      if (!formData.month || !formData.year) {
        console.error('❌ Invalid month/year:', { month: formData.month, year: formData.year })
        alert('Please select a valid month and year')
        setIsSubmitting(false)
        return
      }

      const budgetData = {
        category_id: formData.category_id && formData.category_id.trim() !== '' ? formData.category_id : null,
        monthly_budget: parseFloat(formData.monthly_budget),
        month: formData.month,
        year: formData.year
      }

      console.log('💾 Prepared budget data:', budgetData)

      if (editingBudget) {
        console.log('🔄 Updating budget:', editingBudget.id, budgetData)
        await updateBudget(editingBudget.id, budgetData)
        setEditModalOpen(false)
        setEditingBudget(null)
        console.log('✅ Budget updated successfully')
      } else {
        console.log('➕ Adding new budget:', budgetData)
        await addBudget(budgetData)
        setIsModalOpen(false)
        console.log('✅ Budget created successfully')
      }

      // Reset form and reload data
      setFormData({
        category_id: '',
        monthly_budget: '',
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear()
      })

      console.log('🔄 Reloading budget data...')
      await loadData()

    } catch (error) {
      console.error('💥 Budget submission failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'

      // Handle specific error types with user-friendly messages
      if (errorMessage.includes('Invalid category selected')) {
        alert('❌ Invalid category selected. Please choose a valid category or leave it empty for a general budget.')
      } else if (errorMessage.includes('already exists')) {
        alert('❌ A budget for this category and month already exists.')
      } else if (errorMessage.includes('Budget amount must be greater than 0')) {
        alert('❌ Budget amount must be greater than 0.')
      } else if (errorMessage.includes('Valid month') || errorMessage.includes('Valid year')) {
        alert('❌ Please select a valid month and year.')
      } else if (errorMessage.includes('Failed to load categories')) {
        alert('❌ Unable to load categories. Please refresh the page and try again.')
      } else if (errorMessage.includes('Database schema error')) {
        alert('❌ Database schema error. Please refresh the page and try again.')
      } else {
        alert(`❌ Error saving budget: ${errorMessage}`)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (budget: any) => {
    setEditingBudget(budget)
    setFormData({
      category_id: budget.category_id || '',
      monthly_budget: budget.monthly_budget.toString(),
      month: budget.month,
      year: budget.year
    })
    setEditModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this budget?')) {
      try {
        await deleteBudget(id)
        await loadData()
      } catch (error) {
        console.error('Error deleting budget:', error)
        alert('Error deleting budget. Please try again.')
      }
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-1">Budgets</h1>
            <p className="text-muted-foreground">Manage your spending limits</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="button-primary inline-flex items-center gap-2 w-full sm:w-auto justify-center"
          >
            <Plus size={18} />
            Set Budget
          </button>
        </div>

        {/* Budgets List */}
        {budgets.length > 0 ? (
          <div className="space-y-4">
            {budgets.map((budget) => {
              const percentage = budget.monthly_budget > 0 ? (budget.spent / budget.monthly_budget) * 100 : 0
              const isOverBudget = budget.spent > budget.monthly_budget

              return (
                <DashboardCard key={budget.id} title={`${new Date(budget.year, budget.month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`}>
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                          style={{ backgroundColor: budget.categories?.color || '#3b82f6' }}
                        >
                          {budget.categories?.name?.charAt(0)?.toUpperCase() || 'B'}
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">
                            {budget.categories?.name || 'General'}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {formatCurrency(budget.monthly_budget)} / month
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(budget)}
                          className="text-blue-600 hover:text-blue-800 p-1"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(budget.id)}
                          className="text-red-600 hover:text-red-800 p-1"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Spent</span>
                        <span className="font-medium text-foreground">
                          {formatCurrency(budget.spent || 0)}
                        </span>
                      </div>

                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${isOverBudget ? 'bg-red-500' : 'bg-green-500'
                            }`}
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                      </div>

                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Remaining</span>
                        <span className={`font-medium ${isOverBudget ? 'text-red-600' : 'text-green-600'
                          }`}>
                          {formatCurrency(Math.max(budget.monthly_budget - (budget.spent || 0), 0))}
                        </span>
                      </div>
                    </div>
                  </div>
                </DashboardCard>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">No budgets yet</p>
            <p className="text-muted-foreground">Create your first budget to start tracking spending limits</p>
            {categories.length === 0 && (
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800 font-medium mb-2">
                  📋 No Categories Found
                </p>
                <p className="text-yellow-700 text-sm">
                  You need to create categories first before setting budgets.
                  <a href="/categories" className="text-blue-600 hover:text-blue-800 underline">
                    Go to Categories
                  </a>
                </p>
              </div>
            )}
          </div>
        )}

        {/* Add Budget Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Set New Budget"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Category</label>
              <div className="text-xs text-muted-foreground mb-2">
                Select a category for specific budget tracking, or leave empty for a general budget.
              </div>
              {categories.length === 0 ? (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-800 text-sm">
                    ⚠️ No categories available.
                    <a href="/categories" className="text-blue-600 hover:text-blue-800 underline ml-1">
                      Create categories first
                    </a>
                  </p>
                </div>
              ) : (
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="input-premium w-full"
                >
                  <option value="">Select a category (optional)</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Monthly Budget</label>
              <input
                type="number"
                placeholder="0.00"
                value={formData.monthly_budget}
                onChange={(e) => setFormData({ ...formData, monthly_budget: e.target.value })}
                className="input-premium w-full"
                step="0.01"
                min="0"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Month</label>
                <select
                  value={formData.month}
                  onChange={(e) => setFormData({ ...formData, month: parseInt(e.target.value) })}
                  className="input-premium w-full"
                  required
                >
                  <option value={1}>January</option>
                  <option value={2}>February</option>
                  <option value={3}>March</option>
                  <option value={4}>April</option>
                  <option value={5}>May</option>
                  <option value={6}>June</option>
                  <option value={7}>July</option>
                  <option value={8}>August</option>
                  <option value={9}>September</option>
                  <option value={10}>October</option>
                  <option value={11}>November</option>
                  <option value={12}>December</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Year</label>
                <select
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                  className="input-premium w-full"
                  required
                >
                  {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(year => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="button-ghost flex-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="button-primary flex-1 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  'Set Budget'
                )}
              </button>
            </div>
          </form>
        </Modal>

        {/* Edit Budget Modal */}
        <Modal
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false)
            setEditingBudget(null)
          }}
          title="Edit Budget"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Category</label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="input-premium w-full"
              >
                <option value="">Select a category (optional)</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Monthly Budget</label>
              <input
                type="number"
                placeholder="0.00"
                value={formData.monthly_budget}
                onChange={(e) => setFormData({ ...formData, monthly_budget: e.target.value })}
                className="input-premium w-full"
                step="0.01"
                min="0"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Month</label>
                <select
                  value={formData.month}
                  onChange={(e) => setFormData({ ...formData, month: parseInt(e.target.value) })}
                  className="input-premium w-full"
                  required
                >
                  <option value={1}>January</option>
                  <option value={2}>February</option>
                  <option value={3}>March</option>
                  <option value={4}>April</option>
                  <option value={5}>May</option>
                  <option value={6}>June</option>
                  <option value={7}>July</option>
                  <option value={8}>August</option>
                  <option value={9}>September</option>
                  <option value={10}>October</option>
                  <option value={11}>November</option>
                  <option value={12}>December</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Year</label>
                <select
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                  className="input-premium w-full"
                  required
                >
                  {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(year => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setEditModalOpen(false)
                  setEditingBudget(null)
                }}
                className="button-ghost flex-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="button-primary flex-1"
              >
                Update Budget
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  )
}
