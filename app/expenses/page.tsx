'use client'

import { DashboardLayout } from '@/components/DashboardLayout'
import { DashboardCard } from '@/components/DashboardCard'
import { TransactionTable } from '@/components/TransactionTable'
import { Modal } from '@/components/Modal'
import AdvancedFilters from '@/components/AdvancedFilters'
import { useState, useEffect, useCallback } from 'react'
import { Plus, Edit2, Trash2, AlertCircle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useCurrency } from '@/contexts/CurrencyContext'
import { getExpenses, addExpense, updateExpense, deleteExpense, getCategories } from '@/lib/database'
import {
  getFilteredExpenses,
  hasActiveFilters,
  clearFilters,
  type ExpenseFilters
} from '@/lib/expense-filters'

export default function ExpensesPage() {
  const { user } = useAuth()
  const { formatCurrency } = useCurrency()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [expenses, setExpenses] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<ExpenseFilters>({})
  const [totalCount, setTotalCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    amount: '',
    category_id: '',
    payment_method: 'cash',
    note: '',
    date: new Date().toISOString().split('T')[0]
  })
  const [editingExpense, setEditingExpense] = useState<any>(null)

  // Load expenses with filters
  const loadExpenses = useCallback(async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      const result = await getFilteredExpenses(filters, 1, 100) // Load first 100 expenses
      setExpenses(result.expenses)
      setTotalCount(result.totalCount)
    } catch (error) {
      console.error('Error loading expenses:', error)
      setError('Failed to load expenses. Please try again.')
      setExpenses([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }, [user, filters])

  // Load categories
  const loadCategories = useCallback(async () => {
    if (!user) return

    try {
      const categoriesData = await getCategories()
      setCategories(categoriesData)
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }, [user])

  // Initial data load
  useEffect(() => {
    if (user) {
      loadExpenses()
      loadCategories()
    }
  }, [user, loadExpenses, loadCategories])

  const handleFiltersChange = (newFilters: ExpenseFilters) => {
    setFilters(newFilters)
  }

  const handleApplyFilters = () => {
    loadExpenses()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingExpense) {
        await updateExpense(editingExpense.id, {
          ...formData,
          amount: parseFloat(formData.amount),
          date: formData.date
        })
        setEditModalOpen(false)
        setEditingExpense(null)
      } else {
        await addExpense({
          ...formData,
          amount: parseFloat(formData.amount),
          date: formData.date
        })
        setIsModalOpen(false)
      }

      // Reset form and reload data
      setFormData({
        amount: '',
        category_id: '',
        payment_method: 'cash',
        note: '',
        date: new Date().toISOString().split('T')[0]
      })
      loadExpenses()
    } catch (error) {
      console.error('Error saving expense:', error)
      alert(`Error saving expense: ${error instanceof Error ? error.message : 'Please try again.'}`)
    }
  }

  const handleEdit = (expense: any) => {
    setEditingExpense(expense)
    setFormData({
      amount: expense.amount.toString(),
      category_id: expense.category_id || '',
      payment_method: expense.payment_method,
      note: expense.note || '',
      date: expense.date
    })
    setEditModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this expense?')) {
      try {
        await deleteExpense(id)
        loadExpenses()
      } catch (error) {
        console.error('Error deleting expense:', error)
        alert('Error deleting expense. Please try again.')
      }
    }
  }

  if (loading && expenses.length === 0) {
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
            <h1 className="text-3xl font-bold text-foreground mb-1">Expenses</h1>
            <p className="text-muted-foreground">Manage and track all your expenses</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="button-primary inline-flex items-center gap-2 w-full sm:w-auto justify-center"
          >
            <Plus size={20} />
            Add Expense
          </button>
        </div>

        {/* Advanced Filters */}
        <AdvancedFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onApplyFilters={handleApplyFilters}
          isLoading={loading}
          totalCount={totalCount}
        />

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <div>
                <h3 className="text-red-800 font-medium">Error</h3>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Expenses Table */}
        <DashboardCard
          title="All Expenses"
          subtitle={`${expenses.length} of ${totalCount} transactions${hasActiveFilters(filters) ? ' (filtered)' : ''}`}
        >
          {expenses.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {hasActiveFilters(filters) ? 'No expenses found' : 'No expenses yet'}
              </h3>
              <p className="text-gray-500 text-sm mb-6">
                {hasActiveFilters(filters)
                  ? 'Try adjusting your filters to see more results.'
                  : 'Start by adding your first expense to track your spending.'
                }
              </p>
              {!hasActiveFilters(filters) && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="button-primary inline-flex items-center gap-2"
                >
                  <Plus size={20} />
                  Add Your First Expense
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium text-foreground">Description</th>
                    <th className="text-left py-3 px-4 font-medium text-foreground">Category</th>
                    <th className="text-left py-3 px-4 font-medium text-foreground">Amount</th>
                    <th className="text-left py-3 px-4 font-medium text-foreground">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-foreground">Payment Method</th>
                    <th className="text-left py-3 px-4 font-medium text-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense) => (
                    <tr key={expense.id} className="border-b border-border hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium text-foreground">{expense.note || 'No description'}</div>
                          {hasActiveFilters(filters) && (
                            <div className="text-xs text-gray-500 mt-1">
                              Matches: {filters.search && expense.note?.toLowerCase().includes(filters.search.toLowerCase()) ? 'search' : ''}
                              {filters.categoryId === expense.category_id ? 'category' : ''}
                              {filters.paymentMethod === expense.payment_method ? 'payment method' : ''}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className="px-2 py-1 rounded-full text-xs font-medium"
                          style={{ backgroundColor: expense.categories?.color + '20', color: expense.categories?.color || '#3b82f6' }}
                        >
                          {expense.categories?.name || 'Uncategorized'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium">{formatCurrency(expense.amount)}</td>
                      <td className="py-3 px-4">{new Date(expense.date).toLocaleDateString()}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                          {expense.payment_method || 'N/A'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(expense)}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(expense.id)}
                            className="text-red-600 hover:text-red-800 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DashboardCard>

        {/* Add Expense Modal */}
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Expense">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                required
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
              <select
                required
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="upi">UPI</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
              <input
                type="text"
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Add a note..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add Expense
              </button>
            </div>
          </form>
        </Modal>

        {/* Edit Expense Modal */}
        <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Expense">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                required
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
              <select
                required
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="upi">UPI</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
              <input
                type="text"
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Add a note..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Update Expense
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  )
}
