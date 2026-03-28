'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export interface ExchangeRates {
  [key: string]: number
}

export interface CurrencyContextType {
  currency: string
  setCurrency: (currency: string) => void
  exchangeRates: ExchangeRates
  convertAmount: (amount: number, fromCurrency?: string) => number
  formatCurrency: (amount: number) => string
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined)

const CURRENCY_SYMBOLS: { [key: string]: string } = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£'
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState('INR')
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>({
    INR: 1,
    USD: 0.012,
    EUR: 0.011,
    GBP: 0.0095
  })
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    fetchExchangeRates()
  }, [])

  const fetchExchangeRates = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('https://open.er-api.com/v6/latest/INR')
      if (!response.ok) {
        throw new Error('Failed to fetch exchange rates')
      }
      const data = await response.json()
      setExchangeRates(data.rates)
      console.log('Exchange rates loaded from INR base:', data.rates)
    } catch (error) {
      console.error('Error fetching exchange rates:', error)
      console.log('Using fallback exchange rates with INR as base')
    } finally {
      setIsLoading(false)
    }
  }

  const convertAmount = (amount: number, fromCurrency: string = 'INR'): number => {
    if (fromCurrency === currency) return amount

    const inrAmount = fromCurrency === 'INR' ? amount : amount / (exchangeRates[fromCurrency] || 1)

    return inrAmount * (exchangeRates[currency] || 1)
  }

  const formatCurrency = (amount: number): string => {
    const convertedAmount = convertAmount(amount)
    const symbol = CURRENCY_SYMBOLS[currency] || '₹'
    return `${symbol}${convertedAmount.toFixed(2)}`
  }

  return (
    <CurrencyContext.Provider value={{
      currency,
      setCurrency,
      exchangeRates,
      convertAmount,
      formatCurrency
    }}>
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  const context = useContext(CurrencyContext)
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider')
  }
  return context
}
