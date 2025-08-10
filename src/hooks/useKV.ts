import { useEffect, useState } from 'react'

/**
 * Hook simples para substituir o useKV do @github/spark
 * Usa localStorage para persistir dados
 */
export function useKV<T>(key: string, defaultValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue
    } catch (error) {
      console.warn(`Erro ao ler ${key} do localStorage:`, error)
      return defaultValue
    }
  })

  // Sync updates across all hook instances in the same window and other tabs
  useEffect(() => {
    const onCustom = (e: Event) => {
      const ce = e as CustomEvent<{ key: string; value: T }>
      if (ce.detail?.key === key) {
        setStoredValue(ce.detail.value)
      }
    }
    const onStorage = (e: StorageEvent) => {
      if (e.key === key && e.newValue != null) {
        try {
          setStoredValue(JSON.parse(e.newValue))
        } catch {}
      }
    }
    window.addEventListener('kv:update', onCustom as EventListener)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('kv:update', onCustom as EventListener)
      window.removeEventListener('storage', onStorage)
    }
  }, [key])

  const setValue = (value: T | ((prev: T) => T)) => {
    try {
      const next = typeof value === 'function' 
        ? (value as (prev: T) => T)(storedValue)
        : value
      setStoredValue(next)
      window.localStorage.setItem(key, JSON.stringify(next))
      // Notify other hook instances in the same window
      const evt = new CustomEvent('kv:update', { detail: { key, value: next } })
      window.dispatchEvent(evt)
    } catch (error) {
      console.warn(`Erro ao salvar ${key} no localStorage:`, error)
    }
  }

  return [storedValue, setValue]
}
