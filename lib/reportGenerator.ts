import jsPDF from 'jspdf'
import { getExpenses } from './database'
import { supabase } from './supabaseClient'

export interface ReportData {
  userName: string
  month: string
  year: number
  totalExpenses: number
  totalTransactions: number
  categoryBreakdown: { [key: string]: number }
  expenses: any[]
}

export const generateMonthlyReport = async (selectedCurrency: string = 'INR'): Promise<void> => {
  try {
    console.log('Generating monthly report with currency:', selectedCurrency)

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Get current date
    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()

    // Fetch expenses for current month with categories
    const startDate = new Date(currentYear, currentMonth - 1, 1).toISOString().split('T')[0]
    const endDate = new Date(currentYear, currentMonth, 0).toISOString().split('T')[0]

    console.log('Fetching expenses for date range:', { startDate, endDate })

    const expenses = await getExpenses(startDate, endDate)
    console.log('Fetched expenses:', expenses.length)

    if (expenses.length === 0) {
      alert('No expenses recorded for this month')
      return
    }

    // Calculate report data
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
    const totalTransactions = expenses.length

    // Calculate category breakdown
    const categoryBreakdown: { [key: string]: number } = {}
    expenses.forEach((expense: any) => {
      const categoryName = expense.categories?.name || 'Uncategorized'
      categoryBreakdown[categoryName] = (categoryBreakdown[categoryName] || 0) + expense.amount
    })

    // Create PDF
    const pdf = new jsPDF()

    // Add custom font for better Unicode support
    pdf.setFont('helvetica')

    let yPosition = 20

    // Title
    pdf.setFontSize(20)
    pdf.setFont('helvetica', 'bold')
    pdf.text('SpendWise Monthly Financial Report', 20, yPosition)
    yPosition += 15

    // User info and period
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`User Name: ${user.user_metadata?.full_name || user.email || 'User'}`, 20, yPosition)
    yPosition += 10
    pdf.text(`Month: ${now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`, 20, yPosition)
    yPosition += 10
    pdf.text(`Currency: ${selectedCurrency}`, 20, yPosition)
    yPosition += 20

    // Summary section
    pdf.setFont('helvetica', 'bold')
    pdf.text('Summary', 20, yPosition)
    yPosition += 10

    pdf.setFont('helvetica', 'normal')
    pdf.text(`Total Expenses: ${formatCurrencyForPDF(totalExpenses, selectedCurrency)}`, 20, yPosition)
    yPosition += 8
    pdf.text(`Total Transactions: ${totalTransactions}`, 20, yPosition)
    yPosition += 20

    // Category breakdown
    pdf.setFont('helvetica', 'bold')
    pdf.text('Category Breakdown', 20, yPosition)
    yPosition += 10

    pdf.setFont('helvetica', 'normal')
    Object.entries(categoryBreakdown).forEach(([category, amount]) => {
      pdf.text(`${category}: ${formatCurrencyForPDF(amount, selectedCurrency)}`, 20, yPosition)
      yPosition += 8
    })
    yPosition += 10

    // Expense list
    pdf.setFont('helvetica', 'bold')
    pdf.text('Expense Details', 20, yPosition)
    yPosition += 10

    // Table headers
    pdf.setFont('helvetica', 'bold')
    pdf.text('Date', 20, yPosition)
    pdf.text('Title', 60, yPosition)
    pdf.text('Category', 110, yPosition)
    pdf.text('Amount', 160, yPosition)
    yPosition += 10

    // Table rows
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10)

    expenses.forEach((expense: any) => {
      const date = new Date(expense.date).toLocaleDateString()
      const title = expense.note || 'No description'
      const category = expense.categories?.name || 'Uncategorized'
      const amount = formatCurrencyForPDF(expense.amount, selectedCurrency)

      // Check if we need a new page
      if (yPosition > 270) {
        pdf.addPage()
        yPosition = 20
      }

      pdf.text(date, 20, yPosition)
      pdf.text(title.substring(0, 30), 60, yPosition)
      pdf.text(category.substring(0, 25), 110, yPosition)
      pdf.text(amount, 160, yPosition)
      yPosition += 8
    })

    // Add footer
    const totalPages = pdf.internal.pages.length
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i)
      pdf.setFontSize(8)
      pdf.text(`Page ${i} of ${totalPages}`, 180, 290)
    }

    // Generate filename with current date
    const fileName = `SpendWise_Monthly_Report_${now.toISOString().split('T')[0]}.pdf`

    // Save and download
    pdf.save(fileName)
    console.log('PDF report generated successfully:', fileName)

  } catch (error) {
    console.error('Error generating monthly report:', error)
    alert('Failed to generate report. Please try again.')
  }
}

// Helper function to format currency for PDF
const formatCurrencyForPDF = (amount: number, currency: string): string => {
  const symbols: { [key: string]: string } = {
    INR: '₹',
    USD: '$',
    EUR: '€',
    GBP: '£'
  }
  const symbol = symbols[currency] || '₹'
  return `${symbol}${amount.toFixed(2)}`
}

// Function to generate reports for different date ranges
export const generateDateRangeReport = async (startDate: string, endDate: string, selectedCurrency: string = 'INR'): Promise<void> => {
  try {
    console.log('Generating date range report:', { startDate, endDate, currency: selectedCurrency })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const expenses = await getExpenses(startDate, endDate)
    console.log('Fetched expenses for date range:', expenses.length)

    if (expenses.length === 0) {
      alert('No expenses recorded for this date range')
      return
    }

    // Similar logic to monthly report but with custom date range
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
    const totalTransactions = expenses.length

    const categoryBreakdown: { [key: string]: number } = {}
    expenses.forEach((expense: any) => {
      const categoryName = expense.categories?.name || 'Uncategorized'
      categoryBreakdown[categoryName] = (categoryBreakdown[categoryName] || 0) + expense.amount
    })

    const pdf = new jsPDF()
    pdf.setFont('helvetica')

    let yPosition = 20

    // Title
    pdf.setFontSize(20)
    pdf.setFont('helvetica', 'bold')
    pdf.text('SpendWise Financial Report', 20, yPosition)
    yPosition += 15

    // User info and period
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`User Name: ${user.user_metadata?.full_name || user.email || 'User'}`, 20, yPosition)
    yPosition += 10
    pdf.text(`Period: ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`, 20, yPosition)
    yPosition += 10
    pdf.text(`Currency: ${selectedCurrency}`, 20, yPosition)
    yPosition += 20

    // Summary
    pdf.setFont('helvetica', 'bold')
    pdf.text('Summary', 20, yPosition)
    yPosition += 10

    pdf.setFont('helvetica', 'normal')
    pdf.text(`Total Expenses: ${formatCurrencyForPDF(totalExpenses, selectedCurrency)}`, 20, yPosition)
    yPosition += 8
    pdf.text(`Total Transactions: ${totalTransactions}`, 20, yPosition)
    yPosition += 20

    // Category breakdown
    pdf.setFont('helvetica', 'bold')
    pdf.text('Category Breakdown', 20, yPosition)
    yPosition += 10

    pdf.setFont('helvetica', 'normal')
    Object.entries(categoryBreakdown).forEach(([category, amount]) => {
      pdf.text(`${category}: ${formatCurrencyForPDF(amount, selectedCurrency)}`, 20, yPosition)
      yPosition += 8
    })

    const fileName = `SpendWise_Report_${startDate}_to_${endDate}.pdf`
    pdf.save(fileName)
    console.log('Date range report generated successfully:', fileName)

  } catch (error) {
    console.error('Error generating date range report:', error)
    alert('Failed to generate report. Please try again.')
  }
}
