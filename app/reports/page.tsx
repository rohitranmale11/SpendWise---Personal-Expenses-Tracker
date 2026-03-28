'use client'

import { DashboardLayout } from '@/components/DashboardLayout'
import { DashboardCard } from '@/components/DashboardCard'
import { useState, useEffect } from 'react'
import { Calendar, Download, TrendingUp } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useCurrency } from '@/contexts/CurrencyContext'
import { generateMonthlyReport, generateDateRangeReport } from '@/lib/reportGenerator'

export default function ReportsPage() {
  const { user } = useAuth()
  const { currency } = useCurrency()
  const [selectedRange, setSelectedRange] = useState<'current' | '90days' | 'thisYear' | 'custom'>('current')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [loading, setLoading] = useState(false)

  const handleDownloadReport = async () => {
    try {
      setLoading(true)
      console.log('Generating report for range:', selectedRange)
      
      switch (selectedRange) {
        case 'current':
          await generateMonthlyReport(currency)
          break
        case '90days':
          const endDate = new Date()
          const startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000)
          await generateDateRangeReport(
            startDate.toISOString().split('T')[0],
            endDate.toISOString().split('T')[0],
            currency
          )
          break
        case 'thisYear':
          const currentYear = new Date().getFullYear()
          const yearStart = new Date(currentYear, 0, 1).toISOString().split('T')[0]
          const yearEnd = new Date(currentYear, 11, 31).toISOString().split('T')[0]
          await generateDateRangeReport(yearStart, yearEnd, currency)
          break
        case 'custom':
          if (customStartDate && customEndDate) {
            await generateDateRangeReport(customStartDate, customEndDate, currency)
          } else {
            alert('Please select both start and end dates')
          }
          break
      }
    } catch (error) {
      console.error('Error generating report:', error)
      alert('Failed to generate report. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getRangeLabel = () => {
    switch (selectedRange) {
      case 'current':
        return 'Current Month'
      case '90days':
        return 'Last 90 Days'
      case 'thisYear':
        return 'This Year'
      case 'custom':
        return 'Custom Range'
      default:
        return 'Select Range'
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Financial Reports</h1>
          <p className="text-muted-foreground">Generate and download detailed financial reports</p>
        </div>

        {/* Report Options */}
        <DashboardCard title="Report Options" subtitle="Select date range and generate report">
          <div className="space-y-6">
            {/* Range Selection */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-3">Date Range</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button
                  onClick={() => setSelectedRange('current')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedRange === 'current'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Calendar className="w-6 h-6 mb-2 mx-auto" />
                  <div className="text-sm font-medium">Current Month</div>
                </button>

                <button
                  onClick={() => setSelectedRange('90days')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedRange === '90days'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <TrendingUp className="w-6 h-6 mb-2 mx-auto" />
                  <div className="text-sm font-medium">Last 90 Days</div>
                </button>

                <button
                  onClick={() => setSelectedRange('thisYear')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedRange === 'thisYear'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Calendar className="w-6 h-6 mb-2 mx-auto" />
                  <div className="text-sm font-medium">This Year</div>
                </button>

                <button
                  onClick={() => setSelectedRange('custom')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedRange === 'custom'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Calendar className="w-6 h-6 mb-2 mx-auto" />
                  <div className="text-sm font-medium">Custom Range</div>
                </button>
              </div>
            </div>

            {/* Custom Date Range */}
            {selectedRange === 'custom' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Start Date</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="input-premium w-full"
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">End Date</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="input-premium w-full"
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
            )}

            {/* Generate Button */}
            <div className="flex justify-center">
              <button
                onClick={handleDownloadReport}
                disabled={loading}
                className="button-primary inline-flex items-center gap-2 px-8 py-3"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Generating Report...
                  </>
                ) : (
                  <>
                    <Download size={20} />
                    Generate & Download {getRangeLabel()} Report
                  </>
                )}
              </button>
            </div>
          </div>
        </DashboardCard>

        {/* Instructions */}
        <DashboardCard title="Report Information" subtitle="What's included in your report">
          <div className="space-y-4 text-sm text-muted-foreground">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-primary rounded-full mt-1.5"></div>
              <div>
                <strong>Summary Section:</strong> Total expenses, transaction count, and currency information
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-primary rounded-full mt-1.5"></div>
              <div>
                <strong>Category Breakdown:</strong> Expenses grouped by category with totals
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-primary rounded-full mt-1.5"></div>
              <div>
                <strong>Expense Details:</strong> Complete list of all expenses with date, title, category, and amount
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-primary rounded-full mt-1.5"></div>
              <div>
                <strong>PDF Format:</strong> Professional, printable report with proper formatting
              </div>
            </div>
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-800 text-sm">
                <strong>💡 Tip:</strong> Reports are generated using your selected currency ({currency}). 
                All amounts will be converted and displayed in {currency}.
              </p>
            </div>
          </div>
        </DashboardCard>
      </div>
    </DashboardLayout>
  )
}
