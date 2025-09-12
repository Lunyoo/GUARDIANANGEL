import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  setTheme: (t: Theme) => void
  toggleTheme: () => void
  systemPref: Theme
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

const THEME_STORAGE_KEY = 'ga-theme'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const getSystemPref = useCallback((): Theme => {
    if (typeof window === 'undefined') return 'light'
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
  }, [])

  const [systemPref, setSystemPref] = useState<Theme>(getSystemPref())
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'light'
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY) as Theme | null
    return saved === 'dark' || saved === 'light' ? saved : getSystemPref()
  })

  // Apply attribute for Tailwind dark selector
  const applyTheme = useCallback((next: Theme) => {
    const root = document.documentElement
    const body = document.body
    if (next === 'dark') {
      root.setAttribute('data-appearance', 'dark')
      body.setAttribute('data-appearance', 'dark')
      root.style.colorScheme = 'dark'
    } else {
      root.removeAttribute('data-appearance')
      body.removeAttribute('data-appearance')
      root.style.colorScheme = 'light'
    }
  }, [])

  useEffect(() => {
    applyTheme(theme)
  }, [theme, applyTheme])

  // Watch system preference
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mm = window.matchMedia('(prefers-color-scheme: dark)')
    const handle = () => setSystemPref(mm.matches ? 'dark' : 'light')
    if (mm.addEventListener) mm.addEventListener('change', handle)
    else mm.addListener(handle)
    return () => {
      if (mm.removeEventListener) mm.removeEventListener('change', handle)
      else mm.removeListener(handle)
    }
  }, [])

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(THEME_STORAGE_KEY, t)
    }
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState((prev: Theme) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark'
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(THEME_STORAGE_KEY, next)
      }
      return next
    })
  }, [])

  const value = useMemo(() => ({ theme, setTheme, toggleTheme, systemPref }), [theme, setTheme, toggleTheme, systemPref])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
