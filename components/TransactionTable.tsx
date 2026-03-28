'use client'

import { useCurrency } from '@/contexts/CurrencyContext'

interface Transaction {
  id: string
  description: string
  category: string
  amount: number
  date: string
  status: 'completed' | 'pending' | 'failed'
}

interface TransactionTableProps {
  transactions: Transaction[]
}

const categoryColors: Record<string, string> = {
  'Food': 'bg-orange-100 text-orange-700',
  'Transport': 'bg-blue-100 text-blue-700',
  'Entertainment': 'bg-purple-100 text-purple-700',
  'Shopping': 'bg-pink-100 text-pink-700',
  'Utilities': 'bg-green-100 text-green-700',
  'Health': 'bg-red-100 text-red-700',
  'Work': 'bg-indigo-100 text-indigo-700',
}

const statusColors: Record<string, string> = {
  'completed': 'text-green-600',
  'pending': 'text-yellow-600',
  'failed': 'text-red-600',
}

export function TransactionTable({ transactions }: TransactionTableProps) {
  const { formatCurrency } = useCurrency()

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-4 px-4 text-sm font-semibold text-muted-foreground">Description</th>
            <th className="text-left py-4 px-4 text-sm font-semibold text-muted-foreground">Category</th>
            <th className="text-left py-4 px-4 text-sm font-semibold text-muted-foreground">Date</th>
            <th className="text-right py-4 px-4 text-sm font-semibold text-muted-foreground">Amount</th>
            <th className="text-left py-4 px-4 text-sm font-semibold text-muted-foreground">Status</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction) => (
            <tr
              key={transaction.id}
              className="border-b border-border/50 hover:bg-muted/30 transition-colors duration-200"
            >
              <td className="py-4 px-4 text-sm text-foreground font-medium">{transaction.description}</td>
              <td className="py-4 px-4">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${categoryColors[transaction.category] || 'bg-gray-100 text-gray-700'}`}>
                  {transaction.category}
                </span>
              </td>
              <td className="py-4 px-4 text-sm text-muted-foreground">{transaction.date}</td>
              <td className="py-4 px-4 text-right text-sm font-semibold text-foreground">
                {formatCurrency(transaction.amount)}
              </td>
              <td className="py-4 px-4">
                <span className={`text-xs font-medium ${statusColors[transaction.status]}`}>
                  {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
