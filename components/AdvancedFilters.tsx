'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Search, X, Calendar, DollarSign, Filter, RotateCcw } from 'lucide-react'
import { getCategories } from '@/lib/database'
import { 
  getExpensePaymentMethods, 
  getExpenseDateRange, 
  getExpenseAmountRange,
  hasActiveFilters,
  clearFilters,
  type ExpenseFilters 
} from '@/lib/expense-filters'
import { useCurrency } from '@/contexts/CurrencyContext'

interface AdvancedFiltersProps {
  filters: ExpenseFilters
  onFiltersChange: (filters: ExpenseFilters) => void
  onApplyFilters: () => void
  isLoading?: boolean
  totalCount?: number
}

export default function AdvancedFilters({ 
  filters, 
  onFiltersChange, 
  onApplyFilters, 
  isLoading = false,
  totalCount = 0 
}: AdvancedFiltersProps) {
  const { formatCurrency } = useCurrency()
  const [categories, setCategories] = useState<{ id: string; name: string; color: string }[]>([])
  const [paymentMethods, setPaymentMethods] = useState<string[]>([])
  const [dateRange, setDateRange] = useState<{ minDate: string; maxDate: string }>({ minDate: '', maxDate: '' })
  const [amountRange, setAmountRange] = useState<{ minAmount: number; maxAmount: number }>({ minAmount: 0, maxAmount: 0 })
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [searchInput, setSearchInput] = useState(filters.search || '')

  // Load filter options
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const [categoriesData, paymentMethodsData, dateRangeData, amountRangeData] = await Promise.all([
          getCategories(),
          getExpensePaymentMethods(),
          getExpenseDateRange(),
          getExpenseAmountRange()
        ])

        setCategories(categoriesData || [])
        setPaymentMethods(paymentMethodsData)
        setDateRange(dateRangeData)
        setAmountRange(amountRangeData)
      } catch (error) {
        console.error('Error loading filter options:', error)
      }
    }

    loadFilterOptions()
  }, [])

  // Debounced search
  const debouncedSearch = useCallback(
    useMemo(() => {
      let timeoutId: NodeJS.Timeout
      return (value: string) => {
        clearTimeout(timeoutId)
        timeoutId = setTimeout(() => {
          onFiltersChange({ ...filters, search: value.trim() || undefined })
          onApplyFilters()
        }, 300)
      }
    }, [filters, onFiltersChange, onApplyFilters]),
    []
  )

  const handleSearchChange = (value: string) => {
    setSearchInput(value)
    debouncedSearch(value)
  }

  const handleFilterChange = (key: keyof ExpenseFilters, value: any) => {
    const newFilters = { ...filters, [key]: value || undefined }
    onFiltersChange(newFilters)
  }

  const handleClearFilters = () => {
    const clearedFilters = clearFilters()
    onFiltersChange(clearedFilters)
    setSearchInput('')
    onApplyFilters()
  }

  const handleApplyAdvancedFilters = () => {
    onApplyFilters()
  }

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.search?.trim()) count++
    if (filters.categoryId) count++
    if (filters.paymentMethod) count++
    if (filters.startDate || filters.endDate) count++
    if (filters.minAmount !== undefined || filters.maxAmount !== undefined) count++
    return count
  }, [filters])

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Advanced Filters</h3>
          {activeFilterCount > 0 && (
            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
              {activeFilterCount} active
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters(filters) && (
            <button
              onClick={handleClearFilters}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Clear All
            </button>
          )}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
          >
            {showAdvanced ? 'Show Less' : 'Show Advanced'}
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search expenses by note or description..."
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {searchInput && (
          <button
            onClick={() => handleSearchChange('')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Basic Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Category Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select
            value={filters.categoryId || ''}
            onChange={(e) => handleFilterChange('categoryId', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        {/* Payment Method Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
          <select
            value={filters.paymentMethod || ''}
            onChange={(e) => handleFilterChange('paymentMethod', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Methods</option>
            {paymentMethods.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="space-y-4 pt-4 border-t border-gray-200">
          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="w-4 h-4 inline mr-1" />
                Start Date
              </label>
              <input
                type="date"
                value={filters.startDate || ''}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                min={dateRange.minDate}
                max={dateRange.maxDate}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="w-4 h-4 inline mr-1" />
                End Date
              </label>
              <input
                type="date"
                value={filters.endDate || ''}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                min={dateRange.minDate}
                max={dateRange.maxDate}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Amount Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <DollarSign className="w-4 h-4 inline mr-1" />
                Min Amount
              </label>
              <input
                type="number"
                placeholder="0"
                value={filters.minAmount || ''}
                onChange={(e) => handleFilterChange('minAmount', e.target.value ? parseFloat(e.target.value) : undefined)}
                min={0}
                max={amountRange.maxAmount}
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <DollarSign className="w-4 h-4 inline mr-1" />
                Max Amount
              </label>
              <input
                type="number"
                placeholder="0"
                value={filters.maxAmount || ''}
                onChange={(e) => handleFilterChange('maxAmount', e.target.value ? parseFloat(e.target.value) : undefined)}
                min={amountRange.minAmount}
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      )}

      {/* Results Summary */}
      {(hasActiveFilters(filters) || totalCount > 0) && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            {hasActiveFilters(filters) ? (
              <span>
                Showing {totalCount} expense{totalCount !== 1 ? 's' : ''} with filters applied
              </span>
            ) : (
              <span>
                {totalCount} total expense{totalCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          {showAdvanced && (
            <button
              onClick={handleApplyAdvancedFilters}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Applying...' : 'Apply Filters'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
