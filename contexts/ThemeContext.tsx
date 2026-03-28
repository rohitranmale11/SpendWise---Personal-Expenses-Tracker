'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { getDarkModePreference, saveDarkModePreference } from '@/lib/settings'

type ThemeContextType = {
  darkMode: boolean
  toggleDarkMode: () => void
  setDarkMode: (enabled: boolean) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

interface ThemeProviderProps {
  children: ReactNode
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [darkMode, setDarkModeState] = useState(getDarkModePreference())

  const toggleDarkMode = () => {
    const newMode = !darkMode
    setDarkModeState(newMode)
    saveDarkModePreference(newMode)
    applyTheme(newMode)
  }

  const setDarkMode = (enabled: boolean) => {
    setDarkModeState(enabled)
    saveDarkModePreference(enabled)
    applyTheme(enabled)
  }

  const applyTheme = (enabled: boolean) => {
    if (typeof document !== 'undefined') {
      if (enabled) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }
  }

  useEffect(() => {
    // Apply theme on mount
    applyTheme(darkMode)

    // Listen for custom theme change events
    const handleThemeChange = (event: CustomEvent) => {
      setDarkModeState(event.detail.darkMode)
      applyTheme(event.detail.darkMode)
    }

    window.addEventListener('theme-change', handleThemeChange as EventListener)

    return () => {
      window.removeEventListener('theme-change', handleThemeChange as EventListener)
    }
  }, [])

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode, setDarkMode }}>
      {children}
    </ThemeContext.Provider>
  )
}
